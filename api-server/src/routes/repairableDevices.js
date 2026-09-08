const express = require('express');
const mssql = require('mssql');
const { connectDB } = require('../server');

const router = express.Router();

function requiredText(value, fieldName, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength) {
    const error = new Error(!text ? `${fieldName}為必填欄位` : `${fieldName}長度不可超過 ${maxLength} 個字元`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function optionalText(value, fieldName, maxLength) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) {
    const error = new Error(`${fieldName}長度不可超過 ${maxLength} 個字元`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function sendError(res, error, operation) {
  console.error(`Error ${operation} RepairableDevice:`, error);
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  if (error.number === 2601 || error.number === 2627) {
    return res.status(409).json({ error: 'DeviceID 已存在' });
  }
  if (error.number === 547) {
    return res.status(409).json({ error: '資料仍被其他可修件使用，無法完成操作' });
  }
  return res.status(500).json({ error: error.message });
}

router.get('/repairable-devices', async (req, res) => {
  try {
    const parentDeviceID = optionalText(req.query.parentId, '上層 DeviceID', 64);
    const subtreeRootID = optionalText(req.query.subtreeOf, '心智圖起始 DeviceID', 64);
    const pool = await connectDB();

    if (subtreeRootID) {
      const subtreeResult = await pool.request()
        .input('SubtreeRootID', mssql.VarChar(64), subtreeRootID)
        .query(`
          WITH DeviceTree AS
          (
            SELECT device.*, CAST(0 AS INT) AS HierarchyLevel,
                   CAST('/' + device.DeviceID + '/' AS VARCHAR(MAX)) AS HierarchyPath
            FROM dbo.RepairableDevices AS device
            WHERE device.DeviceID = @SubtreeRootID
            UNION ALL
            SELECT child.*, parent.HierarchyLevel + 1,
                   CAST(parent.HierarchyPath + child.DeviceID + '/' AS VARCHAR(MAX))
            FROM dbo.RepairableDevices AS child
            INNER JOIN DeviceTree AS parent ON parent.DeviceID = child.CurrentLocationDeviceID
          )
          SELECT tree.*, parent.DeviceName AS CurrentLocationDeviceName,
                 CAST(CASE WHEN EXISTS (
                   SELECT 1
                   FROM dbo.RepairableDevices AS child
                   WHERE child.CurrentLocationDeviceID = tree.DeviceID
                 ) THEN 1 ELSE 0 END AS BIT) AS HasChildren
          FROM DeviceTree AS tree
          LEFT JOIN dbo.RepairableDevices AS parent ON parent.DeviceID = tree.CurrentLocationDeviceID
          ORDER BY tree.HierarchyPath
          OPTION (MAXRECURSION 100)
        `);
      if (subtreeResult.recordset.length === 0) {
        return res.status(404).json({ error: '找不到指定的可修件資料' });
      }
      return res.json(subtreeResult.recordset);
    }

    const result = await pool.request()
      .input('ParentDeviceID', mssql.VarChar(64), parentDeviceID)
      .query(`
        SELECT device.*,
               CAST(CASE WHEN device.CurrentLocationDeviceID IS NULL THEN 0 ELSE 1 END AS INT) AS HierarchyLevel,
               CAST('/' + device.DeviceID + '/' AS VARCHAR(MAX)) AS HierarchyPath,
               parent.DeviceName AS CurrentLocationDeviceName,
               CAST(CASE WHEN EXISTS (
                 SELECT 1
                 FROM dbo.RepairableDevices AS child
                 WHERE child.CurrentLocationDeviceID = device.DeviceID
               ) THEN 1 ELSE 0 END AS BIT) AS HasChildren
        FROM dbo.RepairableDevices AS device
        LEFT JOIN dbo.RepairableDevices AS parent ON parent.DeviceID = device.CurrentLocationDeviceID
        WHERE (@ParentDeviceID IS NULL AND device.CurrentLocationDeviceID IS NULL)
           OR device.CurrentLocationDeviceID = @ParentDeviceID
        ORDER BY device.DeviceID
      `);
    res.json(result.recordset);
  } catch (error) {
    sendError(res, error, 'fetching');
  }
});

router.get('/repairable-devices/:deviceId', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('DeviceID', mssql.VarChar(64), req.params.deviceId)
      .query(`
        SELECT device.*, parent.DeviceName AS CurrentLocationDeviceName
        FROM dbo.RepairableDevices AS device
        LEFT JOIN dbo.RepairableDevices AS parent ON parent.DeviceID = device.CurrentLocationDeviceID
        WHERE device.DeviceID = @DeviceID
      `);
    if (result.recordset.length === 0) return res.status(404).json({ error: '找不到指定的可修件資料' });
    res.json(result.recordset[0]);
  } catch (error) {
    sendError(res, error, 'fetching');
  }
});

router.post('/repairable-devices', async (req, res) => {
  try {
    // Root nodes may provide their own DeviceID. For every other node the
    // server generates the ID from the selected parent/material.
    const requestedDeviceID = optionalText(req.body.DeviceID, 'DeviceID', 64);
    const deviceName = requiredText(req.body.DeviceName, '設備名稱', 100);
    const materialNo = optionalText(req.body.MaterialNo, '料號', 50);
    const serialNumber = optionalText(req.body.SerialNumber, '序號', 50);
    const currentLocationDeviceID = optionalText(req.body.CurrentLocationDeviceID, '目前位置', 64);
    if (!currentLocationDeviceID && !requestedDeviceID) {
      return res.status(400).json({ error: '根節點必須輸入 DeviceID' });
    }
    if (requestedDeviceID && requestedDeviceID === currentLocationDeviceID) {
      return res.status(400).json({ error: '目前位置不可選擇自己' });
    }

    const pool = await connectDB();
    const result = await pool.request()
      .input('RequestedDeviceID', mssql.VarChar(64), requestedDeviceID)
      .input('DeviceName', mssql.NVarChar(100), deviceName)
      .input('MaterialNo', mssql.VarChar(50), materialNo)
      .input('SerialNumber', mssql.VarChar(50), serialNumber)
      .input('CurrentLocationDeviceID', mssql.VarChar(64), currentLocationDeviceID)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        BEGIN TRY
          DECLARE @GeneratedDeviceID VARCHAR(64);
          DECLARE @NextNumber INT;

          IF @CurrentLocationDeviceID IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM dbo.RepairableDevices WHERE DeviceID = @CurrentLocationDeviceID)
            THROW 50001, '目前位置不存在', 1;

          IF @CurrentLocationDeviceID IS NULL
          BEGIN
            IF @RequestedDeviceID IS NULL
              THROW 50006, '根節點必須輸入 DeviceID', 1;
            SET @GeneratedDeviceID = @RequestedDeviceID;
          END
          ELSE
          BEGIN
            IF @MaterialNo IS NULL
              THROW 50012, '非根節點必須先選取料號', 1;

            SELECT @NextNumber = ISNULL(MAX(TRY_CONVERT(INT, RIGHT(DeviceID, 4))), 0) + 1
            FROM dbo.RepairableDevices WITH (TABLOCKX)
            WHERE MaterialNo = @MaterialNo
              AND LEN(DeviceID) = LEN(@MaterialNo) + 5
              AND LEFT(DeviceID, LEN(@MaterialNo) + 1) = @MaterialNo + '_'
              AND TRY_CONVERT(INT, RIGHT(DeviceID, 4)) IS NOT NULL;

            IF @NextNumber > 9999
              THROW 50009, '同料號的 DeviceID 已超過四碼流水號上限', 1;

            SET @GeneratedDeviceID = CONCAT(
              @MaterialNo, '_', RIGHT('0000' + CONVERT(VARCHAR(4), @NextNumber), 4)
            );
          END;

          INSERT INTO dbo.RepairableDevices
            (DeviceID, DeviceName, MaterialNo, SerialNumber, CurrentLocationDeviceID)
          OUTPUT INSERTED.*
          VALUES (
            @GeneratedDeviceID, @DeviceName, @MaterialNo,
            @SerialNumber, @CurrentLocationDeviceID
          );

          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
          THROW;
        END CATCH
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    if ([50001, 50006, 50009, 50012].includes(error.number)) error.statusCode = 400;
    sendError(res, error, 'creating');
  }
});

