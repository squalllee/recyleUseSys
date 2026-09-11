const express = require('express');
const router = express.Router();
const mssql = require('mssql');

// Load connection
const { connectDB } = require('../server');

// ============================================
// ActionPhrases API (處理方式)
// ============================================

// Get all ActionPhrases
router.get('/action-phrases', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query('SELECT * FROM ActionPhrases ORDER BY SortOrder');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching ActionPhrases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single ActionPhrase by ID
router.get('/action-phrases/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('ActionID', mssql.Int, req.params.id)
      .query('SELECT * FROM ActionPhrases WHERE ActionID = @ActionID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ActionPhrase not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching ActionPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create ActionPhrase
router.post('/action-phrases', async (req, res) => {
  try {
    const { ActionName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('ActionName', mssql.NVarChar(50), ActionName)
      .input('SortOrder', mssql.Int, SortOrder || null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : 1)
      .query(`
        INSERT INTO ActionPhrases (ActionName, SortOrder, IsActive)
        OUTPUT INSERTED.*
        VALUES (@ActionName, @SortOrder, @IsActive)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating ActionPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update ActionPhrase
router.put('/action-phrases/:id', async (req, res) => {
  try {
    const { ActionName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('ActionID', mssql.Int, req.params.id)
      .input('ActionName', mssql.NVarChar(50), ActionName)
      .input('SortOrder', mssql.Int, SortOrder !== undefined ? SortOrder : null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : null)
      .query(`
        UPDATE ActionPhrases
        SET ActionName = @ActionName,
            SortOrder = @SortOrder,
            IsActive = @IsActive
        OUTPUT INSERTED.*
        WHERE ActionID = @ActionID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ActionPhrase not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating ActionPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete ActionPhrase
router.delete('/action-phrases/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('ActionID', mssql.Int, req.params.id)
      .query('DELETE FROM ActionPhrases WHERE ActionID = @ActionID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'ActionPhrase not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ActionPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FaultReasonPhrases API (故障原因)
// ============================================

// Get all FaultReasonPhrases
router.get('/fault-reason-phrases', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query('SELECT * FROM FaultReasonPhrases ORDER BY SortOrder');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching FaultReasonPhrases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single FaultReasonPhrase by ID
router.get('/fault-reason-phrases/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('ReasonID', mssql.Int, req.params.id)
      .query('SELECT * FROM FaultReasonPhrases WHERE ReasonID = @ReasonID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'FaultReasonPhrase not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching FaultReasonPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create FaultReasonPhrase
router.post('/fault-reason-phrases', async (req, res) => {
  try {
    const { ReasonName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('ReasonName', mssql.NVarChar(50), ReasonName)
      .input('SortOrder', mssql.Int, SortOrder || null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : 1)
      .query(`
        INSERT INTO FaultReasonPhrases (ReasonName, SortOrder, IsActive)
        OUTPUT INSERTED.*
        VALUES (@ReasonName, @SortOrder, @IsActive)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating FaultReasonPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update FaultReasonPhrase
router.put('/fault-reason-phrases/:id', async (req, res) => {
  try {
    const { ReasonName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('ReasonID', mssql.Int, req.params.id)
      .input('ReasonName', mssql.NVarChar(50), ReasonName)
      .input('SortOrder', mssql.Int, SortOrder !== undefined ? SortOrder : null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : null)
      .query(`
        UPDATE FaultReasonPhrases
        SET ReasonName = @ReasonName,
            SortOrder = @SortOrder,
            IsActive = @IsActive
        OUTPUT INSERTED.*
        WHERE ReasonID = @ReasonID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'FaultReasonPhrase not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating FaultReasonPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete FaultReasonPhrase
router.delete('/fault-reason-phrases/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('ReasonID', mssql.Int, req.params.id)
      .query('DELETE FROM FaultReasonPhrases WHERE ReasonID = @ReasonID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'FaultReasonPhrase not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting FaultReasonPhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MaintTypePhrases API (維修物件類型)
// ============================================

// Get all MaintTypePhrases
router.get('/maint-type-phrases', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query('SELECT * FROM MaintTypePhrases ORDER BY SortOrder');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching MaintTypePhrases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single MaintTypePhrase by ID
router.get('/maint-type-phrases/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('MaintTypeID', mssql.Int, req.params.id)
      .query('SELECT * FROM MaintTypePhrases WHERE MaintTypeID = @MaintTypeID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'MaintTypePhrase not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching MaintTypePhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create MaintTypePhrase
router.post('/maint-type-phrases', async (req, res) => {
  try {
    const { TypeName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('TypeName', mssql.NVarChar(50), TypeName)
      .input('SortOrder', mssql.Int, SortOrder || null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : 1)
      .query(`
        INSERT INTO MaintTypePhrases (TypeName, SortOrder, IsActive)
        OUTPUT INSERTED.*
        VALUES (@TypeName, @SortOrder, @IsActive)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating MaintTypePhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update MaintTypePhrase
router.put('/maint-type-phrases/:id', async (req, res) => {
  try {
    const { TypeName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaintTypeID', mssql.Int, req.params.id)
      .input('TypeName', mssql.NVarChar(50), TypeName)
      .input('SortOrder', mssql.Int, SortOrder !== undefined ? SortOrder : null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : null)
      .query(`
        UPDATE MaintTypePhrases
        SET TypeName = @TypeName,
            SortOrder = @SortOrder,
            IsActive = @IsActive
        OUTPUT INSERTED.*
        WHERE MaintTypeID = @MaintTypeID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'MaintTypePhrase not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating MaintTypePhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete MaintTypePhrase
router.delete('/maint-type-phrases/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('MaintTypeID', mssql.Int, req.params.id)
      .query('DELETE FROM MaintTypePhrases WHERE MaintTypeID = @MaintTypeID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'MaintTypePhrase not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting MaintTypePhrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Locations API (地點)
// ============================================

// Get Locations (paginated, sortable, optional keyword search on LocationCode/LocationName)
const LOCATION_SORT_COLUMNS = {
  LocationCode: 'LocationCode',
  LocationName: 'LocationName',
  SortOrder: 'SortOrder',
  IsActive: 'IsActive',
};

router.get('/locations', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const sortBy = LOCATION_SORT_COLUMNS[req.query.sortBy] || 'SortOrder';
    const sortDir = req.query.sortDir === 'desc' ? 'DESC' : 'ASC';
    const keyword = req.query.keyword ? `%${req.query.keyword}%` : null;
    const unit = req.query.unit || null;

    const conditions = [];
    if (keyword) conditions.push('(LocationCode LIKE @Keyword OR LocationName LIKE @Keyword)');
    // 單位代碼前 3 碼相同視為同單位；尚未記錄建立人/單位的舊資料對所有人開放
    if (unit) conditions.push('(LEFT(CreatedByUnit, 3) = LEFT(@Unit, 3) OR CreatedByUnit IS NULL)');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pool = await connectDB();

    const countRequest = pool.request();
    if (keyword) countRequest.input('Keyword', mssql.NVarChar(100), keyword);
    if (unit) countRequest.input('Unit', mssql.VarChar(20), unit);
    const countResult = await countRequest.query(`SELECT COUNT(*) AS Total FROM Locations ${whereClause}`);

    const dataRequest = pool.request();
    if (keyword) dataRequest.input('Keyword', mssql.NVarChar(100), keyword);
    if (unit) dataRequest.input('Unit', mssql.VarChar(20), unit);
    dataRequest.input('Offset', mssql.Int, offset);
    dataRequest.input('PageSize', mssql.Int, pageSize);
    const dataResult = await dataRequest.query(`
      SELECT * FROM Locations
      ${whereClause}
      ORDER BY ${sortBy} ${sortDir}
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
    `);

    res.json({
      data: dataResult.recordset,
      total: countResult.recordset[0].Total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Error fetching Locations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single Location by ID
router.get('/locations/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('LocationID', mssql.Int, req.params.id)
      .query('SELECT * FROM Locations WHERE LocationID = @LocationID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching Location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Location
router.post('/locations', async (req, res) => {
  try {
    const { LocationCode, LocationName, SortOrder, IsActive, CreatedBy, CreatedByUnit } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('LocationCode', mssql.VarChar(10), LocationCode)
      .input('LocationName', mssql.NVarChar(100), LocationName)
      .input('SortOrder', mssql.Int, SortOrder || null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : 1)
      .input('CreatedBy', mssql.VarChar(6), CreatedBy || null)
      .input('CreatedByUnit', mssql.VarChar(20), CreatedByUnit || null)
      .query(`
        INSERT INTO Locations (LocationCode, LocationName, SortOrder, IsActive, CreatedBy, CreatedByUnit)
        OUTPUT INSERTED.*
        VALUES (@LocationCode, @LocationName, @SortOrder, @IsActive, @CreatedBy, @CreatedByUnit)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating Location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Location
router.put('/locations/:id', async (req, res) => {
  try {
    const { LocationCode, LocationName, SortOrder, IsActive } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('LocationID', mssql.Int, req.params.id)
      .input('LocationCode', mssql.VarChar(10), LocationCode)
      .input('LocationName', mssql.NVarChar(100), LocationName)
      .input('SortOrder', mssql.Int, SortOrder !== undefined ? SortOrder : null)
      .input('IsActive', mssql.Bit, IsActive !== undefined ? IsActive : null)
      .query(`
        UPDATE Locations
        SET LocationCode = @LocationCode,
            LocationName = @LocationName,
            SortOrder = @SortOrder,
            IsActive = @IsActive
        OUTPUT INSERTED.*
        WHERE LocationID = @LocationID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating Location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Location
router.delete('/locations/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input('LocationID', mssql.Int, req.params.id)
      .query('DELETE FROM Locations WHERE LocationID = @LocationID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting Location:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EquipmentMaintenanceRecords API (設備維修記錄)
// ============================================

// Get all EquipmentMaintenanceRecords
router.get('/equipment-maintenance-records', async (req, res) => {
  try {
    const pool = await connectDB();

    // 使用 LEFT JOIN 來獲取對應的型號、原因、處理方式名稱
    const result = await pool.request()
      .query(`
        SELECT emr.*,
               device.DeviceName,
               device.SerialNumber,
               device.PurchaseDate,
               mtp.TypeName AS MaintTypeName,
               frp.ReasonName AS FaultReasonName,
               ap.ActionName AS ActionName
        FROM EquipmentMaintenanceRecords emr
        INNER JOIN RepairableDevices device ON device.DeviceID = emr.DeviceId
        LEFT JOIN MaintTypePhrases mtp ON emr.MaintTypeCode = mtp.MaintTypeID
        LEFT JOIN FaultReasonPhrases frp ON emr.FaultReasonCode = frp.ReasonID
        LEFT JOIN ActionPhrases ap ON emr.ActionCode = CAST(ap.ActionID AS VARCHAR(20))
        ORDER BY emr.CreatedAt DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching EquipmentMaintenanceRecords:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check whether a repairable device already has an EquipmentMaintenanceRecord
router.get('/equipment-maintenance-records/exists/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const pool = await connectDB();

    const result = await pool.request()
      .input('DeviceId', mssql.VarChar(64), deviceId)
      .query(`
        SELECT COUNT(*) AS Cnt
        FROM EquipmentMaintenanceRecords
        WHERE DeviceId = @DeviceId
      `);

    res.json({ exists: result.recordset[0].Cnt > 0 });
  } catch (error) {
    console.error('Error checking material existence:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single EquipmentMaintenanceRecord
router.get('/equipment-maintenance-records/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const pool = await connectDB();

    const result = await pool.request()
      .input('DeviceId', mssql.VarChar(64), deviceId)
      .query(`
        SELECT emr.*, device.DeviceName, device.SerialNumber, device.PurchaseDate
        FROM EquipmentMaintenanceRecords emr
        INNER JOIN RepairableDevices device ON device.DeviceID = emr.DeviceId
        WHERE emr.DeviceId = @DeviceId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'EquipmentMaintenanceRecord not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching EquipmentMaintenanceRecord:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create EquipmentMaintenanceRecord
router.post('/equipment-maintenance-records', async (req, res) => {
  try {
    const { DeviceId, InChargeID,
            MaintTypeCode, MaintTypeOther, MaintStartDate, MaintEndDate,
            WorkOrderNumber, RemovalDate, RemovalLocation, InstallationDate,
            InstallationLocation, FaultReasonCode, FaultReasonOther, ActionCode,
            ActionOther, ReplacementParts, CompletionDate, Remarks } = req.body;
    if (!DeviceId || !InChargeID) {
      return res.status(400).json({ error: 'DeviceId and InChargeID are required' });
    }
    const pool = await connectDB();

    const result = await pool.request()
      .input('DeviceId', mssql.VarChar(64), DeviceId)
      .input('InChargeID', mssql.VarChar(6), InChargeID)
      .input('MaintTypeCode', mssql.VarChar(20), MaintTypeCode || null)
      .input('MaintTypeOther', mssql.NVarChar(100), MaintTypeOther || null)
      .input('MaintStartDate', mssql.Date, MaintStartDate || null)
      .input('MaintEndDate', mssql.Date, MaintEndDate || null)
      .input('WorkOrderNumber', mssql.VarChar(50), WorkOrderNumber || null)
      .input('RemovalDate', mssql.Date, RemovalDate || null)
      .input('RemovalLocation', mssql.NVarChar(50), RemovalLocation || null)
      .input('InstallationDate', mssql.Date, InstallationDate || null)
      .input('InstallationLocation', mssql.NVarChar(50), InstallationLocation || null)
      .input('FaultReasonCode', mssql.VarChar(20), FaultReasonCode || null)
      .input('FaultReasonOther', mssql.NVarChar(200), FaultReasonOther || null)
      .input('ActionCode', mssql.VarChar(100), ActionCode || null)
      .input('ActionOther', mssql.NVarChar(200), ActionOther || null)
      .input('ReplacementParts', mssql.NVarChar('max'), ReplacementParts || null)
      .input('CompletionDate', mssql.Date, CompletionDate || null)
      .input('Remarks', mssql.NVarChar('max'), Remarks || null)
      .query(`
        INSERT INTO EquipmentMaintenanceRecords (
          MaterialNo, DeviceId, InChargeID,
          MaintTypeCode, MaintTypeOther, MaintStartDate, MaintEndDate,
          WorkOrderNumber, RemovalDate, RemovalLocation, InstallationDate,
          InstallationLocation, FaultReasonCode, FaultReasonOther, ActionCode,
          ActionOther, ReplacementParts, CompletionDate, Remarks, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.*
        SELECT
          device.MaterialNo, @DeviceId, @InChargeID,
          @MaintTypeCode, @MaintTypeOther, @MaintStartDate, @MaintEndDate,
          @WorkOrderNumber, @RemovalDate, @RemovalLocation, @InstallationDate,
          @InstallationLocation, @FaultReasonCode, @FaultReasonOther, @ActionCode,
          @ActionOther, @ReplacementParts, @CompletionDate, @Remarks, GETDATE(), GETDATE()
        FROM RepairableDevices device
        WHERE device.DeviceID = @DeviceId
          AND device.CurrentLocationDeviceID IS NOT NULL
      `);

    if (result.recordset.length === 0) {
      return res.status(400).json({ error: 'RepairableDevice not found or is a location' });
    }
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating EquipmentMaintenanceRecord:', error);
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ error: 'This repairable device already has a maintenance record' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update EquipmentMaintenanceRecord
router.put('/equipment-maintenance-records/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { InChargeID, MaintTypeCode,
            MaintTypeOther, MaintStartDate, MaintEndDate, WorkOrderNumber, RemovalDate,
            RemovalLocation, InstallationDate, InstallationLocation, FaultReasonCode,
            FaultReasonOther, ActionCode, ActionOther, ReplacementParts, CompletionDate,
            Remarks } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('DeviceId', mssql.VarChar(64), deviceId)
      .input('InChargeID', mssql.VarChar(6), InChargeID)
      .input('MaintTypeCode', mssql.VarChar(20), MaintTypeCode || null)
      .input('MaintTypeOther', mssql.NVarChar(100), MaintTypeOther || null)
      .input('MaintStartDate', mssql.Date, MaintStartDate || null)
      .input('MaintEndDate', mssql.Date, MaintEndDate || null)
      .input('WorkOrderNumber', mssql.VarChar(50), WorkOrderNumber || null)
      .input('RemovalDate', mssql.Date, RemovalDate || null)
      .input('RemovalLocation', mssql.NVarChar(50), RemovalLocation || null)
      .input('InstallationDate', mssql.Date, InstallationDate || null)
      .input('InstallationLocation', mssql.NVarChar(50), InstallationLocation || null)
      .input('FaultReasonCode', mssql.VarChar(20), FaultReasonCode || null)
      .input('FaultReasonOther', mssql.NVarChar(200), FaultReasonOther || null)
      .input('ActionCode', mssql.VarChar(100), ActionCode || null)
      .input('ActionOther', mssql.NVarChar(200), ActionOther || null)
      .input('ReplacementParts', mssql.NVarChar('max'), ReplacementParts || null)
      .input('CompletionDate', mssql.Date, CompletionDate || null)
      .input('Remarks', mssql.NVarChar('max'), Remarks || null)
      .query(`
        UPDATE EquipmentMaintenanceRecords
        SET InChargeID = @InChargeID,
            MaintTypeCode = @MaintTypeCode,
            MaintTypeOther = @MaintTypeOther,
            MaintStartDate = @MaintStartDate,
            MaintEndDate = @MaintEndDate,
            WorkOrderNumber = @WorkOrderNumber,
            RemovalDate = @RemovalDate,
            RemovalLocation = @RemovalLocation,
            InstallationDate = @InstallationDate,
            InstallationLocation = @InstallationLocation,
            FaultReasonCode = @FaultReasonCode,
            FaultReasonOther = @FaultReasonOther,
            ActionCode = @ActionCode,
            ActionOther = @ActionOther,
            ReplacementParts = @ReplacementParts,
            CompletionDate = @CompletionDate,
            Remarks = @Remarks,
            UpdatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE DeviceId = @DeviceId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'EquipmentMaintenanceRecord not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating EquipmentMaintenanceRecord:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete EquipmentMaintenanceRecord
router.delete('/equipment-maintenance-records/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const pool = await connectDB();

    const result = await pool.request()
      .input('DeviceId', mssql.VarChar(64), deviceId)
      .query(`
        DELETE FROM EquipmentMaintenanceRecords
        WHERE DeviceId = @DeviceId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'EquipmentMaintenanceRecord not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting EquipmentMaintenanceRecord:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
