/**
 * Database Manager for CS2D Enhanced Backend
 * Handles PostgreSQL connections, migrations, and database operations
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'cs2d_enhanced',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  async initialize() {
    try {
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Database connection established');
      
      // Run migrations if needed
      await this.runMigrations();
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      
      // Check if tables exist
      const tablesExist = await this.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      
      if (tablesExist.rows.length === 0) {
        console.log('🔄 Running database migrations...');
        await this.query(schemaContent);
        console.log('✅ Database schema created');
        
        // Run seed data
        await this.seedInitialData();
      } else {
        console.log('✅ Database schema already exists');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async seedInitialData() {
    try {
      // Insert default achievements
      await this.query(`
        INSERT INTO achievements (id, name, description, points) VALUES
        ('first_kill', 'First Blood', 'Get your first kill', 10),
        ('headshot_master', 'Headshot Master', 'Get 100 headshots', 50),
        ('ace_round', 'Ace!', 'Kill all 5 enemies in a single round', 100),
        ('clutch_master', 'Clutch Master', 'Win a 1v4 or better clutch', 150),
        ('bomb_expert', 'Bomb Expert', 'Plant 50 bombs', 75),
        ('defuse_expert', 'Defuse Expert', 'Defuse 25 bombs', 75),
        ('team_player', 'Team Player', 'Get 500 assists', 50),
        ('survivor', 'Survivor', 'Win 10 rounds without dying', 100),
        ('marksman', '90% Club', 'Achieve 90% accuracy in a match', 200),
        ('veteran', 'Veteran', 'Play 1000 matches', 500)
        ON CONFLICT (id) DO NOTHING
      `);
      
      console.log('✅ Initial achievements seeded');
    } catch (error) {
      console.error('❌ Seed data failed:', error);
      throw error;
    }
  }

  async query(text, params) {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.LOG_SQL === 'true') {
        console.log('SQL Query executed:', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: duration + 'ms',
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      console.error('SQL Error:', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // User operations
  async createUser(userData) {
    const {
      username,
      email,
      passwordHash,
      steamId,
      displayName,
      avatarUrl,
      countryCode,
      hardwareId
    } = userData;

    const result = await this.query(`
      INSERT INTO users (username, email, password_hash, steam_id, display_name, avatar_url, country_code, hardware_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, steam_id, display_name, avatar_url, created_at
    `, [username, email, passwordHash, steamId, displayName, avatarUrl, countryCode, hardwareId]);

    if (result.rows.length > 0) {
      // Initialize player stats
      await this.query(`
        INSERT INTO player_stats (user_id) VALUES ($1)
      `, [result.rows[0].id]);
    }

    return result.rows[0];
  }

  async getUserByUsername(username) {
    const result = await this.query(`
      SELECT u.*, ps.* FROM users u
      LEFT JOIN player_stats ps ON u.id = ps.user_id
      WHERE u.username = $1
    `, [username]);
    return result.rows[0];
  }

  async getUserById(userId) {
    const result = await this.query(`
      SELECT u.*, ps.* FROM users u
      LEFT JOIN player_stats ps ON u.id = ps.user_id
      WHERE u.id = $1
    `, [userId]);
    return result.rows[0];
  }

  async getUserBySteamId(steamId) {
    const result = await this.query(`
      SELECT u.*, ps.* FROM users u
      LEFT JOIN player_stats ps ON u.id = ps.user_id
      WHERE u.steam_id = $1
    `, [steamId]);
    return result.rows[0];
  }

  async updateUserStats(userId, stats) {
    const {
      kills = 0,
      deaths = 0,
      assists = 0,
      headshots = 0,
      damageDealt = 0,
      roundsWon = 0,
      matchWon = false
    } = stats;

    await this.query(`
      UPDATE player_stats SET
        kills = kills + $2,
        deaths = deaths + $3,
        assists = assists + $4,
        headshots = headshots + $5,
        damage_dealt = damage_dealt + $6,
        rounds_won = rounds_won + $7,
        matches_played = matches_played + 1,
        matches_won = matches_won + $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId, kills, deaths, assists, headshots, damageDealt, roundsWon, matchWon ? 1 : 0]);
  }

  // Match operations
  async createMatch(matchData) {
    const {
      mapName,
      gameMode,
      serverId,
      maxPlayers = 10
    } = matchData;

    const result = await this.query(`
      INSERT INTO matches (map_name, game_mode, server_id, max_players, started_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, map_name, game_mode, started_at
    `, [mapName, gameMode, serverId, maxPlayers]);

    return result.rows[0];
  }

  async addPlayerToMatch(matchId, userId, team) {
    await this.query(`
      INSERT INTO match_players (match_id, user_id, team)
      VALUES ($1, $2, $3)
      ON CONFLICT (match_id, user_id) DO UPDATE SET
        team = EXCLUDED.team,
        disconnected = FALSE
    `, [matchId, userId, team]);
  }

  async updateMatchResult(matchId, result) {
    const {
      winnerTeam,
      ctScore,
      tScore,
      durationSeconds,
      roundsPlayed
    } = result;

    await this.query(`
      UPDATE matches SET
        winner_team = $2,
        ct_score = $3,
        t_score = $4,
        duration_seconds = $5,
        rounds_played = $6,
        ended_at = CURRENT_TIMESTAMP,
        status = 'finished'
      WHERE id = $1
    `, [matchId, winnerTeam, ctScore, tScore, durationSeconds, roundsPlayed]);
  }

  // Anti-cheat operations
  async recordCheatViolation(userId, violationData) {
    const {
      matchId,
      violationType,
      confidenceScore,
      detectionData,
      autoAction = 'none'
    } = violationData;

    await this.query(`
      INSERT INTO cheat_violations (user_id, match_id, violation_type, confidence_score, detection_data, auto_action)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, matchId, violationType, confidenceScore, JSON.stringify(detectionData), autoAction]);

    // Auto-ban for high confidence violations
    if (confidenceScore >= 0.95) {
      await this.banUser(userId, `Automated detection: ${violationType}`, '7 days');
    }
  }

  async banUser(userId, reason, duration = null) {
    const banExpires = duration ? 
      `CURRENT_TIMESTAMP + INTERVAL '${duration}'` : 
      null;

    await this.query(`
      UPDATE users SET
        is_banned = TRUE,
        ban_reason = $2,
        ban_expires_at = ${banExpires ? '$3' : 'NULL'}
      WHERE id = $1
    `, banExpires ? [userId, reason, banExpires] : [userId, reason]);
  }

  // Cleanup old data
  async cleanupOldData() {
    try {
      // Remove expired sessions
      await this.query(`
        DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP
      `);

      // Remove old replays
      await this.query(`
        DELETE FROM match_replays WHERE expires_at < CURRENT_TIMESTAMP
      `);

      // Remove old unverified users
      await this.query(`
        DELETE FROM users WHERE 
          is_verified = FALSE AND 
          created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
      `);

      console.log('✅ Database cleanup completed');
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
    }
  }

  async getHealthStatus() {
    try {
      const result = await this.query('SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE state = $1', ['active']);
      return {
        connected: true,
        activeConnections: parseInt(result.rows[0].active_connections),
        poolSize: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database pool closed');
    }
  }
}

module.exports = { DatabaseManager };