router.put('/repairable-devices/:deviceId', async (req, res) => {
  try {
    const deviceID = requiredText(req.params.deviceId, 'DeviceID', 64);
    const deviceName = requiredText(req.body.DeviceName, '設備名稱', 100);
    const materialNo = optionalText(req.body.MaterialNo, '料號', 50);
    const serialNumber = optionalText(req.body.SerialNumber, '序號', 50);
    const currentLocationDeviceID = optionalText(req.body.CurrentLocationDeviceID, '目前位置', 64);
    if (deviceID === currentLocationDeviceID) return res.status(400).json({ error: '目前位置不可選擇自己' });

    const pool = await connectDB();
    const result = await pool.request()
      .input('DeviceID', mssql.VarChar(64), deviceID)
      .input('DeviceName', mssql.NVarChar(100), deviceName)
      .input('MaterialNo', mssql.VarChar(50), materialNo)
      .input('SerialNumber', mssql.VarChar(50), serialNumber)
      .input('CurrentLocationDeviceID', mssql.VarChar(64), currentLocationDeviceID)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.RepairableDevices WHERE DeviceID = @DeviceID)
          THROW 50002, '找不到指定的可修件資料', 1;
        IF @CurrentLocationDeviceID IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM dbo.RepairableDevices WHERE DeviceID = @CurrentLocationDeviceID)
          THROW 50001, '目前位置不存在', 1;
        IF @CurrentLocationDeviceID IS NOT NULL
        BEGIN
          ;WITH Descendants AS
          (
            SELECT DeviceID FROM dbo.RepairableDevices WHERE CurrentLocationDeviceID = @DeviceID
            UNION ALL
            SELECT child.DeviceID FROM dbo.RepairableDevices AS child
            INNER JOIN Descendants AS parent ON parent.DeviceID = child.CurrentLocationDeviceID
          )
          SELECT DeviceID INTO #Descendants FROM Descendants OPTION (MAXRECURSION 100);
          IF EXISTS (SELECT 1 FROM #Descendants WHERE DeviceID = @CurrentLocationDeviceID)
            THROW 50003, '目前位置不可設定為自己的下層節點', 1;
        END;
        UPDATE dbo.RepairableDevices
        SET DeviceName = @DeviceName, MaterialNo = @MaterialNo,
            SerialNumber = @SerialNumber,
            CurrentLocationDeviceID = @CurrentLocationDeviceID,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE DeviceID = @DeviceID
      `);
    res.json(result.recordset[0]);
  } catch (error) {
    if (error.number === 50001 || error.number === 50003) error.statusCode = 400;
    if (error.number === 50002) error.statusCode = 404;
    sendError(res, error, 'updating');
  }
});

router.delete('/repairable-devices/:deviceId', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('DeviceID', mssql.VarChar(64), req.params.deviceId)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.RepairableDevices WHERE CurrentLocationDeviceID = @DeviceID)
          THROW 50004, '此節點仍有下層資料，請先移除或移動子節點', 1;
        DELETE FROM dbo.RepairableDevices WHERE DeviceID = @DeviceID;
        SELECT @@ROWCOUNT AS DeletedRows;
      `);
    if (result.recordset[0].DeletedRows === 0) return res.status(404).json({ error: '找不到指定的可修件資料' });
    res.status(204).send();
  } catch (error) {
    if (error.number === 50004) error.statusCode = 409;
    sendError(res, error, 'deleting');
  }
});

module.exports = router;
