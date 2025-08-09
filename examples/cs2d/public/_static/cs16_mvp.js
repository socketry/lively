import Live from "/_components/@socketry/live/Live.js";

class CS16MVP {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
    
    // 遊戲狀態
    this.gameState = null;
    this.localPlayerId = null;
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.angle = 0;
    
    // Mac 優化
    this.aimAngle = 0;
    this.aimDistance = 150;
    this.autoAim = false;
    
    // 網路
    this.live = Live.connect();
    this.setupNetworking();
    this.setupInput();
    
    // 遊戲循環
    this.lastUpdate = Date.now();
    this.gameLoop();
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
    // 鍵盤
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      
      // 空白鍵射擊
      if (e.key === ' ') {
        e.preventDefault();
        this.sendInput({ shoot: true, angle: this.aimAngle });
      }
      
      // 方向鍵瞄準
      if (e.key === 'ArrowLeft' || e.key === 'j') this.aimAngle -= 0.15;
      if (e.key === 'ArrowRight' || e.key === 'l') this.aimAngle += 0.15;
      if (e.key === 'ArrowUp' || e.key === 'i') this.aimDistance = Math.min(this.aimDistance + 10, 250);
      if (e.key === 'ArrowDown' || e.key === 'k') this.aimDistance = Math.max(this.aimDistance - 10, 50);
      
      // Q 快速轉身
      if (e.key === 'q') this.aimAngle += Math.PI;
      
      // V 自動瞄準
      if (e.key === 'v') {
        this.autoAim = !this.autoAim;
        this.showNotification(this.autoAim ? '自動瞄準: ON' : '自動瞄準: OFF');
      }
      
      // B 購買選單
      if (e.key === 'b') {
        this.toggleBuyMenu();
      }
      
      // E 互動（安裝/拆彈）
      if (e.key === 'e') {
        this.sendInput({ use: true });
      }
      
      // R 換彈
      if (e.key === 'r') {
        this.sendInput({ reload: true });
      }
      
      // Tab 計分板
      if (e.key === 'Tab') {
        e.preventDefault();
        // TODO: 顯示計分板
      }
      
