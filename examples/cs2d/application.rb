#!/usr/bin/env lively
# frozen_string_literal: true

require_relative "game/multiplayer_game_room"
require_relative "game/room_manager"
require_relative "game/player"
require_relative "game/game_state"
require_relative "game/network_manager"

class CS2DView < Live::View
  @@room_manager = RoomManager.new
  
  def initialize(...)
    super
    @room_id = nil
    @player_id = nil
    @network_manager = NetworkManager.new
    @client_state = {
      last_server_tick: 0,
      prediction_buffer: [],
      interpolation_buffer: [],
      pending_inputs: []
    }
  end
  
  def bind(page)
    super
    @page = page
    @player_id = page.id
    
    # Try to join an existing room or create a new one
    @room_id = @@room_manager.find_or_create_room(@player_id)
    @game_room = @@room_manager.get_room(@room_id)
    
    if @game_room
      @game_room.add_player(@player_id, self)
      send_initial_state
    end
    
    self.update!
  end
  
  def close
    if @game_room && @player_id
      @game_room.remove_player(@player_id)
      # Remove empty rooms
      @@room_manager.cleanup_empty_room(@room_id)
    end
    super
  end
  
  def handle(event)
    return unless @game_room && @player_id
    
    # Add sequence number for client prediction
    event[:sequence] = (event[:sequence] || 0)
    event[:timestamp] = Time.now.to_f * 1000 # milliseconds
    event[:player_id] = @player_id
    
    case event[:type]
    when "input_move"
      handle_movement_input(event)
    when "input_shoot"
      handle_shoot_input(event)
    when "input_reload"
      handle_reload_input(event)
    when "change_team"
      @game_room.change_team(@player_id, event[:team])
    when "buy_weapon"
      @game_room.buy_weapon(@player_id, event[:weapon])
    when "plant_bomb"
      @game_room.plant_bomb(@player_id)
    when "defuse_bomb"
      @game_room.defuse_bomb(@player_id)
    when "chat_message"
      @game_room.broadcast_chat(@player_id, event[:message])
    when "client_prediction_result"
      handle_client_prediction(event)
    when "request_room_info"
      send_room_info
    when "vote_kick"
      @game_room.vote_kick(@player_id, event[:target_id])
    end
  end
  
  def handle_movement_input(event)
    # Server-side validation and lag compensation
    player = @game_room.get_player(@player_id)
    return unless player
    
    # Apply lag compensation - rollback to client's time
    rollback_time = event[:timestamp]
    @game_room.apply_lag_compensation(rollback_time)
    
    # Validate and apply movement
    result = @game_room.process_movement(@player_id, event[:input])
    
    # Restore current state
    @game_room.restore_current_state
    
    # Send authoritative result back to client
    send_to_player(@player_id, {
      type: "movement_result",
      sequence: event[:sequence],
      position: result[:position],
      timestamp: Time.now.to_f * 1000
    })
  end
  
  def handle_shoot_input(event)
    # Server authoritative shooting
    result = @game_room.process_shoot(@player_id, event[:angle], event[:timestamp])
    
    if result[:success]
      # Broadcast to all players in room
      broadcast_to_room({
        type: "player_shot",
        player_id: @player_id,
        angle: event[:angle],
        bullet_id: result[:bullet_id],
        position: result[:position],
        timestamp: Time.now.to_f * 1000
      })
    end
  end
  
  def handle_reload_input(event)
    result = @game_room.process_reload(@player_id)
    
    send_to_player(@player_id, {
      type: "reload_result",
      sequence: event[:sequence],
      success: result[:success],
      reload_time: result[:reload_time],
      timestamp: Time.now.to_f * 1000
    })
  end
  
  def handle_client_prediction(event)
    # Client is sending their predicted state for server reconciliation
    @game_room.reconcile_client_state(@player_id, event[:predicted_state], event[:sequence])
  end
  
  def broadcast_to_room(message)
    @game_room.broadcast_to_all_players(message)
  end
  
  def send_to_player(player_id, message)
    if view = @game_room.get_player_view(player_id)
      view.send_message(message)
    end
  end
  
  def send_message(message)
    @page&.live&.push(message.to_json)
  end
  
  def send_initial_state
    send_message({
      type: "initial_state",
      room_id: @room_id,
      player_id: @player_id,
      game_state: @game_room.get_full_state,
      server_tick_rate: 30,
      timestamp: Time.now.to_f * 1000
    })
  end
  
  def send_room_info
    room_info = @game_room.get_room_info
    send_message({
      type: "room_info",
      room_info: room_info,
      timestamp: Time.now.to_f * 1000
    })
  end
  
  # This method is now handled by the MultiplayerGameRoom's broadcast system
  
  def render(builder)
    # Add CSS animations
    builder.tag(:style) do
      builder.text(<<~CSS)
        @keyframes damageFloat {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -150%) scale(1.2); opacity: 0; }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .kill-feed-entry {
          animation: slideIn 0.3s ease-out;
        }
        
        .notification {
          animation: fadeInOut 3s ease-in-out;
        }
        
        .damage-indicator {
          animation: damageFloat 1s ease-out forwards;
        }
        
        .low-health .health-fill {
          animation: pulse 1s infinite;
        }
        
        .connecting {
          opacity: 0.5;
        }
        
        .network-poor {
          color: #ff4444 !important;
        }
        
        .network-good {
          color: #44ff44 !important;
        }
      CSS
    end
    
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
    # Top bar with round info and scores
    builder.tag(:div, id: "top-bar", style: "position: absolute; top: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; pointer-events: none;") do
      builder.tag(:div, class: "score", style: "display: flex; gap: 20px; font-size: 24px; font-weight: bold;") do
        builder.tag(:div, class: "ct-score", style: "color: #4488ff;") { builder.text("CT: 0") }
        builder.tag(:div, class: "t-score", style: "color: #ff8844;") { builder.text("T: 0") }
      end
      
      builder.tag(:div, id: "round-timer", style: "font-size: 32px; font-weight: bold; color: white;") { builder.text("1:55") }
      
      builder.tag(:div, id: "round-info", style: "text-align: right; font-size: 14px; color: white;") do
        builder.tag(:div, id: "round-number") { builder.text("Round 1") }
        builder.tag(:div, id: "game-phase") { builder.text("Buy Time") }
      end
    end
    
    # Bottom HUD
    builder.tag(:div, id: "bottom-bar", style: "position: absolute; bottom: 0; left: 0; right: 0; height: 100px; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); display: flex; justify-content: space-between; align-items: flex-end; padding: 20px; pointer-events: none;") do
      # Health and Armor bars
      builder.tag(:div, class: "health-armor", style: "display: flex; flex-direction: column; gap: 5px;") do
        builder.tag(:div, class: "bar", style: "width: 200px; height: 20px; background: rgba(0,0,0,0.5); position: relative; border: 1px solid #444;") do
          builder.tag(:div, class: "bar-fill health-fill", style: "height: 100%; width: 100%; background: linear-gradient(to right, #ff4444, #ff6666); transition: width 0.3s;")
          builder.tag(:div, class: "bar-text", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; color: white;", id: "health") { builder.text("HP: 100") }
        end
        
        builder.tag(:div, class: "bar", style: "width: 200px; height: 20px; background: rgba(0,0,0,0.5); position: relative; border: 1px solid #444;") do
          builder.tag(:div, class: "bar-fill armor-fill", style: "height: 100%; width: 0%; background: linear-gradient(to right, #4444ff, #6666ff); transition: width 0.3s;")
          builder.tag(:div, class: "bar-text", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; color: white;", id: "armor") { builder.text("Armor: 0") }
        end
      end
      
      # Weapon and ammo info
      builder.tag(:div, class: "weapon-info", style: "display: flex; flex-direction: column; align-items: center; gap: 5px; color: white;") do
        builder.tag(:div, id: "weapon-name", style: "font-size: 18px; font-weight: bold;") { builder.text("Glock-18") }
        builder.tag(:div, id: "ammo", style: "font-size: 14px;") { builder.text("Ammo: 20/40") }
      end
      
      # Money and utility
      builder.tag(:div, class: "player-info", style: "text-align: right; color: white;") do
        builder.tag(:div, id: "money", style: "font-size: 18px; font-weight: bold; color: #00ff00;") { builder.text("$800") }
        builder.tag(:div, id: "player-name", style: "font-size: 12px;") { builder.text("Player") }
        builder.tag(:div, id: "ping", style: "font-size: 10px; color: #888;") { builder.text("Ping: 0ms") }
      end
    end
    
    # Kill feed area
    builder.tag(:div, id: "kill-feed-container", style: "position: absolute; top: 100px; right: 10px; width: 250px; z-index: 1000;")
    
    # Network debug info (hidden by default)
    builder.tag(:div, id: "network-debug", style: "position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px; font-size: 10px; font-family: monospace; display: none;")
  end
  
  def render_scoreboard(builder)
    builder.tag(:div, id: "scoreboard", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: white; padding: 20px; display: none; border-radius: 10px; min-width: 500px;") do
      builder.tag(:div, style: "text-align: center; margin-bottom: 20px;") do
        builder.tag(:h2, style: "margin: 0 0 10px 0;") { builder.text("Scoreboard") }
        builder.tag(:div, id: "match-info", style: "font-size: 14px; color: #888;") { builder.text("Round 1 - de_dust2") }
      end
      
      builder.tag(:div, style: "display: flex; gap: 40px; justify-content: center;") do
        # Counter-Terrorists team
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #4488ff; text-align: center; margin-bottom: 10px;") { builder.text("Counter-Terrorists") }
          builder.tag(:div, id: "ct-players", style: "border: 1px solid #4488ff; border-radius: 5px; padding: 10px;") do
            builder.tag(:div, style: "display: flex; font-weight: bold; margin-bottom: 5px; font-size: 12px; color: #888;") do
              builder.tag(:span, style: "flex: 2;") { builder.text("Player") }
              builder.tag(:span, style: "width: 30px; text-align: center;") { builder.text("K") }
              builder.tag(:span, style: "width: 30px; text-align: center;") { builder.text("D") }
              builder.tag(:span, style: "width: 40px; text-align: center;") { builder.text("Ping") }
            end
            builder.tag(:div, id: "ct-player-list") { builder.text("Loading...") }
          end
        end
        
        # Terrorists team
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #ff8844; text-align: center; margin-bottom: 10px;") { builder.text("Terrorists") }
          builder.tag(:div, id: "t-players", style: "border: 1px solid #ff8844; border-radius: 5px; padding: 10px;") do
            builder.tag(:div, style: "display: flex; font-weight: bold; margin-bottom: 5px; font-size: 12px; color: #888;") do
              builder.tag(:span, style: "flex: 2;") { builder.text("Player") }
              builder.tag(:span, style: "width: 30px; text-align: center;") { builder.text("K") }
              builder.tag(:span, style: "width: 30px; text-align: center;") { builder.text("D") }
              builder.tag(:span, style: "width: 40px; text-align: center;") { builder.text("Ping") }
            end
            builder.tag(:div, id: "t-player-list") { builder.text("Loading...") }
          end
        end
      end
      
      builder.tag(:div, style: "text-align: center; margin-top: 20px; font-size: 12px; color: #888;") do
        builder.tag(:div) { builder.text("Press TAB to close") }
        builder.tag(:div, style: "margin-top: 5px;") do
          builder.tag(:span, id: "server-info") { builder.text("Server: Loading...") }
        end
      end
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
      
      // Client-side prediction and networking classes
      // Performance Optimization Classes
      class ObjectPool {
        constructor(createFn, resetFn = null) {
          this.createFn = createFn;
          this.resetFn = resetFn;
          this.pool = [];
          this.used = [];
        }
        
        get() {
          let obj;
          if (this.pool.length > 0) {
            obj = this.pool.pop();
          } else {
            obj = this.createFn();
          }
          this.used.push(obj);
          return obj;
        }
        
        release(obj) {
          const index = this.used.indexOf(obj);
          if (index > -1) {
            this.used.splice(index, 1);
            if (this.resetFn) {
              this.resetFn(obj);
            }
            this.pool.push(obj);
          }
        }
        
        releaseAll() {
          if (this.resetFn) {
            this.used.forEach(obj => this.resetFn(obj));
          }
          this.pool.push(...this.used);
          this.used.length = 0;
        }
      }
      
      class FrustumCuller {
        constructor() {
          this.viewBounds = { x: 0, y: 0, width: 1920, height: 1080 };
          this.margin = 100; // Extra margin for objects entering view
        }
        
        updateBounds(camera, canvas) {
          this.viewBounds.x = camera.x - canvas.width / 2 - this.margin;
          this.viewBounds.y = camera.y - canvas.height / 2 - this.margin;
          this.viewBounds.width = canvas.width + this.margin * 2;
          this.viewBounds.height = canvas.height + this.margin * 2;
        }
        
        isInView(object) {
          if (!object.x || !object.y) return true; // Always render if no position
          
          return !(
            object.x + (object.radius || 20) < this.viewBounds.x ||
            object.x - (object.radius || 20) > this.viewBounds.x + this.viewBounds.width ||
            object.y + (object.radius || 20) < this.viewBounds.y ||
            object.y - (object.radius || 20) > this.viewBounds.y + this.viewBounds.height
          );
        }
        
        filterVisible(objects) {
          return objects.filter(obj => this.isInView(obj));
        }
      }
      
      class DirtyRectangleRenderer {
        constructor(canvas) {
          this.canvas = canvas;
          this.ctx = canvas.getContext('2d');
          this.dirtyRegions = [];
          this.lastFrameObjects = new Map();
          this.currentFrameObjects = new Map();
        }
        
        markDirty(x, y, width, height) {
          this.dirtyRegions.push({ x: x - 10, y: y - 10, width: width + 20, height: height + 20 });
        }
        
        beginFrame() {
          this.currentFrameObjects.clear();
          this.dirtyRegions = [];
        }
        
        addObject(id, x, y, width, height) {
          const bounds = { x, y, width, height };
          this.currentFrameObjects.set(id, bounds);
          
          const lastBounds = this.lastFrameObjects.get(id);
          if (!lastBounds || 
              lastBounds.x !== x || lastBounds.y !== y || 
              lastBounds.width !== width || lastBounds.height !== height) {
            // Mark both old and new positions as dirty
            if (lastBounds) {
              this.markDirty(lastBounds.x, lastBounds.y, lastBounds.width, lastBounds.height);
            }
            this.markDirty(x, y, width, height);
          }
        }
        
        endFrame() {
          // Mark removed objects as dirty
          for (const [id, bounds] of this.lastFrameObjects) {
            if (!this.currentFrameObjects.has(id)) {
              this.markDirty(bounds.x, bounds.y, bounds.width, bounds.height);
            }
          }
          
          this.lastFrameObjects = new Map(this.currentFrameObjects);
        }
        
        clearDirtyRegions() {
          // Merge overlapping dirty regions for efficiency
          this.dirtyRegions = this.mergeRegions(this.dirtyRegions);
          
          for (const region of this.dirtyRegions) {
            this.ctx.clearRect(region.x, region.y, region.width, region.height);
          }
        }
        
        mergeRegions(regions) {
          if (regions.length <= 1) return regions;
          
          const merged = [];
          const sorted = regions.sort((a, b) => a.x - b.x);
          
          for (const region of sorted) {
            let wasMerged = false;
            for (let i = 0; i < merged.length; i++) {
              if (this.regionsOverlap(merged[i], region)) {
                merged[i] = this.mergeRegion(merged[i], region);
                wasMerged = true;
                break;
              }
            }
            if (!wasMerged) {
              merged.push(region);
            }
          }
          
          return merged;
        }
        
        regionsOverlap(a, b) {
          return !(a.x + a.width < b.x || b.x + b.width < a.x || 
                  a.y + a.height < b.y || b.y + b.height < a.y);
        }
        
        mergeRegion(a, b) {
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          const width = Math.max(a.x + a.width, b.x + b.width) - x;
          const height = Math.max(a.y + a.height, b.y + b.height) - y;
          return { x, y, width, height };
        }
      }
      
      class LODSystem {
        constructor() {
          this.lodLevels = [
            { distance: 0, detail: 'high' },     // 0-200 pixels
            { distance: 200, detail: 'medium' }, // 200-500 pixels  
            { distance: 500, detail: 'low' },    // 500+ pixels
            { distance: 1000, detail: 'minimal' } // 1000+ pixels
          ];
        }
        
        getLOD(distance) {
          for (let i = this.lodLevels.length - 1; i >= 0; i--) {
            if (distance >= this.lodLevels[i].distance) {
              return this.lodLevels[i].detail;
            }
          }
          return 'high';
        }
        
        shouldRenderDetail(distance, detail) {
          const lod = this.getLOD(distance);
          switch (lod) {
            case 'minimal': return false;
            case 'low': return ['health', 'name'].includes(detail);
            case 'medium': return !['shadows', 'particles'].includes(detail);
            case 'high': return true;
            default: return true;
          }
        }
      }
      
      class PerformanceMonitor {
        constructor() {
          this.frameCount = 0;
          this.lastTime = performance.now();
          this.fps = 60;
          this.frameTime = 0;
          this.maxFrameTime = 0;
          this.minFrameTime = Infinity;
          this.renderTime = 0;
          this.updateTime = 0;
          this.memoryUsage = 0;
          this.history = [];
          this.enabled = false;
        }
        
        beginFrame() {
          this.frameStart = performance.now();
        }
        
        endFrame() {
          const now = performance.now();
          this.frameTime = now - this.frameStart;
          this.frameCount++;
          
          this.maxFrameTime = Math.max(this.maxFrameTime, this.frameTime);
          this.minFrameTime = Math.min(this.minFrameTime, this.frameTime);
          
          if (now - this.lastTime >= 1000) {
            this.fps = (this.frameCount * 1000) / (now - this.lastTime);
            this.frameCount = 0;
            this.lastTime = now;
            
            // Reset min/max for next second
            this.maxFrameTime = 0;
            this.minFrameTime = Infinity;
            
            // Memory usage estimation
            if (performance.memory) {
              this.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            }
            
            this.updateHistory();
          }
        }
        
        updateHistory() {
          this.history.push({
            fps: this.fps,
            frameTime: this.frameTime,
            memoryUsage: this.memoryUsage,
            timestamp: performance.now()
          });
          
          // Keep only last 60 seconds of history
          if (this.history.length > 60) {
            this.history.shift();
          }
        }
        
        getStats() {
          return {
            fps: Math.round(this.fps),
            frameTime: Math.round(this.frameTime * 100) / 100,
            maxFrameTime: Math.round(this.maxFrameTime * 100) / 100,
            minFrameTime: Math.round(this.minFrameTime * 100) / 100,
            memoryUsage: Math.round(this.memoryUsage * 100) / 100
          };
        }
      }
      
      class GraphicsSettings {
        constructor() {
          this.quality = this.loadSetting('graphics_quality', 'medium');
          this.settings = this.getQualitySettings(this.quality);
          this.applySettings();
        }
        
        getQualitySettings(quality) {
          const settings = {
            low: {
              particleCount: 10,
              bulletTrails: false,
              muzzleFlash: false,
              bloodEffects: false,
              shadows: false,
              smoothing: false,
              maxBullets: 20,
              lodEnabled: true,
              dirtyRectangles: true,
              targetFPS: 30
            },
            medium: {
              particleCount: 50,
              bulletTrails: true,
              muzzleFlash: true,
              bloodEffects: true,
              shadows: false,
              smoothing: true,
              maxBullets: 50,
              lodEnabled: true,
              dirtyRectangles: true,
              targetFPS: 60
            },
            high: {
              particleCount: 100,
              bulletTrails: true,
              muzzleFlash: true,
              bloodEffects: true,
              shadows: true,
              smoothing: true,
              maxBullets: 100,
              lodEnabled: false,
              dirtyRectangles: false,
              targetFPS: 60
            }
          };
          
          return settings[quality] || settings.medium;
        }
        
        setQuality(quality) {
          if (['low', 'medium', 'high'].includes(quality)) {
            this.quality = quality;
            this.settings = this.getQualitySettings(quality);
            this.saveSetting('graphics_quality', quality);
            this.applySettings();
          }
        }
        
        applySettings() {
          // Apply canvas settings
          const canvas = document.getElementById('game-canvas');
          if (canvas && canvas.getContext) {
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = this.settings.smoothing;
          }
        }
        
        loadSetting(key, defaultValue) {
          try {
            return localStorage.getItem(key) || defaultValue;
          } catch {
            return defaultValue;
          }
        }
        
        saveSetting(key, value) {
          try {
            localStorage.setItem(key, value);
          } catch {
            // Ignore storage errors
          }
        }
      }

      class ClientPrediction {
        constructor() {
          this.inputSequence = 0;
          this.pendingInputs = [];
          this.stateBuffer = [];
          this.reconciliationEnabled = true;
        }
        
        addInput(input) {
          input.sequence = ++this.inputSequence;
          input.timestamp = performance.now();
          this.pendingInputs.push(input);
          return input;
        }
        
        confirmInput(sequence) {
          this.pendingInputs = this.pendingInputs.filter(input => input.sequence > sequence);
        }
        
        rollbackAndReplay(serverState, sequence) {
          if (!this.reconciliationEnabled) return;
          
          // Find the input that needs correction
          const inputIndex = this.pendingInputs.findIndex(input => input.sequence === sequence);
          if (inputIndex === -1) return;
          
          // Apply server correction
          this.applyServerCorrection(serverState);
          
          // Replay all inputs after the corrected one
          const inputsToReplay = this.pendingInputs.slice(inputIndex + 1);
          inputsToReplay.forEach(input => this.applyInputLocally(input));
        }
        
        applyServerCorrection(serverState) {
          // Override local state with server authority
          if (window.game && window.game.localPlayer) {
            window.game.localPlayer.x = serverState.x;
            window.game.localPlayer.y = serverState.y;
          }
        }
        
        applyInputLocally(input) {
          // Re-apply the input locally for prediction
          if (window.game) {
            window.game.processLocalInput(input);
          }
        }
      }
      
      class NetworkStats {
        constructor() {
          this.pingHistory = [];
          this.latency = 0;
          this.jitter = 0;
          this.packetLoss = 0;
          this.lastPingTime = 0;
        }
        
        updateLatency(serverTimestamp) {
          const now = performance.now();
          const rtt = now - this.lastPingTime;
          this.pingHistory.push(rtt);
          
          if (this.pingHistory.length > 10) {
            this.pingHistory.shift();
          }
          
          this.latency = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;
          
          if (this.pingHistory.length > 1) {
            const variance = this.pingHistory.reduce((acc, ping) => {
              return acc + Math.pow(ping - this.latency, 2);
            }, 0) / this.pingHistory.length;
            this.jitter = Math.sqrt(variance);
          }
        }
        
        sendPing() {
          this.lastPingTime = performance.now();
          return {
            type: 'network_ping',
            client_timestamp: this.lastPingTime
          };
        }
        
        getNetworkQuality() {
          if (this.latency < 50) return 'excellent';
          if (this.latency < 100) return 'good';
          if (this.latency < 200) return 'fair';
          return 'poor';
        }
      }
      
      class CS2DGame {
        constructor() {
          this.canvas = document.getElementById('game-canvas');
          this.ctx = this.canvas.getContext('2d');
          this.setupCanvas();
          this.setupInput();
          
          // Performance optimization systems
          this.graphicsSettings = new GraphicsSettings();
          this.performanceMonitor = new PerformanceMonitor();
          this.frustumCuller = new FrustumCuller();
          this.dirtyRenderer = new DirtyRectangleRenderer(this.canvas);
          this.lodSystem = new LODSystem();
          
          // Object pools for performance
          this.bulletPool = new ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 100, id: Math.random() }),
            (bullet) => { bullet.life = 0; bullet.x = 0; bullet.y = 0; }
          );
          
          this.particlePool = new ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 30, color: '#fff', size: 2 }),
            (particle) => { particle.life = 0; particle.x = 0; particle.y = 0; }
          );
          
          this.effectPool = new ObjectPool(
            () => ({ x: 0, y: 0, type: '', life: 0, maxLife: 60, alpha: 1 }),
            (effect) => { effect.life = 0; effect.alpha = 1; }
          );
          
          // Multiplayer state
          this.players = {};
          this.bullets = [];
          this.particles = [];
          this.effects = [];
          this.localPlayer = null;
          this.playerId = null;
          this.roomId = null;
          this.gameState = {};
          
          // Network components
          this.live = Live.connect();
          this.clientPrediction = new ClientPrediction();
          this.networkStats = new NetworkStats();
          this.interpolationBuffer = [];
          this.serverTick = 0;
          this.lastServerUpdate = 0;
          
          // Performance tracking
          this.frameSkipCounter = 0;
          this.targetFrameTime = 1000 / this.graphicsSettings.settings.targetFPS;
          
          // Mac 優化：瞄準系統
          this.aimAngle = 0;
          this.aimDistance = 100;
          this.autoAimEnabled = true;
          this.aimSensitivity = 0.15;
          this.lastShootTime = 0;
          this.shootCooldown = 100; // ms
          
          // Input state for prediction
          this.inputState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false
          };
          
          this.setupNetworking();
          this.gameLoop();
          this.showControls();
          this.startNetworkPing();
          
          // Make game available globally for prediction system
          window.game = this;
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
            
            // Graphics quality controls
            if (e.key === 'F1') {
              e.preventDefault();
              this.graphicsSettings.setQuality('low');
              this.showNotification('Graphics: Low Quality');
            }
            if (e.key === 'F2') {
              e.preventDefault();
              this.graphicsSettings.setQuality('medium');
              this.showNotification('Graphics: Medium Quality');
            }
            if (e.key === 'F3') {
              e.preventDefault();
              this.graphicsSettings.setQuality('high');
              this.showNotification('Graphics: High Quality');
            }
            
            // Toggle performance monitor
            if (e.key === 'F10') {
              e.preventDefault();
              this.performanceMonitor.enabled = !this.performanceMonitor.enabled;
              this.showNotification(`Performance Monitor: ${this.performanceMonitor.enabled ? 'ON' : 'OFF'}`);
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
            this.handleServerMessage(data);
          });
          
          this.live.addEventListener('open', () => {
            console.log('Connected to server');
            this.showNotification('Connected to game server');
          });
          
          this.live.addEventListener('close', (event) => {
            console.log('Disconnected from server', event);
            this.handleNetworkDisconnection(event);
          });
          
          this.live.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            this.showNotification('Network error - check your connection');
          });
        }
        
        handleServerMessage(data) {
          switch (data.type) {
            case 'initial_state':
              this.handleInitialState(data);
              break;
            case 'full_game_state':
              this.handleFullGameState(data);
              break;
            case 'game_state_delta':
              this.handleGameStateDelta(data);
              break;
            case 'movement_result':
              this.handleMovementResult(data);
              break;
            case 'position_correction':
              this.handlePositionCorrection(data);
              break;
            case 'player_shot':
              this.handlePlayerShot(data);
              break;
            case 'player_hit':
              this.handlePlayerHit(data);
              break;
            case 'player_killed':
              this.handlePlayerKilled(data);
              break;
            case 'player_joined':
              this.handlePlayerJoined(data);
              break;
            case 'player_left':
              this.handlePlayerLeft(data);
              break;
            case 'round_started':
              this.handleRoundStarted(data);
              break;
            case 'round_ended':
              this.handleRoundEnded(data);
              break;
            case 'network_pong':
              this.networkStats.updateLatency(data.server_timestamp);
              break;
            case 'room_info':
              this.handleRoomInfo(data);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        }
        
        handleInitialState(data) {
          this.playerId = data.player_id;
          this.roomId = data.room_id;
          this.gameState = data.game_state;
          this.players = data.game_state.players || {};
          this.bullets = data.game_state.bullets || [];
          
          // Set local player reference
          this.localPlayer = this.players[this.playerId];
          
          console.log('Initial state received:', {
            playerId: this.playerId,
            roomId: this.roomId,
            playerCount: Object.keys(this.players).length
          });
          
          this.showNotification('Game ready - use WASD to move, Space to shoot');
        }
        
        handleFullGameState(data) {
          this.gameState = data.state;
          this.players = data.state.players || {};
          this.bullets = data.state.bullets || [];
          this.serverTick = data.state.tick || 0;
          this.lastServerUpdate = performance.now();
          
          // Update local player reference
          this.localPlayer = this.players[this.playerId];
          
          // Add to interpolation buffer
          this.addToInterpolationBuffer(data.state);
          
          this.updateUI();
        }
        
        handleGameStateDelta(data) {
          this.serverTick = data.tick;
          this.lastServerUpdate = performance.now();
          
          // Apply delta updates
          if (data.delta.players) {
            Object.assign(this.players, data.delta.players);
            this.localPlayer = this.players[this.playerId];
          }
          
          if (data.delta.bullets) {
            this.bullets = data.delta.bullets;
          }
          
          if (data.delta.round_time) {
            this.gameState.round_time = data.delta.round_time;
          }
          
          if (data.delta.scores) {
            this.gameState.scores = data.delta.scores;
          }
          
          if (data.delta.game_events) {
            this.processGameEvents(data.delta.game_events);
          }
          
          this.addToInterpolationBuffer({
            players: this.players,
            bullets: this.bullets,
            timestamp: data.timestamp
          });
          
          this.updateUI();
        }
        
        handleMovementResult(data) {
          if (data.player_id !== this.playerId) return;
          
          // Confirm the input sequence
          this.clientPrediction.confirmInput(data.sequence);
          
          // Check if position correction is needed
          const predictedPos = this.localPlayer ? { x: this.localPlayer.x, y: this.localPlayer.y } : null;
          const serverPos = data.position;
          
          if (predictedPos && this.positionsDiffer(predictedPos, serverPos)) {
            this.clientPrediction.rollbackAndReplay(serverPos, data.sequence);
          }
        }
        
        handlePositionCorrection(data) {
          console.log('Position correction received:', data);
          this.clientPrediction.rollbackAndReplay(data.authoritative_position, data.sequence);
        }
        
        positionsDiffer(pos1, pos2, threshold = 5) {
          const distance = Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
          );
          return distance > threshold;
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
          // Update input state
          this.inputState.forward = this.keys['w'];
          this.inputState.backward = this.keys['s'];
          this.inputState.left = this.keys['a'];
          this.inputState.right = this.keys['d'];
          this.inputState.sprint = this.keys['shift'];
          
          let dx = 0, dy = 0;
          if (this.inputState.forward) dy -= 1;
          if (this.inputState.backward) dy += 1;
          if (this.inputState.left) dx -= 1;
          if (this.inputState.right) dx += 1;
          
          const speed = this.inputState.sprint ? 7 : 5;
          
          if (dx !== 0 || dy !== 0) {
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            const input = {
              type: 'input_move',
              input: { dx: vx, dy: vy },
              timestamp: performance.now()
            };
            
            // Add to prediction system
            this.clientPrediction.addInput(input);
            
            // Apply locally for immediate response
            this.processLocalInput(input);
            
            // Send to server
            this.live.push(input);
          }
        }
        
        processLocalInput(input) {
          if (!this.localPlayer) return;
          
          // Apply movement locally for prediction
          const newX = this.localPlayer.x + input.input.dx;
          const newY = this.localPlayer.y + input.input.dy;
          
          // Basic bounds checking (same as server)
          this.localPlayer.x = Math.max(20, Math.min(1260, newX));
          this.localPlayer.y = Math.max(20, Math.min(700, newY));
        }
        
        shoot() {
          const now = performance.now();
          if (now - this.lastShootTime < this.shootCooldown) return;
          if (!this.localPlayer || this.localPlayer.dead) return;
          
          this.lastShootTime = now;
          
          const input = {
            type: 'input_shoot',
            angle: this.aimAngle,
            timestamp: now
          };
          
          // Add to prediction
          this.clientPrediction.addInput(input);
          
          // Send to server
          this.live.push(input);
        }
        
        reload() {
          const input = {
            type: 'input_reload',
            timestamp: performance.now()
          };
          
          this.clientPrediction.addInput(input);
          this.live.push(input);
        }
        
        // Add missing multiplayer methods
        addToInterpolationBuffer(state) {
          this.interpolationBuffer.push({
            ...state,
            timestamp: performance.now()
          });
          
          // Keep buffer size manageable
          if (this.interpolationBuffer.length > 60) { // 2 seconds at 30 fps
            this.interpolationBuffer.shift();
          }
        }
        
        interpolateGameState() {
          if (this.interpolationBuffer.length < 2) return;
          
          const now = performance.now();
          const interpolationDelay = 100; // 100ms delay for smooth interpolation
          const targetTime = now - interpolationDelay;
          
          // Find the two states to interpolate between
          let beforeState = null;
          let afterState = null;
          
          for (let i = 0; i < this.interpolationBuffer.length - 1; i++) {
            if (this.interpolationBuffer[i].timestamp <= targetTime && 
                this.interpolationBuffer[i + 1].timestamp >= targetTime) {
              beforeState = this.interpolationBuffer[i];
              afterState = this.interpolationBuffer[i + 1];
              break;
            }
          }
          
          if (!beforeState || !afterState) return;
          
          // Interpolate between the states
          const alpha = (targetTime - beforeState.timestamp) / 
                       (afterState.timestamp - beforeState.timestamp);
          
          // Interpolate other players (not local player - we use prediction for that)
          Object.keys(afterState.players || {}).forEach(playerId => {
            if (playerId === this.playerId) return; // Skip local player
            
            const beforePlayer = beforeState.players?.[playerId];
            const afterPlayer = afterState.players?.[playerId];
            
            if (beforePlayer && afterPlayer && this.players[playerId]) {
              this.players[playerId].x = beforePlayer.x + (afterPlayer.x - beforePlayer.x) * alpha;
              this.players[playerId].y = beforePlayer.y + (afterPlayer.y - beforePlayer.y) * alpha;
            }
          });
        }
        
        processGameEvents(events) {
          events.forEach(event => {
            switch (event.type) {
              case 'player_killed':
                this.showKillFeed(event);
                break;
              case 'bomb_planted':
                this.showNotification('Bomb has been planted!');
                break;
              case 'bomb_defused':
                this.showNotification('Bomb defused!');
                break;
              case 'round_ended':
                this.showRoundEndMessage(event);
                break;
            }
          });
        }
        
        handlePlayerJoined(data) {
          this.players[data.player.id] = data.player;
          this.showNotification(`${data.player.name} joined the game`);
        }
        
        handlePlayerLeft(data) {
          delete this.players[data.player_id];
          this.showNotification(`${data.player_name} left the game`);
        }
        
        handlePlayerShot(data) {
          // Visual effect for other players shooting
          if (data.player_id !== this.playerId) {
            this.createMuzzleFlash(data.position.x, data.position.y, data.angle);
          }
        }
        
        handlePlayerHit(data) {
          if (data.victim_id === this.playerId) {
            this.showDamageIndicator(data.damage);
          }
          
          // Show hit effect
          const player = this.players[data.victim_id];
          if (player) {
            this.createHitEffect(player.x, player.y);
          }
        }
        
        handlePlayerKilled(data) {
          const victim = this.players[data.victim_id];
          const killer = this.players[data.killer_id];
          
          if (victim) {
            victim.dead = true;
          }
          
          this.showKillFeed({
            killer: killer?.name || 'Unknown',
            victim: victim?.name || 'Unknown',
            weapon: data.weapon
          });
          
          if (data.victim_id === this.playerId) {
            this.showNotification('You have been eliminated!');
          }
        }
        
        handleRoundStarted(data) {
          this.showNotification(`Round ${data.round_number} started!`);
        }
        
        handleRoundEnded(data) {
          const winner = data.winning_team === 'ct' ? 'Counter-Terrorists' : 'Terrorists';
          this.showNotification(`Round over - ${winner} win!`);
        }
        
        handleRoomInfo(data) {
          console.log('Room info:', data.room_info);
        }
        
        startNetworkPing() {
          setInterval(() => {
            if (this.live.readyState === WebSocket.OPEN) {
              this.live.push(this.networkStats.sendPing());
            }
          }, 5000); // Ping every 5 seconds
        }
        
        createMuzzleFlash(x, y, angle) {
          // Simple muzzle flash effect
          // This would be enhanced with particle systems in a full implementation
          setTimeout(() => {
            // Effect cleanup
          }, 100);
        }
        
        createHitEffect(x, y) {
          // Hit effect animation
          // Blood splatter or hit markers
        }
        
        showDamageIndicator(damage) {
          const indicator = document.createElement('div');
          indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: red;
            font-size: 24px;
            font-weight: bold;
            pointer-events: none;
            z-index: 10000;
            animation: damageFloat 1s ease-out forwards;
          `;
          indicator.textContent = `-${damage}`;
          document.body.appendChild(indicator);
          
          setTimeout(() => indicator.remove(), 1000);
        }
        
        showKillFeed(killData) {
          const feed = document.getElementById('kill-feed') || this.createKillFeed();
          
          const entry = document.createElement('div');
          entry.style.cssText = `
            color: white;
            font-size: 12px;
            padding: 2px 5px;
            background: rgba(0,0,0,0.7);
            margin-bottom: 2px;
          `;
          entry.textContent = `${killData.killer} [${killData.weapon}] ${killData.victim}`;
          
          feed.appendChild(entry);
          
          setTimeout(() => entry.remove(), 5000);
        }
        
        createKillFeed() {
          const feed = document.createElement('div');
          feed.id = 'kill-feed';
          feed.style.cssText = `
            position: fixed;
            top: 100px;
            right: 10px;
            width: 250px;
            z-index: 1000;
          `;
          document.body.appendChild(feed);
          return feed;
        }
        
        showRoundEndMessage(data) {
          const message = document.createElement('div');
          message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            text-align: center;
            z-index: 10000;
          `;
          
          const winner = data.winning_team === 'ct' ? 'Counter-Terrorists' : 'Terrorists';
          message.innerHTML = `
            <h2>${winner} Win!</h2>
            <p>Reason: ${data.reason}</p>
            <p>Score: CT ${data.scores.ct} - ${data.scores.t} T</p>
          `;
          
          document.body.appendChild(message);
          setTimeout(() => message.remove(), 3000);
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
            <b>Game Controls</b><br>
            移動：WASD (Shift 加速)<br>
            瞄準：方向鍵 或 IJKL<br>
            射擊：空白鍵 或 點擊<br>
            換彈：R<br>
            快速轉身：Q<br>
            自動瞄準：V<br>
            購買：B 或 數字鍵1-5<br>
            <br>
            <b>Quality Settings</b><br>
            F1: Low Quality<br>
            F2: Medium Quality<br>
            F3: High Quality<br>
            F10: Performance Monitor<br>
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
          // Use dirty rectangles for better performance
          if (this.graphicsSettings.settings.dirtyRectangles) {
            this.dirtyRenderer.beginFrame();
          } else {
            this.ctx.fillStyle = '#2a2a2a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          }
          
          const camera = this.getCamera();
          
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
          
          // Render players with frustum culling and LOD
          const visiblePlayers = this.frustumCuller.filterVisible(Object.values(this.players));
          const localPlayerPos = this.players[this.playerId] || camera;
          
          visiblePlayers.forEach(player => {
            if (this.graphicsSettings.settings.dirtyRectangles) {
              this.dirtyRenderer.addObject(player.id, player.x - 20, player.y - 30, 40, 50);
            }
            
            // Calculate distance for LOD
            const distance = Math.sqrt(
              Math.pow(player.x - localPlayerPos.x, 2) + 
              Math.pow(player.y - localPlayerPos.y, 2)
            );
            
            // Player body
            this.ctx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Direction indicator for local player
            if (player.id === this.playerId) {
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
            
            // Player name (LOD: only show for close/medium distance)
            if (this.lodSystem.shouldRenderDetail(distance, 'name')) {
              this.ctx.fillStyle = 'white';
              this.ctx.font = '12px Arial';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(player.name, player.x, player.y - 25);
            }
            
            // Health bar (LOD: only show for close/medium distance)
            if (this.lodSystem.shouldRenderDetail(distance, 'health')) {
              const barWidth = 30;
              const barHeight = 4;
              this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
              this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth, barHeight);
              this.ctx.fillStyle = player.health > 50 ? '#00ff00' : player.health > 25 ? '#ffaa00' : '#ff0000';
              this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth * (player.health/100), barHeight);
            }
            
            // Shadows (LOD: only for high quality)
            if (this.graphicsSettings.settings.shadows && this.lodSystem.shouldRenderDetail(distance, 'shadows')) {
              this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
              this.ctx.beginPath();
              this.ctx.ellipse(player.x + 2, player.y + 20, 12, 6, 0, 0, Math.PI * 2);
              this.ctx.fill();
            }
          });
          
          // Render bullets with frustum culling
          const visibleBullets = this.frustumCuller.filterVisible(this.bullets);
          if (visibleBullets.length > 0) {
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#ffff00';
            this.ctx.fillStyle = '#ffff00';
            
            visibleBullets.forEach(bullet => {
              if (this.graphicsSettings.settings.dirtyRectangles) {
                this.dirtyRenderer.addObject(bullet.id, bullet.x - 5, bullet.y - 5, 10, 10);
              }
              this.ctx.beginPath();
              this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
              this.ctx.fill();
            });
            this.ctx.shadowBlur = 0;
          }
          
          // Render particles (only if enabled)
          if (this.graphicsSettings.settings.bulletTrails && this.particles.length > 0) {
            const visibleParticles = this.frustumCuller.filterVisible(this.particles);
            visibleParticles.forEach(particle => {
              this.ctx.globalAlpha = particle.alpha;
              this.ctx.fillStyle = particle.color;
              this.ctx.beginPath();
              this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
              this.ctx.fill();
            });
            this.ctx.globalAlpha = 1;
          }
          
          // Render effects
          if (this.effects.length > 0) {
            const visibleEffects = this.frustumCuller.filterVisible(this.effects);
            visibleEffects.forEach(effect => {
              this.ctx.globalAlpha = effect.alpha;
              this.renderEffect(effect);
            });
            this.ctx.globalAlpha = 1;
          }
          
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
          
          // Finalize dirty rectangle rendering
          if (this.graphicsSettings.settings.dirtyRectangles) {
            this.dirtyRenderer.endFrame();
          }
        }
        
        renderEffect(effect) {
          switch (effect.type) {
            case 'muzzle_flash':
              if (this.graphicsSettings.settings.muzzleFlash) {
                this.ctx.fillStyle = '#ff8800';
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Flash lines
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                  const angle = (Math.PI * 2 / 6) * i + (effect.angle || 0);
                  this.ctx.beginPath();
                  this.ctx.moveTo(effect.x, effect.y);
                  this.ctx.lineTo(
                    effect.x + Math.cos(angle) * 15,
                    effect.y + Math.sin(angle) * 15
                  );
                  this.ctx.stroke();
                }
              }
              break;
              
            case 'blood':
              if (this.graphicsSettings.settings.bloodEffects) {
                this.ctx.fillStyle = '#cc0000';
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, 4, 0, Math.PI * 2);
                this.ctx.fill();
              }
              break;
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
          this.performanceMonitor.beginFrame();
          
          // Skip frame if performance is poor and we're behind target
          const now = performance.now();
          if (now - this.lastFrameTime < this.targetFrameTime * 0.8) {
            requestAnimationFrame(() => this.gameLoop());
            return;
          }
          this.lastFrameTime = now;
          
          // Update game systems
          this.handleMovement();
          this.interpolateGameState();
          this.updateBullets();
          this.updateParticles();
          this.updateEffects();
          
          // Frustum culling
          this.frustumCuller.updateBounds(this.getCamera(), this.canvas);
          
          // Render with optimizations
          this.render();
          this.updateUI();
          
          this.performanceMonitor.endFrame();
          
          // Adjust quality based on performance
          this.autoAdjustQuality();
          
          requestAnimationFrame(() => this.gameLoop());
        }
        
        updateBullets() {
          const maxBullets = this.graphicsSettings.settings.maxBullets;
          
          // Remove excess bullets if over limit
          while (this.bullets.length > maxBullets) {
            const bullet = this.bullets.shift();
            this.bulletPool.release(bullet);
          }
          
          // Update remaining bullets
          this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            
            if (bullet.life <= 0) {
              this.bulletPool.release(bullet);
              return false;
            }
            return true;
          });
        }
        
        updateParticles() {
          if (!this.graphicsSettings.settings.bulletTrails) {
            this.particlePool.releaseAll();
            this.particles.length = 0;
            return;
          }
          
          this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            particle.alpha = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
              this.particlePool.release(particle);
              return false;
            }
            return true;
          });
        }
        
        updateEffects() {
          this.effects = this.effects.filter(effect => {
            effect.life--;
            effect.alpha = effect.life / effect.maxLife;
            
            if (effect.life <= 0) {
              this.effectPool.release(effect);
              return false;
            }
            return true;
          });
        }
        
        createBullet(x, y, vx, vy) {
          const bullet = this.bulletPool.get();
          bullet.x = x;
          bullet.y = y;
          bullet.vx = vx;
          bullet.vy = vy;
          bullet.life = bullet.maxLife;
          this.bullets.push(bullet);
          
          // Create particle trail if enabled
          if (this.graphicsSettings.settings.bulletTrails) {
            this.createBulletTrail(x, y, vx, vy);
          }
        }
        
        createBulletTrail(x, y, vx, vy) {
          for (let i = 0; i < 3; i++) {
            const particle = this.particlePool.get();
            particle.x = x + (Math.random() - 0.5) * 5;
            particle.y = y + (Math.random() - 0.5) * 5;
            particle.vx = vx * 0.1 + (Math.random() - 0.5) * 2;
            particle.vy = vy * 0.1 + (Math.random() - 0.5) * 2;
            particle.life = particle.maxLife;
            particle.color = '#ffff00';
            particle.size = 2;
            this.particles.push(particle);
          }
        }
        
        createMuzzleFlash(x, y, angle) {
          if (!this.graphicsSettings.settings.muzzleFlash) return;
          
          const effect = this.effectPool.get();
          effect.x = x;
          effect.y = y;
          effect.type = 'muzzle_flash';
          effect.angle = angle;
          effect.life = effect.maxLife;
          this.effects.push(effect);
          
          // Particles for muzzle flash
          for (let i = 0; i < this.graphicsSettings.settings.particleCount / 10; i++) {
            const particle = this.particlePool.get();
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle + (Math.random() - 0.5) * 0.5) * 5;
            particle.vy = Math.sin(angle + (Math.random() - 0.5) * 0.5) * 5;
            particle.life = 10;
            particle.color = '#ff8800';
            particle.size = 3;
            this.particles.push(particle);
          }
        }
        
        getCamera() {
          if (this.localPlayer && this.players[this.playerId]) {
            const player = this.players[this.playerId];
            return { x: player.x, y: player.y };
          }
          return { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        }
        
        autoAdjustQuality() {
          const stats = this.performanceMonitor.getStats();
          
          // Auto-adjust quality if FPS is consistently low
          if (stats.fps < 30 && this.graphicsSettings.quality !== 'low') {
            this.showNotification('Performance warning: Switching to low quality');
            this.graphicsSettings.setQuality('low');
            this.targetFrameTime = 1000 / this.graphicsSettings.settings.targetFPS;
          } else if (stats.fps > 55 && this.graphicsSettings.quality === 'low') {
            this.showNotification('Performance improved: Switching to medium quality');
            this.graphicsSettings.setQuality('medium');
            this.targetFrameTime = 1000 / this.graphicsSettings.settings.targetFPS;
          }
        }
        
        updateUI() {
          if (!this.localPlayer) return;
          
          // Update HUD
          const healthEl = document.getElementById('health');
          const armorEl = document.getElementById('armor');
          const moneyEl = document.getElementById('money');
          const ammoEl = document.getElementById('ammo');
          
          if (healthEl) healthEl.textContent = `HP: ${this.localPlayer.health}`;
          if (armorEl) armorEl.textContent = `Armor: ${this.localPlayer.armor}`;
          if (moneyEl) moneyEl.textContent = `$${this.localPlayer.money}`;
          if (ammoEl && this.localPlayer.ammo) {
            ammoEl.textContent = `Ammo: ${this.localPlayer.ammo.magazine}/${this.localPlayer.ammo.reserve}`;
          }
          
          // Update round info
          if (this.gameState.round_info) {
            const roundTime = Math.max(0, Math.ceil(this.gameState.round_info.time_left));
            const minutes = Math.floor(roundTime / 60);
            const seconds = roundTime % 60;
            const timerEl = document.getElementById('round-timer');
            if (timerEl) {
              timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Update scores
            if (this.gameState.round_info.scores) {
              const ctScoreEl = document.querySelector('.ct-score');
              const tScoreEl = document.querySelector('.t-score');
              if (ctScoreEl) ctScoreEl.textContent = `CT: ${this.gameState.round_info.scores.ct}`;
              if (tScoreEl) tScoreEl.textContent = `T: ${this.gameState.round_info.scores.t}`;
            }
          }
          
          // Show network stats in debug mode
          this.updateNetworkDebugInfo();
        }
        
        handleNetworkDisconnection(event) {
          const reason = event.code === 1006 ? 'Network error' : 'Connection closed';
          this.showNotification(`${reason} - attempting to reconnect...`);
          
          // Attempt to reconnect with exponential backoff
          let retryCount = 0;
          const maxRetries = 5;
          
          const attemptReconnect = () => {
            if (retryCount >= maxRetries) {
              this.showNotification('Failed to reconnect. Please refresh the page.');
              return;
            }
            
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            
            setTimeout(() => {
              try {
                this.live = Live.connect();
                this.setupNetworking();
                this.showNotification(`Reconnection attempt ${retryCount}/${maxRetries}`);
              } catch (error) {
                console.error('Reconnection failed:', error);
                attemptReconnect();
              }
            }, delay);
          };
          
          attemptReconnect();
        }
        
        updateNetworkDebugInfo() {
          let debugEl = document.getElementById('network-debug');
          if (!debugEl) {
            debugEl = document.createElement('div');
            debugEl.id = 'network-debug';
            debugEl.style.cssText = `
              position: fixed;
              bottom: 10px;
              right: 10px;
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 5px;
              font-size: 10px;
              font-family: monospace;
              display: ${this.performanceMonitor.enabled ? 'block' : 'none'};
            `;
            document.body.appendChild(debugEl);
          }
          
          const networkStats = this.networkStats;
          const perfStats = this.performanceMonitor.getStats();
          
          debugEl.innerHTML = `
            <strong>Network</strong><br>
            Ping: ${Math.round(networkStats.latency)}ms<br>
            Jitter: ${Math.round(networkStats.jitter)}ms<br>
            Quality: ${networkStats.getNetworkQuality()}<br>
            <strong>Performance</strong><br>
            FPS: ${perfStats.fps}<br>
            Frame: ${perfStats.frameTime}ms<br>
            Memory: ${perfStats.memoryUsage}MB<br>
            Quality: ${this.graphicsSettings.quality}<br>
            <strong>Game</strong><br>
            Players: ${Object.keys(this.players).length}<br>
            Bullets: ${this.bullets.length}<br>
            Particles: ${this.particles.length}<br>
            Room: ${this.roomId || 'None'}
          `;
          
          // Color code based on performance
          if (perfStats.fps < 30) {
            debugEl.style.borderLeft = '3px solid #ff0000';
          } else if (perfStats.fps < 45) {
            debugEl.style.borderLeft = '3px solid #ffaa00';
          } else {
            debugEl.style.borderLeft = '3px solid #00ff00';
          }
        }
      }
      
      class BrowserCompatibility {
        constructor() {
          this.features = this.detectFeatures();
          this.warnings = [];
        }
        
        detectFeatures() {
          const features = {
            webSocket: typeof WebSocket !== 'undefined',
            canvas: typeof HTMLCanvasElement !== 'undefined' && 
                   HTMLCanvasElement.prototype.getContext,
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
            localStorage: this.testLocalStorage(),
            performance: typeof performance !== 'undefined' && 
                        typeof performance.now === 'function',
            es6Classes: this.testES6Classes(),
            arrowFunctions: this.testArrowFunctions(),
            objectAssign: typeof Object.assign === 'function',
            arrayIncludes: Array.prototype.includes,
            mathSign: typeof Math.sign === 'function'
          };
          
          return features;
        }
        
        testLocalStorage() {
          try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
          } catch {
            return false;
          }
        }
        
        testES6Classes() {
          try {
            eval('class TestClass {}');
            return true;
          } catch {
            return false;
          }
        }
        
        testArrowFunctions() {
          try {
            eval('() => {}');
            return true;
          } catch {
            return false;
          }
        }
        
        checkCompatibility() {
          const criticalFeatures = ['webSocket', 'canvas', 'requestAnimationFrame'];
          const recommendedFeatures = ['localStorage', 'performance', 'es6Classes'];
          
          // Check critical features
          for (const feature of criticalFeatures) {
            if (!this.features[feature]) {
              this.warnings.push({
                level: 'critical',
                message: `Your browser doesn't support ${feature}. The game may not work properly.`,
                feature
              });
            }
          }
          
          // Check recommended features
          for (const feature of recommendedFeatures) {
            if (!this.features[feature]) {
              this.warnings.push({
                level: 'warning',
                message: `Your browser doesn't support ${feature}. Some features may be degraded.`,
                feature
              });
            }
          }
          
          return {
            compatible: this.warnings.filter(w => w.level === 'critical').length === 0,
            warnings: this.warnings
          };
        }
        
        showCompatibilityWarnings() {
          if (this.warnings.length === 0) return;
          
          const warningDiv = document.createElement('div');
          warningDiv.id = 'compatibility-warnings';
          warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: rgba(255, 165, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
          `;
          
          const criticalWarnings = this.warnings.filter(w => w.level === 'critical');
          const otherWarnings = this.warnings.filter(w => w.level !== 'critical');
          
          let html = '<strong>Browser Compatibility Notice</strong><br><br>';
          
          if (criticalWarnings.length > 0) {
            html += '<strong>Critical Issues:</strong><br>';
            criticalWarnings.forEach(warning => {
              html += `• ${warning.message}<br>`;
            });
            html += '<br>';
          }
          
          if (otherWarnings.length > 0) {
            html += '<strong>Warnings:</strong><br>';
            otherWarnings.forEach(warning => {
              html += `• ${warning.message}<br>`;
            });
            html += '<br>';
          }
          
          html += `
            <br>
            <strong>For the best experience, please use:</strong><br>
            • Chrome 60+, Firefox 55+, Safari 12+, or Edge 79+<br>
            <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">
              Continue Anyway
            </button>
          `;
          
          warningDiv.innerHTML = html;
          document.body.appendChild(warningDiv);
        }
        
        applyFallbacks() {
          // Polyfill for requestAnimationFrame
          if (!this.features.requestAnimationFrame) {
            window.requestAnimationFrame = window.requestAnimationFrame ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame ||
              function(callback) {
                return setTimeout(callback, 1000 / 60);
              };
          }
          
          // Polyfill for performance.now()
          if (!this.features.performance) {
            window.performance = window.performance || {};
            window.performance.now = window.performance.now ||
              function() { return Date.now(); };
          }
          
          // Polyfill for Object.assign
          if (!this.features.objectAssign) {
            Object.assign = Object.assign || function(target) {
              for (let i = 1; i < arguments.length; i++) {
                const source = arguments[i];
                for (const key in source) {
                  if (source.hasOwnProperty(key)) {
                    target[key] = source[key];
                  }
                }
              }
              return target;
            };
          }
          
          // Polyfill for Array.includes
          if (!this.features.arrayIncludes) {
            Array.prototype.includes = Array.prototype.includes ||
              function(searchElement) {
                return this.indexOf(searchElement) !== -1;
              };
          }
          
          // Polyfill for Math.sign
          if (!this.features.mathSign) {
            Math.sign = Math.sign || function(x) {
              return ((x > 0) - (x < 0)) || +x;
            };
          }
        }
      }
      
      // Initialize compatibility check and game
      window.addEventListener('DOMContentLoaded', () => {
        const compatibility = new BrowserCompatibility();
        const compatResult = compatibility.checkCompatibility();
        
        if (!compatResult.compatible) {
          compatibility.showCompatibilityWarnings();
          
          // Don't start the game if critical features are missing
          console.error('Critical browser features missing. Game cannot start.');
          return;
        }
        
        // Show warnings for non-critical issues
        if (compatResult.warnings.length > 0) {
          compatibility.showCompatibilityWarnings();
        }
        
        // Apply fallbacks for missing features
        compatibility.applyFallbacks();
        
        // Start the game
        try {
          new CS2DGame();
        } catch (error) {
          console.error('Failed to start game:', error);
          
          // Show user-friendly error message
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10001;
          `;
          errorDiv.innerHTML = `
            <h2>Game Failed to Start</h2>
            <p>There was an error starting the game. This might be due to:</p>
            <ul style="text-align: left; margin: 10px 0;">
              <li>Browser compatibility issues</li>
              <li>Network connectivity problems</li>
              <li>JavaScript being disabled</li>
            </ul>
            <p>Please try refreshing the page or using a different browser.</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin: 10px;">
              Refresh Page
            </button>
          `;
          document.body.appendChild(errorDiv);
        }
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