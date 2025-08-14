// CS 1.6 Bomb System UI
class BombSystemUI {
    constructor(game) {
        this.game = game;
        this.hasBomb = false;
        this.bombPlanted = false;
        this.bombTimer = 45;
        this.isPlanting = false;
        this.isDefusing = false;
        this.plantProgress = 0;
        this.defuseProgress = 0;
        this.bombSite = null;
        this.bombPosition = null;
        
        // Bomb sites for de_dust2
        this.bombSites = {
            A: {
                x: 200,
                y: 200,
                width: 150,
                height: 150,
                name: 'Bombsite A'
            },
            B: {
                x: 800,
                y: 500,
                width: 150,
                height: 150,
                name: 'Bombsite B'
            }
        };
        
        // Beep timing for bomb countdown
        this.beepIntervals = [
            { time: 45, interval: 1.5 },
            { time: 35, interval: 1.3 },
            { time: 25, interval: 1.1 },
            { time: 15, interval: 0.9 },
            { time: 10, interval: 0.7 },
            { time: 5, interval: 0.5 },
            { time: 2, interval: 0.3 },
            { time: 1, interval: 0.1 }
        ];
        
        this.lastBeepTime = 0;
        this.currentBeepInterval = 1.5;
        
        this.createUI();
        this.setupControls();
    }
    
