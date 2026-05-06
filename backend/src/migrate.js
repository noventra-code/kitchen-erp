const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const mainPool = new Pool({
  host: process.env.MAIN_DB_HOST || 'localhost',
  port: process.env.MAIN_DB_PORT || 5432,
  database: process.env.MAIN_DB_NAME || 'kitchen_erp_main',
  user: process.env.MAIN_DB_USER || 'erp_admin',
  password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
});

async function runMigrations() {
  try {
    // Get all tenant databases
    const tenants = await mainPool.query('SELECT db_name FROM tenants');
    
    const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const tenant of tenants.rows) {
      const dbName = tenant.db_name;
      console.log(`Running migrations for ${dbName}...`);

      const tenantPool = new Pool({
        host: process.env.MAIN_DB_HOST || 'localhost',
        port: process.env.MAIN_DB_PORT || 5432,
        database: dbName,
        user: process.env.MAIN_DB_USER || 'erp_admin',
        password: process.env.MAIN_DB_PASSWORD || 'erp_secure_password_123',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      for (const file of migrationFiles) {
        console.log(`  Applying ${file}...`);
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
        await tenantPool.query(sql);
      }

      await tenantPool.end();
      console.log(`  Done with ${dbName}`);
    }

    // Also run main DB migrations (for recipe_mappings)
    console.log('Running migrations for main database...');
    const mainDbMigration = migrationFiles.find(f => f.includes('003'));
    if (mainDbMigration) {
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', mainDbMigration), 'utf8');
      await mainPool.query(sql);
      console.log('  Done with main database');
    }

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
