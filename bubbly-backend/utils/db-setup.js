const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'password';
const dbName = process.env.DB_NAME || 'bubbly';

async function runSetup() {
  console.log('🔄 Initializing database setup...');
  
  // 1. Connect to default 'postgres' database to ensure the target DB exists
  const tempClientConfig = {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  };

  if (process.env.DB_SSL === 'true') {
    tempClientConfig.ssl = { rejectUnauthorized: false };
  }

  const tempClient = new Client(tempClientConfig);

  try {
    await tempClient.connect();
    console.log('Connected to default "postgres" database.');
    
    // Check if target database exists
    const checkDbResult = await tempClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDbResult.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      // CREATE DATABASE cannot run inside a transaction block
      await tempClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully!`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error('Info/Error checking/creating database:', error.message);
    console.log('Attempting to apply schema directly to database, assuming it already exists or default database is inaccessible...');
  } finally {
    try {
      await tempClient.end();
    } catch (e) {}
  }

  // 2. Connect to the actual target database to run the schema
  const targetClientConfig = {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  };

  if (process.env.DB_SSL === 'true') {
    targetClientConfig.ssl = { rejectUnauthorized: false };
  }

  const targetClient = new Client(targetClientConfig);

  try {
    await targetClient.connect();
    console.log(`Connected to database "${dbName}".`);

    // Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing schema.sql...');
    
    // Run the SQL script
    await targetClient.query(schemaSql);
    console.log('✅ Database schema applied and interests seeded successfully!');

  } catch (error) {
    console.error('❌ Failed to set up database:', error);
    process.exit(1);
  } finally {
    try {
      await targetClient.end();
    } catch (e) {}
  }
}

runSetup();
