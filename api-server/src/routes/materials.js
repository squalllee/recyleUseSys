const express = require('express');
const router = express.Router();
const mssql = require('mssql');
const { connectWMSDB } = require('../server');

router.get('/main-systems', async (_req, res) => {
  try {
    const pool = await connectWMSDB();
    const result = await pool.request().query(`
      SELECT
        SystemId,
        RTRIM(SystemName) AS SystemName
      FROM MainSystem
      ORDER BY SystemId
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching main systems:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/main-systems/:systemId/sub-systems', async (req, res) => {
  try {
    const pool = await connectWMSDB();
    const result = await pool.request()
      .input('SystemId', mssql.NVarChar(5), req.params.systemId)
      .query(`
        SELECT
          SystemId,
          SubSystemId,
          RTRIM(SubSystemName) AS SubSystemName
        FROM SubSystem
        WHERE SystemId = @SystemId
        ORDER BY SubSystemId
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching sub systems:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get material basic data with optional fuzzy search by MaterialNo / MaterialName.
// The result is intentionally kept compatible with MaterialNoSelect.vue.
router.get('/', async (req, res) => {
  try {
    const pool = await connectWMSDB();
    const request = pool.request();
    const conditions = [];

    if (req.query.materialNo) {
      request.input('materialNo', mssql.NVarChar(100), `%${req.query.materialNo}%`);
      conditions.push('MaterialInfo.MaterialNo LIKE @materialNo');
    }

    if (req.query.materialName) {
      request.input('materialName', mssql.NVarChar(100), `%${req.query.materialName}%`);
      conditions.push('MaterialInfo.MaterialName LIKE @materialName');
    }

    if (req.query.keyword) {
      request.input('keyword', mssql.NVarChar(100), `%${req.query.keyword}%`);
      conditions.push('(MaterialInfo.MaterialNo LIKE @keyword OR MaterialInfo.MaterialName LIKE @keyword)');
    }

    let query = `
      SELECT
        MaterialInfo.MaterialNo AS 物料編號,
        MaterialInfo.MaterialName AS 物料名稱,
        MaterialInfo.spec AS 規格,
        MaterialInfo.SystemId AS 系統代號,
        MainSystem.SystemName AS 系統名稱,
        MaterialInfo.SubSystemId AS 子系統代號,
        SubSystem.SubSystemName AS 子系統名稱
      FROM MaterialInfo
      INNER JOIN MainSystem ON MainSystem.SystemId = MaterialInfo.SystemId
      INNER JOIN SubSystem ON MaterialInfo.SystemId = SubSystem.SystemId
        AND MaterialInfo.SubSystemId = SubSystem.SubSystemId
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY MaterialInfo.MaterialNo';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching material basic data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
