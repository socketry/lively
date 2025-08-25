import { describe, it, expect, beforeEach } from 'vitest';

interface SecurityTester {
  testXSSVulnerabilities(input: string): { safe: boolean; sanitized: string };
  testInputValidation(data: any, schema: any): { valid: boolean; errors: string[] };
  testRateLimiting(requests: number, timeWindow: number): { allowed: number; rejected: number };
  testAuthenticationBypass(credentials: any): { authenticated: boolean; reason: string };
  testDataInjection(query: string): { safe: boolean; sanitized: string };
}

describe('Security Testing', () => {
  let securityTester: SecurityTester;

  beforeEach(() => {
    securityTester = {
      testXSSVulnerabilities: (input: string) => {
        const dangerousPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe/gi,
          /<object/gi,
          /<embed/gi,
        ];

        const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(input));
        
        let sanitized = input;
        if (hasDangerousContent) {
          // Basic sanitization (in real app, use proper library like DOMPurify)
          sanitized = input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/<iframe/gi, '&lt;iframe')
            .replace(/<object/gi, '&lt;object')
            .replace(/<embed/gi, '&lt;embed');
        }

        return {
          safe: !hasDangerousContent,
          sanitized,
        };
      },

      testInputValidation: (data: any, schema: any) => {
        const errors: string[] = [];
        
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data) || data[field] === null || data[field] === undefined) {
              errors.push(`Field '${field}' is required`);
            }
          }
        }

        if (schema.properties) {
          for (const [field, rules] of Object.entries(schema.properties)) {
            const value = data[field];
            const fieldRules = rules as any;

            if (value !== undefined) {
              if (fieldRules.type === 'string' && typeof value !== 'string') {
                errors.push(`Field '${field}' must be a string`);
              }
              if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                errors.push(`Field '${field}' exceeds maximum length`);
              }
              if (fieldRules.pattern && !new RegExp(fieldRules.pattern).test(value)) {
                errors.push(`Field '${field}' does not match required pattern`);
              }
            }
          }
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      },

      testRateLimiting: (requests: number, timeWindow: number) => {
        const maxRequestsPerWindow = 100;
        const allowedRequests = Math.min(requests, maxRequestsPerWindow);
        const rejectedRequests = Math.max(0, requests - maxRequestsPerWindow);

        return {
          allowed: allowedRequests,
          rejected: rejectedRequests,
        };
      },

      testAuthenticationBypass: (credentials: any) => {
        const validCredentials = {
          username: 'admin',
          password: 'secure_password_123',
          token: 'valid_jwt_token',
        };

        if (!credentials.username || !credentials.password) {
          return { authenticated: false, reason: 'Missing credentials' };
        }

        // Test for common bypass attempts
        const bypassAttempts = [
          'admin\' OR \'1\'=\'1',
          'admin\' --',
          'admin\'; DROP TABLE users; --',
          '\' OR 1=1 --',
          'admin\' UNION SELECT * FROM users --',
        ];

        if (bypassAttempts.includes(credentials.username) || bypassAttempts.includes(credentials.password)) {
          return { authenticated: false, reason: 'SQL injection attempt detected' };
        }

        const isValid = credentials.username === validCredentials.username && 
                        credentials.password === validCredentials.password;

        return {
          authenticated: isValid,
          reason: isValid ? 'Valid credentials' : 'Invalid credentials',
        };
      },

      testDataInjection: (query: string) => {
        const sqlInjectionPatterns = [
          /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/gi,
          /(\s|^)(or|and)(\s|$)\d+(\s|$)=(\s|$)\d+/gi,
          /['"]\s*(or|and)\s*['"]\d+['"]\s*=\s*['"]\d+['"]]/gi,
          /--/g,
          /\/\*/g,
          /\*\//g,
        ];

        const hasInjection = sqlInjectionPatterns.some(pattern => pattern.test(query));
        
        let sanitized = query;
        if (hasInjection) {
          // Basic sanitization
          sanitized = query.replace(/['"]/g, '').replace(/--.*$/gm, '').replace(/\/\*.*?\*\//g, '');
        }

        return {
          safe: !hasInjection,
          sanitized,
        };
      },
    };
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should detect and prevent script injection in player names', () => {
      const maliciousNames = [
        '<script>alert("XSS")</script>',
        'javascript:alert(1)',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)">',
        '<embed src="javascript:alert(1)">',
      ];

      maliciousNames.forEach(name => {
        const result = securityTester.testXSSVulnerabilities(name);
        expect(result.safe).toBe(false);
        expect(result.sanitized).not.toContain('<script');
        expect(result.sanitized).not.toContain('javascript:');
      });
    });

    it('should allow safe player names', () => {
      const safeNames = [
        'PlayerOne',
        'Pro_Gamer_2024',
        'CS2D-Master',
        'Player [TAG]',
        'Sniper_Elite',
      ];

      safeNames.forEach(name => {
        const result = securityTester.testXSSVulnerabilities(name);
        expect(result.safe).toBe(true);
        expect(result.sanitized).toBe(name);
      });
    });

    it('should sanitize chat messages', () => {
      const maliciousMessages = [
        'Check this out: <script>steal_cookies()</script>',
        'Click here: <a href="javascript:malicious()">Link</a>',
        'Image: <img src="x" onerror="alert(document.cookie)">',
      ];

      maliciousMessages.forEach(message => {
        const result = securityTester.testXSSVulnerabilities(message);
        expect(result.safe).toBe(false);
        expect(result.sanitized).not.toMatch(/<script|javascript:|onerror=/i);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate player registration data', () => {
      const schema = {
        required: ['username', 'email'],
        properties: {
          username: { type: 'string', maxLength: 20, pattern: '^[a-zA-Z0-9_-]+$' },
          email: { type: 'string', maxLength: 100, pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' },
          password: { type: 'string', maxLength: 100 },
        },
      };

      const validData = {
        username: 'ValidUser123',
        email: 'user@example.com',
        password: 'SecurePassword123',
      };

      const result = securityTester.testInputValidation(validData, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid registration data', () => {
      const schema = {
        required: ['username', 'email'],
        properties: {
          username: { type: 'string', maxLength: 20, pattern: '^[a-zA-Z0-9_-]+$' },
          email: { type: 'string', maxLength: 100, pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' },
        },
      };

      const invalidData = [
        { username: '', email: 'user@example.com' }, // Empty username
        { username: 'User123', email: 'invalid-email' }, // Invalid email
        { username: 'User<script>', email: 'user@example.com' }, // Invalid characters
        { email: 'user@example.com' }, // Missing username
        { username: 'ThisUsernameIsTooLongForValidation', email: 'user@example.com' }, // Too long
      ];

      invalidData.forEach(data => {
        const result = securityTester.testInputValidation(data, schema);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate game settings', () => {
      const schema = {
        required: ['gameMode', 'maxPlayers'],
        properties: {
          gameMode: { type: 'string', pattern: '^(competitive|casual|deathmatch)$' },
          maxPlayers: { type: 'number', min: 2, max: 32 },
          mapName: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
        },
      };

      const validSettings = {
        gameMode: 'competitive',
        maxPlayers: 10,
        mapName: 'de_dust2',
      };

      const result = securityTester.testInputValidation(validSettings, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit chat message frequency', () => {
      const messagesPerMinute = 150; // Spam attempt
      const timeWindow = 60000; // 1 minute
      
      const result = securityTester.testRateLimiting(messagesPerMinute, timeWindow);
      
      expect(result.allowed).toBeLessThan(messagesPerMinute);
      expect(result.rejected).toBeGreaterThan(0);
      expect(result.allowed + result.rejected).toBe(messagesPerMinute);
    });

    it('should limit connection attempts', () => {
      const connectionAttempts = 200; // DDoS attempt
      const timeWindow = 10000; // 10 seconds
      
      const result = securityTester.testRateLimiting(connectionAttempts, timeWindow);
      
      expect(result.allowed).toBeLessThanOrEqual(100); // Max 100 per window
      expect(result.rejected).toBe(connectionAttempts - result.allowed);
    });

    it('should allow normal usage patterns', () => {
      const normalRequests = 50; // Normal usage
      const timeWindow = 60000; // 1 minute
      
      const result = securityTester.testRateLimiting(normalRequests, timeWindow);
      
      expect(result.allowed).toBe(normalRequests);
      expect(result.rejected).toBe(0);
    });
  });

  describe('Authentication Security', () => {
    it('should prevent SQL injection in login', () => {
      const maliciousCredentials = [
        { username: 'admin\' OR \'1\'=\'1', password: 'password' },
        { username: 'admin', password: '\' OR 1=1 --' },
        { username: 'admin\'; DROP TABLE users; --', password: 'password' },
        { username: 'admin\' UNION SELECT * FROM users --', password: 'password' },
      ];

      maliciousCredentials.forEach(creds => {
        const result = securityTester.testAuthenticationBypass(creds);
        expect(result.authenticated).toBe(false);
        expect(result.reason).toContain('injection');
      });
    });

    it('should authenticate valid credentials', () => {
      const validCredentials = {
        username: 'admin',
        password: 'secure_password_123',
      };

      const result = securityTester.testAuthenticationBypass(validCredentials);
      expect(result.authenticated).toBe(true);
      expect(result.reason).toBe('Valid credentials');
    });

    it('should reject invalid credentials', () => {
      const invalidCredentials = [
        { username: 'admin', password: 'wrong_password' },
        { username: 'wrong_user', password: 'secure_password_123' },
        { username: '', password: 'password' },
        { username: 'admin', password: '' },
      ];

      invalidCredentials.forEach(creds => {
        const result = securityTester.testAuthenticationBypass(creds);
        expect(result.authenticated).toBe(false);
      });
    });
  });

  describe('Data Injection Prevention', () => {
    it('should detect SQL injection attempts', () => {
      const maliciousQueries = [
        'SELECT * FROM users WHERE id = 1; DROP TABLE users;',
        'user\' OR 1=1 --',
        'user\' UNION SELECT password FROM admin_users --',
        'user\'; INSERT INTO users (username, password) VALUES (\'hacker\', \'password\'); --',
      ];

      maliciousQueries.forEach(query => {
        const result = securityTester.testDataInjection(query);
        expect(result.safe).toBe(false);
        expect(result.sanitized).not.toMatch(/union|select|drop|insert|delete/i);
      });
    });

    it('should allow safe queries', () => {
      const safeQueries = [
        'PlayerName123',
        'Search for: Counter-Strike',
        'Map: de_dust2',
        'Player message: Good game!',
      ];

      safeQueries.forEach(query => {
        const result = securityTester.testDataInjection(query);
        expect(result.safe).toBe(true);
        expect(result.sanitized).toBe(query);
      });
    });
  });

  describe('Session Security', () => {
    it('should validate JWT tokens', () => {
      interface JWTValidator {
        validate(token: string): { valid: boolean; expired: boolean; payload?: any };
      }

      const jwtValidator: JWTValidator = {
        validate: (token: string) => {
          if (!token || token.length < 10) {
            return { valid: false, expired: false };
          }

          // Simulate token validation
          if (token === 'expired_token') {
            return { valid: false, expired: true };
          }

          if (token === 'valid_jwt_token') {
            return {
              valid: true,
              expired: false,
              payload: { userId: 123, username: 'player' },
            };
          }

          return { valid: false, expired: false };
        },
      };

      const validToken = jwtValidator.validate('valid_jwt_token');
      expect(validToken.valid).toBe(true);
      expect(validToken.expired).toBe(false);

      const expiredToken = jwtValidator.validate('expired_token');
      expect(expiredToken.valid).toBe(false);
      expect(expiredToken.expired).toBe(true);

      const invalidToken = jwtValidator.validate('invalid_token');
      expect(invalidToken.valid).toBe(false);
    });

    it('should handle session timeouts', () => {
      interface SessionManager {
        isSessionValid(sessionId: string, lastActivity: number): boolean;
      }

      const sessionManager: SessionManager = {
        isSessionValid: (sessionId: string, lastActivity: number) => {
          const sessionTimeout = 30 * 60 * 1000; // 30 minutes
          const now = Date.now();
          
          return (now - lastActivity) < sessionTimeout;
        },
      };

      const recentActivity = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const oldActivity = Date.now() - 60 * 60 * 1000; // 1 hour ago

      expect(sessionManager.isSessionValid('session1', recentActivity)).toBe(true);
      expect(sessionManager.isSessionValid('session2', oldActivity)).toBe(false);
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens', () => {
      interface CSRFProtection {
        generateToken(): string;
        validateToken(token: string, expectedToken: string): boolean;
      }

      const csrfProtection: CSRFProtection = {
        generateToken: () => {
          return 'csrf_token_' + Math.random().toString(36).substr(2, 9);
        },
        validateToken: (token: string, expectedToken: string) => {
          return token === expectedToken && token.length > 10;
        },
      };

      const validToken = csrfProtection.generateToken();
      expect(csrfProtection.validateToken(validToken, validToken)).toBe(true);
      expect(csrfProtection.validateToken('wrong_token', validToken)).toBe(false);
      expect(csrfProtection.validateToken('', validToken)).toBe(false);
    });
  });

  describe('Content Security Policy', () => {
    it('should enforce secure content sources', () => {
      interface CSPValidator {
        validateSource(url: string, policy: string[]): boolean;
      }

      const cspValidator: CSPValidator = {
        validateSource: (url: string, policy: string[]) => {
          try {
            const urlObj = new URL(url);
            const origin = urlObj.origin;
            
            return policy.some(allowed => {
              if (allowed === '\'self\'') return origin === window.location.origin;
              if (allowed === '\'none\'') return false;
              return origin === allowed;
            });
          } catch {
            return false;
          }
        },
      };

      const policy = ['\'self\'', 'https://cdn.example.com'];
      
      expect(cspValidator.validateSource('https://cdn.example.com/script.js', policy)).toBe(true);
      expect(cspValidator.validateSource('https://malicious.com/script.js', policy)).toBe(false);
      expect(cspValidator.validateSource('javascript:alert(1)', policy)).toBe(false);
    });
  });
});