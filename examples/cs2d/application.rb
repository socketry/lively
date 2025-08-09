#!/usr/bin/env lively
# frozen_string_literal: true

require_relative "game/game_room"
require_relative "game/player"
require_relative "game/game_state"

class CS2DView < Live::View
  def initialize(...)
    super
    @game_room = GameRoom.new
  end
  
  def bind(page)
    super
    @page = page
    @game_room.add_player(page.id)
    self.update!
  end
  
  def close
    @game_room.remove_player(@page.id)
    super
  end
  
  def handle(event)
    case event[:type]
    when "player_move"
      @game_room.update_player_position(@page.id, event[:x], event[:y])
    when "player_shoot"
      @game_room.player_shoot(@page.id, event[:angle])
    when "player_reload"
      @game_room.player_reload(@page.id)
    when "change_team"
      @game_room.change_team(@page.id, event[:team])
    when "buy_weapon"
      @game_room.buy_weapon(@page.id, event[:weapon])
    when "chat_message"
      @game_room.broadcast_chat(@page.id, event[:message])
    end
    
    broadcast_game_state
  end
  
  def broadcast_game_state
    @game_room.players.each do |player_id, player|
      if page = Live::Page.pages[player_id]
        page.live.push(game_state_json)
      end
    end
  end
  
  def game_state_json
    {
      type: "game_update",
      players: @game_room.players_data,
      bullets: @game_room.bullets_data,
      round_time: @game_room.round_time,
      scores: @game_room.scores
    }.to_json
  end
  
  def render(builder)
    builder.tag(:div, id: "cs2d-container", style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden;") do
      builder.tag(:canvas, id: "game-canvas", style: "display: block;")
      
      builder.tag(:div, id: "game-ui", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%;") do
        render_hud(builder)
        render_scoreboard(builder)
        render_buy_menu(builder)
        render_chat(builder)
      end
    end
    
    builder.tag(:script, type: "module") do
      builder.text(client_game_script)
    end
  end
  
  private
  
  def render_hud(builder)
    builder.tag(:div, id: "hud", style: "position: absolute; bottom: 20px; left: 20px; color: white; font-family: monospace;") do
      builder.tag(:div, id: "health") { builder.text("HP: 100") }
      builder.tag(:div, id: "armor") { builder.text("Armor: 0") }
      builder.tag(:div, id: "ammo") { builder.text("Ammo: 30/90") }
      builder.tag(:div, id: "money") { builder.text("$800") }
    end
  end
  
  def render_scoreboard(builder)
    builder.tag(:div, id: "scoreboard", style: "position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; display: none;") do
      builder.tag(:h3) { builder.text("Scoreboard") }
      builder.tag(:div, id: "team-ct") { builder.text("Counter-Terrorists") }
      builder.tag(:div, id: "team-t") { builder.text("Terrorists") }
    end
  end
  
  def render_buy_menu(builder)
    builder.tag(:div, id: "buy-menu", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: white; padding: 20px; display: none;") do
      builder.tag(:h2) { builder.text("Buy Menu") }
      builder.tag(:div, class: "weapon-categories") do
        builder.tag(:button, onclick: "buyWeapon('ak47')") { builder.text("AK-47 - $2700") }
        builder.tag(:button, onclick: "buyWeapon('m4a1')") { builder.text("M4A1 - $3100") }
        builder.tag(:button, onclick: "buyWeapon('awp')") { builder.text("AWP - $4750") }
      end
    end
  end
  
  def render_chat(builder)
    builder.tag(:div, id: "chat", style: "position: absolute; bottom: 100px; left: 20px; width: 300px; height: 150px;") do
      builder.tag(:div, id: "chat-messages", style: "background: rgba(0,0,0,0.5); color: white; padding: 5px; height: 120px; overflow-y: auto;")
      builder.tag(:input, id: "chat-input", type: "text", placeholder: "Press T to chat...", 
                 style: "width: 100%; display: none;")
    end
  end
  
  def client_game_script
    <<~JAVASCRIPT
      import Live from "/_components/@socketry/live/Live.js";
      
      class CS2DGame {
        constructor() {
          this.canvas = document.getElementById('game-canvas');
          this.ctx = this.canvas.getContext('2d');
          this.setupCanvas();
          this.setupInput();
          this.players = {};
          this.bullets = [];
          this.localPlayer = null;
          this.live = Live.connect();
          this.setupNetworking();
          
          // Mac 優化：瞄準系統
          this.aimAngle = 0;
          this.aimDistance = 100;
          this.autoAimEnabled = true;
          this.aimSensitivity = 0.15;
          this.lastShootTime = 0;
          this.shootCooldown = 100; // ms
          
          this.gameLoop();
          this.showControls();
        }
        
        setupCanvas() {
          this.canvas.width = window.innerWidth;
          this.canvas.height = window.innerHeight;
          window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
          });
        }
        
        setupInput() {
          this.keys = {};
          
          // 鍵盤控制
          document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // 空白鍵射擊
            if (e.key === ' ') {
              e.preventDefault();
              this.shoot();
            }
            
            // 方向鍵或 IJKL 控制瞄準
            if (e.key === 'ArrowLeft' || e.key === 'j') {
              this.aimAngle -= this.aimSensitivity;
            }
            if (e.key === 'ArrowRight' || e.key === 'l') {
              this.aimAngle += this.aimSensitivity;
            }
            if (e.key === 'ArrowUp' || e.key === 'i') {
              this.aimDistance = Math.min(this.aimDistance + 10, 200);
            }
            if (e.key === 'ArrowDown' || e.key === 'k') {
              this.aimDistance = Math.max(this.aimDistance - 10, 50);
            }
            
            // 快速 180 度轉身
            if (e.key === 'q' || e.key === 'Q') {
              this.aimAngle += Math.PI;
            }
            
            // 切換自動瞄準
            if (e.key === 'v' || e.key === 'V') {
              this.autoAimEnabled = !this.autoAimEnabled;
              this.showNotification(this.autoAimEnabled ? '自動瞄準：開啟' : '自動瞄準：關閉');
            }
            
            if (e.key === 'b' || e.key === 'B') {
              this.toggleBuyMenu();
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              this.toggleScoreboard();
            }
            if (e.key === 't' || e.key === 'T') {
              e.preventDefault();
              this.toggleChat();
            }
            if (e.key === 'r' || e.key === 'R') {
              this.reload();
            }
            
            // 數字鍵快速購買
            if (e.key >= '1' && e.key <= '5') {
              this.quickBuy(e.key);
            }
          });
          
          document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
          });
          
          // 觸控板支援
          this.setupTouchpad();
        }
        
        setupTouchpad() {
          let touchStartX = 0;
          let touchStartY = 0;
          
          // 雙指滑動控制瞄準
          this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            // 水平滾動改變瞄準角度
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
              this.aimAngle += e.deltaX * 0.01;
            }
            // 垂直滾動改變瞄準距離
            else {
              this.aimDistance = Math.max(50, Math.min(200, this.aimDistance - e.deltaY));
            }
          });
          
          // 雙指點擊射擊
          this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.shoot();
          });
          
          // 單指點擊也可射擊
          this.canvas.addEventListener('click', (e) => {
            // 如果點擊的是遊戲區域，則射擊
            if (e.target === this.canvas) {
              this.shoot();
            }
          });
        }
        
        setupNetworking() {
          this.live.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'game_update') {
              this.updateGameState(data);
            }
          });
        }
        
        updateGameState(data) {
          this.players = data.players || {};
          this.bullets = data.bullets || [];
          this.updateUI(data);
          
          // 自動瞄準輔助
          if (this.autoAimEnabled && this.localPlayer) {
            this.applyAutoAim();
          }
        }
        
        applyAutoAim() {
          const player = this.players[this.localPlayer];
          if (!player) return;
          
          let closestEnemy = null;
          let closestDistance = Infinity;
          
          // 找最近的敵人
          Object.values(this.players).forEach(enemy => {
            if (enemy.id === this.localPlayer || enemy.team === player.team || enemy.dead) return;
            
            const distance = Math.sqrt(
              Math.pow(enemy.x - player.x, 2) + 
              Math.pow(enemy.y - player.y, 2)
            );
            
            if (distance < closestDistance && distance < 300) {
              closestDistance = distance;
              closestEnemy = enemy;
            }
          });
          
          // 緩慢調整瞄準角度朝向最近的敵人
          if (closestEnemy) {
            const targetAngle = Math.atan2(
              closestEnemy.y - player.y,
              closestEnemy.x - player.x
            );
            
            // 平滑過渡
            const angleDiff = targetAngle - this.aimAngle;
            this.aimAngle += angleDiff * 0.1;
          }
        }
        
        updateUI(data) {
          if (this.localPlayer) {
            const player = this.players[this.localPlayer];
            if (player) {
              document.getElementById('health').textContent = `HP: ${player.health}`;
              document.getElementById('armor').textContent = `Armor: ${player.armor}`;
              document.getElementById('money').textContent = `$${player.money}`;
              document.getElementById('ammo').textContent = `Ammo: ${player.ammo || '30/90'}`;
            }
          }
        }
        
        handleMovement() {
          let dx = 0, dy = 0;
          if (this.keys['w']) dy -= 1;
          if (this.keys['s']) dy += 1;
          if (this.keys['a']) dx -= 1;
          if (this.keys['d']) dx += 1;
          
          // Shift 加速跑
          const speed = this.keys['shift'] ? 7 : 5;
          
          if (dx !== 0 || dy !== 0) {
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            this.live.push({
              type: 'player_move',
              x: vx,
              y: vy
            });
          }
        }
        
        shoot() {
          const now = Date.now();
          if (now - this.lastShootTime < this.shootCooldown) return;
          
          this.lastShootTime = now;
          this.live.push({
            type: 'player_shoot',
            angle: this.aimAngle
          });
        }
        
        reload() {
          this.live.push({
            type: 'player_reload'
          });
        }
        
        quickBuy(key) {
          const weapons = {
            '1': 'ak47',
            '2': 'm4a1',
            '3': 'awp',
            '4': 'deagle',
            '5': 'armor'
          };
          
          if (weapons[key]) {
            this.live.push({
              type: 'buy_weapon',
              weapon: weapons[key]
            });
            this.showNotification(`購買：${weapons[key].toUpperCase()}`);
          }
        }
        
        showNotification(text) {
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #ffaa00;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 10000;
            animation: fadeOut 2s forwards;
          `;
          notification.textContent = text;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 2000);
        }
        
        showControls() {
          const controls = document.createElement('div');
          controls.id = 'controls-help';
          controls.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            font-family: monospace;
            z-index: 1000;
          `;
          controls.innerHTML = `
            <b>Mac 優化控制</b><br>
            移動：WASD (Shift 加速)<br>
            瞄準：方向鍵 或 IJKL<br>
            射擊：空白鍵 或 點擊<br>
            換彈：R<br>
            快速轉身：Q<br>
            自動瞄準：V<br>
            購買：B 或 數字鍵1-5<br>
            <br>
            <b>觸控板手勢</b><br>
            雙指橫滑：旋轉瞄準<br>
            雙指縱滑：調整距離<br>
            雙指點擊：射擊
          `;
          document.body.appendChild(controls);
          
          // 5秒後自動隱藏，按 H 可再次顯示
          setTimeout(() => {
            controls.style.opacity = '0.3';
          }, 5000);
        }
        
        render() {
          this.ctx.fillStyle = '#2a2a2a';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          // 繪製地圖格線
          this.ctx.strokeStyle = '#333';
          this.ctx.lineWidth = 0.5;
          for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
          }
          for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
          }
          
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          
          // 繪製玩家
          Object.values(this.players).forEach(player => {
            // 玩家身體
            this.ctx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 玩家方向指示
            if (player.id === this.localPlayer) {
              this.ctx.strokeStyle = '#ffffff';
              this.ctx.lineWidth = 3;
              this.ctx.beginPath();
              this.ctx.moveTo(player.x, player.y);
              this.ctx.lineTo(
                player.x + Math.cos(this.aimAngle) * 25,
                player.y + Math.sin(this.aimAngle) * 25
              );
              this.ctx.stroke();
            }
            
            // 玩家名稱與血量條
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 25);
            
            // 血量條
            const barWidth = 30;
            const barHeight = 4;
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth, barHeight);
            this.ctx.fillStyle = player.health > 50 ? '#00ff00' : player.health > 25 ? '#ffaa00' : '#ff0000';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth * (player.health/100), barHeight);
          });
          
          // 繪製子彈
          this.ctx.shadowBlur = 5;
          this.ctx.shadowColor = '#ffff00';
          this.ctx.fillStyle = '#ffff00';
          this.bullets.forEach(bullet => {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
          });
          this.ctx.shadowBlur = 0;
          
          // 繪製瞄準系統 (針對本地玩家)
          if (this.localPlayer && this.players[this.localPlayer]) {
            const player = this.players[this.localPlayer];
            const aimX = player.x + Math.cos(this.aimAngle) * this.aimDistance;
            const aimY = player.y + Math.sin(this.aimAngle) * this.aimDistance;
            
            // 瞄準線
            this.ctx.strokeStyle = this.autoAimEnabled ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            this.ctx.lineTo(aimX, aimY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // 準心
            this.ctx.strokeStyle = this.autoAimEnabled ? '#ff4444' : '#00ff00';
            this.ctx.lineWidth = 2;
            
            // 圓形準心
            this.ctx.beginPath();
            this.ctx.arc(aimX, aimY, 15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 十字準心
            this.ctx.beginPath();
            this.ctx.moveTo(aimX - 20, aimY);
            this.ctx.lineTo(aimX - 8, aimY);
            this.ctx.moveTo(aimX + 8, aimY);
            this.ctx.lineTo(aimX + 20, aimY);
            this.ctx.moveTo(aimX, aimY - 20);
            this.ctx.lineTo(aimX, aimY - 8);
            this.ctx.moveTo(aimX, aimY + 8);
            this.ctx.lineTo(aimX, aimY + 20);
            this.ctx.stroke();
            
            // 自動瞄準指示器
            if (this.autoAimEnabled) {
              this.ctx.fillStyle = 'rgba(255,0,0,0.5)';
              this.ctx.font = '10px Arial';
              this.ctx.textAlign = 'center';
              this.ctx.fillText('AUTO', aimX, aimY - 25);
            }
          }
        }
        
        toggleBuyMenu() {
          const menu = document.getElementById('buy-menu');
          menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        
        toggleScoreboard() {
          const scoreboard = document.getElementById('scoreboard');
          scoreboard.style.display = scoreboard.style.display === 'none' ? 'block' : 'none';
        }
        
        toggleChat() {
          const input = document.getElementById('chat-input');
          input.style.display = input.style.display === 'none' ? 'block' : 'none';
          if (input.style.display === 'block') {
            input.focus();
          }
        }
        
        gameLoop() {
          this.handleMovement();
          this.render();
          requestAnimationFrame(() => this.gameLoop());
        }
      }
      
      // 啟動遊戲
      window.addEventListener('DOMContentLoaded', () => {
        new CS2DGame();
      });
      
      // 購買武器函數
      window.buyWeapon = function(weapon) {
        Live.current?.push({
          type: 'buy_weapon',
          weapon: weapon
        });
        document.getElementById('buy-menu').style.display = 'none';
      };
    JAVASCRIPT
  end
end

Application = Lively::Application[CS2DView]