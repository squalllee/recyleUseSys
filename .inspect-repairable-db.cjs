const path = require('path');
const projectRoot = __dirname;
require(path.join(projectRoot, 'api-server', 'node_modules', 'dotenv')).config({
  path: path.join(projectRoot, 'api-server', '.env'),
});
const sql = require(path.join(projectRoot, 'api-server', 'node_modules', 'mssql'));

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

sql.connect(config).then(async (pool) => {
  const tables = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME IN ('EquipmentMaintenanceRecords', 'Locations', 'RepairablePartLocations')
    ORDER BY TABLE_NAME
  `);
  const columns = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'EquipmentMaintenanceRecords'
    ORDER BY ORDINAL_POSITION
  `);
  console.log(JSON.stringify({ tables: tables.recordset, columns: columns.recordset }));
  await pool.close();
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
