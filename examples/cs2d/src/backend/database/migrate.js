/**
 * Database Migration Script for CS2D Enhanced Backend
 * Creates database schema and initial data
 */

const { DatabaseManager } = require('./DatabaseManager');
require('dotenv').config();

async function runMigrations() {
  const dbManager = new DatabaseManager();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Initialize database connection
    await dbManager.initialize();
    
    console.log('✅ Database migrations completed successfully');
    
    // Optional: Create admin user if specified in environment
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_EMAIL) {
      await createAdminUser(dbManager);
    }
    
    await dbManager.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await dbManager.close();
    process.exit(1);
  }
}

async function createAdminUser(dbManager) {
  try {
    const { AuthService } = require('../services/AuthService');
    const Redis = require('ioredis');
    
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    const authService = new AuthService(redis, dbManager);
    
    // Check if admin already exists
    const existingAdmin = await dbManager.getUserByUsername(process.env.ADMIN_USERNAME);
    if (existingAdmin) {
      console.log('📝 Admin user already exists');
      redis.disconnect();
      return;
    }
    
    // Create admin user
    const adminData = {
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      displayName: 'Administrator'
    };
    
    const adminUser = await authService.registerUser(adminData);
    
    // Set admin privileges
    await dbManager.query(
      'UPDATE users SET is_verified = TRUE, is_admin = TRUE WHERE id = $1',
      [adminUser.id]
    );
    
    console.log('✅ Admin user created successfully');
    redis.disconnect();
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
}

// Add admin column to schema if not exists
async function addAdminColumn(dbManager) {
  try {
    await dbManager.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
    `);
  } catch (error) {
    // Column might already exist, ignore error
  }
}

// Add admin logs table
async function createAdminLogsTable(dbManager) {
  try {
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        target_id UUID,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
    `);
  } catch (error) {
    console.error('Failed to create admin logs table:', error);
  }
}

// Run additional migrations
async function runAdditionalMigrations(dbManager) {
  await addAdminColumn(dbManager);
  await createAdminLogsTable(dbManager);
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations, createAdminUser };