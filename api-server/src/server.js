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

async function connectDB() {
  if (!pool) {
    const config = {
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '',
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'CaptialPlain',
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true,
      },
    };

    pool = new mssql.ConnectionPool(config);
    await pool.connect();
    console.log('Connected to SQL Server');
  }
  return pool;
}

// API Routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

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
