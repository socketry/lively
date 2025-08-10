#!/usr/bin/env lively
# frozen_string_literal: true

require 'securerandom'
require 'json'
require_relative "game/multiplayer_game_room"

class CS2DView < Live::View
  def initialize(...)
    super
    @room = nil
    @player_id = nil
    @game_running = false
  end
  
  def bind(page)
    super
    @player_id = SecureRandom.uuid
    @room = MultiplayerGameRoom.new("room_#{@player_id}", {})
    @room.add_player(@player_id, self)
    @game_running = true
    self.update!
  end
  
  def close
    @game_running = false
    @room&.remove_player(@player_id)
    super
  end
  
  def handle(event)
    return unless @room && @player_id && @game_running
    
    case event[:type]
    when "keydown"
      handle_keydown(event[:detail])
    when "keyup"
      handle_keyup(event[:detail])
    when "click"
      handle_click(event[:detail])
    when "player_move"
      @room.process_movement(@player_id, {
        dx: event[:dx] || 0,
        dy: event[:dy] || 0
      })
    when "player_shoot"
      @room.process_shoot(@player_id, event[:angle] || 0, Time.now.to_f * 1000)
    when "player_reload"
      @room.process_reload(@player_id)
    when "buy_weapon"
      @room.buy_weapon(@player_id, event[:weapon])
    end
  end
  
  def handle_keydown(detail)
    return unless detail
    # Pass keydown events to JavaScript game
    self.script("window.game && window.game.handleKeydown(#{detail.to_json});")
  end
  
  def handle_keyup(detail)
    return unless detail
    # Pass keyup events to JavaScript game
    self.script("window.game && window.game.handleKeyup(#{detail.to_json});")
  end
  
  def handle_click(detail)
    return unless detail
    # Pass click events to JavaScript game
    self.script("window.game && window.game.handleClick(#{detail.to_json});")
  end
  
  def send_message(message)
    # Send game state updates to client
    self.script("window.game && window.game.receiveMessage(#{message.to_json});")
  end
  
  def forward_event(event_type)
    "window.forwardEvent && window.forwardEvent(#{JSON.dump(@id)}, '#{event_type}', event)"
  end
  
  def render(builder)
    builder.tag(:div, id: "cs2d-game", style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; position: relative;") do
      # Game canvas
      builder.tag(:canvas, id: "game-canvas", 
                 style: "display: block; width: 100%; height: 100%; background: #1a1a1a;",
                 tabIndex: 0)
      
      # HUD overlay
      builder.tag(:div, id: "game-hud", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
        render_hud(builder)
      end
      
      # Controls hint
      builder.tag(:div, id: "controls-hint", style: "position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; font-family: monospace; font-size: 12px;") do
        builder.tag(:div) { builder.text("CS2D - Multiplayer") }
        builder.tag(:div) { builder.text("WASD: Move") }
        builder.tag(:div) { builder.text("Mouse: Aim") }
        builder.tag(:div) { builder.text("Click: Shoot") }
        builder.tag(:div) { builder.text("R: Reload") }
        builder.tag(:div) { builder.text("B: Buy Menu") }
      end
      
      # Console output div
      builder.tag(:div, id: "console-output", style: "position: absolute; top: 150px; left: 10px; width: 400px; height: 200px; background: rgba(0,0,0,0.9); color: #0f0; padding: 10px; font-family: monospace; font-size: 10px; overflow-y: auto; border: 1px solid #0f0;") do
        builder.text("Console Output:")
      end
    end
    
    # Include game JavaScript
    builder.tag(:script, type: "text/javascript") do
      builder.raw(game_javascript)
    end
    
    # Initialize game after DOM is ready
    builder.tag(:script, type: "text/javascript") do
      builder.raw(<<~JS)
        // Capture console logs to display on screen
        (function() {
          const consoleOutput = document.getElementById('console-output');
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          
          function addToConsole(message, type) {
            if (consoleOutput) {
              const line = document.createElement('div');
              line.style.color = type === 'error' ? '#f00' : type === 'warn' ? '#ff0' : '#0f0';
              line.textContent = '[' + type + '] ' + message;
              consoleOutput.appendChild(line);
              consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
          }
          
          console.log = function(...args) {
            originalLog.apply(console, args);
            addToConsole(args.join(' '), 'log');
          };
          
          console.error = function(...args) {
            originalError.apply(console, args);
            addToConsole(args.join(' '), 'error');
          };
          
          console.warn = function(...args) {
            originalWarn.apply(console, args);
            addToConsole(args.join(' '), 'warn');
          };
        })();
        
        console.log('CS2D initialization script running...');
        console.log('Document ready state:', document.readyState);
        
        // Create a debug indicator
        const debugDiv = document.createElement('div');
        debugDiv.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: yellow; color: black; padding: 10px; z-index: 10000;';
        debugDiv.textContent = 'CS2D Loading...';
        document.body.appendChild(debugDiv);
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          console.log('Waiting for DOM to load...');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, initializing game...');
            debugDiv.textContent = 'Initializing...';
            window.initCS2DGame('#{@id}', '#{@player_id}');
          });
        } else {
          console.log('DOM already loaded, initializing game immediately...');
          debugDiv.textContent = 'Initializing...';
          window.initCS2DGame('#{@id}', '#{@player_id}');
        }
      JS
    end
  end
  
  private
  
  def render_hud(builder)
    builder.tag(:div, style: "position: absolute; bottom: 20px; left: 20px; color: white; font-family: monospace;") do
      builder.tag(:div, id: "health", style: "font-size: 18px;") { builder.text("HP: 100") }
      builder.tag(:div, id: "armor", style: "font-size: 14px;") { builder.text("Armor: 0") }
      builder.tag(:div, id: "ammo", style: "font-size: 14px;") { builder.text("Ammo: 30/90") }
      builder.tag(:div, id: "money", style: "font-size: 14px; color: #4f4;") { builder.text("$800") }
    end
    
    builder.tag(:div, id: "round-timer", style: "position: absolute; top: 10px; left: 50%; transform: translateX(-50%); color: white; font-size: 24px; font-family: monospace;") do
      builder.text("1:55")
    end
    
    builder.tag(:div, id: "team-scores", style: "position: absolute; top: 50px; left: 50%; transform: translateX(-50%); color: white; font-family: monospace;") do
      builder.tag(:span, style: "color: #44f;") { builder.text("CT: 0") }
      builder.text(" - ")
      builder.tag(:span, style: "color: #f44;") { builder.text("T: 0") }
    end
  end
  
  def game_javascript
    <<~JAVASCRIPT
      console.log('CS2D JavaScript loading...');
      
      // CS2D Game Implementation
      class CS2DGame {
        constructor(viewId, playerId) {
          console.log('CS2DGame constructor called', { viewId, playerId });
          this.viewId = viewId;
          this.playerId = playerId;
          this.canvas = document.getElementById('game-canvas');
          
          if (!this.canvas) {
            console.error('Canvas element not found!');
            this.showError('Canvas element not found!');
            return;
          }
          
          this.ctx = this.canvas.getContext('2d');
          if (!this.ctx) {
            console.error('Failed to get 2D context!');
            this.showError('Failed to get 2D context!');
            return;
          }
          
          console.log('Canvas and context obtained successfully');
          this.setupCanvas();
          this.setupInput();
          
          // Game state
          this.players = {};
          this.bullets = [];
          this.localPlayer = {
            x: 640,
            y: 360,
            angle: 0,
            health: 100,
            armor: 0,
            team: 'ct',
            ammo: 30,
            money: 800
          };
          
          // Input state
          this.keys = {};
          this.mouseX = 0;
          this.mouseY = 0;
          this.lastShootTime = 0;
          this.shootCooldown = 100;
          
          // Start game loop
          this.running = true;
          this.gameLoop();
          
          console.log('CS2D Game initialized successfully!');
          this.showStatus('Game initialized');
        }
        
        showError(message) {
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: red; color: white; padding: 20px; font-size: 18px; z-index: 10000;';
          errorDiv.textContent = 'Error: ' + message;
          document.body.appendChild(errorDiv);
        }
        
        showStatus(message) {
          const statusDiv = document.getElementById('game-status') || document.createElement('div');
          statusDiv.id = 'game-status';
          statusDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,255,0,0.8); color: white; padding: 10px; font-size: 14px; z-index: 10000;';
          statusDiv.textContent = message;
          if (!document.getElementById('game-status')) {
            document.body.appendChild(statusDiv);
          }
        }
        
        setupCanvas() {
          console.log('Setting up canvas...');
          this.canvas.width = 1280;
          this.canvas.height = 720;
          
          // Handle resize
          const resize = () => {
            const container = this.canvas.parentElement;
            const scaleX = container.clientWidth / 1280;
            const scaleY = container.clientHeight / 720;
            const scale = Math.min(scaleX, scaleY);
            
            this.canvas.style.width = (1280 * scale) + 'px';
            this.canvas.style.height = (720 * scale) + 'px';
          };
          
          window.addEventListener('resize', resize);
          resize();
        }
        
        setupInput() {
          // Keyboard input
          document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
              e.preventDefault();
              this.shoot();
            }
            
            if (e.key.toLowerCase() === 'r') {
              this.reload();
            }
            
            if (e.key.toLowerCase() === 'b') {
              this.openBuyMenu();
            }
          });
          
          document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
          });
          
          // Mouse input
          this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            
            // Calculate aim angle
            const dx = this.mouseX - this.localPlayer.x;
            const dy = this.mouseY - this.localPlayer.y;
            this.localPlayer.angle = Math.atan2(dy, dx);
          });
          
          this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.shoot();
          });
          
          // Focus canvas for keyboard input
          this.canvas.focus();
        }
        
        handleKeydown(detail) {
          if (detail && detail.key) {
            this.keys[detail.key.toLowerCase()] = true;
          }
        }
        
        handleKeyup(detail) {
          if (detail && detail.key) {
            this.keys[detail.key.toLowerCase()] = false;
          }
        }
        
        handleClick(detail) {
          this.shoot();
        }
        
        receiveMessage(message) {
          // Handle messages from server
          if (message.type === 'game_state_delta' || message.type === 'full_game_state') {
            if (message.players) {
              this.players = message.players;
              // Update local player if present
              if (this.players[this.playerId]) {
                const serverPlayer = this.players[this.playerId];
                this.localPlayer.x = serverPlayer.x;
                this.localPlayer.y = serverPlayer.y;
                this.localPlayer.health = serverPlayer.health;
                this.localPlayer.armor = serverPlayer.armor;
                this.localPlayer.money = serverPlayer.money;
                this.localPlayer.team = serverPlayer.team;
              }
            }
            if (message.bullets) {
              this.bullets = message.bullets;
            }
            this.updateHUD();
          }
        }
        
        updateMovement() {
          let dx = 0, dy = 0;
          const speed = 5;
          
          if (this.keys['w']) dy -= speed;
          if (this.keys['s']) dy += speed;
          if (this.keys['a']) dx -= speed;
          if (this.keys['d']) dx += speed;
          
          if (dx !== 0 || dy !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              dx = (dx / length) * speed;
              dy = (dy / length) * speed;
            }
            
            // Update local position (client prediction)
            this.localPlayer.x += dx;
            this.localPlayer.y += dy;
            
            // Bounds checking
            this.localPlayer.x = Math.max(20, Math.min(1260, this.localPlayer.x));
            this.localPlayer.y = Math.max(20, Math.min(700, this.localPlayer.y));
            
            // Send movement to server
            this.sendEvent('player_move', { dx: dx, dy: dy });
          }
        }
        
        shoot() {
          const now = Date.now();
          if (now - this.lastShootTime < this.shootCooldown) return;
          
          this.lastShootTime = now;
          this.sendEvent('player_shoot', { angle: this.localPlayer.angle });
          
          // Add local bullet for immediate feedback
          this.bullets.push({
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            angle: this.localPlayer.angle,
            speed: 15,
            owner_id: this.playerId,
            local: true
          });
        }
        
        reload() {
          this.sendEvent('player_reload', {});
        }
        
        openBuyMenu() {
          // Simple buy menu implementation
          const weapon = prompt('Buy weapon: 1=AK47($2700), 2=M4A1($3100), 3=AWP($4750)');
          const weapons = { '1': 'ak47', '2': 'm4a1', '3': 'awp' };
          if (weapons[weapon]) {
            this.sendEvent('buy_weapon', { weapon: weapons[weapon] });
          }
        }
        
        sendEvent(type, data) {
          if (window.forwardEvent) {
            window.forwardEvent(this.viewId, type, data);
          }
        }
        
        updateHUD() {
          const health = document.getElementById('health');
          const armor = document.getElementById('armor');
          const ammo = document.getElementById('ammo');
          const money = document.getElementById('money');
          
          if (health) health.textContent = `HP: ${this.localPlayer.health}`;
          if (armor) armor.textContent = `Armor: ${this.localPlayer.armor}`;
          if (ammo) ammo.textContent = `Ammo: ${this.localPlayer.ammo}/90`;
          if (money) money.textContent = `$${this.localPlayer.money}`;
        }
        
        render() {
          if (!this.ctx) {
            console.error('No context in render!');
            return;
          }
          
          // Clear canvas - use a visible color to test
          this.ctx.fillStyle = '#2a2a2a';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          // Draw grid
          this.ctx.strokeStyle = '#333';
          this.ctx.lineWidth = 0.5;
          for (let x = 0; x <= this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
          }
          for (let y = 0; y <= this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
          }
          
          // Draw bomb sites
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
          this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
          this.ctx.lineWidth = 2;
          
          // Site A
          this.ctx.beginPath();
          this.ctx.arc(200, 200, 50, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.fillStyle = 'yellow';
          this.ctx.font = '20px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('A', 200, 210);
          
          // Site B
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
          this.ctx.beginPath();
          this.ctx.arc(1000, 500, 50, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.fillStyle = 'yellow';
          this.ctx.fillText('B', 1000, 510);
          
          // Draw players
          Object.values(this.players).forEach(player => {
            this.drawPlayer(player);
          });
          
          // Draw local player
          this.drawPlayer(this.localPlayer, true);
          
          // Draw bullets
          this.ctx.fillStyle = '#ff0';
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = '#ff0';
          this.bullets.forEach(bullet => {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
          });
          this.ctx.shadowBlur = 0;
          
          // Update bullets
          this.bullets = this.bullets.filter(bullet => {
            if (bullet.local) {
              bullet.x += Math.cos(bullet.angle) * (bullet.speed || 15);
              bullet.y += Math.sin(bullet.angle) * (bullet.speed || 15);
              return bullet.x > 0 && bullet.x < 1280 && bullet.y > 0 && bullet.y < 720;
            }
            return true;
          });
          
          // Draw crosshair
          this.ctx.strokeStyle = '#0f0';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(this.mouseX - 10, this.mouseY);
          this.ctx.lineTo(this.mouseX + 10, this.mouseY);
          this.ctx.moveTo(this.mouseX, this.mouseY - 10);
          this.ctx.lineTo(this.mouseX, this.mouseY + 10);
          this.ctx.stroke();
        }
        
        drawPlayer(player, isLocal = false) {
          const color = player.team === 'ct' ? '#44f' : '#f44';
          
          // Player body
          this.ctx.fillStyle = isLocal ? '#0f0' : color;
          this.ctx.beginPath();
          this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Player direction
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(player.x, player.y);
          this.ctx.lineTo(
            player.x + Math.cos(player.angle || 0) * 25,
            player.y + Math.sin(player.angle || 0) * 25
          );
          this.ctx.stroke();
          
          // Player name
          if (player.name) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 25);
          }
          
          // Health bar
          if (!isLocal && player.health !== undefined) {
            const barWidth = 30;
            const barHeight = 4;
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth, barHeight);
            
            const healthColor = player.health > 50 ? '#0f0' : player.health > 25 ? '#fa0' : '#f00';
            this.ctx.fillStyle = healthColor;
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth * (player.health/100), barHeight);
          }
        }
        
        gameLoop() {
          if (!this.running) return;
          
          this.updateMovement();
          this.render();
          
          requestAnimationFrame(() => this.gameLoop());
        }
        
        destroy() {
          this.running = false;
        }
      }
      
      // Initialize game
      window.initCS2DGame = function(viewId, playerId) {
        console.log('initCS2DGame called', { viewId, playerId });
        try {
          if (window.game) {
            window.game.destroy();
          }
          window.game = new CS2DGame(viewId, playerId);
          console.log('CS2D Game started successfully with player:', playerId);
        } catch (error) {
          console.error('Failed to initialize game:', error);
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: red; color: white; padding: 20px; z-index: 10000;';
          errorDiv.textContent = 'Failed to initialize: ' + error.message;
          document.body.appendChild(errorDiv);
        }
      };
      
      // Event forwarding
      window.forwardEvent = function(viewId, type, data) {
        // Use Live.js if available, otherwise use a fallback
        if (typeof Live !== 'undefined' && Live.default) {
          const live = Live.default;
          const view = live.views && live.views[viewId];
          if (view) {
            view.forward({
              type: type,
              ...data
            });
          }
        } else {
          // Fallback: try to find the Live context
          const element = document.getElementById('cs2d-game');
          if (element && element.__live) {
            element.__live.forward({
              type: type,
              ...data
            });
          }
        }
      };
    JAVASCRIPT
  end
end

Application = Lively::Application[CS2DView]