// CS 1.6 Grenade System UI
class GrenadeSystemUI {
    constructor(game) {
        this.game = game;
        this.selectedGrenade = null;
        this.throwPower = 0;
        this.isCharging = false;
        
        // Player grenades inventory
        this.inventory = {
            hegrenade: 0,
            flashbang: 0,
            smokegrenade: 0
        };
        
        // Grenade properties
        this.grenadeTypes = {
            hegrenade: {
                name: 'HE手榴彈',
                key: '4',
                maxCount: 1,
                icon: '💣',
                color: '#e74c3c'
            },
            flashbang: {
                name: '閃光彈',
                key: '5',
                maxCount: 2,
                icon: '✨',
                color: '#f39c12'
            },
            smokegrenade: {
                name: '煙霧彈',
                key: '6',
                maxCount: 1,
                icon: '💨',
                color: '#95a5a6'
            }
        };
        
        // Active grenades in world
        this.activeGrenades = [];
        this.smokeEffects = [];
        this.flashEffects = [];
        
        this.createUI();
        this.setupControls();
    }
    
    createUI() {
        // Create grenade HUD
        const grenadeHUD = document.createElement('div');
        grenadeHUD.id = 'grenade-hud';
        grenadeHUD.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #555;
            display: flex;
            gap: 15px;
            z-index: 100;
        `;
        
        // Add grenade slots
        ['hegrenade', 'flashbang', 'smokegrenade'].forEach(type => {
            const slot = document.createElement('div');
            slot.className = `grenade-slot grenade-${type}`;
            slot.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 50px;
            `;
            
            const icon = document.createElement('div');
            icon.style.cssText = `
                font-size: 24px;
                opacity: 0.3;
            `;
            icon.textContent = this.grenadeTypes[type].icon;
            icon.id = `grenade-icon-${type}`;
            
            const count = document.createElement('div');
            count.style.cssText = `
                color: ${this.grenadeTypes[type].color};
                font-weight: bold;
                margin-top: 5px;
            `;
            count.textContent = '0';
            count.id = `grenade-count-${type}`;
            
            const key = document.createElement('div');
            key.style.cssText = `
                color: #95a5a6;
                font-size: 0.8em;
                margin-top: 2px;
            `;
            key.textContent = `[${this.grenadeTypes[type].key}]`;
            
            slot.appendChild(icon);
            slot.appendChild(count);
            slot.appendChild(key);
            grenadeHUD.appendChild(slot);
        });
        
        document.body.appendChild(grenadeHUD);
        
        // Create throw power indicator
        const powerIndicator = document.createElement('div');
        powerIndicator.id = 'grenade-power';
        powerIndicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: none;
            pointer-events: none;
            z-index: 500;
        `;
        powerIndicator.innerHTML = `
            <div style="text-align: center; color: white; margin-bottom: 10px;">
                <span id="grenade-type-label" style="color: #3498db; font-size: 1.2em;">HE手榴彈</span>
                <div style="margin-top: 5px;">按住滑鼠左鍵蓄力</div>
            </div>
            <div style="width: 200px; height: 20px; background: #333; border-radius: 10px; overflow: hidden;">
                <div id="power-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #27ae60, #f39c12, #e74c3c); transition: width 0.1s;"></div>
            </div>
            <div style="text-align: center; color: #95a5a6; margin-top: 5px;">
                力量: <span id="power-percent">0</span>%
            </div>
        `;
        document.body.appendChild(powerIndicator);
        
        // Create trajectory preview (optional)
        const trajectoryCanvas = document.createElement('canvas');
        trajectoryCanvas.id = 'grenade-trajectory';
        trajectoryCanvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99;
        `;
        trajectoryCanvas.width = window.innerWidth;
        trajectoryCanvas.height = window.innerHeight;
        document.body.appendChild(trajectoryCanvas);
        
        this.trajectoryCtx = trajectoryCanvas.getContext('2d');
    }
    
    setupControls() {
        // Number keys to select grenades
        document.addEventListener('keydown', (e) => {
            if (this.game && this.game.gameState !== 'playing') return;
            
            switch(e.key) {
                case '4':
                    this.selectGrenade('hegrenade');
                    e.preventDefault();
                    break;
                case '5':
                    this.selectGrenade('flashbang');
                    e.preventDefault();
                    break;
                case '6':
                    this.selectGrenade('smokegrenade');
                    e.preventDefault();
                    break;
                case 'g':
                case 'G':
                    // Quick throw last selected grenade
                    if (this.selectedGrenade && this.inventory[this.selectedGrenade] > 0) {
                        this.quickThrow();
                    }
                    e.preventDefault();
                    break;
            }
        });
        
        // Mouse controls for throwing
        document.addEventListener('mousedown', (e) => {
            if (this.selectedGrenade && this.inventory[this.selectedGrenade] > 0) {
                if (e.button === 0) { // Left click
                    this.startCharging();
                    e.preventDefault();
                }
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.isCharging && e.button === 0) {
                this.throwGrenade();
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.selectedGrenade && this.game) {
                this.updateTrajectoryPreview(e);
            }
        });
    }
    
    selectGrenade(type) {
        if (this.inventory[type] > 0) {
            this.selectedGrenade = type;
            
            // Update UI
            document.querySelectorAll('.grenade-slot').forEach(slot => {
                slot.style.border = 'none';
            });
            document.querySelector(`.grenade-${type}`).style.border = '2px solid #3498db';
            
            // Show selection message
            this.game.addChatMessage('系統', `已選擇 ${this.grenadeTypes[type].name}`, 'info');
        } else {
            this.game.addChatMessage('系統', `沒有 ${this.grenadeTypes[type].name}`, 'error');
        }
    }
    
    startCharging() {
        if (!this.selectedGrenade || this.inventory[this.selectedGrenade] <= 0) return;
        
        this.isCharging = true;
        this.throwPower = 0;
        
        // Show power indicator
        const indicator = document.getElementById('grenade-power');
        const typeLabel = document.getElementById('grenade-type-label');
        typeLabel.textContent = this.grenadeTypes[this.selectedGrenade].name;
        typeLabel.style.color = this.grenadeTypes[this.selectedGrenade].color;
        indicator.style.display = 'block';
        
        // Start charging animation
        this.chargeInterval = setInterval(() => {
            if (this.throwPower < 100) {
                this.throwPower += 2;
                this.updatePowerIndicator();
            }
        }, 20);
    }
    
    updatePowerIndicator() {
        document.getElementById('power-bar').style.width = `${this.throwPower}%`;
        document.getElementById('power-percent').textContent = this.throwPower;
    }
    
    throwGrenade() {
        if (!this.isCharging || !this.selectedGrenade) return;
        
        clearInterval(this.chargeInterval);
        this.isCharging = false;
        
        // Hide power indicator
        document.getElementById('grenade-power').style.display = 'none';
        
        // Calculate throw parameters
        const angle = this.game.player.angle;
        const power = this.throwPower / 100; // Normalize to 0-1
        const velocity = 500 + power * 500; // 500-1000 units/s
        
        // Send throw command to server/game
        if (this.game) {
            this.game.throwGrenade({
                type: this.selectedGrenade,
                angle: angle,
                power: power,
                velocity: velocity,
                position: {
                    x: this.game.player.x,
                    y: this.game.player.y
                }
            });
        }
        
        // Update inventory
        this.inventory[this.selectedGrenade]--;
        this.updateInventoryUI();
        
        // Deselect if no more grenades
        if (this.inventory[this.selectedGrenade] <= 0) {
            this.selectedGrenade = null;
        }
        
        // Reset power
        this.throwPower = 0;
    }
    
    quickThrow() {
        // Throw with default power (50%)
        this.throwPower = 50;
        this.throwGrenade();
    }
    
    updateTrajectoryPreview(mouseEvent) {
        if (!this.selectedGrenade || this.inventory[this.selectedGrenade] <= 0) {
            this.trajectoryCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            return;
        }
        
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const mouseX = mouseEvent.clientX - rect.left;
        const mouseY = mouseEvent.clientY - rect.top;
        
        // Calculate trajectory
        const startX = this.game.player.x;
        const startY = this.game.player.y;
        const angle = Math.atan2(mouseY - startY, mouseX - startX);
        
        // Simple trajectory preview (parabolic arc)
        this.trajectoryCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.trajectoryCtx.strokeStyle = this.grenadeTypes[this.selectedGrenade].color;
        this.trajectoryCtx.lineWidth = 2;
        this.trajectoryCtx.setLineDash([5, 5]);
        this.trajectoryCtx.globalAlpha = 0.5;
        
        this.trajectoryCtx.beginPath();
        this.trajectoryCtx.moveTo(startX + rect.left, startY + rect.top);
        
        const steps = 20;
        const velocity = 700; // Average velocity
        const gravity = 800;
        
        for (let i = 1; i <= steps; i++) {
            const t = i * 0.05; // Time step
            const x = startX + Math.cos(angle) * velocity * t;
            const y = startY + Math.sin(angle) * velocity * t + 0.5 * gravity * t * t;
            
            this.trajectoryCtx.lineTo(x + rect.left, y + rect.top);
            
            // Stop if trajectory goes off screen
            if (x < 0 || x > canvas.width || y > canvas.height) break;
        }
        
        this.trajectoryCtx.stroke();
        this.trajectoryCtx.globalAlpha = 1;
        this.trajectoryCtx.setLineDash([]);
    }
    
    updateInventory(type, count) {
        this.inventory[type] = Math.min(count, this.grenadeTypes[type].maxCount);
        this.updateInventoryUI();
    }
    
    updateInventoryUI() {
        Object.keys(this.inventory).forEach(type => {
            const count = this.inventory[type];
            const countEl = document.getElementById(`grenade-count-${type}`);
            const iconEl = document.getElementById(`grenade-icon-${type}`);
            
            if (countEl) countEl.textContent = count;
            if (iconEl) iconEl.style.opacity = count > 0 ? '1' : '0.3';
        });
    }
    
    // Visual effects for grenades
    renderGrenadeEffects(ctx) {
        // Render smoke clouds
        this.smokeEffects.forEach(smoke => {
            ctx.save();
            ctx.globalAlpha = smoke.opacity;
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // Render flash effects
        this.flashEffects.forEach(flash => {
            if (flash.active) {
                ctx.save();
                ctx.globalAlpha = flash.intensity;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.restore();
            }
        });
        
        // Render active grenades
        this.activeGrenades.forEach(grenade => {
            ctx.save();
            ctx.translate(grenade.x, grenade.y);
            
            // Draw grenade
            ctx.fillStyle = this.grenadeTypes[grenade.type].color;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw fuse sparks
            if (grenade.fuseTime < 0.5) {
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const length = Math.random() * 10 + 5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
                    ctx.stroke();
                }
            }
            
            ctx.restore();
        });
    }
    
    addSmokeEffect(x, y) {
        this.smokeEffects.push({
            x: x,
            y: y,
            radius: 10,
            opacity: 0.7,
            growthRate: 2,
            maxRadius: 150,
            duration: 18000, // 18 seconds
            startTime: Date.now()
        });
    }
    
    addFlashEffect(intensity, duration) {
        this.flashEffects.push({
            active: true,
            intensity: intensity,
            duration: duration,
            startTime: Date.now()
        });
    }
    
    update(deltaTime) {
        // Update smoke effects
        this.smokeEffects = this.smokeEffects.filter(smoke => {
            const elapsed = Date.now() - smoke.startTime;
            if (elapsed > smoke.duration) return false;
            
            // Grow smoke cloud
            if (smoke.radius < smoke.maxRadius) {
                smoke.radius += smoke.growthRate * deltaTime;
            }
            
            // Fade out near end
            if (elapsed > smoke.duration * 0.8) {
                smoke.opacity = 0.7 * (1 - (elapsed - smoke.duration * 0.8) / (smoke.duration * 0.2));
            }
            
            return true;
        });
        
        // Update flash effects
        this.flashEffects = this.flashEffects.filter(flash => {
            const elapsed = Date.now() - flash.startTime;
            if (elapsed > flash.duration) {
                flash.active = false;
                return false;
            }
            
            // Fade out flash
            flash.intensity = flash.intensity * (1 - elapsed / flash.duration);
            return true;
        });
        
        // Update active grenades
        this.activeGrenades = this.activeGrenades.filter(grenade => {
            grenade.fuseTime -= deltaTime;
            
            // Update position (physics)
            grenade.vx *= 0.98; // Air resistance
            grenade.vy += 800 * deltaTime; // Gravity
            grenade.x += grenade.vx * deltaTime;
            grenade.y += grenade.vy * deltaTime;
            
            // Bounce off ground
            if (grenade.y > this.game.canvas.height - 20) {
                grenade.y = this.game.canvas.height - 20;
                grenade.vy *= -0.5; // Bounce with damping
                grenade.vx *= 0.8; // Friction
            }
            
            // Explode when fuse runs out
            if (grenade.fuseTime <= 0) {
                this.explodeGrenade(grenade);
                return false;
            }
            
            return true;
        });
    }
    
    explodeGrenade(grenade) {
        switch(grenade.type) {
            case 'hegrenade':
                // HE explosion effect
                this.game.createExplosion(grenade.x, grenade.y, 98, 350);
                break;
            case 'flashbang':
                // Flash effect
                const distance = Math.sqrt(
                    Math.pow(grenade.x - this.game.player.x, 2) + 
                    Math.pow(grenade.y - this.game.player.y, 2)
                );
                const intensity = Math.max(0, 1 - distance / 1500);
                if (intensity > 0) {
                    this.addFlashEffect(intensity, intensity * 5000);
                }
                break;
            case 'smokegrenade':
                // Smoke cloud
                this.addSmokeEffect(grenade.x, grenade.y);
                break;
        }
    }
    
    // Clean up grenade UI when player dies
    cleanupOnDeath() {
        // Clear trajectory preview
        if (this.trajectoryCtx) {
            this.trajectoryCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
        
        // Stop charging if in progress
        if (this.isCharging) {
            clearInterval(this.chargeInterval);
            this.isCharging = false;
            this.throwPower = 0;
        }
        
        // Hide power indicator
        const powerIndicator = document.getElementById('grenade-power');
        if (powerIndicator) {
            powerIndicator.style.display = 'none';
        }
        
        // Reset selected grenade
        this.selectedGrenade = null;
        
        // Clear selection border
        document.querySelectorAll('.grenade-slot').forEach(slot => {
            slot.style.border = 'none';
        });
    }
}

// Export for use in game
window.GrenadeSystemUI = GrenadeSystemUI;