      // 數字鍵快速購買
      if (e.key >= '1' && e.key <= '5') {
        this.quickBuy(e.key);
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      
      // 停止互動
      if (e.key === 'e') {
        this.sendInput({ use: false });
      }
    });
    
    // 觸控板
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        this.aimAngle += e.deltaX * 0.01;
      } else {
        this.aimDistance = Math.max(50, Math.min(250, this.aimDistance - e.deltaY));
      }
    });
    
    // 點擊射擊
    this.canvas.addEventListener('click', () => {
      this.sendInput({ shoot: true, angle: this.aimAngle });
    });
    
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.sendInput({ shoot: true, angle: this.aimAngle });
    });
  }
  
  setupNetworking() {
    this.live.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'game_state') {
        this.gameState = data.data;
        this.updateUI();
      }
    });
  }
  
  sendInput(input) {
    this.live.push({
      type: 'player_input',
      data: input
    });
  }
  
  handleMovement() {
    let dx = 0, dy = 0;
    if (this.keys['w']) dy = -1;
    if (this.keys['s']) dy = 1;
    if (this.keys['a']) dx = -1;
    if (this.keys['d']) dx = 1;
    
    if (dx !== 0 || dy !== 0) {
      this.sendInput({
        move: {
          x: dx,
          y: dy,
          shift: this.keys['shift']
        }
      });
    }
  }
  
  updateUI() {
    if (!this.gameState) return;
    
    const round = this.gameState.round;
    const localPlayer = this.gameState.players[this.localPlayerId];
    
    // 更新回合資訊
    document.getElementById('ct-score').textContent = `CT: ${round.ct_score}`;
    document.getElementById('t-score').textContent = `T: ${round.t_score}`;
    document.getElementById('round-number').textContent = `Round ${round.round_number}/${round.max_rounds}`;
    
    // 更新計時器
    const minutes = Math.floor(round.round_time / 60);
    const seconds = round.round_time % 60;
    document.getElementById('round-timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新階段
    const phaseText = {
      freeze: 'Freeze Time',
      buy: 'Buy Time',
      playing: 'Round Live',
      ended: 'Round Over'
    };
    document.getElementById('round-phase').textContent = phaseText[round.phase] || '';
    
    // 更新玩家資訊
    if (localPlayer) {
      document.getElementById('health-bar').style.width = `${localPlayer.health}%`;
      document.getElementById('armor-bar').style.width = `${localPlayer.armor}%`;
      document.getElementById('money').textContent = `$${localPlayer.money}`;
      
      if (localPlayer.ammo) {
        document.getElementById('ammo-clip').textContent = localPlayer.ammo.clip;
        document.getElementById('ammo-reserve').textContent = localPlayer.ammo.reserve;
      }
      document.getElementById('weapon-name').textContent = localPlayer.weapon;
      
      // 死亡畫面
      const deathScreen = document.getElementById('death-screen');
      deathScreen.style.display = localPlayer.alive ? 'none' : 'block';
    }
    
    // 更新炸彈指示器
    const bombIndicator = document.getElementById('bomb-indicator');
    if (this.gameState.bomb.planted) {
      bombIndicator.style.display = 'block';
      const bombMinutes = Math.floor(this.gameState.bomb.bomb_timer / 60);
      const bombSeconds = this.gameState.bomb.bomb_timer % 60;
      document.getElementById('bomb-countdown').textContent = `${bombMinutes}:${bombSeconds.toString().padStart(2, '0')}`;
      
      // 拆彈進度
      const defuseProgress = document.getElementById('defuse-progress');
      if (this.gameState.bomb.defusing) {
        defuseProgress.style.display = 'block';
        document.getElementById('defuse-bar').style.width = `${this.gameState.bomb.defusing_progress * 100}%`;
      } else {
        defuseProgress.style.display = 'none';
      }
    } else {
      bombIndicator.style.display = 'none';
    }
  }
  
  render() {
    // 清空畫布
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.gameState) return;
    
    // 相機偏移（跟隨玩家）
    const localPlayer = this.gameState.players[this.localPlayerId];
    let cameraX = 0, cameraY = 0;
    
    if (localPlayer && localPlayer.alive) {
      cameraX = this.canvas.width / 2 - localPlayer.x;
      cameraY = this.canvas.height / 2 - localPlayer.y;
    }
    
    this.ctx.save();
    this.ctx.translate(cameraX, cameraY);
    
    // 繪製地圖
    this.renderMap();
    
    // 繪製炸彈點
    this.renderBombSites();
    
    // 繪製炸彈
    this.renderBomb();
    
    // 繪製玩家
    this.renderPlayers();
    
    // 繪製子彈
    this.renderBullets();
    
    this.ctx.restore();
    
    // 繪製準心（不受相機影響）
    if (localPlayer && localPlayer.alive) {
      this.renderCrosshair();
    }
  }
  
  renderMap() {
    if (!this.gameState.map) return;
    
    // 繪製牆壁
    this.ctx.fillStyle = '#444';
    this.gameState.map.walls.forEach(wall => {
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
  }
  
  renderBombSites() {
    if (!this.gameState.map) return;
    
    this.ctx.strokeStyle = '#ffaa00';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    this.gameState.map.bomb_sites.forEach(site => {
      this.ctx.beginPath();
      this.ctx.arc(site.x, site.y, site.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.font = '24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(site.name, site.x, site.y);
    });
    
    this.ctx.setLineDash([]);
  }
  
  renderBomb() {
    if (!this.gameState.bomb.planted) return;
    
    const pos = this.gameState.bomb.bomb_position;
    if (!pos) return;
    
    // 炸彈圖示
    this.ctx.fillStyle = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 閃爍效果
    if (this.gameState.bomb.bomb_timer < 10) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      if (flash) {
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
  }
  
  renderPlayers() {
    Object.values(this.gameState.players).forEach(player => {
      if (!player.alive) return;
      
      // 玩家身體
      this.ctx.fillStyle = player.team === 'ct' ? '#4488ff' : '#ff8844';
      this.ctx.beginPath();
      this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 方向指示
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(player.x, player.y);
      this.ctx.lineTo(
        player.x + Math.cos(player.angle || 0) * 20,
        player.y + Math.sin(player.angle || 0) * 20
      );
      this.ctx.stroke();
      
      // 名稱
      this.ctx.fillStyle = 'white';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(player.name, player.x, player.y - 25);
      
      // 血量條
      const barWidth = 30;
      const barHeight = 4;
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth, barHeight);
      
      const healthColor = player.health > 50 ? '#00ff00' : player.health > 25 ? '#ffaa00' : '#ff0000';
      this.ctx.fillStyle = healthColor;
      this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth * (player.health/100), barHeight);
    });
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
    
    // 瞄準線
    this.ctx.strokeStyle = this.autoAim ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(aimX, aimY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // 準心
    this.ctx.strokeStyle = this.autoAim ? '#ff4444' : '#00ff00';
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
  
  toggleBuyMenu() {
    const menu = document.getElementById('buy-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  quickBuy(key) {
    const weapons = {
      '1': 'ak47',
      '2': 'm4a1', 
      '3': 'awp',
      '4': 'deagle',
      '5': 'kevlar'
    };
    
    if (weapons[key]) {
      this.live.push({
        type: 'buy_weapon',
        weapon: weapons[key]
      });
    }
  }
  
  showNotification(text) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      color: #ffaa00;
      padding: 20px;
      border-radius: 5px;
      font-size: 18px;
      z-index: 10000;
    `;
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1500);
  }
  
  gameLoop() {
    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    
    // 處理輸入
    this.handleMovement();
    
    // 自動瞄準
    if (this.autoAim && this.gameState) {
      this.applyAutoAim();
    }
    
    // 渲染
    this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  applyAutoAim() {
    const localPlayer = this.gameState.players[this.localPlayerId];
    if (!localPlayer || !localPlayer.alive) return;
    
    let closestEnemy = null;
    let closestDistance = Infinity;
    
    Object.values(this.gameState.players).forEach(player => {
      if (player.id === this.localPlayerId) return;
      if (player.team === localPlayer.team) return;
      if (!player.alive) return;
      
      const distance = Math.sqrt(
        Math.pow(player.x - localPlayer.x, 2) +
        Math.pow(player.y - localPlayer.y, 2)
      );
      
      if (distance < closestDistance && distance < 400) {
        closestDistance = distance;
        closestEnemy = player;
      }
    });
    
    if (closestEnemy) {
      const targetAngle = Math.atan2(
        closestEnemy.y - localPlayer.y,
        closestEnemy.x - localPlayer.x
      );
      
      const diff = targetAngle - this.aimAngle;
      this.aimAngle += diff * 0.1;
    }
  }
}

// 啟動遊戲
window.addEventListener('DOMContentLoaded', () => {
  // 設置購買選單事件
  document.querySelectorAll('.buy-item').forEach(button => {
    button.addEventListener('click', (e) => {
      const weapon = e.target.dataset.weapon;
      Live.current?.push({
        type: 'buy_weapon',
        weapon: weapon
      });
      document.getElementById('buy-menu').style.display = 'none';
    });
  });
  
  // 啟動遊戲
  new CS16MVP();
});