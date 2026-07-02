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
               mtp.TypeName AS MaintTypeName,
               frp.ReasonName AS FaultReasonName,
               ap.ActionName AS ActionName
        FROM EquipmentMaintenanceRecords emr
        LEFT JOIN MaintTypePhrases mtp ON emr.MaintTypeCode = mtp.MaintTypeID
        LEFT JOIN FaultReasonPhrases frp ON emr.FaultReasonCode = frp.ReasonID
        LEFT JOIN ActionPhrases ap ON emr.ActionCode = ap.ActionID
        ORDER BY emr.CreatedAt DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching EquipmentMaintenanceRecords:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get the next SerialNumber to use for a given MaterialNo (numbering starts at 1 per MaterialNo)
router.get('/equipment-maintenance-records/next-serial/:materialNo', async (req, res) => {
  try {
    const { materialNo } = req.params;
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaterialNo', mssql.VarChar(13), materialNo)
      .query(`
        SELECT ISNULL(MAX(TRY_CAST(SerialNumber AS INT)), 0) + 1 AS NextSerialNumber
        FROM EquipmentMaintenanceRecords
        WHERE MaterialNo = @MaterialNo
      `);

    res.json({ NextSerialNumber: result.recordset[0].NextSerialNumber });
  } catch (error) {
    console.error('Error computing next serial number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single EquipmentMaintenanceRecord
router.get('/equipment-maintenance-records/:materialNo/:serialNumber/:id', async (req, res) => {
  try {
    const { materialNo, serialNumber, id } = req.params;
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaterialNo', mssql.VarChar(13), materialNo)
      .input('SerialNumber', mssql.VarChar(50), serialNumber)
      .input('Id', mssql.Int, id)
      .query(`
        SELECT * FROM EquipmentMaintenanceRecords
        WHERE MaterialNo = @MaterialNo
          AND SerialNumber = @SerialNumber
          AND Id = @Id
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
    const { MaterialNo, SerialNumber, Id, SystemCode, InChargeID, PurchaseDate,
            MaintTypeCode, MaintTypeYear, MaintTypeOther, MaintStartDate, MaintEndDate,
            WorkOrderNumber, RemovalDate, RemovalLocation, InstallationDate,
            InstallationLocation, FaultReasonCode, FaultReasonOther, ActionCode,
            ActionOther, ReplacementParts, CompletionDate, Remarks } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaterialNo', mssql.VarChar(13), MaterialNo)
      .input('SerialNumber', mssql.VarChar(50), SerialNumber)
      .input('Id', mssql.Int, Id)
      .input('SystemCode', mssql.VarChar(5), SystemCode)
      .input('InChargeID', mssql.VarChar(6), InChargeID)
      .input('PurchaseDate', mssql.Date, PurchaseDate || null)
      .input('MaintTypeCode', mssql.VarChar(20), MaintTypeCode || null)
      .input('MaintTypeYear', mssql.VarChar(10), MaintTypeYear || null)
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
      .input('ActionCode', mssql.VarChar(20), ActionCode || null)
      .input('ActionOther', mssql.NVarChar(200), ActionOther || null)
      .input('ReplacementParts', mssql.NVarChar('max'), ReplacementParts || null)
      .input('CompletionDate', mssql.Date, CompletionDate || null)
      .input('Remarks', mssql.NVarChar('max'), Remarks || null)
      .query(`
        INSERT INTO EquipmentMaintenanceRecords (
          MaterialNo, SerialNumber, Id, SystemCode, InChargeID, PurchaseDate,
          MaintTypeCode, MaintTypeYear, MaintTypeOther, MaintStartDate, MaintEndDate,
          WorkOrderNumber, RemovalDate, RemovalLocation, InstallationDate,
          InstallationLocation, FaultReasonCode, FaultReasonOther, ActionCode,
          ActionOther, ReplacementParts, CompletionDate, Remarks, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @MaterialNo, @SerialNumber, @Id, @SystemCode, @InChargeID, @PurchaseDate,
          @MaintTypeCode, @MaintTypeYear, @MaintTypeOther, @MaintStartDate, @MaintEndDate,
          @WorkOrderNumber, @RemovalDate, @RemovalLocation, @InstallationDate,
          @InstallationLocation, @FaultReasonCode, @FaultReasonOther, @ActionCode,
          @ActionOther, @ReplacementParts, @CompletionDate, @Remarks, GETDATE(), GETDATE()
        )
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating EquipmentMaintenanceRecord:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update EquipmentMaintenanceRecord
router.put('/equipment-maintenance-records/:materialNo/:serialNumber/:id', async (req, res) => {
  try {
    const { materialNo, serialNumber, id } = req.params;
    const { SystemCode, InChargeID, PurchaseDate, MaintTypeCode, MaintTypeYear,
            MaintTypeOther, MaintStartDate, MaintEndDate, WorkOrderNumber, RemovalDate,
            RemovalLocation, InstallationDate, InstallationLocation, FaultReasonCode,
            FaultReasonOther, ActionCode, ActionOther, ReplacementParts, CompletionDate,
            Remarks } = req.body;
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaterialNo', mssql.VarChar(13), materialNo)
      .input('SerialNumber', mssql.VarChar(50), serialNumber)
      .input('Id', mssql.Int, id)
      .input('SystemCode', mssql.VarChar(5), SystemCode)
      .input('InChargeID', mssql.VarChar(6), InChargeID)
      .input('PurchaseDate', mssql.Date, PurchaseDate || null)
      .input('MaintTypeCode', mssql.VarChar(20), MaintTypeCode || null)
      .input('MaintTypeYear', mssql.VarChar(10), MaintTypeYear || null)
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
      .input('ActionCode', mssql.VarChar(20), ActionCode || null)
      .input('ActionOther', mssql.NVarChar(200), ActionOther || null)
      .input('ReplacementParts', mssql.NVarChar('max'), ReplacementParts || null)
      .input('CompletionDate', mssql.Date, CompletionDate || null)
      .input('Remarks', mssql.NVarChar('max'), Remarks || null)
      .query(`
        UPDATE EquipmentMaintenanceRecords
        SET SystemCode = @SystemCode,
            InChargeID = @InChargeID,
            PurchaseDate = @PurchaseDate,
            MaintTypeCode = @MaintTypeCode,
            MaintTypeYear = @MaintTypeYear,
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
        WHERE MaterialNo = @MaterialNo
          AND SerialNumber = @SerialNumber
          AND Id = @Id
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
router.delete('/equipment-maintenance-records/:materialNo/:serialNumber/:id', async (req, res) => {
  try {
    const { materialNo, serialNumber, id } = req.params;
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaterialNo', mssql.VarChar(13), materialNo)
      .input('SerialNumber', mssql.VarChar(50), serialNumber)
      .input('Id', mssql.Int, id)
      .query(`
        DELETE FROM EquipmentMaintenanceRecords
        WHERE MaterialNo = @MaterialNo
          AND SerialNumber = @SerialNumber
          AND Id = @Id
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
