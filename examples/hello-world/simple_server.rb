#!/usr/bin/env ruby
# frozen_string_literal: true

require 'webrick'
require 'json'
require 'erb'

class CS2DServer < WEBrick::HTTPServlet::AbstractServlet
  def do_GET(request, response)
    response.status = 200
    response['Content-Type'] = 'text/html'
    response.body = <<~HTML
      <!DOCTYPE html>
      <html>
      <head>
        <title>CS2D - Mac Optimized</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            background: #1a1a1a; 
            color: white; 
            overflow: hidden;
          }
          #game-canvas { 
            cursor: crosshair; 
            display: block;
          }
          #controls {
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 5px;
            font-size: 12px;
          }
          #hud {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <canvas id="game-canvas"></canvas>
        <div id="controls">
          <b>CS2D - Mac 觸控板優化版</b><br><br>
          移動: WASD (Shift 加速)<br>
          瞄準: 方向鍵/IJKL<br>
          射擊: 空白鍵<br>
          轉身: Q (180°)<br>
          自動瞄準: V<br><br>
          觸控板:<br>
          雙指橫滑 - 旋轉<br>
          雙指縱滑 - 距離<br>
          雙指點擊 - 射擊
        </div>
        <div id="hud">
          <div>HP: <span id="health">100</span></div>
          <div>Ammo: <span id="ammo">30/90</span></div>
          <div>Score: <span id="score">0</span></div>
        </div>
        
        <script>
          class CS2DGame {
            constructor() {
              this.canvas = document.getElementById('game-canvas');
              this.ctx = this.canvas.getContext('2d');
              this.canvas.width = window.innerWidth;
              this.canvas.height = window.innerHeight;
              
              this.player = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                angle: 0,
                health: 100,
                ammo: 30
              };
              
              this.enemies = [];
              this.bullets = [];
              this.keys = {};
              this.autoAim = true;
              this.aimDistance = 150;
              
              this.setupInput();
              this.spawnEnemies();
              this.gameLoop();
            }
            
            setupInput() {
              document.addEventListener('keydown', (e) => {
                this.keys[e.key.toLowerCase()] = true;
                
                if (e.key === ' ') {
                  e.preventDefault();
                  this.shoot();
                }
                if (e.key === 'q') this.player.angle += Math.PI;
                if (e.key === 'v') {
                  this.autoAim = !this.autoAim;
                  this.showNotification(this.autoAim ? '自動瞄準: ON' : '自動瞄準: OFF');
                }
                if (e.key === 'ArrowLeft' || e.key === 'j') this.player.angle -= 0.1;
                if (e.key === 'ArrowRight' || e.key === 'l') this.player.angle += 0.1;
                if (e.key === 'ArrowUp' || e.key === 'i') this.aimDistance = Math.min(this.aimDistance + 10, 250);
                if (e.key === 'ArrowDown' || e.key === 'k') this.aimDistance = Math.max(this.aimDistance - 10, 50);
              });
              
              document.addEventListener('keyup', (e) => {
                this.keys[e.key.toLowerCase()] = false;
              });
              
              this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                  this.player.angle += e.deltaX * 0.01;
                } else {
                  this.aimDistance = Math.max(50, Math.min(250, this.aimDistance - e.deltaY));
                }
              });
              
              this.canvas.addEventListener('click', () => this.shoot());
              this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.shoot();
              });
            }
            
            spawnEnemies() {
              for (let i = 0; i < 5; i++) {
                this.enemies.push({
                  x: Math.random() * this.canvas.width,
                  y: Math.random() * this.canvas.height,
                  health: 50,
                  angle: Math.random() * Math.PI * 2
                });
              }
            }
            
            shoot() {
              if (this.player.ammo > 0) {
                this.player.ammo--;
                this.bullets.push({
                  x: this.player.x,
                  y: this.player.y,
                  vx: Math.cos(this.player.angle) * 10,
                  vy: Math.sin(this.player.angle) * 10,
                  life: 100
                });
                document.getElementById('ammo').textContent = this.player.ammo + '/90';
              }
            }
            
            update() {
              // Player movement
              let dx = 0, dy = 0;
              if (this.keys['w']) dy -= 1;
              if (this.keys['s']) dy += 1;
              if (this.keys['a']) dx -= 1;
              if (this.keys['d']) dx += 1;
              
              const speed = this.keys['shift'] ? 7 : 5;
              if (dx !== 0 || dy !== 0) {
                const moveAngle = Math.atan2(dy, dx);
                this.player.x += Math.cos(moveAngle) * speed;
                this.player.y += Math.sin(moveAngle) * speed;
                
                this.player.x = Math.max(20, Math.min(this.canvas.width - 20, this.player.x));
                this.player.y = Math.max(20, Math.min(this.canvas.height - 20, this.player.y));
              }
              
              // Auto aim
              if (this.autoAim && this.enemies.length > 0) {
                let closest = null;
                let minDist = Infinity;
                
                this.enemies.forEach(enemy => {
                  const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                  if (dist < minDist) {
                    minDist = dist;
                    closest = enemy;
                  }
                });
                
                if (closest && minDist < 300) {
                  const targetAngle = Math.atan2(closest.y - this.player.y, closest.x - this.player.x);
                  const diff = targetAngle - this.player.angle;
                  this.player.angle += diff * 0.1;
                }
              }
              
              // Update bullets
              this.bullets = this.bullets.filter(bullet => {
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
                bullet.life--;
                
                // Check enemy hits
                this.enemies.forEach((enemy, i) => {
                  if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 20) {
                    enemy.health -= 10;
                    if (enemy.health <= 0) {
                      this.enemies.splice(i, 1);
                      const score = parseInt(document.getElementById('score').textContent);
                      document.getElementById('score').textContent = score + 100;
                    }
                    bullet.life = 0;
                  }
                });
                
                return bullet.life > 0 && 
                       bullet.x > 0 && bullet.x < this.canvas.width &&
                       bullet.y > 0 && bullet.y < this.canvas.height;
              });
              
              // Simple enemy AI
              this.enemies.forEach(enemy => {
                enemy.angle += (Math.random() - 0.5) * 0.1;
                enemy.x += Math.cos(enemy.angle) * 2;
                enemy.y += Math.sin(enemy.angle) * 2;
                
                if (enemy.x < 20 || enemy.x > this.canvas.width - 20) enemy.angle = Math.PI - enemy.angle;
                if (enemy.y < 20 || enemy.y > this.canvas.height - 20) enemy.angle = -enemy.angle;
              });
            }
            
            render() {
              // Clear
              this.ctx.fillStyle = '#2a2a2a';
              this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
              
              // Grid
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
              
              // Enemies
              this.enemies.forEach(enemy => {
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Health bar
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 4);
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * (enemy.health/50), 4);
              });
              
              // Player
              this.ctx.fillStyle = '#4444ff';
              this.ctx.beginPath();
              this.ctx.arc(this.player.x, this.player.y, 15, 0, Math.PI * 2);
              this.ctx.fill();
              
              // Player direction
              this.ctx.strokeStyle = '#ffffff';
              this.ctx.lineWidth = 3;
              this.ctx.beginPath();
              this.ctx.moveTo(this.player.x, this.player.y);
              this.ctx.lineTo(
                this.player.x + Math.cos(this.player.angle) * 25,
                this.player.y + Math.sin(this.player.angle) * 25
              );
              this.ctx.stroke();
              
              // Aim system
              const aimX = this.player.x + Math.cos(this.player.angle) * this.aimDistance;
              const aimY = this.player.y + Math.sin(this.player.angle) * this.aimDistance;
              
              // Aim line
              this.ctx.strokeStyle = this.autoAim ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)';
              this.ctx.lineWidth = 1;
              this.ctx.setLineDash([5, 5]);
              this.ctx.beginPath();
              this.ctx.moveTo(this.player.x, this.player.y);
              this.ctx.lineTo(aimX, aimY);
              this.ctx.stroke();
              this.ctx.setLineDash([]);
              
              // Crosshair
              this.ctx.strokeStyle = this.autoAim ? '#ff4444' : '#00ff00';
              this.ctx.lineWidth = 2;
              this.ctx.beginPath();
              this.ctx.arc(aimX, aimY, 15, 0, Math.PI * 2);
              this.ctx.stroke();
              
              // Bullets
              this.ctx.fillStyle = '#ffff00';
              this.bullets.forEach(bullet => {
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
              });
            }
            
            showNotification(text) {
              const div = document.createElement('div');
              div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:#ffaa00;padding:20px;border-radius:5px;font-size:18px;';
              div.textContent = text;
              document.body.appendChild(div);
              setTimeout(() => div.remove(), 1000);
            }
            
            gameLoop() {
              this.update();
              this.render();
              requestAnimationFrame(() => this.gameLoop());
            }
          }
          
          window.addEventListener('DOMContentLoaded', () => {
            new CS2DGame();
          });
        </script>
      </body>
      </html>
    HTML
  end
end

server = WEBrick::HTTPServer.new(Port: 9292)
server.mount '/', CS2DServer
trap('INT') { server.shutdown }

puts "🎮 CS2D Server started!"
puts "📱 Open http://localhost:9292 in your browser"
puts "🎯 Mac touchpad optimized!"
puts "Press Ctrl+C to stop"

server.start