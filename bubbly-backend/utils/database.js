const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(dbConfig);

// Test database connection
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// Query helper function
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = { connectDB, query, pool };