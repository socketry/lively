#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"

class CS2DView < Live::View
	def initialize(...)
		super
		# Initialize game state early to prevent nil errors
		@player_id = SecureRandom.uuid
		@game_state = {
						players: {},
						phase: "waiting",
						round_time: 30,
						ct_score: 0,
						t_score: 0,
						round: 1
				}
	end
		
	def bind(page)
		super
		# Console.info(self, "CS2D bind method called - WebSocket connection established")
				
		# Re-initialize game state if needed
		@player_id ||= SecureRandom.uuid
		@game_state ||= {
						players: {},
						phase: "waiting",
						round_time: 30,
						ct_score: 0,
						t_score: 0,
						round: 1
				}
				
		# Add current player to game state
		@game_state[:players][@player_id] = {
						id: @player_id,
						name: "Player_#{@player_id[0..7]}",
						team: "ct",
						x: 640,
						y: 360,
						health: 100,
						alive: true
				}
				
		# Console.info(self, "CS2D game state initialized for player #{@player_id}")
		self.update!
		# Console.info(self, "CS2D render update sent via WebSocket")
				
		# Initialize JavaScript after render - proper Lively pattern
		initialize_game_javascript
	end

	def render(builder)
		# Render the complete game container
		render_game_container(builder)
				
		# For large JavaScript games, use HTML-based inclusion
		# This avoids WebSocket injection issues with 40K+ chars of code
		render_game_javascript(builder)
	end
		
	def render_game_container(builder)
		builder.tag(:div, id: "cs2d-container", data: { live: @id }, 
																style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #1a1a1a; position: relative; font-family: Arial, sans-serif;") do
			# Main game canvas
			builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
																	style: "display: block; margin: 0 auto; cursor: crosshair; border: 2px solid #333;",
																	tabIndex: 0)
						
			# CS 1.6 style HUD
			render_hud(builder)
		end
	end
		
	def render_hud(builder)
		builder.tag(:div, id: "hud", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
			# Player info
			builder.tag(:div, style: "position: absolute; top: 20px; left: 20px; color: #00ff00; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				player_name = @player_id ? "Player: #{@player_id[0..7]}" : "CS 1.6"
				builder.text(player_name)
			end
						
			# Health & Armor
			builder.tag(:div, style: "position: absolute; bottom: 20px; left: 20px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				builder.tag(:div, style: "font-size: 32px; font-weight: bold; color: #ff4444;") do
					builder.text("❤ 100")
				end
				builder.tag(:div, style: "font-size: 32px; font-weight: bold; color: #4444ff;") do
					builder.text("🛡 100")
				end
			end
						
			# Ammo
			builder.tag(:div, style: "position: absolute; bottom: 20px; right: 20px; text-align: right; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				builder.tag(:div, style: "font-size: 48px; font-weight: bold;") do
					builder.text("30 / 90")
				end
				builder.tag(:div, style: "font-size: 24px; color: #ffaa00;") do
					builder.text("M4A1")
				end
			end
						
			# Score
			builder.tag(:div, style: "position: absolute; top: 20px; left: 50%; transform: translateX(-50%); text-align: center;") do
				builder.tag(:div, style: "font-size: 28px; color: white; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
					ct_score = @game_state ? @game_state[:ct_score] : 0
					t_score = @game_state ? @game_state[:t_score] : 0
					builder.tag(:span, style: "color: #4444ff;") { builder.text("CT #{ct_score}") }
					builder.text(" - ")
					builder.tag(:span, style: "color: #ff6600;") { builder.text("#{t_score} T") }
				end
			end
		end
	end
		
	def render_game_javascript(builder)
		# For production CS 1.6 with full features, use HTML-based JavaScript inclusion
		# This prevents WebSocket injection failures with large code
		builder.tag(:script, type: "text/javascript") do
			builder.raw(generate_cs16_core_javascript)
		end
	end

	def initialize_game_javascript
		# For small JavaScript, WebSocket injection is fine
		# For large game code (>40K chars), use HTML-based inclusion in render method
				
		# Delay to ensure WebSocket connection is ready
		Async do
			sleep 1.5
						
			# Test JavaScript injection
			self.script(<<~JAVASCRIPT)
        console.log('CS 1.6: WebSocket JavaScript injection active!');
        document.body.style.backgroundColor = '#1a1a1a';
        
        // Visual confirmation
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #00ff00; color: black; padding: 10px; z-index: 99999; font-weight: bold; border: 2px solid #000;';
        statusDiv.textContent = 'CS 1.6 Active';
        document.body.appendChild(statusDiv);
        
        // Initialize canvas
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // CS 1.6 style background
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Title screen
            ctx.fillStyle = '#ff6b00';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('COUNTER-STRIKE 1.6', canvas.width/2, canvas.height/2 - 50);
            
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 32px Arial';
            ctx.fillText('JavaScript Injection Working', canvas.width/2, canvas.height/2 + 20);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = '24px Arial';
            ctx.fillText('Press B for Buy Menu | TAB for Scoreboard', canvas.width/2, canvas.height/2 + 80);
            
            console.log('CS 1.6: Canvas initialized successfully');
          }
        }
        
        // Status indicator
      const statusDiv = document.createElement('div');
      statusDiv.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: yellow; color: black; padding: 10px; z-index: 99999; font-weight: bold;';
      statusDiv.textContent = 'Game Active';
      document.body.appendChild(statusDiv);
						JAVASCRIPT
		end
	end
		
	def generate_cs16_core_javascript
		# Complete CS 1.6 game implementation
		<<~JAVASCRIPT
    (function() {
      console.log('CS 1.6: Initializing complete game engine...');
      
      // Game configuration
      const CONFIG = {
        PLAYER_SPEED: 250,
        PLAYER_RADIUS: 16,
        BULLET_SPEED: 2000,
        MAP_WIDTH: 1280,
        MAP_HEIGHT: 720,
        TICK_RATE: 64,
        BOMB_TIMER: 35,
        ROUND_TIME: 115
      };
      
      // Weapon configurations  
      const WEAPONS = {
        m4a1: { damage: 33, fireRate: 0.09, clipSize: 30, reserve: 90, reloadTime: 3.0, price: 3100, automatic: true },
        ak47: { damage: 36, fireRate: 0.1, clipSize: 30, reserve: 90, reloadTime: 2.5, price: 2500, automatic: true },
        awp: { damage: 115, fireRate: 1.45, clipSize: 10, reserve: 30, reloadTime: 3.6, price: 4750, automatic: false },
        deagle: { damage: 54, fireRate: 0.22, clipSize: 7, reserve: 35, reloadTime: 2.2, price: 650, automatic: false },
        glock: { damage: 28, fireRate: 0.15, clipSize: 20, reserve: 120, reloadTime: 2.2, price: 400, automatic: false },
        usp: { damage: 34, fireRate: 0.15, clipSize: 12, reserve: 100, reloadTime: 2.7, price: 500, automatic: false },
        mp5: { damage: 26, fireRate: 0.075, clipSize: 30, reserve: 120, reloadTime: 2.6, price: 1500, automatic: true },
        p90: { damage: 26, fireRate: 0.066, clipSize: 50, reserve: 100, reloadTime: 3.3, price: 2350, automatic: true },
        scout: { damage: 75, fireRate: 1.25, clipSize: 10, reserve: 90, reloadTime: 2.0, price: 2750, automatic: false }
      };
      
      // Game state
      let gameState = {
        players: {},
        bullets: [],
        grenades: [],
        smokeAreas: [],
        bomb: null,
        localPlayerId: null,
        lastUpdate: Date.now(),
        round: 1,
        ctScore: 0,
        tScore: 0,
        roundTime: CONFIG.ROUND_TIME,
        buyMenuOpen: false,
        scoreboardOpen: false
      };
      
      // Input handling
      const input = {
        keys: {},
        mouse: { x: 0, y: 0, buttons: {} },
        init() {
          document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            
            // Special keys
            if (e.code === 'KeyB') toggleBuyMenu();
            if (e.code === 'Tab') {
              e.preventDefault();
              toggleScoreboard(true);
            }
          });
          document.addEventListener('keyup', e => {
            delete this.keys[e.code];
            if (e.code === 'Tab') toggleScoreboard(false);
          });
          document.addEventListener('mousemove', e => {
            const canvas = document.getElementById('game-canvas');
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
          });
          document.addEventListener('mousedown', e => {
            this.mouse.buttons[e.button] = true;
            if (e.button === 0) shoot();
            if (e.button === 2) toggleScope();
          });
          document.addEventListener('mouseup', e => {
            delete this.mouse.buttons[e.button];
          });
          document.addEventListener('contextmenu', e => e.preventDefault());
        }
      };
      
      // Renderer
      const renderer = {
        canvas: null,
        ctx: null,
        init() {
          this.canvas = document.getElementById('game-canvas');
          this.ctx = this.canvas.getContext('2d');
          this.ctx.imageSmoothingEnabled = false;
          console.log('CS 1.6: Renderer initialized');
        },
        render() {
          if (!this.ctx) return;
          
          // Clear
          this.ctx.fillStyle = '#c4a57b';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          // Draw map features
          this.renderMap();
          
          // Draw bomb sites
          this.renderBombSites();
          
          // Draw smoke
          this.renderSmoke();
          
          // Draw players
          this.renderPlayers();
          
          // Draw bullets
          this.renderBullets();
          
          // Draw grenades
          this.renderGrenades();
          
          // Draw bomb if planted
          if (gameState.bomb && gameState.bomb.planted) {
            this.renderBomb();
          }
          
          // Draw crosshair
          this.renderCrosshair();
        },
        renderMap() {
          // Simple de_dust2 style map elements
          this.ctx.fillStyle = '#8b7355';
          
          // CT spawn walls
          this.ctx.fillRect(50, 100, 20, 200);
          this.ctx.fillRect(50, 100, 150, 20);
          
          // T spawn walls  
          this.ctx.fillRect(1200, 100, 20, 200);
          this.ctx.fillRect(1070, 100, 150, 20);
          
          // Mid walls
          this.ctx.fillRect(400, 50, 20, 300);
          this.ctx.fillRect(860, 50, 20, 300);
          this.ctx.fillRect(400, 400, 480, 20);
          
          // Boxes
          this.ctx.fillStyle = '#6b5d4f';
          this.ctx.fillRect(250, 250, 60, 60);
          this.ctx.fillRect(550, 150, 40, 40);
          this.ctx.fillRect(750, 300, 50, 50);
          this.ctx.fillRect(950, 200, 60, 60);
        },
        renderBombSites() {
          // A site
          this.ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
          this.ctx.beginPath();
          this.ctx.arc(600, 200, 80, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = '#ff6400';
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
          this.ctx.fillStyle = '#ff6400';
          this.ctx.font = 'bold 36px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('A', 600, 210);
          
          // B site
          this.ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
          this.ctx.beginPath();
          this.ctx.arc(300, 500, 80, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.fillStyle = '#ff6400';
          this.ctx.fillText('B', 300, 510);
        },
        renderPlayers() {
          for (const player of Object.values(gameState.players)) {
            if (!player.alive) continue;
            
            // Player body
            this.ctx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ff6600';
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Direction
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            const dirX = Math.cos(player.angle || 0) * 25;
            const dirY = Math.sin(player.angle || 0) * 25;
            this.ctx.lineTo(player.x + dirX, player.y + dirY);
            this.ctx.stroke();
            
            // Name and health
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 25);
            
            // Health bar
            const barWidth = 40;
            const barHeight = 4;
            const healthPercent = player.health / 100;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 35, barWidth, barHeight);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 35, barWidth * healthPercent, barHeight);
            
            // Bomb carrier
            if (player.bomb) {
              this.ctx.fillStyle = '#ff0000';
              this.ctx.font = 'bold 16px Arial';
              this.ctx.fillText('💣', player.x, player.y + 35);
            }
          }
        },
        renderBullets() {
          this.ctx.strokeStyle = '#ffff00';
          this.ctx.lineWidth = 2;
          for (const bullet of gameState.bullets) {
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
            this.ctx.lineTo(bullet.x, bullet.y);
            this.ctx.stroke();
          }
        },
        renderGrenades() {
          for (const grenade of gameState.grenades) {
            if (grenade.type === 'flashbang') {
              this.ctx.fillStyle = '#ffffff';
            } else if (grenade.type === 'smoke') {
              this.ctx.fillStyle = '#888888';
            } else if (grenade.type === 'he') {
              this.ctx.fillStyle = '#ff0000';
            }
            
            this.ctx.beginPath();
            this.ctx.arc(grenade.x, grenade.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
          }
        },
        renderSmoke() {
          for (const smoke of gameState.smokeAreas) {
            this.ctx.fillStyle = 'rgba(150, 150, 150, 0.7)';
            for (let i = 0; i < 5; i++) {
              const offsetX = (Math.random() - 0.5) * 20;
              const offsetY = (Math.random() - 0.5) * 20;
              const radius = smoke.radius + (Math.random() * 30);
              
              this.ctx.globalAlpha = 0.6;
              this.ctx.beginPath();
              this.ctx.arc(smoke.x + offsetX, smoke.y + offsetY, radius, 0, Math.PI * 2);
              this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;
          }
        },
        renderBomb() {
          const bomb = gameState.bomb;
          
          // Bomb
          this.ctx.fillStyle = '#ff0000';
          this.ctx.fillRect(bomb.x - 10, bomb.y - 10, 20, 20);
          
          // Blinking light
          if (Math.sin(Date.now() * 0.01) > 0) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(bomb.x, bomb.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
          }
          
          // Timer
          this.ctx.fillStyle = '#ff0000';
          this.ctx.font = 'bold 16px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(bomb.timeLeft.toFixed(1) + 's', bomb.x, bomb.y - 20);
        },
        renderCrosshair() {
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          
          this.ctx.strokeStyle = '#00ff00';
          this.ctx.lineWidth = 2;
          
          const player = gameState.players[gameState.localPlayerId];
          let spread = 5;
          if (player && player.velocity) {
            const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
            spread += speed * 0.05;
          }
          
          // Horizontal
          this.ctx.beginPath();
          this.ctx.moveTo(centerX - 20 - spread, centerY);
          this.ctx.lineTo(centerX - 5 - spread, centerY);
          this.ctx.moveTo(centerX + 5 + spread, centerY);
          this.ctx.lineTo(centerX + 20 + spread, centerY);
          this.ctx.stroke();
          
          // Vertical
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY - 20 - spread);
          this.ctx.lineTo(centerX, centerY - 5 - spread);
          this.ctx.moveTo(centerX, centerY + 5 + spread);
          this.ctx.lineTo(centerX, centerY + 20 + spread);
          this.ctx.stroke();
          
          // Center dot
          this.ctx.fillStyle = '#00ff00';
          this.ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
        }
      };
      
      // Game functions
      function shoot() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.reloading) return;
        
        const weapon = WEAPONS[player.weapon || 'm4a1'];
        
        // Check ammo
        if (!player.ammo || player.ammo <= 0) {
          reload();
          return;
        }
        
        // Check fire rate
        const now = Date.now();
        if (player.lastShot && (now - player.lastShot) < weapon.fireRate * 1000) return;
        player.lastShot = now;
        
        // Decrease ammo
        player.ammo--;
        
        // Calculate spread based on movement and weapon
        const angle = player.angle || 0;
        let spread = 0.02;
        if (player.velocity) {
          const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
          spread += speed * 0.0001;
        }
        if (player.jumping) spread += 0.05;
        if (player.crouching) spread *= 0.5;
        if (weapon === WEAPONS.awp || weapon === WEAPONS.scout) {
          if (!player.scoped) spread *= 3;
        }
        
        const finalSpread = (Math.random() - 0.5) * spread;
        
        const bullet = {
          x: player.x + Math.cos(angle) * 30,
          y: player.y + Math.sin(angle) * 30,
          vx: Math.cos(angle + finalSpread) * CONFIG.BULLET_SPEED,
          vy: Math.sin(angle + finalSpread) * CONFIG.BULLET_SPEED,
          damage: weapon.damage,
          penetration: weapon === WEAPONS.awp ? 3 : weapon === WEAPONS.scout ? 2 : 1,
          owner: player.id,
          team: player.team
        };
        
        gameState.bullets.push(bullet);
        
        // Recoil effect
        player.angle += (Math.random() - 0.5) * 0.05;
        
        // Muzzle flash effect
        gameState.muzzleFlashes = gameState.muzzleFlashes || [];
        gameState.muzzleFlashes.push({
          x: bullet.x,
          y: bullet.y,
          time: 0.1
        });
      }
      
      function reload() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.reloading) return;
        
        player.reloading = true;
        const weapon = WEAPONS[player.weapon || 'm4a1'];
        
        setTimeout(() => {
          player.ammo = weapon.clipSize;
          player.reloading = false;
        }, weapon.reloadTime * 1000);
      }
      
      function plantBomb() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.team !== 't' || !player.bomb) return;
        
        // Check if in bomb site A
        const distA = Math.sqrt(Math.pow(player.x - 600, 2) + Math.pow(player.y - 200, 2));
        const distB = Math.sqrt(Math.pow(player.x - 300, 2) + Math.pow(player.y - 500, 2));
        
        if (distA <= 80 || distB <= 80) {
          gameState.bomb = {
            planted: true,
            x: player.x,
            y: player.y,
            timeLeft: CONFIG.BOMB_TIMER,
            site: distA <= 80 ? 'A' : 'B'
          };
          player.bomb = false;
          console.log('Bomb planted at site ' + gameState.bomb.site + '!');
        }
      }
      
      function defuseBomb() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.team !== 'ct' || !gameState.bomb || !gameState.bomb.planted) return;
        
        const dist = Math.sqrt(Math.pow(player.x - gameState.bomb.x, 2) + Math.pow(player.y - gameState.bomb.y, 2));
        if (dist <= 50) {
          // Start defusing (simplified)
          setTimeout(() => {
            if (gameState.bomb && gameState.bomb.planted) {
              gameState.bomb = null;
              console.log('Bomb defused!');
              gameState.ctScore++;
            }
          }, 5000);
        }
      }
      
      function toggleScope() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive) return;
        
        const weapon = WEAPONS[player.weapon];
        if (weapon && (weapon === WEAPONS.awp || weapon === WEAPONS.scout)) {
          player.scoped = !player.scoped;
        }
      }
      
      function toggleBuyMenu() {
        gameState.buyMenuOpen = !gameState.buyMenuOpen;
        if (gameState.buyMenuOpen) {
          renderBuyMenu();
        } else {
          closeBuyMenu();
        }
      }
      
      function renderBuyMenu() {
        const existing = document.getElementById('buy-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.id = 'buy-menu';
        menu.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); border: 2px solid #ff6600; padding: 20px; color: white; font-family: Arial; z-index: 1000;';
        
        menu.innerHTML = `
          <h2 style="color: #ff6600; text-align: center;">Buy Menu</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <h3>Rifles</h3>
              <button onclick="buyWeapon('m4a1')" style="display: block; width: 100%; margin: 5px 0;">M4A1 - $3100</button>
              <button onclick="buyWeapon('ak47')" style="display: block; width: 100%; margin: 5px 0;">AK-47 - $2500</button>
              <button onclick="buyWeapon('awp')" style="display: block; width: 100%; margin: 5px 0;">AWP - $4750</button>
              <button onclick="buyWeapon('scout')" style="display: block; width: 100%; margin: 5px 0;">Scout - $2750</button>
            </div>
            <div>
              <h3>SMGs & Pistols</h3>
              <button onclick="buyWeapon('mp5')" style="display: block; width: 100%; margin: 5px 0;">MP5 - $1500</button>
              <button onclick="buyWeapon('p90')" style="display: block; width: 100%; margin: 5px 0;">P90 - $2350</button>
              <button onclick="buyWeapon('deagle')" style="display: block; width: 100%; margin: 5px 0;">Desert Eagle - $650</button>
              <button onclick="buyWeapon('usp')" style="display: block; width: 100%; margin: 5px 0;">USP - $500</button>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <button onclick="buyArmor()" style="margin-right: 10px;">Kevlar - $650</button>
            <button onclick="buyDefuseKit()" style="margin-right: 10px;">Defuse Kit - $200</button>
            <button onclick="buyGrenade('flashbang')" style="margin-right: 10px;">Flash - $200</button>
            <button onclick="buyGrenade('smoke')" style="margin-right: 10px;">Smoke - $300</button>
            <button onclick="buyGrenade('he')" style="margin-right: 10px;">HE - $300</button>
          </div>
          <p style="text-align: center; color: #00ff00;">Money: $${gameState.players[gameState.localPlayerId]?.money || 800}</p>
        `;
        
        document.body.appendChild(menu);
        
        // Define buy functions
        window.buyWeapon = function(weaponName) {
          const player = gameState.players[gameState.localPlayerId];
          if (!player) return;
          
          const weapon = WEAPONS[weaponName];
          if (!weapon) return;
          
          player.money = player.money || 800;
          if (player.money >= weapon.price) {
            player.money -= weapon.price;
            player.weapon = weaponName;
            player.ammo = weapon.clipSize;
            player.reserve = weapon.reserve;
            console.log('Bought ' + weaponName);
            renderBuyMenu(); // Update money display
          }
        };
        
        window.buyArmor = function() {
          const player = gameState.players[gameState.localPlayerId];
          if (!player) return;
          
          player.money = player.money || 800;
          if (player.money >= 650 && player.armor < 100) {
            player.money -= 650;
            player.armor = 100;
            renderBuyMenu();
          }
        };
        
        window.buyDefuseKit = function() {
          const player = gameState.players[gameState.localPlayerId];
          if (!player || player.team !== 'ct') return;
          
          player.money = player.money || 800;
          if (player.money >= 200 && !player.defuseKit) {
            player.money -= 200;
            player.defuseKit = true;
            renderBuyMenu();
          }
        };
        
        window.buyGrenade = function(type) {
          const player = gameState.players[gameState.localPlayerId];
          if (!player) return;
          
          const prices = { flashbang: 200, smoke: 300, he: 300 };
          player.money = player.money || 800;
          
          if (player.money >= prices[type]) {
            player.money -= prices[type];
            player.grenades = player.grenades || {};
            player.grenades[type] = (player.grenades[type] || 0) + 1;
            renderBuyMenu();
          }
        };
      }
      
      function closeBuyMenu() {
        const menu = document.getElementById('buy-menu');
        if (menu) menu.remove();
      }
      
      function toggleScoreboard(show) {
        gameState.scoreboardOpen = show;
        if (show) {
          renderScoreboard();
        } else {
          closeScoreboard();
        }
      }
      
      function renderScoreboard() {
        const existing = document.getElementById('scoreboard');
        if (existing) existing.remove();
        
        const board = document.createElement('div');
        board.id = 'scoreboard';
        board.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); border: 2px solid #666; padding: 20px; color: white; font-family: monospace; z-index: 999;';
        
        let html = '<h2 style="text-align: center;">SCOREBOARD</h2>';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><th>Name</th><th>Team</th><th>K</th><th>D</th><th>Money</th><th>Ping</th></tr>';
        
        for (const player of Object.values(gameState.players)) {
          const teamColor = player.team === 'ct' ? '#4444ff' : '#ff6600';
          html += `<tr style="color: ${teamColor};">`;
          html += `<td>${player.name}</td>`;
          html += `<td>${player.team.toUpperCase()}</td>`;
          html += `<td>${player.kills || 0}</td>`;
          html += `<td>${player.deaths || 0}</td>`;
          html += `<td>$${player.money || 800}</td>`;
          html += `<td>${Math.floor(Math.random() * 50 + 20)}</td>`;
          html += '</tr>';
        }
        
        html += '</table>';
        html += `<p style="text-align: center; margin-top: 10px;">Round ${gameState.round} | CT: ${gameState.ctScore} - T: ${gameState.tScore}</p>`;
        
        board.innerHTML = html;
        document.body.appendChild(board);
      }
      
      function closeScoreboard() {
        const board = document.getElementById('scoreboard');
        if (board) board.remove();
      }
      
      function throwGrenade(type) {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive) return;
        
        player.grenades = player.grenades || {};
        if (!player.grenades[type] || player.grenades[type] <= 0) return;
        
        player.grenades[type]--;
        
        const grenade = {
          x: player.x,
          y: player.y,
          vx: Math.cos(player.angle) * 500,
          vy: Math.sin(player.angle) * 500,
          type: type,
          timer: 2,
          owner: player.id
        };
        
        gameState.grenades.push(grenade);
      }
      
      // Advanced Bot AI System
      function updateBotAI(deltaTime) {
        for (const bot of Object.values(gameState.players)) {
          if (bot.id === gameState.localPlayerId || !bot.alive) continue;
          
          // Initialize bot AI state
          bot.ai = bot.ai || {
            state: 'patrol',
            target: null,
            destination: null,
            reactionTime: 0.2 + Math.random() * 0.3,
            skill: Math.random() * 0.5 + 0.3,
            lastDecision: 0,
            patrolPoints: generatePatrolPoints(bot.team)
          };
          
          // Decision making
          const now = Date.now() / 1000;
          if (now - bot.ai.lastDecision > bot.ai.reactionTime) {
            bot.ai.lastDecision = now;
            makeBotDecision(bot);
          }
          
          // Execute current state
          switch(bot.ai.state) {
            case 'patrol':
              executeBotPatrol(bot, deltaTime);
              break;
            case 'combat':
              executeBotCombat(bot, deltaTime);
              break;
            case 'plant':
              executeBotPlant(bot, deltaTime);
              break;
            case 'defuse':
              executeBotDefuse(bot, deltaTime);
              break;
            case 'retreat':
              executeBotRetreat(bot, deltaTime);
              break;
          }
          
          // Check for enemies
          const enemy = findNearestEnemy(bot);
          if (enemy && canSeeTarget(bot, enemy)) {
            bot.ai.state = 'combat';
            bot.ai.target = enemy;
          }
        }
      }
      
      function makeBotDecision(bot) {
        // Check health
        if (bot.health < 30) {
          bot.ai.state = 'retreat';
          return;
        }
        
        // Check for bomb objectives
        if (bot.team === 't' && bot.bomb && !gameState.bomb?.planted) {
          const site = Math.random() < 0.5 ? { x: 600, y: 200 } : { x: 300, y: 500 };
          const dist = Math.sqrt(Math.pow(bot.x - site.x, 2) + Math.pow(bot.y - site.y, 2));
          if (dist < 80) {
            bot.ai.state = 'plant';
            return;
          }
        }
        
        if (bot.team === 'ct' && gameState.bomb?.planted) {
          const dist = Math.sqrt(Math.pow(bot.x - gameState.bomb.x, 2) + Math.pow(bot.y - gameState.bomb.y, 2));
          if (dist < 50) {
            bot.ai.state = 'defuse';
            return;
          }
        }
        
        // Default to patrol if not in combat
        if (bot.ai.state !== 'combat') {
          bot.ai.state = 'patrol';
        }
      }
      
      function executeBotPatrol(bot, deltaTime) {
        // Select destination
        if (!bot.ai.destination || distanceToPoint(bot, bot.ai.destination) < 50) {
          bot.ai.destination = bot.ai.patrolPoints[Math.floor(Math.random() * bot.ai.patrolPoints.length)];
        }
        
        // Move towards destination
        moveTowards(bot, bot.ai.destination, CONFIG.PLAYER_SPEED * 0.7, deltaTime);
        
        // Look around
        bot.angle = (bot.angle || 0) + (Math.random() - 0.5) * deltaTime;
      }
      
      function executeBotCombat(bot, deltaTime) {
        if (!bot.ai.target || !bot.ai.target.alive) {
          bot.ai.state = 'patrol';
          bot.ai.target = null;
          return;
        }
        
        // Aim at target
        const dx = bot.ai.target.x - bot.x;
        const dy = bot.ai.target.y - bot.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Add skill-based aim adjustment
        const aimError = (1 - bot.ai.skill) * 0.2;
        bot.angle = targetAngle + (Math.random() - 0.5) * aimError;
        
        // Shoot if aligned
        const angleDiff = Math.abs(normalizeAngle(bot.angle - targetAngle));
        if (angleDiff < 0.1) {
          shootBot(bot);
        }
        
        // Strafe
        const strafeDir = Math.sin(Date.now() * 0.003) > 0 ? 1 : -1;
        bot.x += strafeDir * CONFIG.PLAYER_SPEED * 0.5 * deltaTime;
        
        // Maintain distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 300) {
          moveTowards(bot, bot.ai.target, CONFIG.PLAYER_SPEED * 0.5, deltaTime);
        } else if (distance < 100) {
          moveTowards(bot, bot.ai.target, -CONFIG.PLAYER_SPEED * 0.3, deltaTime);
        }
      }
      
      function executeBotPlant(bot, deltaTime) {
        // Plant bomb
        bot.plantingProgress = (bot.plantingProgress || 0) + deltaTime;
        if (bot.plantingProgress > 3) {
          gameState.bomb = {
            planted: true,
            x: bot.x,
            y: bot.y,
            timeLeft: CONFIG.BOMB_TIMER,
            site: 'A'
          };
          bot.bomb = false;
          bot.plantingProgress = 0;
          bot.ai.state = 'patrol';
        }
      }
      
      function executeBotDefuse(bot, deltaTime) {
        // Defuse bomb
        bot.defusingProgress = (bot.defusingProgress || 0) + deltaTime;
        const defuseTime = bot.defuseKit ? 5 : 10;
        if (bot.defusingProgress > defuseTime) {
          gameState.bomb = null;
          gameState.ctScore++;
          bot.defusingProgress = 0;
          bot.ai.state = 'patrol';
        }
      }
      
      function executeBotRetreat(bot, deltaTime) {
        // Find safe spot
        const safeSpot = bot.team === 'ct' ? { x: 100, y: 200 } : { x: 1100, y: 500 };
        moveTowards(bot, safeSpot, CONFIG.PLAYER_SPEED, deltaTime);
        
        // Recover
        if (bot.health > 50) {
          bot.ai.state = 'patrol';
        }
      }
      
      function shootBot(bot) {
        const weapon = WEAPONS[bot.weapon || (bot.team === 'ct' ? 'm4a1' : 'ak47')];
        const now = Date.now();
        
        bot.ammo = bot.ammo || weapon.clipSize;
        if (bot.ammo <= 0) {
          // Reload
          bot.reloading = true;
          setTimeout(() => {
            bot.ammo = weapon.clipSize;
            bot.reloading = false;
          }, weapon.reloadTime * 1000);
          return;
        }
        
        if (bot.lastShot && (now - bot.lastShot) < weapon.fireRate * 1000) return;
        bot.lastShot = now;
        bot.ammo--;
        
        const spread = (Math.random() - 0.5) * 0.05 * (2 - bot.ai.skill);
        const bullet = {
          x: bot.x + Math.cos(bot.angle) * 30,
          y: bot.y + Math.sin(bot.angle) * 30,
          vx: Math.cos(bot.angle + spread) * CONFIG.BULLET_SPEED,
          vy: Math.sin(bot.angle + spread) * CONFIG.BULLET_SPEED,
          damage: weapon.damage,
          owner: bot.id,
          team: bot.team
        };
        
        gameState.bullets.push(bullet);
      }
      
      // Helper functions
      function findNearestEnemy(bot) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const player of Object.values(gameState.players)) {
          if (player.team === bot.team || !player.alive) continue;
          
          const dist = Math.sqrt(Math.pow(player.x - bot.x, 2) + Math.pow(player.y - bot.y, 2));
          if (dist < minDist) {
            minDist = dist;
            nearest = player;
          }
        }
        
        return minDist < 500 ? nearest : null;
      }
      
      function canSeeTarget(bot, target) {
        // Simple line of sight check
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check angle
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(normalizeAngle(bot.angle - targetAngle));
        
        return dist < 400 && angleDiff < Math.PI / 3;
      }
      
      function moveTowards(entity, target, speed, deltaTime) {
        const dx = target.x - entity.x;
        const dy = target.y - entity.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          entity.x += (dx / dist) * speed * deltaTime;
          entity.y += (dy / dist) * speed * deltaTime;
        }
        
        // Keep in bounds
        entity.x = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_WIDTH - CONFIG.PLAYER_RADIUS, entity.x));
        entity.y = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_HEIGHT - CONFIG.PLAYER_RADIUS, entity.y));
      }
      
      function distanceToPoint(entity, point) {
        return Math.sqrt(Math.pow(entity.x - point.x, 2) + Math.pow(entity.y - point.y, 2));
      }
      
      function normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
      }
      
      function generatePatrolPoints(team) {
        if (team === 'ct') {
          return [
            { x: 200, y: 200 },
            { x: 600, y: 200 },
            { x: 300, y: 500 },
            { x: 640, y: 360 }
          ];
        } else {
          return [
            { x: 1000, y: 200 },
            { x: 600, y: 200 },
            { x: 300, y: 500 },
            { x: 640, y: 360 }
          ];
        }
      }
      
      // Update game
      function updateGame(deltaTime) {
        // Update local player
        const player = gameState.players[gameState.localPlayerId];
        if (player && player.alive) {
          let dx = 0, dy = 0;
          
          if (input.keys['KeyW']) dy -= 1;
          if (input.keys['KeyS']) dy += 1;
          if (input.keys['KeyA']) dx -= 1;
          if (input.keys['KeyD']) dx += 1;
          
          // Normalize diagonal movement
          if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
          }
          
          // Speed modifiers
          let speed = CONFIG.PLAYER_SPEED;
          if (input.keys['ShiftLeft']) speed *= 0.4; // Walk
          if (input.keys['ControlLeft']) speed *= 0.3; // Crouch
          
          // Update position
          player.x += dx * speed * deltaTime;
          player.y += dy * speed * deltaTime;
          
          // Keep in bounds
          player.x = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_WIDTH - CONFIG.PLAYER_RADIUS, player.x));
          player.y = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_HEIGHT - CONFIG.PLAYER_RADIUS, player.y));
          
          // Store velocity
          player.velocity = { x: dx * speed, y: dy * speed };
          
          // Update angle
          const centerX = renderer.canvas.width / 2;
          const centerY = renderer.canvas.height / 2;
          player.angle = Math.atan2(input.mouse.y - centerY, input.mouse.x - centerX);
          
          // Handle other inputs
          if (input.keys['KeyR']) reload();
          if (input.keys['KeyG']) throwGrenade('flashbang');
          if (input.keys['KeyF']) throwGrenade('smoke');
          if (input.keys['Key4']) throwGrenade('he');
          if (input.keys['KeyE']) {
            if (player.team === 't' && player.bomb) {
              plantBomb();
            } else if (player.team === 'ct') {
              defuseBomb();
            }
          }
        }
        
        // Update bullets
        gameState.bullets = gameState.bullets.filter(bullet => {
          bullet.x += bullet.vx * deltaTime;
          bullet.y += bullet.vy * deltaTime;
          
          // Check collision
          for (const target of Object.values(gameState.players)) {
            if (target.id === bullet.owner || !target.alive || target.team === bullet.team) continue;
            
            const dist = Math.sqrt(Math.pow(bullet.x - target.x, 2) + Math.pow(bullet.y - target.y, 2));
            if (dist < CONFIG.PLAYER_RADIUS) {
              target.health -= bullet.damage;
              if (target.health <= 0) {
                target.alive = false;
                console.log(target.name + ' was eliminated!');
              }
              return false;
            }
          }
          
          // Remove if out of bounds
          return bullet.x > 0 && bullet.x < CONFIG.MAP_WIDTH && 
                 bullet.y > 0 && bullet.y < CONFIG.MAP_HEIGHT;
        });
        
        // Update grenades
        gameState.grenades = gameState.grenades.filter(grenade => {
          grenade.x += grenade.vx * deltaTime;
          grenade.y += grenade.vy * deltaTime;
          grenade.vy += 500 * deltaTime; // Gravity
          grenade.vx *= 0.98; // Friction
          grenade.timer -= deltaTime;
          
          if (grenade.timer <= 0) {
            if (grenade.type === 'smoke') {
              gameState.smokeAreas.push({
                x: grenade.x,
                y: grenade.y,
                radius: 100,
                duration: 15
              });
            } else if (grenade.type === 'he') {
              // Damage nearby players
              for (const target of Object.values(gameState.players)) {
                const dist = Math.sqrt(Math.pow(grenade.x - target.x, 2) + Math.pow(grenade.y - target.y, 2));
                if (dist < 150) {
                  const damage = Math.floor(100 * (1 - dist / 150));
                  target.health -= damage;
                  if (target.health <= 0) {
                    target.alive = false;
                  }
                }
              }
            }
            return false;
          }
          
          return true;
        });
        
        // Update smoke
        gameState.smokeAreas = gameState.smokeAreas.filter(smoke => {
          smoke.duration -= deltaTime;
          return smoke.duration > 0;
        });
        
        // Update bomb
        if (gameState.bomb && gameState.bomb.planted) {
          gameState.bomb.timeLeft -= deltaTime;
          if (gameState.bomb.timeLeft <= 0) {
            // Bomb explodes
            console.log('Bomb exploded! Terrorists win!');
            gameState.tScore++;
            gameState.bomb = null;
          }
        }
        
        // Advanced bot AI
        updateBotAI(deltaTime);
      }
      
      // Game loop
      let lastTime = Date.now();
      function gameLoop() {
        const now = Date.now();
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;
        
        updateGame(deltaTime);
        renderer.render();
        
        requestAnimationFrame(gameLoop);
      }
      
      // Initialize
      function init() {
        console.log('CS 1.6: Starting initialization...');
        
        input.init();
        renderer.init();
        
        // Get player ID
        const container = document.getElementById('cs2d-container');
        gameState.localPlayerId = container.dataset.live || 'player_' + Math.random().toString(36).substr(2, 9);
        
        // Create local player
        gameState.players[gameState.localPlayerId] = {
          id: gameState.localPlayerId,
          name: 'Player',
          team: 'ct',
          x: 200,
          y: 300,
          angle: 0,
          health: 100,
          armor: 100,
          alive: true,
          weapon: 'm4a1',
          ammo: 30,
          reserve: 90,
          money: 800,
          kills: 0,
          deaths: 0,
          bomb: false,
          grenades: {
            flashbang: 2,
            smoke: 1,
            he: 1
          }
        };
        
        // Add bots
        for (let i = 0; i < 7; i++) {
          const botId = 'bot_' + i;
          const team = i < 3 ? 'ct' : 't';
          gameState.players[botId] = {
            id: botId,
            name: ['Eagle', 'Hawk', 'Wolf', 'Phoenix', 'Viper', 'Shadow', 'Ghost'][i],
            team: team,
            x: team === 'ct' ? 200 + Math.random() * 100 : 1000 + Math.random() * 100,
            y: 200 + Math.random() * 300,
            angle: Math.random() * Math.PI * 2,
            health: 100,
            armor: 100,
            alive: true,
            weapon: team === 'ct' ? 'm4a1' : 'ak47',
            ammo: 30,
            reserve: 90,
            money: 800,
            kills: 0,
            deaths: 0,
            bomb: team === 't' && i === 3,
            grenades: {
              flashbang: Math.random() > 0.5 ? 1 : 0,
              smoke: Math.random() > 0.7 ? 1 : 0,
              he: Math.random() > 0.6 ? 1 : 0
            }
          };
        }
        
        console.log('CS 1.6: Starting game loop...');
        gameLoop();
        
        // Server update handler
        window.updateGameState = function(newState) {
          if (newState.players) {
            for (const [id, player] of Object.entries(newState.players)) {
              if (id !== gameState.localPlayerId) {
                gameState.players[id] = player;
              }
            }
          }
        };
        
        console.log('CS 1.6: Game initialized successfully!');
      }
      
      // Start
      init();
    })();
				JAVASCRIPT
	end

	def close
		# Clean up when view closes
	end
end

Application = Lively::Application[CS2DView]