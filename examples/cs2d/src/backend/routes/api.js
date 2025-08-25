/**
 * Main API Routes for CS2D Enhanced Backend
 * General API endpoints for game functionality
 */

const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  message: { error: 'Too many API requests' }
});

module.exports = (authService, dbManager, matchmakingService, antiCheatService, socketManager) => {
  
  router.use(apiLimiter);

  // Player Statistics
  router.get('/stats/:userId', [
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
      
      // Get player stats
      const statsResult = await dbManager.query(`
        SELECT 
          ps.*,
          u.username, u.display_name, u.avatar_url, u.country_code,
          CASE WHEN ps.deaths > 0 THEN ROUND(ps.kills::NUMERIC / ps.deaths, 2) ELSE ps.kills END as kd_ratio,
          CASE WHEN ps.shots_fired > 0 THEN ROUND((ps.shots_hit::NUMERIC / ps.shots_fired) * 100, 1) ELSE 0 END as accuracy,
          CASE WHEN ps.matches_played > 0 THEN ROUND((ps.matches_won::NUMERIC / ps.matches_played) * 100, 1) ELSE 0 END as win_rate
        FROM player_stats ps
        JOIN users u ON ps.user_id = u.id
        WHERE ps.user_id = $1
      `, [userId]);

      if (statsResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Player not found'
        });
      }

      const stats = statsResult.rows[0];

      // Get recent matches
      const recentMatchesResult = await dbManager.query(`
        SELECT 
          m.id, m.map_name, m.game_mode, m.started_at, m.ended_at,
          m.winner_team, m.ct_score, m.t_score,
          mp.team, mp.kills, mp.deaths, mp.assists, mp.mvp_rounds
        FROM matches m
        JOIN match_players mp ON m.id = mp.match_id
        WHERE mp.user_id = $1 AND m.status = 'finished'
        ORDER BY m.started_at DESC
        LIMIT 10
      `, [userId]);

      res.json({
        success: true,
        data: {
          stats,
          recentMatches: recentMatchesResult.rows
        }
      });

    } catch (error) {
      console.error('Stats fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch player statistics'
      });
    }
  });

  // Leaderboards
  router.get('/leaderboard', [
    query('type').optional().isIn(['elo', 'kills', 'wins', 'kd']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 })
  ], async (req, res) => {
    try {
      const {
        type = 'elo',
        limit = 50,
        page = 1
      } = req.query;

      const offset = (page - 1) * limit;
      
      let orderBy;
      switch (type) {
        case 'kills':
          orderBy = 'ps.kills DESC';
          break;
        case 'wins':
          orderBy = 'ps.matches_won DESC';
          break;
        case 'kd':
          orderBy = 'CASE WHEN ps.deaths > 0 THEN ps.kills::NUMERIC / ps.deaths ELSE ps.kills END DESC';
          break;
        default:
          orderBy = 'ps.elo_rating DESC';
      }

      const result = await dbManager.query(`
        SELECT 
          u.id, u.username, u.display_name, u.avatar_url, u.country_code,
          ps.elo_rating, ps.rank_tier, ps.kills, ps.deaths, ps.matches_played, ps.matches_won,
          CASE WHEN ps.deaths > 0 THEN ROUND(ps.kills::NUMERIC / ps.deaths, 2) ELSE ps.kills END as kd_ratio
        FROM player_stats ps
        JOIN users u ON ps.user_id = u.id
        WHERE u.is_banned = FALSE AND ps.matches_played >= 10
        ORDER BY ${orderBy}
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      // Add ranking numbers
      const leaderboard = result.rows.map((player, index) => ({
        ...player,
        rank: offset + index + 1
      }));

      res.json({
        success: true,
        data: {
          leaderboard,
          type,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({
        error: 'Failed to fetch leaderboard'
      });
    }
  });

  // Match History
  router.get('/matches/history', [
    query('userId').optional().isUUID(),
    query('gameMode').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('page').optional().isInt({ min: 1 })
  ], authService.requireAuth, async (req, res) => {
    try {
      const {
        userId = req.user.id,
        gameMode,
        limit = 20,
        page = 1
      } = req.query;

      // Only allow users to see their own history unless admin
      if (userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE mp.user_id = $1';
      let params = [userId];
      let paramIndex = 2;

      if (gameMode) {
        whereClause += ` AND m.game_mode = $${paramIndex}`;
        params.push(gameMode);
        paramIndex++;
      }

      const result = await dbManager.query(`
        SELECT 
          m.id, m.map_name, m.game_mode, m.started_at, m.ended_at,
          m.winner_team, m.ct_score, m.t_score, m.duration_seconds,
          mp.team, mp.kills, mp.deaths, mp.assists, mp.mvp_rounds, mp.score,
          (mp.team = m.winner_team) as won
        FROM matches m
        JOIN match_players mp ON m.id = mp.match_id
        ${whereClause}
        ORDER BY m.started_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      res.json({
        success: true,
        data: {
          matches: result.rows,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Match history error:', error);
      res.status(500).json({
        error: 'Failed to fetch match history'
      });
    }
  });

  // Match Details
  router.get('/matches/:matchId', [
    param('matchId').isUUID()
  ], async (req, res) => {
    try {
      const matchId = req.params.matchId;
      
      // Get match details
      const matchResult = await dbManager.query(`
        SELECT 
          m.*, gs.name as server_name, gs.region as server_region
        FROM matches m
        LEFT JOIN game_servers gs ON m.server_id = gs.id
        WHERE m.id = $1
      `, [matchId]);

      if (matchResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Match not found'
        });
      }

      const match = matchResult.rows[0];

      // Get players
      const playersResult = await dbManager.query(`
        SELECT 
          mp.*, u.username, u.display_name, u.avatar_url
        FROM match_players mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.match_id = $1
        ORDER BY mp.team, mp.score DESC
      `, [matchId]);

      // Get round statistics if available
      const roundsResult = await dbManager.query(`
        SELECT 
          round_number, team as winner_team,
          COUNT(*) as players_count
        FROM round_stats
        WHERE match_id = $1
        GROUP BY round_number, team
        ORDER BY round_number
      `, [matchId]);

      res.json({
        success: true,
        data: {
          match,
          players: playersResult.rows,
          rounds: roundsResult.rows
        }
      });

    } catch (error) {
      console.error('Match details error:', error);
      res.status(500).json({
        error: 'Failed to fetch match details'
      });
    }
  });

  // Friends System
  router.get('/friends', authService.requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await dbManager.query(`
        SELECT 
          f.id, f.status, f.created_at,
          CASE 
            WHEN f.user_id = $1 THEN u2.id
            ELSE u1.id
          END as friend_id,
          CASE 
            WHEN f.user_id = $1 THEN u2.username
            ELSE u1.username
          END as friend_username,
          CASE 
            WHEN f.user_id = $1 THEN u2.display_name
            ELSE u1.display_name
          END as friend_display_name,
          CASE 
            WHEN f.user_id = $1 THEN u2.avatar_url
            ELSE u1.avatar_url
          END as friend_avatar_url,
          CASE 
            WHEN f.user_id = $1 THEN u2.last_activity_at
            ELSE u1.last_activity_at
          END as friend_last_activity
        FROM friends f
        JOIN users u1 ON f.user_id = u1.id
        JOIN users u2 ON f.friend_id = u2.id
        WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
        ORDER BY friend_username
      `, [userId]);

      res.json({
        success: true,
        data: {
          friends: result.rows
        }
      });

    } catch (error) {
      console.error('Friends list error:', error);
      res.status(500).json({
        error: 'Failed to fetch friends list'
      });
    }
  });

  router.post('/friends/invite', [
    body('username').isString().isLength({ min: 1, max: 50 })
  ], authService.requireAuth, async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid username'
        });
      }

      const userId = req.user.id;
      const { username } = req.body;

      // Find target user
      const targetUser = await dbManager.getUserByUsername(username);
      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (targetUser.id === userId) {
        return res.status(400).json({
          error: 'Cannot add yourself as friend'
        });
      }

      // Check if friendship already exists
      const existingFriendship = await dbManager.query(`
        SELECT id, status FROM friends 
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      `, [userId, targetUser.id]);

      if (existingFriendship.rows.length > 0) {
        return res.status(400).json({
          error: 'Friend request already exists or user is already a friend'
        });
      }

      // Create friend request
      await dbManager.query(`
        INSERT INTO friends (user_id, friend_id, status)
        VALUES ($1, $2, 'pending')
      `, [userId, targetUser.id]);

      // Notify target user if online
      socketManager?.sendToUser(targetUser.id, 'friend:request_received', {
        from: {
          id: userId,
          username: req.user.username,
          displayName: req.user.display_name,
          avatarUrl: req.user.avatar_url
        }
      });

      res.json({
        success: true,
        message: 'Friend request sent'
      });

    } catch (error) {
      console.error('Friend invite error:', error);
      res.status(500).json({
        error: 'Failed to send friend request'
      });
    }
  });

  // Reports System
  router.post('/reports', [
    body('reportedUserId').isUUID(),
    body('type').isIn(['aimbot', 'wallhack', 'speedhack', 'griefing', 'toxic_behavior', 'other']),
    body('description').isString().isLength({ min: 10, max: 500 }),
    body('matchId').optional().isUUID()
  ], authService.requireAuth, async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const reporterId = req.user.id;
      const { reportedUserId, type, description, matchId } = req.body;

      if (reporterId === reportedUserId) {
        return res.status(400).json({
          error: 'Cannot report yourself'
        });
      }

      // Check if user already reported this player recently
      const recentReport = await dbManager.query(`
        SELECT id FROM cheat_reports 
        WHERE reporter_id = $1 AND reported_id = $2 
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `, [reporterId, reportedUserId]);

      if (recentReport.rows.length > 0) {
        return res.status(400).json({
          error: 'You have already reported this player in the last 24 hours'
        });
      }

      // Create report
      await dbManager.query(`
        INSERT INTO cheat_reports (reporter_id, reported_id, match_id, report_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [reporterId, reportedUserId, matchId, type, description]);

      // Decrease trust factor for reported player
      await antiCheatService.updateTrustFactor(reportedUserId, -0.01);

      res.json({
        success: true,
        message: 'Report submitted successfully'
      });

    } catch (error) {
      console.error('Report error:', error);
      res.status(500).json({
        error: 'Failed to submit report'
      });
    }
  });

  // Achievements
  router.get('/achievements/:userId', [
    param('userId').isUUID()
  ], async (req, res) => {
    try {
      const userId = req.params.userId;

      const result = await dbManager.query(`
        SELECT 
          a.id, a.name, a.description, a.icon_url, a.points,
          ua.progress, ua.max_progress, ua.is_completed, ua.completed_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
        WHERE a.is_hidden = FALSE OR ua.is_completed = TRUE
        ORDER BY ua.is_completed DESC, a.points DESC
      `, [userId]);

      const achievements = result.rows.map(row => ({
        ...row,
        progress: row.progress || 0,
        max_progress: row.max_progress || 1,
        unlocked: row.is_completed || false
      }));

      res.json({
        success: true,
        data: {
          achievements,
          totalPoints: achievements
            .filter(a => a.unlocked)
            .reduce((sum, a) => sum + a.points, 0)
        }
      });

    } catch (error) {
      console.error('Achievements error:', error);
      res.status(500).json({
        error: 'Failed to fetch achievements'
      });
    }
  });

  // Server Browser
  router.get('/servers/browse', [
    query('region').optional().isString(),
    query('gameMode').optional().isString(),
    query('map').optional().isString(),
    query('notFull').optional().isBoolean(),
    query('hasPlayers').optional().isBoolean()
  ], async (req, res) => {
    try {
      const { region, gameMode, map, notFull, hasPlayers } = req.query;
      
      let whereClause = "WHERE gs.status = 'online'";
      let params = [];
      let paramIndex = 1;

      if (region) {
        whereClause += ` AND gs.region = $${paramIndex}`;
        params.push(region);
        paramIndex++;
      }

      if (gameMode) {
        whereClause += ` AND gs.game_mode = $${paramIndex}`;
        params.push(gameMode);
        paramIndex++;
      }

      if (map) {
        whereClause += ` AND gs.map_name = $${paramIndex}`;
        params.push(map);
        paramIndex++;
      }

      if (notFull) {
        whereClause += ` AND gs.current_players < gs.max_players`;
      }

      if (hasPlayers) {
        whereClause += ` AND gs.current_players > 0`;
      }

      const result = await dbManager.query(`
        SELECT 
          gs.id, gs.name, gs.region, gs.ip_address, gs.port,
          gs.current_players, gs.max_players, gs.map_name, gs.game_mode,
          gs.last_heartbeat,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - gs.last_heartbeat)) as ping
        FROM game_servers gs
        ${whereClause}
        ORDER BY gs.current_players DESC, gs.name
      `, params);

      res.json({
        success: true,
        data: {
          servers: result.rows
        }
      });

    } catch (error) {
      console.error('Server browser error:', error);
      res.status(500).json({
        error: 'Failed to fetch servers'
      });
    }
  });

  // System Status
  router.get('/status', async (req, res) => {
    try {
      const status = {
        server: {
          status: 'online',
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0'
        },
        services: {
          database: (await dbManager.getHealthStatus()).connected,
          matchmaking: !!matchmakingService,
          anticheat: !!antiCheatService
        },
        stats: {
          activeConnections: socketManager?.getConnectionStats().totalConnections || 0,
          queuedPlayers: Object.values(await matchmakingService?.getQueueStatus() || {})
            .reduce((sum, regions) => sum + Object.values(regions).reduce((s, c) => s + c, 0), 0)
        }
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Status error:', error);
      res.status(200).json({
        success: false,
        data: {
          server: { status: 'degraded' },
          error: 'Some services unavailable'
        }
      });
    }
  });

  return router;
};

module.exports.router = router;