    createUI() {
        // Bomb indicator (for carrier)
        const bombIndicator = document.createElement('div');
        bombIndicator.id = 'bomb-indicator';
        bombIndicator.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px 15px;
            border-radius: 5px;
            border: 2px solid #e74c3c;
            display: none;
            z-index: 100;
            color: white;
        `;
        bombIndicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">💣</span>
                <div>
                    <div style="color: #e74c3c; font-weight: bold;">攜帶C4炸彈</div>
                    <div style="color: #95a5a6; font-size: 0.9em;">按 [5] 選擇炸彈</div>
                </div>
            </div>
        `;
        document.body.appendChild(bombIndicator);
        
        // Bomb timer (when planted)
        const bombTimer = document.createElement('div');
        bombTimer.id = 'bomb-timer';
        bombTimer.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 15px 30px;
            border-radius: 10px;
            border: 2px solid #e74c3c;
            display: none;
            z-index: 200;
            text-align: center;
        `;
        bombTimer.innerHTML = `
            <div style="color: #e74c3c; font-size: 1.2em; margin-bottom: 10px;">
                💣 炸彈已放置
            </div>
            <div id="bomb-countdown" style="font-size: 2em; font-weight: bold; color: white;">
                45
            </div>
            <div id="bomb-site-name" style="color: #95a5a6; margin-top: 5px;">
                Bombsite A
            </div>
        `;
        document.body.appendChild(bombTimer);
        
        // Plant/Defuse progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'bomb-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #3498db;
            display: none;
            z-index: 300;
            min-width: 300px;
        `;
        progressBar.innerHTML = `
            <div id="progress-title" style="color: #3498db; font-size: 1.2em; margin-bottom: 10px; text-align: center;">
                正在放置炸彈...
            </div>
            <div style="width: 100%; height: 30px; background: #333; border-radius: 15px; overflow: hidden;">
                <div id="progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3498db, #2ecc71); transition: width 0.1s;"></div>
            </div>
            <div style="text-align: center; color: #95a5a6; margin-top: 10px;">
                <span id="progress-time">3.0</span> 秒
            </div>
            <div style="text-align: center; color: #e74c3c; margin-top: 5px; font-size: 0.9em;">
                按住不要移動！
            </div>
        `;
        document.body.appendChild(progressBar);
        
        // Bomb site indicators on minimap
        const bombSiteOverlay = document.createElement('canvas');
        bombSiteOverlay.id = 'bombsite-overlay';
        bombSiteOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 98;
        `;
        bombSiteOverlay.width = window.innerWidth;
        bombSiteOverlay.height = window.innerHeight;
        document.body.appendChild(bombSiteOverlay);
        
        this.siteOverlayCtx = bombSiteOverlay.getContext('2d');
        
        // Defuse kit indicator
        const defuseKit = document.createElement('div');
        defuseKit.id = 'defuse-kit';
        defuseKit.style.cssText = `
            position: fixed;
            bottom: 160px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 5px;
            border: 1px solid #3498db;
            display: none;
            z-index: 100;
            color: #3498db;
            font-size: 0.9em;
        `;
        defuseKit.innerHTML = `🔧 拆彈鉗`;
        document.body.appendChild(defuseKit);
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.game && this.game.gameState !== 'playing') return;
            
            // Select bomb
            if (e.key === '5' && this.hasBomb && !this.bombPlanted) {
                this.selectBomb();
                e.preventDefault();
            }
            
            // Plant/Defuse with E key
            if (e.key.toLowerCase() === 'e') {
                if (this.hasBomb && !this.bombPlanted && this.isInBombsite()) {
                    this.startPlanting();
                } else if (this.bombPlanted && this.isNearBomb() && this.game.player.team === 'ct') {
                    this.startDefusing();
                }
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // Cancel plant/defuse if key released
            if (e.key.toLowerCase() === 'e') {
                if (this.isPlanting) {
                    this.cancelPlanting();
                } else if (this.isDefusing) {
                    this.cancelDefusing();
                }
            }
        });
    }
    
    setBombCarrier(isCarrier) {
        this.hasBomb = isCarrier;
        const indicator = document.getElementById('bomb-indicator');
        indicator.style.display = isCarrier ? 'block' : 'none';
        
        if (isCarrier) {
            this.game.addChatMessage('系統', '你攜帶著C4炸彈！找到炸彈點並按E放置', 'important');
        }
    }
    
    selectBomb() {
        this.game.addChatMessage('系統', '已選擇C4炸彈，到炸彈點按E放置', 'info');
        // Visual feedback
        document.getElementById('bomb-indicator').style.borderColor = '#f39c12';
        setTimeout(() => {
            document.getElementById('bomb-indicator').style.borderColor = '#e74c3c';
        }, 500);
    }
    
    isInBombsite() {
        const player = this.game.player;
        for (const [site, bounds] of Object.entries(this.bombSites)) {
            if (player.x >= bounds.x && player.x <= bounds.x + bounds.width &&
                player.y >= bounds.y && player.y <= bounds.y + bounds.height) {
                this.bombSite = site;
                return true;
            }
        }
        return false;
    }
    
    isNearBomb() {
        if (!this.bombPosition) return false;
        const player = this.game.player;
        const distance = Math.sqrt(
            Math.pow(player.x - this.bombPosition.x, 2) + 
            Math.pow(player.y - this.bombPosition.y, 2)
        );
        return distance < 50; // Within 50 units
    }
    
    startPlanting() {
        if (this.isPlanting) return;
        
        this.isPlanting = true;
        this.plantProgress = 0;
        
        const progressBar = document.getElementById('bomb-progress');
        const title = document.getElementById('progress-title');
        title.textContent = `正在放置炸彈於 ${this.bombSites[this.bombSite].name}...`;
        progressBar.style.display = 'block';
        
        // Start planting animation
        this.plantInterval = setInterval(() => {
            this.plantProgress += 100 / 30; // 3 seconds = 30 ticks at 100ms
            
            if (this.plantProgress >= 100) {
                this.completePlanting();
            } else {
                this.updateProgress(this.plantProgress, 3 - (this.plantProgress / 100 * 3));
            }
        }, 100);
    }
    
    cancelPlanting() {
        if (!this.isPlanting) return;
        
        clearInterval(this.plantInterval);
        this.isPlanting = false;
        this.plantProgress = 0;
        
        document.getElementById('bomb-progress').style.display = 'none';
        this.game.addChatMessage('系統', '取消放置炸彈', 'warning');
    }
    
    completePlanting() {
        clearInterval(this.plantInterval);
        this.isPlanting = false;
        this.hasBomb = false;
        this.bombPlanted = true;
        this.bombTimer = 45;
        this.bombPosition = {
            x: this.game.player.x,
            y: this.game.player.y
        };
        
        document.getElementById('bomb-indicator').style.display = 'none';
        document.getElementById('bomb-progress').style.display = 'none';
        
        // Show bomb timer
        const timerEl = document.getElementById('bomb-timer');
        timerEl.style.display = 'block';
        document.getElementById('bomb-site-name').textContent = this.bombSites[this.bombSite].name;
        
        // Notify game
        if (this.game) {
            this.game.onBombPlanted(this.bombSite, this.bombPosition);
        }
        
        // Start countdown
        this.startBombCountdown();
        
        // Global announcement
        this.game.addChatMessage('系統', `💣 炸彈已在 ${this.bombSites[this.bombSite].name} 放置！`, 'critical');
    }
    
    startDefusing() {
        if (this.isDefusing) return;
        
        this.isDefusing = true;
        this.defuseProgress = 0;
        
        const hasKit = this.game.player.hasDefuseKit;
        const defuseTime = hasKit ? 5 : 10;
        
        const progressBar = document.getElementById('bomb-progress');
        const title = document.getElementById('progress-title');
        title.textContent = hasKit ? '正在拆除炸彈 (有拆彈鉗)...' : '正在拆除炸彈...';
        progressBar.style.display = 'block';
        
        // Start defusing animation
        this.defuseInterval = setInterval(() => {
            this.defuseProgress += 100 / (defuseTime * 10); // Convert to ticks
            
            if (this.defuseProgress >= 100) {
                this.completeDefusing();
            } else {
                const timeLeft = defuseTime - (this.defuseProgress / 100 * defuseTime);
                this.updateProgress(this.defuseProgress, timeLeft);
            }
        }, 100);
    }
    
    cancelDefusing() {
        if (!this.isDefusing) return;
        
        clearInterval(this.defuseInterval);
        this.isDefusing = false;
        this.defuseProgress = 0;
        
        document.getElementById('bomb-progress').style.display = 'none';
        this.game.addChatMessage('系統', '取消拆除炸彈', 'warning');
    }
    
    completeDefusing() {
        clearInterval(this.defuseInterval);
        clearInterval(this.bombInterval);
        this.isDefusing = false;
        this.bombPlanted = false;
        this.bombPosition = null;
        
        document.getElementById('bomb-progress').style.display = 'none';
        document.getElementById('bomb-timer').style.display = 'none';
        
        // Notify game
        if (this.game) {
            this.game.onBombDefused();
        }
        
        // Global announcement
        this.game.addChatMessage('系統', '💣 炸彈已被拆除！CT勝利！', 'success');
    }
    
    startBombCountdown() {
        this.bombInterval = setInterval(() => {
            this.bombTimer -= 0.1;
            
            if (this.bombTimer <= 0) {
                this.explodeBomb();
            } else {
                // Update timer display
                document.getElementById('bomb-countdown').textContent = Math.ceil(this.bombTimer);
                
                // Update beep interval
                for (const interval of this.beepIntervals) {
                    if (this.bombTimer <= interval.time) {
                        this.currentBeepInterval = interval.interval;
                    }
                }
                
                // Play beep sound
                if (Date.now() - this.lastBeepTime > this.currentBeepInterval * 1000) {
                    this.playBeep();
                    this.lastBeepTime = Date.now();
                }
            }
        }, 100);
    }
    
    explodeBomb() {
        clearInterval(this.bombInterval);
        this.bombPlanted = false;
        this.bombPosition = null;
        
        document.getElementById('bomb-timer').style.display = 'none';
        
        // Create explosion effect
        if (this.game) {
            this.game.createExplosion(this.bombPosition.x, this.bombPosition.y, 500, 500);
            this.game.onBombExploded();
        }
        
        // Global announcement
        this.game.addChatMessage('系統', '💥 炸彈爆炸！恐怖分子勝利！', 'critical');
    }
    
    updateProgress(percent, timeLeft) {
        document.getElementById('progress-fill').style.width = `${percent}%`;
        document.getElementById('progress-time').textContent = timeLeft.toFixed(1);
    }
    
    playBeep() {
        // Visual beep indicator
        const timer = document.getElementById('bomb-timer');
        if (timer) {
            timer.style.borderColor = '#ff0000';
            setTimeout(() => {
                timer.style.borderColor = '#e74c3c';
            }, 100);
        }
        
        // Audio would go here
        // this.game.playSound('bomb_beep');
    }
    
    setHasDefuseKit(hasKit) {
        const kitIndicator = document.getElementById('defuse-kit');
        kitIndicator.style.display = hasKit ? 'block' : 'none';
    }
    
    renderBombsites(ctx) {
        // Draw bombsite zones on canvas
        ctx.save();
        ctx.globalAlpha = 0.2;
        
        for (const [site, bounds] of Object.entries(this.bombSites)) {
            // Check if player is in this site
            const player = this.game.player;
            const isInSite = player.x >= bounds.x && player.x <= bounds.x + bounds.width &&
                             player.y >= bounds.y && player.y <= bounds.y + bounds.height;
            
            // Draw zone
            ctx.fillStyle = isInSite ? '#f39c12' : '#e74c3c';
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            
            // Draw border
            ctx.strokeStyle = isInSite ? '#f39c12' : '#e74c3c';
            ctx.lineWidth = 2;
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            
            // Draw label
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(site, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            ctx.globalAlpha = 0.2;
        }
        
        // Draw planted bomb
        if (this.bombPlanted && this.bombPosition) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(this.bombPosition.x, this.bombPosition.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Blinking effect
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.bombPosition.x, this.bombPosition.y, 15, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    update(deltaTime) {
        // Update bomb sites visibility
        if (this.game && this.game.canvas) {
            const rect = this.game.canvas.getBoundingClientRect();
            this.siteOverlayCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            
            // Only show bombsites for terrorists or when spectating
            if (this.game.player.team === 't' || this.game.gameState === 'spectating') {
                this.siteOverlayCtx.save();
                this.siteOverlayCtx.translate(rect.left, rect.top);
                this.renderBombsites(this.siteOverlayCtx);
                this.siteOverlayCtx.restore();
            }
        }
    }
}

// Export for use in game
window.BombSystemUI = BombSystemUI;