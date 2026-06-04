const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '13122004',
});

async function main() {
  await client.connect();
  
  // List all users
  const usersRes = await client.query('SELECT * FROM users');
  console.log('--- Users in Database ---');
  console.log(usersRes.rows);
  
  // List all bubbles
  const bubblesRes = await client.query('SELECT * FROM bubbles');
  console.log('--- Bubbles in Database ---');
  console.log(bubblesRes.rows);
  
  await client.end();
}

main().catch(console.error);
