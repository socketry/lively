/**
 * Authentication Routes for CS2D Enhanced Backend
 * Handles user registration, login, Steam OAuth, and password management
 */

const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiters
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many attempts, please try again later' }
});

const normalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' }
});

module.exports = (authService, dbManager) => {
  // Register new user
  router.post('/register', 
    normalLimiter,
    [
      body('username')
        .isLength({ min: 3, max: 20 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username must be 3-20 characters, letters, numbers, underscore, and dash only'),
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
      body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
      body('displayName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Display name max 50 characters'),
      body('countryCode')
        .optional()
        .isLength({ min: 2, max: 2 })
        .withMessage('Country code must be 2 characters')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const userData = {
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
          displayName: req.body.displayName,
          countryCode: req.body.countryCode,
          hardwareId: req.body.hardwareId || null
        };

        const user = await authService.registerUser(userData);
        
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user
        });

      } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
          error: error.message || 'Registration failed'
        });
      }
    }
  );

  // Login user
  router.post('/login',
    strictLimiter,
    [
      body('username').optional().isLength({ min: 1 }),
      body('email').optional().isEmail(),
      body('password').isLength({ min: 1 }).withMessage('Password required')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        if (!req.body.username && !req.body.email) {
          return res.status(400).json({
            error: 'Username or email required'
          });
        }

        const credentials = {
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
          hardwareId: req.body.hardwareId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        };

        const sessionData = await authService.loginUser(credentials);
        
        res.json({
          success: true,
          message: 'Login successful',
          ...sessionData
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
          error: error.message || 'Login failed'
        });
      }
    }
  );

  // Logout
  router.post('/logout',
    async (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          await authService.logout(token);
        }
        
        res.json({
          success: true,
          message: 'Logged out successfully'
        });

      } catch (error) {
        console.error('Logout error:', error);
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      }
    }
  );

  // Steam OAuth routes
  router.get('/steam',
    passport.authenticate('steam', { session: false })
  );

  router.get('/steam/return',
    passport.authenticate('steam', { session: false, failureRedirect: '/login?error=steam_failed' }),
    async (req, res) => {
      try {
        const sessionData = await authService.createSession(req.user, {
          provider: 'steam',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5174'}/login/success?token=${sessionData.token}`);

      } catch (error) {
        console.error('Steam OAuth error:', error);
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5174'}/login?error=steam_callback_failed`);
      }
    }
  );

  // Create guest account
  router.post('/guest',
    normalLimiter,
    async (req, res) => {
      try {
        const deviceInfo = {
          hardwareId: req.body.hardwareId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        };

        const sessionData = await authService.createGuestAccount(deviceInfo);
        
        res.json({
          success: true,
          message: 'Guest account created',
          ...sessionData,
          isGuest: true
        });

      } catch (error) {
        console.error('Guest account error:', error);
        res.status(500).json({
          error: error.message || 'Failed to create guest account'
        });
      }
    }
  );

  // Verify JWT token
  router.get('/verify',
    async (req, res) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const user = await authService.verifyToken(token);
        
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            isVerified: user.is_verified,
            trustFactor: user.trust_factor,
            stats: {
              eloRating: user.elo_rating,
              rankTier: user.rank_tier,
              kills: user.kills,
              deaths: user.deaths
            }
          }
        });

      } catch (error) {
        res.status(401).json({
          error: error.message || 'Invalid token'
        });
      }
    }
  );

  // Request password reset
  router.post('/forgot-password',
    strictLimiter,
    [
      body('email').isEmail().normalizeEmail().withMessage('Valid email required')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        await authService.requestPasswordReset(req.body.email);
        
        res.json({
          success: true,
          message: 'Password reset email sent'
        });

      } catch (error) {
        console.error('Password reset request error:', error);
        // Don't reveal if email exists
        res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
      }
    }
  );

  // Reset password with token
  router.post('/reset-password',
    strictLimiter,
    [
      body('token').isLength({ min: 1 }).withMessage('Reset token required'),
      body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        await authService.resetPassword(req.body.token, req.body.password);
        
        res.json({
          success: true,
          message: 'Password reset successful'
        });

      } catch (error) {
        console.error('Password reset error:', error);
        res.status(400).json({
          error: error.message || 'Password reset failed'
        });
      }
    }
  );

  // Verify email with token
  router.get('/verify-email/:token',
    async (req, res) => {
      try {
        await authService.verifyEmail(req.params.token);
        
        res.json({
          success: true,
          message: 'Email verified successfully'
        });

      } catch (error) {
        console.error('Email verification error:', error);
        res.status(400).json({
          error: error.message || 'Email verification failed'
        });
      }
    }
  );

  // Get user profile (protected route)
  router.get('/profile',
    authService.requireAuth,
    async (req, res) => {
      try {
        const user = req.user;
        
        // Get detailed stats
        const statsResult = await dbManager.query(`
          SELECT ps.*, 
                 CASE WHEN ps.deaths > 0 THEN ROUND(ps.kills::NUMERIC / ps.deaths, 2) ELSE ps.kills END as kd_ratio,
                 CASE WHEN ps.shots_fired > 0 THEN ROUND((ps.shots_hit::NUMERIC / ps.shots_fired) * 100, 1) ELSE 0 END as accuracy,
                 CASE WHEN ps.matches_played > 0 THEN ROUND((ps.matches_won::NUMERIC / ps.matches_played) * 100, 1) ELSE 0 END as win_rate
          FROM player_stats ps
          WHERE ps.user_id = $1
        `, [user.id]);

        const stats = statsResult.rows[0] || {};

        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            email: user.email,
            avatarUrl: user.avatar_url,
            countryCode: user.country_code,
            isVerified: user.is_verified,
            steamId: user.steam_id,
            trustFactor: user.trust_factor,
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at,
            stats
          }
        });

      } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
          error: 'Failed to fetch profile'
        });
      }
    }
  );

  // Update profile (protected route)
  router.patch('/profile',
    authService.requireAuth,
    [
      body('displayName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Display name must be 1-50 characters'),
      body('countryCode')
        .optional()
        .isLength({ min: 2, max: 2 })
        .withMessage('Country code must be 2 characters')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const updates = {};
        if (req.body.displayName) updates.display_name = req.body.displayName;
        if (req.body.countryCode) updates.country_code = req.body.countryCode;

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({
            error: 'No valid updates provided'
          });
        }

        const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [req.user.id, ...Object.values(updates)];

        await dbManager.query(
          `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          values
        );

        res.json({
          success: true,
          message: 'Profile updated successfully'
        });

      } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
          error: 'Failed to update profile'
        });
      }
    }
  );

  // Get user sessions (protected route)
  router.get('/sessions',
    authService.requireAuth,
    async (req, res) => {
      try {
        const sessions = await authService.getUserSessions(req.user.id);
        res.json({
          success: true,
          sessions
        });

      } catch (error) {
        console.error('Sessions fetch error:', error);
        res.status(500).json({
          error: 'Failed to fetch sessions'
        });
      }
    }
  );

  // Revoke session (protected route)
  router.delete('/sessions/:sessionId',
    authService.requireAuth,
    async (req, res) => {
      try {
        await authService.revokeSession(req.user.id, req.params.sessionId);
        
        res.json({
          success: true,
          message: 'Session revoked successfully'
        });

      } catch (error) {
        console.error('Session revoke error:', error);
        res.status(500).json({
          error: 'Failed to revoke session'
        });
      }
    }
  );

  return router;
};

module.exports.router = router;