#!/usr/bin/env ruby
# frozen_string_literal: true

require 'webrick'
require 'json'

puts "🎮 Starting CS 1.6 2D MVP Server..."
puts "📱 Mac touchpad optimized!"
puts "🌐 Open http://localhost:9292 in your browser"
puts "Press Ctrl+C to stop"

class CS16Server < WEBrick::HTTPServlet::AbstractServlet
  def do_GET(request, response)
    response.status = 200
    response['Content-Type'] = 'text/html; charset=utf-8'
    response.body = <<~HTML
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>CS 1.6 2D - MVP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      background: #1a1a1a; 
      color: white; 
      overflow: hidden;
      user-select: none;
    }
    #game-canvas { 
      cursor: crosshair; 
      display: block;
      image-rendering: pixelated;
    }
    
    /* 頂部資訊列 */
    #top-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
      pointer-events: none;
    }
    
    .score {
      display: flex;
      gap: 20px;
      font-size: 24px;
      font-weight: bold;
    }
    
    .ct-score { color: #4488ff; }
    .t-score { color: #ff8844; }
    
    #round-timer {
      font-size: 32px;
      font-weight: bold;
      color: white;
    }
    
    #round-info {
      text-align: right;
      font-size: 14px;
    }
    
    /* 底部資訊列 */
    #bottom-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 20px;
      pointer-events: none;
    }
    
    .health-armor {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .bar {
      width: 200px;
      height: 20px;
      background: rgba(0,0,0,0.5);
      position: relative;
      border: 1px solid #444;
    }
    
    .bar-fill {
      height: 100%;
      transition: width 0.3s;
    }
    
    .health-fill { background: linear-gradient(to right, #ff4444, #ff6666); }
    .armor-fill { background: linear-gradient(to right, #4444ff, #6666ff); }
    
    .bar-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: bold;
    }
    
    #money {
      font-size: 28px;
      color: #44ff44;
      font-weight: bold;
    }
    
    #ammo {
      text-align: right;
    }
    
    #ammo-display {
      font-size: 32px;
      font-weight: bold;
    }
    
    #weapon-name {
      font-size: 14px;
      color: #aaa;
      margin-top: 5px;
    }
    
    /* 控制提示 */
    #controls {
      position: absolute;
      top: 70px;
      left: 20px;
      background: rgba(0,0,0,0.8);
      padding: 15px;
      border-radius: 5px;
      font-size: 12px;
      border: 1px solid #444;
    }
    
    #controls h3 {
      color: #ffaa00;
      margin-bottom: 10px;
    }
    
    /* 購買選單 */
    #buy-menu {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95);
      border: 2px solid #666;
      border-radius: 10px;
      padding: 20px;
      display: none;
      min-width: 400px;
    }
    
    #buy-menu h2 {
      color: #ffaa00;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .buy-category {
      margin-bottom: 15px;
    }
    
    .buy-category h3 {
      color: #888;
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .buy-item {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 5px;
      background: rgba(255,255,255,0.1);
      border: 1px solid #444;
      color: white;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }
    
    .buy-item:hover {
      background: rgba(255,255,255,0.2);
      border-color: #ffaa00;
    }
    
    .buy-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* 炸彈指示器 */
    #bomb-indicator {
      position: absolute;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      display: none;
      text-align: center;
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
    
    #bomb-timer {
      font-size: 32px;
      font-weight: bold;
      color: #ffff00;
    }
    
    /* 死亡畫面 */
    #death-screen {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      justify-content: center;
      align-items: center;
    }
    
    #death-message {
      text-align: center;
      color: #ff4444;
      font-size: 48px;
      font-weight: bold;
    }
    
    .notification {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      color: #ffaa00;
      padding: 20px 40px;
      border-radius: 5px;
      font-size: 20px;
      font-weight: bold;
      z-index: 10000;
      animation: fadeOut 2s forwards;
    }
    
    @keyframes fadeOut {
      0%, 70% { opacity: 1; }
      100% { opacity: 0; }
    }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  
  <!-- UI 元素 -->
  <div id="top-bar">
    <div class="score">
      <div class="ct-score">CT: <span id="ct-score-value">0</span></div>
      <div>-</div>
      <div class="t-score">T: <span id="t-score-value">0</span></div>
    </div>
    <div id="round-timer">1:55</div>
    <div id="round-info">
      <div>Round <span id="round-number">1</span>/30</div>
      <div id="round-phase" style="color: #ffaa00;">Buy Time</div>
    </div>
  </div>
  
  <div id="bottom-bar">
    <div class="health-armor">
      <div class="bar">
        <div class="bar-fill health-fill" id="health-bar" style="width: 100%;"></div>
        <div class="bar-text">100 HP</div>
      </div>
      <div class="bar">
        <div class="bar-fill armor-fill" id="armor-bar" style="width: 0%;"></div>
        <div class="bar-text">0 Armor</div>
      </div>
    </div>
    <div id="money">$800</div>
    <div id="ammo">
      <div id="ammo-display">
        <span id="ammo-clip">30</span> / <span id="ammo-reserve">90</span>
      </div>
      <div id="weapon-name">Glock-18</div>
    </div>
  </div>
  
  <div id="controls">
    <h3>🎮 Mac 觸控板優化</h3>
    <b>主要控制 (推薦):</b><br>
    🖱️ 雙指橫滑 - 精準旋轉瞄準<br>
    🖱️ 雙指縱滑 - 調整瞄準距離<br>
    🖱️ 單指點擊 - 射擊<br>
    🖱️ 雙指點擊 - 快速射擊<br>
    <br>
    <b>鍵盤控制:</b><br>
    移動: WASD (Shift 跑)<br>
    瞄準: 方向鍵/IJKL<br>
    射擊: 空白鍵<br>
    換彈: R | 互動: E<br>
    購買: B 或 數字鍵 1-5<br>
    快速轉身: Q (180°)<br>
    <br>
    <small>💡 提示: V 鍵可開啟輔助瞄準</small>
  </div>
  
  <div id="buy-menu">
    <h2>購買選單</h2>
    <div class="buy-category">
      <h3>手槍 PISTOLS</h3>
      <button class="buy-item" data-weapon="deagle" data-price="650">Desert Eagle - $650</button>
    </div>
    <div class="buy-category">
      <h3>步槍 RIFLES</h3>
      <button class="buy-item" data-weapon="ak47" data-price="2700">AK-47 - $2700 (T)</button>
      <button class="buy-item" data-weapon="m4a1" data-price="3100">M4A1 - $3100 (CT)</button>
      <button class="buy-item" data-weapon="awp" data-price="4750">AWP - $4750</button>
    </div>
    <div class="buy-category">
      <h3>裝備 EQUIPMENT</h3>
      <button class="buy-item" data-weapon="kevlar" data-price="650">Kevlar Vest - $650</button>
      <button class="buy-item" data-weapon="helmet" data-price="350">Helmet - $350</button>
      <button class="buy-item" data-weapon="defuse" data-price="400">Defuse Kit - $400 (CT)</button>
    </div>
    <div style="margin-top: 15px; text-align: center; color: #666; font-size: 12px;">
      按 B 關閉 • 數字鍵 1-5 快速購買
    </div>
  </div>
  
  <div id="bomb-indicator" style="display: none;">
    <div>💣 炸彈已安裝</div>
    <div id="bomb-timer">0:45</div>
  </div>
  
  <div id="death-screen">
    <div id="death-message">
      <div>YOU DIED</div>
      <div style="font-size: 20px; margin-top: 10px;">觀戰中...</div>
    </div>
  </div>
  
  <script>
    // CS 1.6 2D MVP 遊戲
    class CS16Game {
      constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // 遊戲狀態
        this.gameState = {
          phase: 'buy',
          roundTime: 115,
          ctScore: 0,
          tScore: 0,
          roundNumber: 1,
          bombPlanted: false,
          bombTimer: 45,
          players: {},
          bullets: [],
          map: null
        };
        
        // 本地玩家
        this.localPlayer = {
          id: 'player-' + Math.random().toString(36).substr(2, 9),
          name: 'Player',
          team: Math.random() > 0.5 ? 'ct' : 't',
          x: 640,
          y: 360,
          angle: 0,
          health: 100,
          armor: 0,
          money: 800,
          alive: true,
          weapon: { name: 'Glock-18', damage: 28, firerate: 150, ammo: { clip: 20, reserve: 120 } }
        };
        
        // 輸入
        this.keys = {};
        this.aimAngle = 0;
        this.aimDistance = 150;
        this.autoAim = false;  // 預設關閉，不會自動瞄準
        this.lastShootTime = 0;
        
        // 敵人 (單機模式)
        this.enemies = [];
        this.spawnEnemies();
        
        this.setupInput();
        this.setupMap();
        this.gameLoop();
        
        // 5秒後隱藏控制提示
        setTimeout(() => {
          document.getElementById('controls').style.opacity = '0.3';
        }, 5000);
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
        // 鍵盤控制
        document.addEventListener('keydown', (e) => {
          this.keys[e.key.toLowerCase()] = true;
          
          // 空白鍵射擊
          if (e.key === ' ') {
            e.preventDefault();
            this.shoot();
          }
          
          // 方向鍵瞄準
          if (e.key === 'ArrowLeft' || e.key === 'j') this.aimAngle -= 0.15;
          if (e.key === 'ArrowRight' || e.key === 'l') this.aimAngle += 0.15;
          if (e.key === 'ArrowUp' || e.key === 'i') this.aimDistance = Math.min(this.aimDistance + 10, 250);
          if (e.key === 'ArrowDown' || e.key === 'k') this.aimDistance = Math.max(this.aimDistance - 10, 50);
          
          // Q 快速轉身
          if (e.key === 'q') this.aimAngle += Math.PI;
          
          // V 切換輔助瞄準（選擇性使用）
          if (e.key === 'v') {
            this.autoAim = !this.autoAim;
            this.showNotification(this.autoAim ? '輔助瞄準: 開啟' : '輔助瞄準: 關閉');
          }
          
          // B 購買選單
          if (e.key === 'b') {
            const menu = document.getElementById('buy-menu');
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
          }
          
          // R 換彈
          if (e.key === 'r') {
            this.reload();
          }
          
          // E 互動
          if (e.key === 'e') {
            this.interact();
          }
          
          // 數字鍵快速購買
          if (e.key >= '1' && e.key <= '5') {
            this.quickBuy(e.key);
          }
        });
        
        document.addEventListener('keyup', (e) => {
          this.keys[e.key.toLowerCase()] = false;
        });
        
        // 觸控板精準控制
        this.touchpadSensitivity = 0.005;  // 可調整靈敏度
        this.touchpadSmoothing = 0.3;     // 平滑係數
        this.lastTouchpadX = 0;
        this.lastTouchpadY = 0;
        
        this.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          
          // 更精準的觸控板控制
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            // 水平滑動 - 旋轉瞄準
            const smoothedDelta = e.deltaX * this.touchpadSensitivity;
            this.aimAngle += smoothedDelta;
          } else {
            // 垂直滑動 - 調整瞄準距離
            const smoothedDelta = e.deltaY * 0.5;
            this.aimDistance = Math.max(80, Math.min(200, this.aimDistance - smoothedDelta));
          }
          
          // 角度正規化
          while (this.aimAngle < 0) this.aimAngle += Math.PI * 2;
          while (this.aimAngle > Math.PI * 2) this.aimAngle -= Math.PI * 2;
        });
        
        // 點擊射擊 - 增加精準度檢查
        this.canvas.addEventListener('click', (e) => {
          // 防止誤觸
          if (e.button === 0) {  // 左鍵
            this.shoot();
          }
        });
        this.canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.shoot();
        });
        
        // 購買按鈕
        document.querySelectorAll('.buy-item').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const weapon = e.target.dataset.weapon;
            const price = parseInt(e.target.dataset.price);
            this.buyWeapon(weapon, price);
          });
        });
      }
      
      setupMap() {
        this.gameState.map = {
          width: 1600,
          height: 900,
          walls: [
            { x: 0, y: 0, width: 1600, height: 20 },
            { x: 0, y: 880, width: 1600, height: 20 },
            { x: 0, y: 0, width: 20, height: 900 },
            { x: 1580, y: 0, width: 20, height: 900 },
            { x: 400, y: 200, width: 100, height: 500 },
            { x: 1100, y: 200, width: 100, height: 500 },
            { x: 600, y: 350, width: 400, height: 200 }
          ],
          bombSites: [
            { name: 'A', x: 300, y: 450, radius: 100 },
            { name: 'B', x: 1300, y: 450, radius: 100 }
          ]
        };
      }
      
      spawnEnemies() {
        // 生成 AI 敵人
        for (let i = 0; i < 3; i++) {
          this.enemies.push({
            id: 'enemy-' + i,
            name: 'Bot' + i,
            team: this.localPlayer.team === 'ct' ? 't' : 'ct',
            x: 200 + Math.random() * 1200,
            y: 200 + Math.random() * 500,
            angle: Math.random() * Math.PI * 2,
            health: 100,
            armor: 0,
            alive: true,
            lastShoot: 0,
            moveTimer: 0
          });
        }
      }
      
      handleMovement() {
        if (!this.localPlayer.alive) return;
        
        let dx = 0, dy = 0;
        if (this.keys['w']) dy = -1;
        if (this.keys['s']) dy = 1;
        if (this.keys['a']) dx = -1;
        if (this.keys['d']) dx = 1;
        
        if (dx !== 0 || dy !== 0) {
          const speed = this.keys['shift'] ? 7 : 5;
          const angle = Math.atan2(dy, dx);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          
          const newX = this.localPlayer.x + vx;
          const newY = this.localPlayer.y + vy;
          
          if (!this.checkCollision(newX, newY, 15)) {
            this.localPlayer.x = newX;
            this.localPlayer.y = newY;
          }
        }
        
        this.localPlayer.angle = this.aimAngle;
      }
      
      checkCollision(x, y, radius) {
        // 邊界檢查
        if (x - radius < 0 || x + radius > this.gameState.map.width) return true;
        if (y - radius < 0 || y + radius > this.gameState.map.height) return true;
        
        // 牆壁碰撞
        for (const wall of this.gameState.map.walls) {
          if (x + radius > wall.x && 
              x - radius < wall.x + wall.width &&
              y + radius > wall.y && 
              y - radius < wall.y + wall.height) {
            return true;
          }
        }
        
        return false;
      }
      
      shoot() {
        if (!this.localPlayer.alive) return;
        
        const now = Date.now();
        if (now - this.lastShootTime < this.localPlayer.weapon.firerate) return;
        if (this.localPlayer.weapon.ammo.clip <= 0) {
          this.showNotification('需要換彈！');
          return;
        }
        
        this.lastShootTime = now;
        this.localPlayer.weapon.ammo.clip--;
        
        // 創建子彈
        this.gameState.bullets.push({
          x: this.localPlayer.x,
          y: this.localPlayer.y,
          vx: Math.cos(this.aimAngle) * 20,
          vy: Math.sin(this.aimAngle) * 20,
          damage: this.localPlayer.weapon.damage,
          owner: this.localPlayer.id,
          team: this.localPlayer.team,
          life: 60
        });
        
        this.updateAmmoDisplay();
      }
      
      reload() {
        if (this.localPlayer.weapon.ammo.clip >= 30) return;
        if (this.localPlayer.weapon.ammo.reserve <= 0) return;
        
        const needed = 30 - this.localPlayer.weapon.ammo.clip;
        const available = Math.min(needed, this.localPlayer.weapon.ammo.reserve);
        
        this.localPlayer.weapon.ammo.clip += available;
        this.localPlayer.weapon.ammo.reserve -= available;
        
        this.updateAmmoDisplay();
        this.showNotification('換彈完成！');
      }
      
      interact() {
        // 檢查是否在炸彈點
        for (const site of this.gameState.map.bombSites) {
          const dist = Math.hypot(this.localPlayer.x - site.x, this.localPlayer.y - site.y);
          if (dist < site.radius) {
            if (this.localPlayer.team === 't' && !this.gameState.bombPlanted) {
              this.plantBomb(site);
            } else if (this.localPlayer.team === 'ct' && this.gameState.bombPlanted) {
              this.defuseBomb();
            }
          }
        }
      }
      
      plantBomb(site) {
        this.gameState.bombPlanted = true;
        this.gameState.bombTimer = 45;
        this.gameState.bombSite = site;
        this.showNotification('炸彈已安裝！');
        document.getElementById('bomb-indicator').style.display = 'block';
      }
      
      defuseBomb() {
        this.gameState.bombPlanted = false;
        this.showNotification('炸彈已拆除！CT 勝利！');
        document.getElementById('bomb-indicator').style.display = 'none';
        this.endRound('ct');
      }
      
      buyWeapon(weapon, price) {
        if (this.gameState.phase !== 'buy') {
          this.showNotification('只能在購買時間購買！');
          return;
        }
        
        if (this.localPlayer.money < price) {
          this.showNotification('金錢不足！');
          return;
        }
        
        // 隊伍限制檢查
        if ((weapon === 'ak47' && this.localPlayer.team === 'ct') ||
            (weapon === 'm4a1' && this.localPlayer.team === 't') ||
            (weapon === 'defuse' && this.localPlayer.team === 't')) {
          this.showNotification('你的隊伍不能購買此武器！');
          return;
        }
        
        this.localPlayer.money -= price;
        document.getElementById('money').textContent = '$' + this.localPlayer.money;
        
        // 更新武器
        const weapons = {
          'deagle': { name: 'Desert Eagle', damage: 48, firerate: 225, ammo: { clip: 7, reserve: 35 } },
          'ak47': { name: 'AK-47', damage: 36, firerate: 100, ammo: { clip: 30, reserve: 90 } },
          'm4a1': { name: 'M4A1', damage: 33, firerate: 90, ammo: { clip: 30, reserve: 90 } },
          'awp': { name: 'AWP', damage: 115, firerate: 1450, ammo: { clip: 10, reserve: 30 } },
          'kevlar': null,
          'helmet': null,
          'defuse': null
        };
        
        if (weapons[weapon]) {
          this.localPlayer.weapon = weapons[weapon];
          document.getElementById('weapon-name').textContent = this.localPlayer.weapon.name;
          this.updateAmmoDisplay();
        } else if (weapon === 'kevlar') {
          this.localPlayer.armor = 100;
          this.updateHealthArmor();
        }
        
        this.showNotification('已購買: ' + weapon.toUpperCase());
        document.getElementById('buy-menu').style.display = 'none';
      }
      
      quickBuy(key) {
        const quickBuys = {
          '1': { weapon: 'ak47', price: 2700 },
          '2': { weapon: 'm4a1', price: 3100 },
          '3': { weapon: 'awp', price: 4750 },
          '4': { weapon: 'deagle', price: 650 },
          '5': { weapon: 'kevlar', price: 650 }
        };
        
        if (quickBuys[key]) {
          this.buyWeapon(quickBuys[key].weapon, quickBuys[key].price);
        }
      }
      
      updateAI() {
        this.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          
          // 簡單 AI 移動
          enemy.moveTimer++;
          if (enemy.moveTimer > 60) {
            enemy.angle += (Math.random() - 0.5) * Math.PI;
            enemy.moveTimer = 0;
          }
          
          const speed = 3;
          const newX = enemy.x + Math.cos(enemy.angle) * speed;
          const newY = enemy.y + Math.sin(enemy.angle) * speed;
          
          if (!this.checkCollision(newX, newY, 15)) {
            enemy.x = newX;
            enemy.y = newY;
          } else {
            enemy.angle += Math.PI;
          }
          
          // AI 射擊
          const dist = Math.hypot(this.localPlayer.x - enemy.x, this.localPlayer.y - enemy.y);
          if (dist < 400 && this.localPlayer.alive) {
            const now = Date.now();
            if (now - enemy.lastShoot > 500) {
              enemy.lastShoot = now;
              const angle = Math.atan2(this.localPlayer.y - enemy.y, this.localPlayer.x - enemy.x);
              
              this.gameState.bullets.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * 20,
                vy: Math.sin(angle) * 20,
                damage: 25,
                owner: enemy.id,
                team: enemy.team,
                life: 60
              });
            }
          }
        });
      }
      
      updateBullets() {
        this.gameState.bullets = this.gameState.bullets.filter(bullet => {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;
          bullet.life--;
          
          // 牆壁碰撞
          if (this.checkCollision(bullet.x, bullet.y, 2)) {
            return false;
          }
          
          // 檢查擊中玩家
          if (bullet.owner !== this.localPlayer.id && bullet.team !== this.localPlayer.team) {
            const dist = Math.hypot(this.localPlayer.x - bullet.x, this.localPlayer.y - bullet.y);
            if (dist < 15 && this.localPlayer.alive) {
              this.takeDamage(bullet.damage);
              return false;
            }
          }
          
          // 檢查擊中敵人
          this.enemies.forEach(enemy => {
            if (bullet.owner === this.localPlayer.id && enemy.alive) {
              const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
              if (dist < 15) {
                enemy.health -= bullet.damage;
                if (enemy.health <= 0) {
                  enemy.alive = false;
                  this.localPlayer.money += 300;
                  document.getElementById('money').textContent = '$' + this.localPlayer.money;
                  this.showNotification('擊殺 +$300');
                }
                bullet.life = 0;
              }
            }
          });
          
          return bullet.life > 0;
        });
      }
      
      takeDamage(damage) {
        if (this.localPlayer.armor > 0) {
          const absorbed = Math.min(damage * 0.5, this.localPlayer.armor);
          this.localPlayer.armor -= absorbed;
          damage -= absorbed * 0.5;
        }
        
        this.localPlayer.health = Math.max(0, this.localPlayer.health - damage);
        this.updateHealthArmor();
        
        if (this.localPlayer.health <= 0) {
          this.localPlayer.alive = false;
          document.getElementById('death-screen').style.display = 'flex';
        }
      }
      
      updateHealthArmor() {
        document.getElementById('health-bar').style.width = this.localPlayer.health + '%';
        document.querySelector('.health-fill').parentElement.querySelector('.bar-text').textContent = this.localPlayer.health + ' HP';
        
        document.getElementById('armor-bar').style.width = this.localPlayer.armor + '%';
        document.querySelector('.armor-fill').parentElement.querySelector('.bar-text').textContent = this.localPlayer.armor + ' Armor';
      }
      
      updateAmmoDisplay() {
        document.getElementById('ammo-clip').textContent = this.localPlayer.weapon.ammo.clip;
        document.getElementById('ammo-reserve').textContent = this.localPlayer.weapon.ammo.reserve;
      }
      
      updateAutoAim() {
        // 輔助瞄準 - 只在主動開啟時生效
        if (!this.autoAim || !this.localPlayer.alive) return;
        
        let closest = null;
        let minDist = Infinity;
        
        this.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          const dist = Math.hypot(enemy.x - this.localPlayer.x, enemy.y - this.localPlayer.y);
          if (dist < minDist && dist < 400) {
            minDist = dist;
            closest = enemy;
          }
        });
        
        if (closest) {
          const targetAngle = Math.atan2(closest.y - this.localPlayer.y, closest.x - this.localPlayer.x);
          const diff = targetAngle - this.aimAngle;
          this.aimAngle += diff * 0.1;
        }
      }
      
      endRound(winner) {
        if (winner === 'ct') {
          this.gameState.ctScore++;
        } else {
          this.gameState.tScore++;
        }
        
        document.getElementById('ct-score-value').textContent = this.gameState.ctScore;
        document.getElementById('t-score-value').textContent = this.gameState.tScore;
        
        // 重置回合
        setTimeout(() => {
          this.resetRound();
        }, 3000);
      }
      
      resetRound() {
        this.gameState.roundNumber++;
        this.gameState.phase = 'buy';
        this.gameState.roundTime = 115;
        this.gameState.bombPlanted = false;
        
        // 復活玩家
        this.localPlayer.health = 100;
        this.localPlayer.alive = true;
        this.localPlayer.x = 640;
        this.localPlayer.y = this.localPlayer.team === 'ct' ? 200 : 700;
        
        // 復活敵人
        this.enemies.forEach((enemy, i) => {
          enemy.alive = true;
          enemy.health = 100;
          enemy.x = 200 + i * 200;
          enemy.y = enemy.team === 'ct' ? 200 : 700;
        });
        
        // 清空子彈
        this.gameState.bullets = [];
        
        // 更新 UI
        document.getElementById('death-screen').style.display = 'none';
        document.getElementById('bomb-indicator').style.display = 'none';
        document.getElementById('round-number').textContent = this.gameState.roundNumber;
        this.updateHealthArmor();
        
        // 15秒後進入戰鬥階段
        setTimeout(() => {
          this.gameState.phase = 'playing';
          document.getElementById('round-phase').textContent = 'Round Live';
          this.showNotification('回合開始！');
        }, 15000);
      }
      
      render() {
        // 清空畫布
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 相機跟隨
        this.ctx.save();
        const cameraX = this.canvas.width / 2 - this.localPlayer.x;
        const cameraY = this.canvas.height / 2 - this.localPlayer.y;
        this.ctx.translate(cameraX, cameraY);
        
        // 繪製地圖
        this.renderMap();
        
        // 繪製炸彈點
        this.renderBombSites();
        
        // 繪製玩家和敵人
        this.renderEntities();
        
        // 繪製子彈
        this.renderBullets();
        
        // 繪製炸彈
        if (this.gameState.bombPlanted) {
          this.renderBomb();
        }
        
        this.ctx.restore();
        
        // 繪製準心（不受相機影響）
        if (this.localPlayer.alive) {
          this.renderCrosshair();
        }
      }
      
      renderMap() {
        // 繪製牆壁
        this.ctx.fillStyle = '#444';
        this.gameState.map.walls.forEach(wall => {
          this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        });
      }
      
      renderBombSites() {
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.gameState.map.bombSites.forEach(site => {
          this.ctx.beginPath();
          this.ctx.arc(site.x, site.y, site.radius, 0, Math.PI * 2);
          this.ctx.stroke();
          
          this.ctx.fillStyle = '#ffaa00';
          this.ctx.font = 'bold 24px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(site.name, site.x, site.y);
        });
        
        this.ctx.setLineDash([]);
      }
      
      renderBomb() {
        const site = this.gameState.bombSite;
        if (!site) return;
        
        // 炸彈閃爍效果
        const flash = Math.sin(Date.now() * 0.01) > 0;
        this.ctx.fillStyle = flash ? '#ff0000' : '#aa0000';
        this.ctx.beginPath();
        this.ctx.arc(site.x, site.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (this.gameState.bombTimer < 10) {
          this.ctx.strokeStyle = '#ff0000';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(site.x, site.y, 20 + Math.sin(Date.now() * 0.02) * 5, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
      
      renderEntities() {
        // 繪製敵人
        this.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          
          this.ctx.fillStyle = enemy.team === 'ct' ? '#4488ff' : '#ff8844';
          this.ctx.beginPath();
          this.ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          
          // 方向指示
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(enemy.x, enemy.y);
          this.ctx.lineTo(
            enemy.x + Math.cos(enemy.angle) * 20,
            enemy.y + Math.sin(enemy.angle) * 20
          );
          this.ctx.stroke();
          
          // 血條
          this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
          this.ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 4);
          this.ctx.fillStyle = enemy.health > 50 ? '#00ff00' : '#ff0000';
          this.ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * (enemy.health / 100), 4);
        });
        
        // 繪製本地玩家
        if (this.localPlayer.alive) {
          this.ctx.fillStyle = this.localPlayer.team === 'ct' ? '#4488ff' : '#ff8844';
          this.ctx.beginPath();
          this.ctx.arc(this.localPlayer.x, this.localPlayer.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          
          // 方向指示
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(this.localPlayer.x, this.localPlayer.y);
          this.ctx.lineTo(
            this.localPlayer.x + Math.cos(this.aimAngle) * 25,
            this.localPlayer.y + Math.sin(this.aimAngle) * 25
          );
          this.ctx.stroke();
        }
      }
      
      renderBullets() {
        this.ctx.fillStyle = '#ffff00';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#ffff00';
        
        this.gameState.bullets.forEach(bullet => {
          this.ctx.beginPath();
          this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
          this.ctx.fill();
        });
        
        this.ctx.shadowBlur = 0;
      }
      
      renderCrosshair() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const aimX = centerX + Math.cos(this.aimAngle) * this.aimDistance;
        const aimY = centerY + Math.sin(this.aimAngle) * this.aimDistance;
        
        // 瞄準線 - 更清晰的視覺提示
        this.ctx.strokeStyle = this.autoAim ? 'rgba(255,100,100,0.4)' : 'rgba(100,255,100,0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(aimX, aimY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // 動態準心 - 根據狀態變化
        const crosshairColor = this.autoAim ? '#ff9999' : '#99ff99';
        this.ctx.strokeStyle = crosshairColor;
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(aimX - 15, aimY);
        this.ctx.lineTo(aimX - 5, aimY);
        this.ctx.moveTo(aimX + 5, aimY);
        this.ctx.lineTo(aimX + 15, aimY);
        this.ctx.moveTo(aimX, aimY - 15);
        this.ctx.lineTo(aimX, aimY - 5);
        this.ctx.moveTo(aimX, aimY + 5);
        this.ctx.lineTo(aimX, aimY + 15);
        this.ctx.stroke();
      }
      
      showNotification(text) {
        const div = document.createElement('div');
        div.className = 'notification';
        div.textContent = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
      }
      
      gameLoop() {
        // 更新遊戲邏輯
        this.handleMovement();
        this.updateAutoAim();
        this.updateAI();
        this.updateBullets();
        
        // 更新回合時間
        if (this.gameState.phase === 'playing') {
          this.gameState.roundTime -= 1/60;
          const minutes = Math.floor(this.gameState.roundTime / 60);
          const seconds = Math.floor(this.gameState.roundTime % 60);
          document.getElementById('round-timer').textContent = minutes + ':' + seconds.toString().padStart(2, '0');
          
          // 更新炸彈時間
          if (this.gameState.bombPlanted) {
            this.gameState.bombTimer -= 1/60;
            const bombMinutes = Math.floor(this.gameState.bombTimer / 60);
            const bombSeconds = Math.floor(this.gameState.bombTimer % 60);
            document.getElementById('bomb-timer').textContent = bombMinutes + ':' + bombSeconds.toString().padStart(2, '0');
            
            if (this.gameState.bombTimer <= 0) {
              this.showNotification('💣 炸彈爆炸！T 勝利！');
              this.endRound('t');
            }
          }
          
          // 檢查時間結束
          if (this.gameState.roundTime <= 0) {
            if (this.gameState.bombPlanted) {
              this.endRound('t');
            } else {
              this.endRound('ct');
            }
          }
        }
        
        // 渲染
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
      }
    }
    
    // 啟動遊戲
    window.addEventListener('DOMContentLoaded', () => {
      new CS16Game();
    });
  </script>
</body>
</html>
    HTML
  end
end

server = WEBrick::HTTPServer.new(Port: 9292)
server.mount '/', CS16Server
trap('INT') { server.shutdown }

server.start