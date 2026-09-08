const express = require('express');
const router = express.Router();
const { connectWMSDB } = require('../server');

// Get all employees, optionally fuzzy-filtered by TMNAME or KEYNO via ?keyword=
router.get('/employees', async (req, res) => {
  try {
    const pool = await connectWMSDB();
    const request = pool.request();
    const conditions = [`UNITNO LIKE 'L%'`];

    if (req.query.keyword) {
      request.input('keyword', `%${req.query.keyword}%`);
      conditions.push('(TMNAME LIKE @keyword OR KEYNO LIKE @keyword)');
    }

    const result = await request.query(`
      SELECT
        KEYNO,
        TMNAME,
        EMAIL,
        TelExtension,
        UNITNO,
        JOBName,
        OFFJOBDATE,
        CreatedTime,
        UpdatedTime
      FROM Employee
      WHERE ${conditions.join(' AND ')}
      ORDER BY CreatedTime DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employees by TMNAME
router.get('/employees/tmname/:tmname', async (req, res) => {
  try {
    const pool = await connectWMSDB();
    const result = await pool.request()
      .input('TMNAME', `%${req.params.tmname}%`)
      .query(`
        SELECT
          KEYNO,
          TMNAME,
          EMAIL,
          TelExtension,
          UNITNO,
          JOBName,
          OFFJOBDATE,
          CreatedTime,
          UpdatedTime
        FROM Employee
        WHERE TMNAME LIKE @TMNAME
        ORDER BY CreatedTime DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching employees by TMNAME:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get employee by key no
router.get('/employees/keyno/:keyno', async (req, res) => {
  try {
    const pool = await connectWMSDB();
    const result = await pool.request()
      .input('KEYNO', req.params.keyno)
      .query(`
        SELECT TOP 1
          KEYNO,
          TMNAME,
          EMAIL,
          TelExtension,
          UNITNO,
          JOBName,
          OFFJOBDATE,
          CreatedTime,
          UpdatedTime
        FROM Employee
        WHERE KEYNO = @KEYNO
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching employee by KEYNO:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
