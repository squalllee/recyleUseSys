require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mssql = require('mssql');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
let pool;
let employeePool;

function createSqlConfig(configOverrides = {}) {
  return {
    user: configOverrides.user || process.env.DB_USER || 'sa',
    password: configOverrides.password || process.env.DB_PASSWORD || '',
    server: configOverrides.server || process.env.DB_SERVER || 'localhost',
    database: configOverrides.database || process.env.DB_DATABASE || 'CaptialPlain',
    options: {
      encrypt: (configOverrides.encrypt ?? process.env.DB_ENCRYPT) === 'true',
      trustServerCertificate: (configOverrides.trustServerCertificate ?? process.env.DB_TRUST_SERVER_CERTIFICATE) === 'true',
    },
  };
}

async function connectDB() {
  if (pool) {
    try {
      await pool.request().query('SELECT 1');
      return pool;
    } catch (error) {
      console.warn('Existing SQL pool is unavailable, reconnecting...', error.message);
      try {
        await pool.close();
      } catch (closeError) {
        console.warn('Failed to close stale pool:', closeError.message);
      }
      pool = null;
    }
  }

  const config = createSqlConfig();
  const newPool = new mssql.ConnectionPool(config);
  newPool.on('error', (err) => {
    console.error('SQL pool error:', err);
    if (pool === newPool) {
      pool = null;
    }
  });

  try {
    await newPool.connect();
    pool = newPool;
    console.log('Connected to SQL Server');
    return pool;
  } catch (error) {
    console.error('Failed to connect to SQL Server:', error);
    pool = null;
    throw error;
  }
}

async function connectWMSDB() {
  if (employeePool) {
    try {
      await employeePool.request().query('SELECT 1');
      return employeePool;
    } catch (error) {
      console.warn('Existing employee SQL pool is unavailable, reconnecting...', error.message);
      try {
        await employeePool.close();
      } catch (closeError) {
        console.warn('Failed to close stale employee pool:', closeError.message);
      }
      employeePool = null;
    }
  }

  const config = createSqlConfig({
    user: process.env.WMS_DB_USER || process.env.DB_USER || 'sa',
    password: process.env.WMS_DB_PASSWORD || process.env.DB_PASSWORD || '',
    server: process.env.WMS_DB_SERVER || process.env.DB_SERVER || 'localhost',
    database: process.env.WMS_DB_DATABASE || process.env.DB_DATABASE || 'CaptialPlain',
    encrypt: process.env.WMS_DB_ENCRYPT || process.env.DB_ENCRYPT,
    trustServerCertificate: process.env.WMS_DB_TRUST_SERVER_CERTIFICATE || process.env.DB_TRUST_SERVER_CERTIFICATE,
  });

  const newPool = new mssql.ConnectionPool(config);
  newPool.on('error', (err) => {
    console.error('Employee SQL pool error:', err);
    if (employeePool === newPool) {
      employeePool = null;
    }
  });

  try {
    await newPool.connect();
    employeePool = newPool;
    console.log('Connected to Employee SQL Server');
    return employeePool;
  } catch (error) {
    console.error('Failed to connect to Employee SQL Server:', error);
    employeePool = null;
    throw error;
  }
}

// Export connectDB function for use in route files
exports.connectDB = connectDB;
exports.connectWMSDB = connectWMSDB;

// API Routes
const apiRouter = require('./routes/api');
const employeeRouter = require('./routes/employee');
const materialRouter = require('./routes/materials');
app.use('/api', apiRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/materials', materialRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

