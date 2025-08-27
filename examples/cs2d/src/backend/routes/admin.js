/**
 * Admin Routes for CS2D Enhanced Backend
 * Server administration, monitoring, and management tools
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Admin rate limiter (more permissive for admins)
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute for admins
  message: { error: 'Too many admin requests' }
});

module.exports = (authService, dbManager, socketManager, antiCheatService, matchmakingService) => {
  
  // Apply admin authentication to all routes
  router.use(authService.requireAdmin);
  router.use(adminLimiter);

  // Dashboard Overview
  router.get('/dashboard', async (req, res) => {
    try {
      // Get system metrics
      const systemStats = await getSystemStats(dbManager, socketManager, antiCheatService, matchmakingService);
      
      res.json({
        success: true,
        data: systemStats
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard data'
      });
    }
  });

  // User Management
  router.get('/users', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('sort').optional().isIn(['username', 'created_at', 'last_login_at', 'elo_rating']),
    query('order').optional().isIn(['asc', 'desc']),
    query('banned').optional().isBoolean()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        page = 1,
        limit = 50,
        search = '',
        sort = 'created_at',
        order = 'desc',
        banned
      } = req.query;

      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` WHERE (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (banned !== undefined) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` u.is_banned = $${paramIndex}`;
        params.push(banned);
        paramIndex++;
      }

      const query = `
        SELECT 
          u.id, u.username, u.email, u.display_name, u.avatar_url,
          u.is_verified, u.is_banned, u.ban_reason, u.ban_expires_at,
          u.trust_factor, u.created_at, u.last_login_at, u.last_activity_at,
          ps.elo_rating, ps.kills, ps.deaths, ps.matches_played, ps.matches_won
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        ${whereClause}
        ORDER BY u.${sort} ${order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await dbManager.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `;
      const countResult = await dbManager.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          users: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('User list error:', error);
      res.status(500).json({
        error: 'Failed to fetch users'
      });
    }
  });

  // Get user details
  router.get('/users/:userId', [
    param('userId').isUUID()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid user ID'
        });
      }

      const userId = req.params.userId;

      // Get user details
      const userResult = await dbManager.query(`
        SELECT 
          u.*, ps.*,
          COUNT(cv.id) as violation_count,
          COUNT(cr.id) as report_count
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        LEFT JOIN cheat_violations cv ON u.id = cv.user_id
        LEFT JOIN cheat_reports cr ON u.id = cr.reported_id
        WHERE u.id = $1
        GROUP BY u.id, ps.user_id
      `, [userId]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Get recent matches
      const matchesResult = await dbManager.query(`
        SELECT 
          m.id, m.map_name, m.game_mode, m.started_at, m.ended_at,
          m.winner_team, mp.team, mp.kills, mp.deaths, mp.assists
        FROM matches m
        JOIN match_players mp ON m.id = mp.match_id
        WHERE mp.user_id = $1
        ORDER BY m.started_at DESC
        LIMIT 10
      `, [userId]);

      // Get recent violations
      const violationsResult = await dbManager.query(`
        SELECT violation_type, confidence_score, created_at, reviewed
        FROM cheat_violations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);

      // Get active sessions
      const sessionsResult = await dbManager.query(`
        SELECT id, device_info, ip_address, created_at, last_used_at, is_active
        FROM user_sessions
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY last_used_at DESC
      `, [userId]);

      res.json({
        success: true,
        data: {
          user,
          recentMatches: matchesResult.rows,
          recentViolations: violationsResult.rows,
          activeSessions: sessionsResult.rows,
          antiCheatStats: antiCheatService.getPlayerStats(userId)
        }
      });

    } catch (error) {
      console.error('User details error:', error);
      res.status(500).json({
        error: 'Failed to fetch user details'
      });
    }
  });

  // Ban/unban user
  router.post('/users/:userId/ban', [
    param('userId').isUUID(),
    body('reason').isString().isLength({ min: 1, max: 500 }),
    body('duration').optional().isString(),
    body('permanent').optional().isBoolean()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.params.userId;
      const { reason, duration, permanent = false } = req.body;
      const adminId = req.user.id;

      await dbManager.banUser(userId, reason, permanent ? null : duration);

      // Log admin action
      await logAdminAction(dbManager, {
        adminId,
        action: 'ban_user',
        targetId: userId,
        details: { reason, duration, permanent }
      });

      // Disconnect user if online
      const socketManager = req.app.locals.socketManager;
      if (socketManager) {
        socketManager.sendToUser(userId, 'account:banned', {
          reason,
          duration,
          permanent
        });
      }

      res.json({
        success: true,
        message: 'User banned successfully'
      });

    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({
        error: 'Failed to ban user'
      });
    }
  });

  router.delete('/users/:userId/ban', [
    param('userId').isUUID(),
    body('reason').optional().isString()
  ], async (req, res) => {
    try {
      const userId = req.params.userId;
      const reason = req.body.reason || 'Ban lifted by admin';
      const adminId = req.user.id;

      await dbManager.query(
        'UPDATE users SET is_banned = FALSE, ban_reason = NULL, ban_expires_at = NULL WHERE id = $1',
        [userId]
      );

      await logAdminAction(dbManager, {
        adminId,
        action: 'unban_user',
        targetId: userId,
        details: { reason }
      });

      res.json({
        success: true,
        message: 'User unbanned successfully'
      });

    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({
        error: 'Failed to unban user'
      });
    }
  });

  // Server Management
  router.get('/servers', async (req, res) => {
    try {
      const result = await dbManager.query(`
        SELECT 
          id, name, region, ip_address, port, max_players, 
          current_players, map_name, game_mode, status, 
          last_heartbeat, created_at
        FROM game_servers
        ORDER BY region, name
      `);

      const servers = result.rows.map(server => ({
        ...server,
        online: server.last_heartbeat && 
                Date.now() - new Date(server.last_heartbeat).getTime() < 60000
      }));

      res.json({
        success: true,
        data: { servers }
      });

    } catch (error) {
      console.error('Server list error:', error);
      res.status(500).json({
        error: 'Failed to fetch servers'
      });
    }
  });

  // Match Management
  router.get('/matches', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['waiting', 'starting', 'live', 'finished', 'cancelled']),
    query('gameMode').optional().isString()
  ], async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        gameMode
      } = req.query;

      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      let paramIndex = 1;

      if (status) {
        whereClause = ' WHERE status = $1';
        params.push(status);
        paramIndex++;
      }

      if (gameMode) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` game_mode = $${paramIndex}`;
        params.push(gameMode);
        paramIndex++;
      }

      const query = `
        SELECT 
          m.id, m.map_name, m.game_mode, m.server_id, m.max_players,
          m.duration_seconds, m.ct_score, m.t_score, m.winner_team,
          m.started_at, m.ended_at, m.status,
          COUNT(mp.id) as player_count
        FROM matches m
        LEFT JOIN match_players mp ON m.id = mp.match_id
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.started_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await dbManager.query(query, params);

      res.json({
        success: true,
        data: { matches: result.rows }
      });

    } catch (error) {
      console.error('Match list error:', error);
      res.status(500).json({
        error: 'Failed to fetch matches'
      });
    }
  });

  // Anti-cheat Management
  router.get('/anticheat/violations', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('reviewed').optional().isBoolean(),
    query('confidence').optional().isFloat({ min: 0, max: 1 })
  ], async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        reviewed,
        confidence
      } = req.query;

      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      let paramIndex = 1;

      if (reviewed !== undefined) {
        whereClause = ' WHERE cv.reviewed = $1';
        params.push(reviewed);
        paramIndex++;
      }

      if (confidence !== undefined) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` cv.confidence_score >= $${paramIndex}`;
        params.push(confidence);
        paramIndex++;
      }

      const query = `
        SELECT 
          cv.id, cv.violation_type, cv.confidence_score, cv.created_at,
          cv.auto_action, cv.reviewed,
          u.username, u.display_name, u.trust_factor,
          m.id as match_id, m.map_name, m.game_mode
        FROM cheat_violations cv
        JOIN users u ON cv.user_id = u.id
        LEFT JOIN matches m ON cv.match_id = m.id
        ${whereClause}
        ORDER BY cv.created_at DESC, cv.confidence_score DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await dbManager.query(query, params);

      res.json({
        success: true,
        data: { violations: result.rows }
      });

    } catch (error) {
      console.error('Violations list error:', error);
      res.status(500).json({
        error: 'Failed to fetch violations'
      });
    }
  });

  // Review violation
  router.patch('/anticheat/violations/:violationId', [
    param('violationId').isUUID(),
    body('action').isIn(['dismiss', 'confirm', 'escalate']),
    body('notes').optional().isString()
  ], async (req, res) => {
    try {
      const violationId = req.params.violationId;
      const { action, notes } = req.body;
      const adminId = req.user.id;

      await dbManager.query(
        'UPDATE cheat_violations SET reviewed = TRUE, reviewer_id = $1, admin_notes = $2 WHERE id = $3',
        [adminId, notes, violationId]
      );

      await logAdminAction(dbManager, {
        adminId,
        action: 'review_violation',
        targetId: violationId,
        details: { action, notes }
      });

      res.json({
        success: true,
        message: 'Violation reviewed successfully'
      });

    } catch (error) {
      console.error('Review violation error:', error);
      res.status(500).json({
        error: 'Failed to review violation'
      });
    }
  });

  // System Monitoring
  router.get('/system/metrics', async (req, res) => {
    try {
      const metrics = {
        connections: socketManager?.getConnectionStats() || {},
        anticheat: antiCheatService?.getOverallStats() || {},
        matchmaking: await matchmakingService?.getQueueStatus() || {},
        database: await dbManager?.getHealthStatus() || {},
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('System metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch system metrics'
      });
    }
  });

  // Admin Logs
  router.get('/logs/admin', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('action').optional().isString()
  ], async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        action
      } = req.query;

      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];

      if (action) {
        whereClause = ' WHERE al.action = $1';
        params.push(action);
      }

      params.push(limit, offset);
      const paramIndex = params.length - 1;

      const query = `
        SELECT 
          al.id, al.action, al.target_id, al.details, al.created_at,
          u.username as admin_username
        FROM admin_logs al
        JOIN users u ON al.admin_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await dbManager.query(query, params);

      res.json({
        success: true,
        data: { logs: result.rows }
      });

    } catch (error) {
      console.error('Admin logs error:', error);
      res.status(500).json({
        error: 'Failed to fetch admin logs'
      });
    }
  });

  // Configuration Management
  router.get('/config', async (req, res) => {
    try {
      // Return server configuration (sanitized)
      const config = {
        server: {
          tickRate: 64,
          maxPlayers: process.env.MAX_PLAYERS || 1000,
          region: process.env.SERVER_REGION || 'us-east'
        },
        game: {
          modes: ['classic', 'deathmatch', 'casual', 'competitive'],
          maps: ['de_dust2', 'de_inferno', 'de_mirage', 'de_cache']
        },
        features: {
          steamAuth: !!process.env.STEAM_API_KEY,
          voiceChat: true,
          antiCheat: true,
          matchmaking: true
        }
      };

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('Config fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch configuration'
      });
    }
  });

  return router;
};

// Helper functions
async function getSystemStats(dbManager, socketManager, antiCheatService, matchmakingService) {
  try {
    // Database stats
    const userCountResult = await dbManager.query('SELECT COUNT(*) as count FROM users');
    const matchCountResult = await dbManager.query('SELECT COUNT(*) as count FROM matches');
    const activeMatchesResult = await dbManager.query("SELECT COUNT(*) as count FROM matches WHERE status IN ('waiting', 'starting', 'live')");
    
    // Recent registrations (last 24h)
    const recentUsersResult = await dbManager.query(
      'SELECT COUNT(*) as count FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL \'24 hours\''
    );

    // Recent matches (last 24h)
    const recentMatchesResult = await dbManager.query(
      'SELECT COUNT(*) as count FROM matches WHERE started_at > CURRENT_TIMESTAMP - INTERVAL \'24 hours\''
    );

    return {
      users: {
        total: parseInt(userCountResult.rows[0].count),
        recent: parseInt(recentUsersResult.rows[0].count)
      },
      matches: {
        total: parseInt(matchCountResult.rows[0].count),
        active: parseInt(activeMatchesResult.rows[0].count),
        recent: parseInt(recentMatchesResult.rows[0].count)
      },
      connections: socketManager?.getConnectionStats() || {},
      anticheat: antiCheatService?.getOverallStats() || {},
      matchmaking: await matchmakingService?.getQueueStatus() || {},
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
}

async function logAdminAction(dbManager, actionData) {
  try {
    await dbManager.query(`
      INSERT INTO admin_logs (admin_id, action, target_id, details)
      VALUES ($1, $2, $3, $4)
    `, [
      actionData.adminId,
      actionData.action,
      actionData.targetId,
      JSON.stringify(actionData.details)
    ]);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

module.exports.router = router;