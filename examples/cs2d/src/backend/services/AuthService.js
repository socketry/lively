/**
 * Authentication Service for CS2D Enhanced Backend
 * Handles JWT tokens, Steam OAuth, user registration, and session management
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  constructor(redis, dbManager) {
    this.redis = redis;
    this.db = dbManager;
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.steamApiKey = process.env.STEAM_API_KEY;
    this.clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    
    this.setupPassport();
    this.setupEmailTransporter();
  }

  setupPassport() {
    // Steam Strategy
    if (this.steamApiKey) {
      passport.use(new SteamStrategy({
        returnURL: `${process.env.SERVER_URL || 'http://localhost:3001'}/api/auth/steam/return`,
        realm: process.env.SERVER_URL || 'http://localhost:3001',
        apiKey: this.steamApiKey
      }, async (identifier, profile, done) => {
        try {
          const steamId = profile.id;
          const steamProfile = profile._json;
          
          // Check if user exists
          let user = await this.db.getUserBySteamId(steamId);
          
          if (!user) {
            // Create new user with Steam data
            const userData = {
              username: `steam_${steamId.substring(0, 8)}`,
              steamId: steamId,
              displayName: steamProfile.personaname || 'Steam User',
              avatarUrl: steamProfile.avatarfull,
              countryCode: steamProfile.loccountrycode || null,
              hardwareId: null // Will be set by client
            };
            
            user = await this.db.createUser(userData);
          }
          
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
    }

    // JWT Strategy
    passport.use(new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: this.jwtSecret,
      issuer: 'cs2d-enhanced',
      audience: 'cs2d-players'
    }, async (payload, done) => {
      try {
        const user = await this.db.getUserById(payload.userId);
        if (!user || user.is_banned) {
          return done(null, false);
        }
        
        // Check if session is still valid
        const sessionValid = await this.redis.exists(`session:${payload.sessionId}`);
        if (!sessionValid) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }));
  }

  setupEmailTransporter() {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  // User Registration
  async registerUser(userData) {
    const {
      username,
      email,
      password,
      displayName,
      countryCode = null,
      hardwareId = null
    } = userData;

    // Validation
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    if (username.length < 3 || username.length > 20) {
      throw new Error('Username must be between 3 and 20 characters');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if user exists
    const existingUser = await this.db.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already taken');
    }

    const existingEmail = await this.db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Check hardware ID ban
    if (hardwareId) {
      const hwBanned = await this.db.query(
        'SELECT id FROM users WHERE hardware_id = $1 AND is_banned = TRUE',
        [hardwareId]
      );
      if (hwBanned.rows.length > 0) {
        throw new Error('Hardware banned');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const newUser = await this.db.createUser({
      username,
      email,
      passwordHash,
      displayName: displayName || username,
      countryCode,
      hardwareId,
      verificationToken
    });

    // Send verification email
    if (this.emailTransporter) {
      await this.sendVerificationEmail(email, verificationToken);
    }

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      displayName: newUser.display_name,
      isVerified: newUser.is_verified
    };
  }

  // User Login
  async loginUser(credentials) {
    const { username, email, password, hardwareId } = credentials;
    
    if (!password) {
      throw new Error('Password is required');
    }

    // Find user by username or email
    let user;
    if (username) {
      user = await this.db.getUserByUsername(username);
    } else if (email) {
      const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows[0];
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if banned
    if (user.is_banned) {
      const banExpires = user.ban_expires_at ? new Date(user.ban_expires_at) : null;
      if (!banExpires || banExpires > new Date()) {
        throw new Error(`Account banned: ${user.ban_reason}`);
      } else {
        // Unban expired ban
        await this.db.query(
          'UPDATE users SET is_banned = FALSE, ban_reason = NULL, ban_expires_at = NULL WHERE id = $1',
          [user.id]
        );
      }
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Update hardware ID and last login
    await this.db.query(
      'UPDATE users SET hardware_id = $1, last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hardwareId, user.id]
    );

    // Generate session
    const sessionData = await this.createSession(user, {
      hardwareId,
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent
    });

    return sessionData;
  }

  // Create JWT session
  async createSession(user, deviceInfo = {}) {
    const sessionId = uuidv4();
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        sessionId: sessionId,
        iss: 'cs2d-enhanced',
        aud: 'cs2d-players'
      },
      this.jwtSecret,
      {
        expiresIn: '24h'
      }
    );

    // Store session in Redis with 24 hour expiry
    const sessionData = {
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
      deviceInfo
    };

    await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(sessionData));

    // Store session in database
    await this.db.query(`
      INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '24 hours')
    `, [
      user.id,
      crypto.createHash('sha256').update(token).digest('hex'),
      JSON.stringify(deviceInfo),
      deviceInfo.ipAddress,
      deviceInfo.userAgent
    ]);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        countryCode: user.country_code,
        trustFactor: user.trust_factor,
        stats: {
          eloRating: user.elo_rating,
          rankTier: user.rank_tier,
          kills: user.kills,
          deaths: user.deaths,
          matchesPlayed: user.matches_played,
          matchesWon: user.matches_won
        }
      }
    };
  }

  // Logout
  async logout(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.sessionId) {
        // Remove from Redis
        await this.redis.del(`session:${decoded.sessionId}`);
        
        // Mark session as inactive in database
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await this.db.query(
          'UPDATE user_sessions SET is_active = FALSE WHERE token_hash = $1',
          [tokenHash]
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check Redis session
      const sessionData = await this.redis.get(`session:${decoded.sessionId}`);
      if (!sessionData) {
        throw new Error('Session expired');
      }

      // Get fresh user data
      const user = await this.db.getUserById(decoded.userId);
      if (!user || user.is_banned) {
        throw new Error('User not found or banned');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Guest account creation
  async createGuestAccount(deviceInfo = {}) {
    const guestId = uuidv4().substring(0, 8);
    const userData = {
      username: `Guest_${guestId}`,
      displayName: `Guest ${guestId}`,
      hardwareId: deviceInfo.hardwareId
    };

    const user = await this.db.createUser(userData);
    const sessionData = await this.createSession(user, deviceInfo);

    return sessionData;
  }

  // Password reset
  async requestPasswordReset(email) {
    const user = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      throw new Error('Email not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [resetToken, resetExpires, email]
    );

    if (this.emailTransporter) {
      await this.sendPasswordResetEmail(email, resetToken);
    }

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token, newPassword) {
    const user = await this.db.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > CURRENT_TIMESTAMP',
      [token]
    );

    if (user.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.db.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [passwordHash, user.rows[0].id]
    );

    // Invalidate all sessions for this user
    await this.invalidateAllUserSessions(user.rows[0].id);

    return { message: 'Password reset successful' };
  }

  // Email verification
  async verifyEmail(token) {
    const user = await this.db.query(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );

    if (user.rows.length === 0) {
      throw new Error('Invalid verification token');
    }

    await this.db.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1',
      [user.rows[0].id]
    );

    return { message: 'Email verified successfully' };
  }

  // Send verification email
  async sendVerificationEmail(email, token) {
    if (!this.emailTransporter) return;

    const verificationUrl = `${this.clientUrl}/verify-email?token=${token}`;
    
    await this.emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@cs2d.com',
      to: email,
      subject: 'Verify your CS2D Enhanced account',
      html: `
        <h1>Welcome to CS2D Enhanced!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `
    });
  }

  async sendPasswordResetEmail(email, token) {
    if (!this.emailTransporter) return;

    const resetUrl = `${this.clientUrl}/reset-password?token=${token}`;
    
    await this.emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@cs2d.com',
      to: email,
      subject: 'Reset your CS2D Enhanced password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });
  }

  // Session management
  async invalidateAllUserSessions(userId) {
    // Get all session IDs for user
    const sessions = await this.db.query(
      'SELECT token_hash FROM user_sessions WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    // Remove from Redis (if we can decode the session ID)
    // Mark as inactive in database
    await this.db.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );
  }

  async getUserSessions(userId) {
    const result = await this.db.query(`
      SELECT id, device_info, ip_address, created_at, last_used_at, is_active
      FROM user_sessions 
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_used_at DESC
    `, [userId]);

    return result.rows;
  }

  async revokeSession(userId, sessionId) {
    await this.db.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1 AND id = $2',
      [userId, sessionId]
    );
  }

  // Trust factor management
  async updateTrustFactor(userId, factor, reason) {
    const currentUser = await this.db.getUserById(userId);
    const newTrustFactor = Math.max(0, Math.min(1, currentUser.trust_factor + factor));

    await this.db.query(
      'UPDATE users SET trust_factor = $1 WHERE id = $2',
      [newTrustFactor, userId]
    );

    console.log(`Trust factor updated for ${userId}: ${currentUser.trust_factor} -> ${newTrustFactor} (${reason})`);
  }

  // Steam OAuth helpers
  getSteamAuthUrl() {
    if (!this.steamApiKey) {
      throw new Error('Steam API key not configured');
    }
    return '/api/auth/steam';
  }

  // Middleware for protecting routes
  requireAuth(req, res, next) {
    passport.authenticate('jwt', { session: false })(req, res, next);
  }

  requireAdmin(req, res, next) {
    this.requireAuth(req, res, (err) => {
      if (err) return next(err);
      
      if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      next();
    });
  }
}

module.exports = { AuthService };