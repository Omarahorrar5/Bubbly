const { spawn } = require('child_process');
const path = require('path');

if (process.env.DB_MIGRATE !== 'true') {
  console.log('DB_MIGRATE is not "true". Skipping database migration.');
  process.exit(0);
}

console.log('🔄 Starting database migration inside container...');
const dumpPath = path.join(__dirname, '..', 'local_dump.sql');

// Pass environment variables directly in options.env to avoid shell escaping issues
const env = {
  ...process.env,
  PGPASSWORD: process.env.DB_PASSWORD,
  PGSSLMODE: 'require' // Enforce SSL connection
};

const child = spawn('psql', [
  '-h', process.env.DB_HOST,
  '-U', process.env.DB_USER,
  '-d', process.env.DB_NAME,
  '-f', dumpPath
], { env });

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } else {
    console.error(`❌ Database migration failed with exit code ${code}`);
    process.exit(code);
  }
});
