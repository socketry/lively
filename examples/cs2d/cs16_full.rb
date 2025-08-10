#!/usr/bin/env lively
# frozen_string_literal: true

require 'securerandom'
require 'json'
require 'async'

class CS16View < Live::View
  def bind(page)
    super
    
    @player_id = SecureRandom.uuid
    @game_running = true
    
    # Full CS 1.6 game state
    @game_state = {
      players: {},
      phase: 'warmup',
      round_time: 115,
      freeze_time: 15,
      ct_score: 0,
      t_score: 0,
      round: 1,
      max_rounds: 30,
      bomb: {
        planted: false,
        time_left: 35,
        x: nil,
        y: nil,
        planter_id: nil,
        site: nil
      },
      economy: {
        ct_money: {},
        t_money: {},
        round_bonus: { ct: 3250, t: 3250 }
      },
      weapons: {},
      grenades: [],
      smoke_areas: [],
      flash_effects: [],
      map: 'de_dust2',
      server_tick: 0,
      tick_rate: 64,
      killfeed: [],
      chat_messages: []
    }
    
    # Add player with full CS 1.6 properties
    @game_state[:players][@player_id] = create_player(@player_id, 'ct')
    @game_state[:economy][:ct_money][@player_id] = 16000
    
    # Add bots with different skill levels
    add_bots
    
    self.update!
    
    # Start game loop
    start_game_loop
  end
  
  def create_player(id, team)
    {
      id: id,
      name: "Player_#{id[0..7]}",
      team: team,
      x: team == 'ct' ? 200 : 1080,
      y: team == 'ct' ? 360 : 360,
      angle: 0,
      health: 100,
      armor: 100,
      helmet: true,
      alive: true,
      kills: 0,
      deaths: 0,
      assists: 0,
      money: 16000,
      primary_weapon: team == 'ct' ? 'm4a1' : 'ak47',
      secondary_weapon: 'glock',
      current_weapon: 'primary',
      grenades: {
        flashbang: 2,
        smoke: 1,
        he: 1
      },
      defuse_kit: team == 'ct',
      bomb: team == 't' && id == @player_id,
      velocity: { x: 0, y: 0 },
      walking: false,
      crouching: false,
      reloading: false,
      switching_weapon: false,
      flash_duration: 0,
      in_smoke: false,
      ping: rand(10..50),
      fps: 60 + rand(0..100),
      skill_level: rand(1..10)
    }
  end
  
  def add_bots
    # Add CT bots
    3.times do |i|
      bot_id = "bot_ct_#{i}"
      @game_state[:players][bot_id] = create_player(bot_id, 'ct')
      @game_state[:players][bot_id][:name] = ["Eagle", "Hawk", "Wolf", "Tiger"][i]
      @game_state[:players][bot_id][:x] = 200 + (i * 50)
      @game_state[:players][bot_id][:y] = 300 + (i * 30)
      @game_state[:economy][:ct_money][bot_id] = 16000
    end
    
    # Add T bots
    4.times do |i|
      bot_id = "bot_t_#{i}"
      @game_state[:players][bot_id] = create_player(bot_id, 't')
      @game_state[:players][bot_id][:name] = ["Phoenix", "Viper", "Shadow", "Ghost"][i]
      @game_state[:players][bot_id][:x] = 1080 - (i * 50)
      @game_state[:players][bot_id][:y] = 300 + (i * 30)
      @game_state[:players][bot_id][:bomb] = (i == 0)
      @game_state[:economy][:t_money][bot_id] = 16000
    end
  end
  
  def render(builder)
    # Render full game interface
    render_game_container(builder)
    # Inject the complete CS 1.6 JavaScript game code
    render_cs16_javascript(builder)
  end
  
  def render_game_container(builder)
    builder.tag(:div, id: "cs16-container", data: { live: @id }, 
                style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #000; position: relative; font-family: 'Counter-Strike', Arial, sans-serif;") do
      
      # Main game canvas
      builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
                 style: "display: block; margin: 0 auto; cursor: crosshair; image-rendering: pixelated;",
                 tabIndex: 0)
      
      # CS 1.6 HUD
      render_hud(builder)
      
      # Buy menu (initially hidden)
      render_buy_menu(builder)
      
      # Scoreboard (initially hidden)
      render_scoreboard(builder)
      
      # Chat box
      render_chatbox(builder)
      
      # Killfeed
      render_killfeed(builder)
      
      # Loading screen
      builder.tag(:div, id: "loading-screen", 
                 style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; z-index: 9999;") do
        builder.tag(:div, style: "text-align: center; color: #fff;") do
          builder.tag(:h1, style: "font-size: 48px; margin-bottom: 20px;") do
            builder.text("Counter-Strike 1.6")
          end
          builder.tag(:div, style: "font-size: 24px;") do
            builder.text("Loading #{@game_state[:map]}...")
          end
          builder.tag(:div, style: "margin-top: 30px;") do
            builder.tag(:div, style: "width: 400px; height: 20px; background: #333; border: 2px solid #555;") do
              builder.tag(:div, id: "loading-bar", style: "width: 0%; height: 100%; background: linear-gradient(90deg, #ff6b00, #ffaa00); transition: width 0.3s;")
            end
          end
        end
      end
    end
  end
  
  def render_hud(builder)
    builder.tag(:div, id: "hud", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
      # Health & Armor
      builder.tag(:div, style: "position: absolute; bottom: 20px; left: 20px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
        builder.tag(:div, style: "font-size: 36px; font-weight: bold;") do
          builder.tag(:span, style: "color: #ff4444;") { builder.text("❤") }
          builder.tag(:span, id: "health-display") { builder.text(" 100") }
        end
        builder.tag(:div, style: "font-size: 36px; font-weight: bold;") do
          builder.tag(:span, style: "color: #4444ff;") { builder.text("🛡") }
          builder.tag(:span, id: "armor-display") { builder.text(" 100") }
        end
      end
      
      # Ammo
      builder.tag(:div, style: "position: absolute; bottom: 20px; right: 20px; color: #fff; text-align: right; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
        builder.tag(:div, style: "font-size: 48px; font-weight: bold;") do
          builder.tag(:span, id: "ammo-current") { builder.text("30") }
          builder.tag(:span, style: "color: #888; font-size: 32px;") { builder.text(" / ") }
          builder.tag(:span, id: "ammo-reserve", style: "font-size: 32px;") { builder.text("120") }
        end
        builder.tag(:div, id: "weapon-name", style: "font-size: 24px; color: #ffaa00;") do
          builder.text("M4A1")
        end
      end
      
      # Money
      builder.tag(:div, style: "position: absolute; top: 100px; left: 20px; color: #00ff00; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
        builder.text("$ ")
        builder.tag(:span, id: "money-display") { builder.text("16000") }
      end
      
      # Round timer & score
      builder.tag(:div, style: "position: absolute; top: 20px; left: 50%; transform: translateX(-50%); text-align: center;") do
        builder.tag(:div, style: "font-size: 32px; color: #fff; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
          builder.tag(:span, id: "round-timer") { builder.text("1:55") }
        end
        builder.tag(:div, style: "margin-top: 10px; font-size: 28px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
          builder.tag(:span, style: "color: #4444ff;") do
            builder.text("CT ")
            builder.tag(:span, id: "ct-score") { builder.text("0") }
          end
          builder.tag(:span, style: "margin: 0 20px;") { builder.text("-") }
          builder.tag(:span, style: "color: #ffaa00;") do
            builder.tag(:span, id: "t-score") { builder.text("0") }
            builder.text(" T")
          end
        end
      end
      
      # Minimap
      builder.tag(:div, style: "position: absolute; top: 150px; right: 20px; width: 200px; height: 200px; background: rgba(0,0,0,0.7); border: 2px solid #555;") do
        builder.tag(:canvas, id: "minimap", width: 200, height: 200)
      end
      
      # Spectator info
      builder.tag(:div, id: "spectator-info", style: "position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 24px; display: none; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
        builder.text("Spectating: ")
        builder.tag(:span, id: "spectating-player")
      end
    end
  end
  
  def render_buy_menu(builder)
    builder.tag(:div, id: "buy-menu", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; height: 600px; background: rgba(20,20,20,0.95); border: 3px solid #ff6b00; display: none; padding: 20px; color: #fff;") do
      builder.tag(:h2, style: "text-align: center; color: #ff6b00; margin-bottom: 20px;") { builder.text("Buy Menu") }
      
      # Categories
      builder.tag(:div, style: "display: flex; gap: 20px;") do
        # Pistols
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px;") { builder.text("Pistols") }
          builder.tag(:div, class: "weapon-list") do
            [
              { name: "Glock-18", price: 400, key: "1" },
              { name: "USP", price: 500, key: "2" },
              { name: "P228", price: 600, key: "3" },
              { name: "Desert Eagle", price: 650, key: "4" },
              { name: "Five-SeveN", price: 750, key: "5" }
            ].each do |weapon|
              builder.tag(:div, class: "weapon-item", style: "padding: 5px; cursor: pointer; hover: background: #333;") do
                builder.text("[#{weapon[:key]}] #{weapon[:name]} - $#{weapon[:price]}")
              end
            end
          end
        end
        
        # SMGs
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px;") { builder.text("SMGs") }
          builder.tag(:div, class: "weapon-list") do
            [
              { name: "MAC-10", price: 1400, key: "1" },
              { name: "MP5", price: 1500, key: "2" },
              { name: "UMP45", price: 1700, key: "3" },
              { name: "P90", price: 2350, key: "4" }
            ].each do |weapon|
              builder.tag(:div, class: "weapon-item", style: "padding: 5px; cursor: pointer;") do
                builder.text("[#{weapon[:key]}] #{weapon[:name]} - $#{weapon[:price]}")
              end
            end
          end
        end
        
        # Rifles
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px;") { builder.text("Rifles") }
          builder.tag(:div, class: "weapon-list") do
            [
              { name: "Galil", price: 2000, key: "1" },
              { name: "FAMAS", price: 2250, key: "2" },
              { name: "AK-47", price: 2500, key: "3" },
              { name: "M4A1", price: 3100, key: "4" },
              { name: "AUG", price: 3500, key: "5" },
              { name: "SG 552", price: 3500, key: "6" },
              { name: "AWP", price: 4750, key: "7" }
            ].each do |weapon|
              builder.tag(:div, class: "weapon-item", style: "padding: 5px; cursor: pointer;") do
                builder.text("[#{weapon[:key]}] #{weapon[:name]} - $#{weapon[:price]}")
              end
            end
          end
        end
      end
      
      # Equipment
      builder.tag(:div, style: "margin-top: 20px;") do
        builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px;") { builder.text("Equipment") }
        builder.tag(:div, style: "display: flex; gap: 20px;") do
          [
            { name: "Kevlar Vest", price: 650, key: "8" },
            { name: "Kevlar + Helmet", price: 1000, key: "9" },
            { name: "Flashbang", price: 200, key: "0" },
            { name: "HE Grenade", price: 300, key: "-" },
            { name: "Smoke Grenade", price: 300, key: "=" },
            { name: "Defuse Kit", price: 200, key: "D", ct_only: true }
          ].each do |item|
            next if item[:ct_only] && @game_state[:players][@player_id][:team] != 'ct'
            builder.tag(:span, style: "padding: 5px;") do
              builder.text("[#{item[:key]}] #{item[:name]} - $#{item[:price]}")
            end
          end
        end
      end
      
      builder.tag(:div, style: "position: absolute; bottom: 20px; right: 20px; color: #888;") do
        builder.text("Press B to close")
      end
    end
  end
  
  def render_scoreboard(builder)
    builder.tag(:div, id: "scoreboard", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 900px; background: rgba(20,20,20,0.95); border: 3px solid #555; display: none; padding: 20px; color: #fff;") do
      builder.tag(:h2, style: "text-align: center; margin-bottom: 20px;") { builder.text("Scoreboard") }
      
      # CT Team
      builder.tag(:div, style: "margin-bottom: 20px;") do
        builder.tag(:h3, style: "color: #4444ff; border-bottom: 2px solid #4444ff; padding-bottom: 5px;") { builder.text("Counter-Terrorists") }
        builder.tag(:table, style: "width: 100%; color: #fff;") do
          builder.tag(:thead) do
            builder.tag(:tr) do
              ["Name", "K", "A", "D", "Score", "Ping"].each do |header|
                builder.tag(:th, style: "text-align: left; padding: 5px;") { builder.text(header) }
              end
            end
          end
          builder.tag(:tbody, id: "ct-players")
        end
      end
      
      # T Team
      builder.tag(:div) do
        builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px;") { builder.text("Terrorists") }
        builder.tag(:table, style: "width: 100%; color: #fff;") do
          builder.tag(:thead) do
            builder.tag(:tr) do
              ["Name", "K", "A", "D", "Score", "Ping"].each do |header|
                builder.tag(:th, style: "text-align: left; padding: 5px;") { builder.text(header) }
              end
            end
          end
          builder.tag(:tbody, id: "t-players")
        end
      end
    end
  end
  
  def render_chatbox(builder)
    builder.tag(:div, id: "chatbox", style: "position: absolute; bottom: 150px; left: 20px; width: 400px; height: 200px;") do
      builder.tag(:div, id: "chat-messages", style: "height: 170px; overflow-y: auto; color: #fff; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);")
      builder.tag(:input, id: "chat-input", type: "text", placeholder: "Press Y to chat...",
                 style: "width: 100%; background: rgba(0,0,0,0.5); border: 1px solid #555; color: #fff; padding: 5px; display: none;")
    end
  end
  
  def render_killfeed(builder)
    builder.tag(:div, id: "killfeed", style: "position: absolute; top: 20px; right: 20px; width: 300px; color: #fff; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);")
  end
  
  def render_cs16_javascript(builder)
    # Use HTML-based JavaScript inclusion for large game code
    builder.tag(:script, type: "text/javascript") do
      builder.raw(generate_cs16_javascript)
    end
  end
  
  def generate_cs16_javascript
    <<~JAVASCRIPT
    // CS 1.6 Complete Game Implementation
    (function() {
      console.log('CS 1.6: Initializing complete game engine...');
      
      // Game configuration
      const CONFIG = {
        TICK_RATE: 64,
        UPDATE_RATE: 20,
        PLAYER_SPEED: 250,
        PLAYER_SPEED_WALK: 100,
        PLAYER_SPEED_CROUCH: 85,
        GRAVITY: 800,
        JUMP_VELOCITY: 300,
        MAP_WIDTH: 2000,
        MAP_HEIGHT: 2000,
        PLAYER_RADIUS: 16,
        BULLET_SPEED: 2000,
        BOMB_TIMER: 35,
        FREEZE_TIME: 15,
        ROUND_TIME: 115,
        SMOKE_DURATION: 15,
        FLASH_DURATION: 5,
        MAX_ROUNDS: 30
      };
      
      // Weapon configurations
      const WEAPONS = {
        // Pistols
        glock: { damage: 28, fireRate: 0.15, clipSize: 20, reserve: 120, reloadTime: 2.2, price: 400, automatic: false, penetration: 1, accuracy: 0.9, recoil: 5 },
        usp: { damage: 34, fireRate: 0.15, clipSize: 12, reserve: 100, reloadTime: 2.7, price: 500, automatic: false, penetration: 1, accuracy: 0.92, recoil: 4 },
        p228: { damage: 32, fireRate: 0.15, clipSize: 13, reserve: 52, reloadTime: 2.7, price: 600, automatic: false, penetration: 1, accuracy: 0.9, recoil: 5 },
        deagle: { damage: 54, fireRate: 0.22, clipSize: 7, reserve: 35, reloadTime: 2.2, price: 650, automatic: false, penetration: 2, accuracy: 0.85, recoil: 12 },
        fiveseven: { damage: 25, fireRate: 0.15, clipSize: 20, reserve: 100, reloadTime: 2.7, price: 750, automatic: false, penetration: 1, accuracy: 0.92, recoil: 3 },
        elite: { damage: 36, fireRate: 0.12, clipSize: 30, reserve: 120, reloadTime: 4.5, price: 800, automatic: false, penetration: 1, accuracy: 0.88, recoil: 6 },
        
        // SMGs
        mac10: { damage: 29, fireRate: 0.075, clipSize: 30, reserve: 100, reloadTime: 3.1, price: 1400, automatic: true, penetration: 1, accuracy: 0.85, recoil: 7 },
        mp5: { damage: 26, fireRate: 0.075, clipSize: 30, reserve: 120, reloadTime: 2.6, price: 1500, automatic: true, penetration: 1, accuracy: 0.88, recoil: 6 },
        ump45: { damage: 30, fireRate: 0.09, clipSize: 25, reserve: 100, reloadTime: 3.5, price: 1700, automatic: true, penetration: 1, accuracy: 0.87, recoil: 6 },
        p90: { damage: 26, fireRate: 0.066, clipSize: 50, reserve: 100, reloadTime: 3.3, price: 2350, automatic: true, penetration: 1, accuracy: 0.86, recoil: 7 },
        
        // Rifles
        galil: { damage: 30, fireRate: 0.09, clipSize: 35, reserve: 90, reloadTime: 2.4, price: 2000, automatic: true, penetration: 2, accuracy: 0.88, recoil: 8 },
        famas: { damage: 30, fireRate: 0.09, clipSize: 25, reserve: 90, reloadTime: 3.3, price: 2250, automatic: true, penetration: 2, accuracy: 0.9, recoil: 7 },
        ak47: { damage: 36, fireRate: 0.1, clipSize: 30, reserve: 90, reloadTime: 2.5, price: 2500, automatic: true, penetration: 2, accuracy: 0.88, recoil: 10 },
        m4a1: { damage: 33, fireRate: 0.09, clipSize: 30, reserve: 90, reloadTime: 3.0, price: 3100, automatic: true, penetration: 2, accuracy: 0.92, recoil: 8 },
        aug: { damage: 32, fireRate: 0.09, clipSize: 30, reserve: 90, reloadTime: 3.8, price: 3500, automatic: true, penetration: 2, accuracy: 0.94, recoil: 6, scope: 2 },
        sg552: { damage: 33, fireRate: 0.09, clipSize: 30, reserve: 90, reloadTime: 3.0, price: 3500, automatic: true, penetration: 2, accuracy: 0.93, recoil: 7, scope: 2 },
        
        // Sniper Rifles
        scout: { damage: 75, fireRate: 1.25, clipSize: 10, reserve: 90, reloadTime: 2.0, price: 2750, automatic: false, penetration: 3, accuracy: 0.98, recoil: 15, scope: 4 },
        awp: { damage: 115, fireRate: 1.45, clipSize: 10, reserve: 30, reloadTime: 3.6, price: 4750, automatic: false, penetration: 3, accuracy: 0.99, recoil: 20, scope: 4 },
        g3sg1: { damage: 80, fireRate: 0.25, clipSize: 20, reserve: 90, reloadTime: 4.7, price: 5000, automatic: true, penetration: 3, accuracy: 0.97, recoil: 12, scope: 4 },
        sg550: { damage: 70, fireRate: 0.25, clipSize: 30, reserve: 90, reloadTime: 3.8, price: 4200, automatic: true, penetration: 3, accuracy: 0.97, recoil: 11, scope: 4 },
        
        // Heavy
        m3: { damage: 26, fireRate: 0.88, clipSize: 8, reserve: 32, reloadTime: 0.55, price: 1700, automatic: false, penetration: 1, accuracy: 0.7, recoil: 14, pellets: 9 },
        xm1014: { damage: 22, fireRate: 0.25, clipSize: 7, reserve: 32, reloadTime: 0.45, price: 3000, automatic: true, penetration: 1, accuracy: 0.7, recoil: 12, pellets: 6 },
        m249: { damage: 32, fireRate: 0.08, clipSize: 100, reserve: 200, reloadTime: 5.7, price: 5750, automatic: true, penetration: 2, accuracy: 0.82, recoil: 11 }
      };
      
      // Game state
      let gameState = {
        players: {},
        bullets: [],
        grenades: [],
        smokeAreas: [],
        flashEffects: [],
        bomb: null,
        round: 1,
        ctScore: 0,
        tScore: 0,
        roundTime: CONFIG.ROUND_TIME,
        freezeTime: CONFIG.FREEZE_TIME,
        phase: 'warmup',
        killfeed: [],
        chatMessages: [],
        localPlayerId: null,
        money: {},
        buyMenuOpen: false,
        scoreboardOpen: false,
        chatOpen: false,
        lastUpdate: Date.now(),
        fps: 0,
        ping: 0,
        tickRate: CONFIG.TICK_RATE,
        soundsEnabled: true,
        mouseX: 0,
        mouseY: 0,
        viewportX: 0,
        viewportY: 0,
        mapData: null,
        bombSites: {
          A: { x: 800, y: 300, radius: 100 },
          B: { x: 400, y: 600, radius: 100 }
        }
      };
      
      // Input handling
      const input = {
        keys: {},
        mouse: { x: 0, y: 0, buttons: {} },
        init() {
          document.addEventListener('keydown', e => this.handleKeyDown(e));
          document.addEventListener('keyup', e => this.handleKeyUp(e));
          document.addEventListener('mousemove', e => this.handleMouseMove(e));
          document.addEventListener('mousedown', e => this.handleMouseDown(e));
          document.addEventListener('mouseup', e => this.handleMouseUp(e));
          document.addEventListener('contextmenu', e => e.preventDefault());
        },
        handleKeyDown(e) {
          this.keys[e.code] = true;
          
          // Special keys
          if (e.code === 'KeyB' && !gameState.buyMenuOpen) {
            toggleBuyMenu();
          } else if (e.code === 'Tab') {
            e.preventDefault();
            toggleScoreboard(true);
          } else if (e.code === 'KeyY' && !gameState.chatOpen) {
            toggleChat(true);
          } else if (e.code === 'Escape') {
            closeBuyMenu();
            closeChat();
          }
        },
        handleKeyUp(e) {
          delete this.keys[e.code];
          if (e.code === 'Tab') {
            toggleScoreboard(false);
          }
        },
        handleMouseMove(e) {
          const canvas = document.getElementById('game-canvas');
          const rect = canvas.getBoundingClientRect();
          this.mouse.x = e.clientX - rect.left;
          this.mouse.y = e.clientY - rect.top;
          gameState.mouseX = this.mouse.x;
          gameState.mouseY = this.mouse.y;
        },
        handleMouseDown(e) {
          this.mouse.buttons[e.button] = true;
          if (e.button === 0) { // Left click - shoot
            shoot();
          } else if (e.button === 2) { // Right click - aim/scope
            toggleScope();
          }
        },
        handleMouseUp(e) {
          delete this.mouse.buttons[e.button];
        }
      };
      
      // Rendering
      const renderer = {
        canvas: null,
        ctx: null,
        minimapCanvas: null,
        minimapCtx: null,
        sprites: {},
        init() {
          this.canvas = document.getElementById('game-canvas');
          this.ctx = this.canvas.getContext('2d');
          this.minimapCanvas = document.getElementById('minimap');
          this.minimapCtx = this.minimapCanvas.getContext('2d');
          
          // Configure rendering settings
          this.ctx.imageSmoothingEnabled = false;
          this.minimapCtx.imageSmoothingEnabled = false;
          
          console.log('CS 1.6: Renderer initialized');
        },
        render() {
          if (!this.ctx) return;
          
          // Clear canvas
          this.ctx.fillStyle = '#2a2a2a';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          // Calculate viewport
          const player = gameState.players[gameState.localPlayerId];
          if (player) {
            gameState.viewportX = player.x - this.canvas.width / 2;
            gameState.viewportY = player.y - this.canvas.height / 2;
          }
          
          // Render map
          this.renderMap();
          
          // Render smoke areas
          this.renderSmoke();
          
          // Render bomb sites
          this.renderBombSites();
          
          // Render bomb if planted
          if (gameState.bomb && gameState.bomb.planted) {
            this.renderBomb();
          }
          
          // Render players
          this.renderPlayers();
          
          // Render bullets
          this.renderBullets();
          
          // Render grenades
          this.renderGrenades();
          
          // Render flash effects
          this.renderFlashEffects();
          
          // Render crosshair
          this.renderCrosshair();
          
          // Update HUD
          this.updateHUD();
          
          // Render minimap
          this.renderMinimap();
        },
        renderMap() {
          // Simple de_dust2 style map
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
          // Ground
          this.ctx.fillStyle = '#c4a57b';
          this.ctx.fillRect(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
          
          // Draw grid for visibility
          this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          this.ctx.lineWidth = 1;
          for (let x = 0; x < CONFIG.MAP_WIDTH; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.MAP_HEIGHT);
            this.ctx.stroke();
          }
          for (let y = 0; y < CONFIG.MAP_HEIGHT; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.MAP_WIDTH, y);
            this.ctx.stroke();
          }
          
          // Walls and obstacles
          this.ctx.fillStyle = '#8b7355';
          // CT spawn area walls
          this.ctx.fillRect(100, 200, 20, 300);
          this.ctx.fillRect(100, 200, 200, 20);
          this.ctx.fillRect(100, 480, 200, 20);
          
          // T spawn area walls
          this.ctx.fillRect(1180, 200, 20, 300);
          this.ctx.fillRect(1000, 200, 200, 20);
          this.ctx.fillRect(1000, 480, 200, 20);
          
          // Mid walls
          this.ctx.fillRect(500, 100, 20, 400);
          this.ctx.fillRect(780, 100, 20, 400);
          this.ctx.fillRect(500, 600, 300, 20);
          
          // Boxes and cover
          this.ctx.fillStyle = '#6b5d4f';
          this.ctx.fillRect(350, 350, 60, 60);
          this.ctx.fillRect(450, 250, 40, 40);
          this.ctx.fillRect(650, 400, 50, 50);
          this.ctx.fillRect(850, 300, 60, 60);
          this.ctx.fillRect(950, 450, 40, 40);
          
          this.ctx.restore();
        },
        renderBombSites() {
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
          // Draw bomb sites
          for (const [site, data] of Object.entries(gameState.bombSites)) {
            // Site area
            this.ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(data.x, data.y, data.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Site border
            this.ctx.strokeStyle = '#ff6400';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Site label
            this.ctx.fillStyle = '#ff6400';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(site, data.x, data.y);
          }
          
          this.ctx.restore();
        },
        renderPlayers() {
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
          for (const player of Object.values(gameState.players)) {
            if (!player.alive) continue;
            
            // Player body
            this.ctx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ff6600';
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Player direction indicator
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            const dirX = Math.cos(player.angle) * 25;
            const dirY = Math.sin(player.angle) * 25;
            this.ctx.lineTo(player.x + dirX, player.y + dirY);
            this.ctx.stroke();
            
            // Player name and health
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
            
            // Show bomb carrier
            if (player.bomb) {
              this.ctx.fillStyle = '#ff0000';
              this.ctx.font = 'bold 16px Arial';
              this.ctx.fillText('💣', player.x, player.y + 35);
            }
          }
          
          this.ctx.restore();
        },
        renderBullets() {
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
          this.ctx.strokeStyle = '#ffff00';
          this.ctx.lineWidth = 2;
          
          for (const bullet of gameState.bullets) {
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.x - bullet.vx * 0.05, bullet.y - bullet.vy * 0.05);
            this.ctx.lineTo(bullet.x, bullet.y);
            this.ctx.stroke();
          }
          
          this.ctx.restore();
        },
        renderGrenades() {
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
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
            
            // Trail effect
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.globalAlpha = 0.3;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(grenade.x, grenade.y);
            this.ctx.lineTo(grenade.x - grenade.vx * 0.1, grenade.y - grenade.vy * 0.1);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
          }
          
          this.ctx.restore();
        },
        renderSmoke() {
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
          for (const smoke of gameState.smokeAreas) {
            const opacity = Math.min(1, (smoke.duration / CONFIG.SMOKE_DURATION));
            this.ctx.fillStyle = `rgba(150, 150, 150, ${opacity * 0.8})`;
            
            // Draw multiple circles for smoke effect
            for (let i = 0; i < 5; i++) {
              const offsetX = (Math.random() - 0.5) * 20;
              const offsetY = (Math.random() - 0.5) * 20;
              const radius = smoke.radius + (Math.random() * 30);
              
              this.ctx.globalAlpha = opacity * 0.6;
              this.ctx.beginPath();
              this.ctx.arc(smoke.x + offsetX, smoke.y + offsetY, radius, 0, Math.PI * 2);
              this.ctx.fill();
            }
          }
          
          this.ctx.globalAlpha = 1;
          this.ctx.restore();
        },
        renderFlashEffects() {
          for (const flash of gameState.flashEffects) {
            if (flash.playerId === gameState.localPlayerId) {
              const intensity = flash.duration / CONFIG.FLASH_DURATION;
              this.ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.9})`;
              this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
          }
        },
        renderBomb() {
          this.ctx.save();
          this.ctx.translate(-gameState.viewportX, -gameState.viewportY);
          
          const bomb = gameState.bomb;
          
          // Bomb model
          this.ctx.fillStyle = '#ff0000';
          this.ctx.fillRect(bomb.x - 10, bomb.y - 10, 20, 20);
          
          // Blinking light
          const blink = Math.sin(Date.now() * 0.01) > 0;
          if (blink) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(bomb.x, bomb.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
          }
          
          // Timer text
          this.ctx.fillStyle = '#ff0000';
          this.ctx.font = 'bold 16px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(bomb.timeLeft.toFixed(1) + 's', bomb.x, bomb.y - 20);
          
          // Defuse progress if someone is defusing
          if (bomb.defuser) {
            const progress = bomb.defuseProgress / 5; // 5 seconds to defuse
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(bomb.x, bomb.y, 25, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
            this.ctx.stroke();
          }
          
          this.ctx.restore();
        },
        renderCrosshair() {
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          
          this.ctx.strokeStyle = '#00ff00';
          this.ctx.lineWidth = 2;
          
          // Dynamic crosshair based on movement and shooting
          const player = gameState.players[gameState.localPlayerId];
          let spread = 5;
          if (player) {
            if (player.velocity && (Math.abs(player.velocity.x) > 0 || Math.abs(player.velocity.y) > 0)) {
              spread += 10;
            }
            if (player.jumping) {
              spread += 15;
            }
            if (player.crouching) {
              spread -= 3;
            }
          }
          
          // Horizontal line
          this.ctx.beginPath();
          this.ctx.moveTo(centerX - 20 - spread, centerY);
          this.ctx.lineTo(centerX - 5 - spread, centerY);
          this.ctx.moveTo(centerX + 5 + spread, centerY);
          this.ctx.lineTo(centerX + 20 + spread, centerY);
          this.ctx.stroke();
          
          // Vertical line
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY - 20 - spread);
          this.ctx.lineTo(centerX, centerY - 5 - spread);
          this.ctx.moveTo(centerX, centerY + 5 + spread);
          this.ctx.lineTo(centerX, centerY + 20 + spread);
          this.ctx.stroke();
          
          // Center dot
          this.ctx.fillStyle = '#00ff00';
          this.ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
        },
        renderMinimap() {
          if (!this.minimapCtx) return;
          
          const scale = 200 / CONFIG.MAP_WIDTH;
          
          // Clear minimap
          this.minimapCtx.fillStyle = '#1a1a1a';
          this.minimapCtx.fillRect(0, 0, 200, 200);
          
          // Draw map outline
          this.minimapCtx.strokeStyle = '#555';
          this.minimapCtx.lineWidth = 1;
          this.minimapCtx.strokeRect(0, 0, 200, 200);
          
          // Draw bomb sites
          for (const [site, data] of Object.entries(gameState.bombSites)) {
            this.minimapCtx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(data.x * scale, data.y * scale, data.radius * scale, 0, Math.PI * 2);
            this.minimapCtx.fill();
            
            this.minimapCtx.fillStyle = '#ff6400';
            this.minimapCtx.font = 'bold 12px Arial';
            this.minimapCtx.textAlign = 'center';
            this.minimapCtx.textBaseline = 'middle';
            this.minimapCtx.fillText(site, data.x * scale, data.y * scale);
          }
          
          // Draw players
          for (const player of Object.values(gameState.players)) {
            if (!player.alive) continue;
            
            const x = player.x * scale;
            const y = player.y * scale;
            
            // Player dot
            this.minimapCtx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ff6600';
            if (player.id === gameState.localPlayerId) {
              this.minimapCtx.fillStyle = '#00ff00';
            }
            
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
            this.minimapCtx.fill();
            
            // Direction indicator for local player
            if (player.id === gameState.localPlayerId) {
              this.minimapCtx.strokeStyle = '#00ff00';
              this.minimapCtx.lineWidth = 2;
              this.minimapCtx.beginPath();
              this.minimapCtx.moveTo(x, y);
              const dirX = Math.cos(player.angle) * 8;
              const dirY = Math.sin(player.angle) * 8;
              this.minimapCtx.lineTo(x + dirX, y + dirY);
              this.minimapCtx.stroke();
            }
          }
          
          // Draw bomb if planted
          if (gameState.bomb && gameState.bomb.planted) {
            this.minimapCtx.fillStyle = '#ff0000';
            this.minimapCtx.font = 'bold 16px Arial';
            this.minimapCtx.textAlign = 'center';
            this.minimapCtx.fillText('💣', gameState.bomb.x * scale, gameState.bomb.y * scale);
          }
        },
        updateHUD() {
          // Update health
          const player = gameState.players[gameState.localPlayerId];
          if (player) {
            document.getElementById('health-display').textContent = ' ' + player.health;
            document.getElementById('armor-display').textContent = ' ' + player.armor;
            
            // Update ammo
            const weapon = WEAPONS[player.primary_weapon] || WEAPONS[player.secondary_weapon];
            if (weapon) {
              document.getElementById('ammo-current').textContent = player.ammo || weapon.clipSize;
              document.getElementById('ammo-reserve').textContent = player.ammo_reserve || weapon.reserve;
              document.getElementById('weapon-name').textContent = player.primary_weapon.toUpperCase();
            }
            
            // Update money
            document.getElementById('money-display').textContent = gameState.money[gameState.localPlayerId] || 16000;
          }
          
          // Update round timer
          const minutes = Math.floor(gameState.roundTime / 60);
          const seconds = Math.floor(gameState.roundTime % 60);
          document.getElementById('round-timer').textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
          
          // Update scores
          document.getElementById('ct-score').textContent = gameState.ctScore;
          document.getElementById('t-score').textContent = gameState.tScore;
        }
      };
      
      // Game functions
      function shoot() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive) return;
        
        const weapon = WEAPONS[player.primary_weapon] || WEAPONS[player.secondary_weapon];
        if (!weapon) return;
        
        // Check fire rate
        const now = Date.now();
        if (player.lastShot && (now - player.lastShot) < weapon.fireRate * 1000) return;
        
        // Check ammo
        if (player.ammo <= 0) {
          // Play empty clip sound
          playSound('empty');
          return;
        }
        
        player.lastShot = now;
        player.ammo = (player.ammo || weapon.clipSize) - 1;
        
        // Calculate bullet trajectory
        const angle = player.angle + (Math.random() - 0.5) * (1 - weapon.accuracy) * 0.2;
        const bullet = {
          x: player.x + Math.cos(angle) * 30,
          y: player.y + Math.sin(angle) * 30,
          vx: Math.cos(angle) * CONFIG.BULLET_SPEED,
          vy: Math.sin(angle) * CONFIG.BULLET_SPEED,
          damage: weapon.damage,
          penetration: weapon.penetration,
          owner: player.id,
          team: player.team
        };
        
        gameState.bullets.push(bullet);
        
        // Recoil
        player.angle += (Math.random() - 0.5) * weapon.recoil * 0.01;
        
        // Play weapon sound
        playSound(player.primary_weapon);
      }
      
      function reload() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.reloading) return;
        
        const weapon = WEAPONS[player.primary_weapon] || WEAPONS[player.secondary_weapon];
        if (!weapon) return;
        
        if (player.ammo >= weapon.clipSize) return;
        
        player.reloading = true;
        playSound('reload');
        
        setTimeout(() => {
          player.ammo = weapon.clipSize;
          player.reloading = false;
        }, weapon.reloadTime * 1000);
      }
      
      function throwGrenade(type) {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive) return;
        
        if (!player.grenades[type] || player.grenades[type] <= 0) return;
        
        player.grenades[type]--;
        
        const grenade = {
          x: player.x,
          y: player.y,
          vx: Math.cos(player.angle) * 500,
          vy: Math.sin(player.angle) * 500,
          type: type,
          timer: 2,
          owner: player.id,
          team: player.team
        };
        
        gameState.grenades.push(grenade);
        playSound('grenade_throw');
      }
      
      function plantBomb() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.team !== 't' || !player.bomb) return;
        
        // Check if in bomb site
        for (const [site, data] of Object.entries(gameState.bombSites)) {
          const dist = Math.sqrt(Math.pow(player.x - data.x, 2) + Math.pow(player.y - data.y, 2));
          if (dist <= data.radius) {
            // Plant bomb
            gameState.bomb = {
              planted: true,
              x: player.x,
              y: player.y,
              timeLeft: CONFIG.BOMB_TIMER,
              site: site,
              planter: player.id
            };
            
            player.bomb = false;
            playSound('bomb_plant');
            
            addKillfeedMessage(`${player.name} planted the bomb at site ${site}!`);
            return;
          }
        }
        
        addChatMessage('System', 'You must be in a bomb site to plant the bomb!', 'system');
      }
      
      function defuseBomb() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive || player.team !== 'ct') return;
        
        if (!gameState.bomb || !gameState.bomb.planted) return;
        
        const dist = Math.sqrt(Math.pow(player.x - gameState.bomb.x, 2) + Math.pow(player.y - gameState.bomb.y, 2));
        if (dist <= 50) {
          gameState.bomb.defuser = player.id;
          gameState.bomb.defuseProgress = 0;
          
          const defuseTime = player.defuse_kit ? 5 : 10;
          const defuseInterval = setInterval(() => {
            if (!gameState.bomb.defuser || gameState.bomb.defuser !== player.id) {
              clearInterval(defuseInterval);
              return;
            }
            
            gameState.bomb.defuseProgress += 0.1;
            
            if (gameState.bomb.defuseProgress >= defuseTime) {
              gameState.bomb = null;
              clearInterval(defuseInterval);
              playSound('bomb_defused');
              addKillfeedMessage(`${player.name} defused the bomb!`);
              
              // CT wins round
              endRound('ct');
            }
          }, 100);
        }
      }
      
      function toggleScope() {
        const player = gameState.players[gameState.localPlayerId];
        if (!player || !player.alive) return;
        
        const weapon = WEAPONS[player.primary_weapon];
        if (!weapon || !weapon.scope) return;
        
        player.scoped = !player.scoped;
        playSound('scope');
      }
      
      function toggleBuyMenu() {
        gameState.buyMenuOpen = !gameState.buyMenuOpen;
        const menu = document.getElementById('buy-menu');
        menu.style.display = gameState.buyMenuOpen ? 'block' : 'none';
      }
      
      function closeBuyMenu() {
        gameState.buyMenuOpen = false;
        document.getElementById('buy-menu').style.display = 'none';
      }
      
      function toggleScoreboard(show) {
        gameState.scoreboardOpen = show;
        const scoreboard = document.getElementById('scoreboard');
        scoreboard.style.display = show ? 'block' : 'none';
        
        if (show) {
          updateScoreboard();
        }
      }
      
      function updateScoreboard() {
        const ctPlayers = document.getElementById('ct-players');
        const tPlayers = document.getElementById('t-players');
        
        ctPlayers.innerHTML = '';
        tPlayers.innerHTML = '';
        
        for (const player of Object.values(gameState.players)) {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td style="padding: 5px;">${player.name}</td>
            <td style="padding: 5px;">${player.kills || 0}</td>
            <td style="padding: 5px;">${player.assists || 0}</td>
            <td style="padding: 5px;">${player.deaths || 0}</td>
            <td style="padding: 5px;">${(player.kills || 0) * 2 + (player.assists || 0)}</td>
            <td style="padding: 5px;">${player.ping || 0}ms</td>
          `;
          
          if (player.team === 'ct') {
            ctPlayers.appendChild(row);
          } else {
            tPlayers.appendChild(row);
          }
        }
      }
      
      function toggleChat(show) {
        gameState.chatOpen = show;
        const chatInput = document.getElementById('chat-input');
        chatInput.style.display = show ? 'block' : 'none';
        
        if (show) {
          chatInput.focus();
        } else {
          chatInput.value = '';
        }
      }
      
      function closeChat() {
        toggleChat(false);
      }
      
      function sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (message) {
          const player = gameState.players[gameState.localPlayerId];
          if (player) {
            addChatMessage(player.name, message, player.team);
          }
        }
        
        closeChat();
      }
      
      function addChatMessage(sender, message, team) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        const teamColor = team === 'ct' ? '#4444ff' : team === 't' ? '#ff6600' : '#888';
        messageDiv.style.color = teamColor;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Remove old messages
        while (chatMessages.children.length > 10) {
          chatMessages.removeChild(chatMessages.firstChild);
        }
      }
      
      function addKillfeedMessage(message) {
        const killfeed = document.getElementById('killfeed');
        const messageDiv = document.createElement('div');
        messageDiv.style.marginBottom = '5px';
        messageDiv.innerHTML = message;
        killfeed.appendChild(messageDiv);
        
        // Fade out and remove after 5 seconds
        setTimeout(() => {
          messageDiv.style.opacity = '0';
          messageDiv.style.transition = 'opacity 1s';
          setTimeout(() => {
            killfeed.removeChild(messageDiv);
          }, 1000);
        }, 5000);
        
        // Keep only last 5 messages
        while (killfeed.children.length > 5) {
          killfeed.removeChild(killfeed.firstChild);
        }
      }
      
      function playSound(soundName) {
        if (!gameState.soundsEnabled) return;
        
        // Sound playing would be implemented here
        console.log('Playing sound:', soundName);
      }
      
      function endRound(winner) {
        if (winner === 'ct') {
          gameState.ctScore++;
        } else {
          gameState.tScore++;
        }
        
        addKillfeedMessage(`Round ended! ${winner.toUpperCase()} wins!`);
        
        // Check for match end
        if (gameState.ctScore >= 16 || gameState.tScore >= 16) {
          endMatch();
        } else {
          // Start new round after delay
          setTimeout(() => {
            startNewRound();
          }, 5000);
        }
      }
      
      function startNewRound() {
        gameState.round++;
        gameState.roundTime = CONFIG.ROUND_TIME;
        gameState.freezeTime = CONFIG.FREEZE_TIME;
        gameState.phase = 'freeze';
        gameState.bomb = null;
        gameState.bullets = [];
        gameState.grenades = [];
        gameState.smokeAreas = [];
        gameState.flashEffects = [];
        
        // Reset players
        for (const player of Object.values(gameState.players)) {
          player.health = 100;
          player.alive = true;
          player.x = player.team === 'ct' ? 200 + Math.random() * 100 : 1080 - Math.random() * 100;
          player.y = 300 + Math.random() * 200;
          player.grenades = { flashbang: 2, smoke: 1, he: 1 };
          
          // Give bomb to random T player
          if (player.team === 't') {
            player.bomb = Math.random() < 0.25;
          }
        }
        
        addChatMessage('System', `Round ${gameState.round} started!`, 'system');
      }
      
      function endMatch() {
        const winner = gameState.ctScore > gameState.tScore ? 'Counter-Terrorists' : 'Terrorists';
        addKillfeedMessage(`Match ended! ${winner} win ${Math.max(gameState.ctScore, gameState.tScore)}-${Math.min(gameState.ctScore, gameState.tScore)}!`);
        
        // Reset game after delay
        setTimeout(() => {
          location.reload();
        }, 10000);
      }
      
      // Game update loop
      function updateGame(deltaTime) {
        // Update local player movement
        const player = gameState.players[gameState.localPlayerId];
        if (player && player.alive) {
          let dx = 0, dy = 0;
          
          // Movement
          if (input.keys['KeyW']) dy -= 1;
          if (input.keys['KeyS']) dy += 1;
          if (input.keys['KeyA']) dx -= 1;
          if (input.keys['KeyD']) dx += 1;
          
          // Normalize diagonal movement
          if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
          }
          
          // Apply speed modifiers
          let speed = CONFIG.PLAYER_SPEED;
          if (input.keys['ShiftLeft']) {
            speed = CONFIG.PLAYER_SPEED_WALK;
            player.walking = true;
          } else {
            player.walking = false;
          }
          
          if (input.keys['ControlLeft']) {
            speed = CONFIG.PLAYER_SPEED_CROUCH;
            player.crouching = true;
          } else {
            player.crouching = false;
          }
          
          // Update position
          player.x += dx * speed * deltaTime;
          player.y += dy * speed * deltaTime;
          
          // Keep player in bounds
          player.x = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_WIDTH - CONFIG.PLAYER_RADIUS, player.x));
          player.y = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_HEIGHT - CONFIG.PLAYER_RADIUS, player.y));
          
          // Update angle based on mouse
          const centerX = renderer.canvas.width / 2;
          const centerY = renderer.canvas.height / 2;
          player.angle = Math.atan2(gameState.mouseY - centerY, gameState.mouseX - centerX);
          
          // Store velocity for rendering
          player.velocity = { x: dx * speed, y: dy * speed };
          
          // Handle other inputs
          if (input.keys['KeyR']) reload();
          if (input.keys['KeyG']) throwGrenade('flashbang');
          if (input.keys['KeyF']) throwGrenade('smoke');
          if (input.keys['Key4']) throwGrenade('he');
          if (input.keys['KeyE']) {
            if (player.team === 't' && player.bomb) {
              plantBomb();
            } else if (player.team === 'ct' && gameState.bomb && gameState.bomb.planted) {
              defuseBomb();
            }
          }
          
          // Weapon switching
          if (input.keys['Key1']) player.current_weapon = 'primary';
          if (input.keys['Key2']) player.current_weapon = 'secondary';
          if (input.keys['Key3']) player.current_weapon = 'knife';
        }
        
        // Update bullets
        gameState.bullets = gameState.bullets.filter(bullet => {
          bullet.x += bullet.vx * deltaTime;
          bullet.y += bullet.vy * deltaTime;
          
          // Check collision with players
          for (const target of Object.values(gameState.players)) {
            if (!target.alive || target.id === bullet.owner || target.team === bullet.team) continue;
            
            const dist = Math.sqrt(Math.pow(bullet.x - target.x, 2) + Math.pow(bullet.y - target.y, 2));
            if (dist < CONFIG.PLAYER_RADIUS) {
              target.health -= bullet.damage;
              
              if (target.health <= 0) {
                target.alive = false;
                target.deaths = (target.deaths || 0) + 1;
                
                const shooter = gameState.players[bullet.owner];
                if (shooter) {
                  shooter.kills = (shooter.kills || 0) + 1;
                  addKillfeedMessage(`${shooter.name} killed ${target.name}`);
                }
              }
              
              return false; // Remove bullet
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
          grenade.vy += CONFIG.GRAVITY * deltaTime; // Apply gravity
          grenade.vx *= 0.98; // Air resistance
          grenade.timer -= deltaTime;
          
          // Bounce off ground
          if (grenade.y > CONFIG.MAP_HEIGHT - 10) {
            grenade.y = CONFIG.MAP_HEIGHT - 10;
            grenade.vy *= -0.5;
            grenade.vx *= 0.8;
          }
          
          // Explode when timer expires
          if (grenade.timer <= 0) {
            if (grenade.type === 'flashbang') {
              // Flash nearby players
              for (const target of Object.values(gameState.players)) {
                const dist = Math.sqrt(Math.pow(grenade.x - target.x, 2) + Math.pow(grenade.y - target.y, 2));
                if (dist < 300) {
                  gameState.flashEffects.push({
                    playerId: target.id,
                    duration: CONFIG.FLASH_DURATION * (1 - dist / 300)
                  });
                }
              }
              playSound('flashbang');
            } else if (grenade.type === 'smoke') {
              gameState.smokeAreas.push({
                x: grenade.x,
                y: grenade.y,
                radius: 100,
                duration: CONFIG.SMOKE_DURATION
              });
              playSound('smoke');
            } else if (grenade.type === 'he') {
              // Damage nearby players
              for (const target of Object.values(gameState.players)) {
                const dist = Math.sqrt(Math.pow(grenade.x - target.x, 2) + Math.pow(grenade.y - target.y, 2));
                if (dist < 200) {
                  const damage = Math.floor(100 * (1 - dist / 200));
                  target.health -= damage;
                  
                  if (target.health <= 0) {
                    target.alive = false;
                    target.deaths = (target.deaths || 0) + 1;
                    
                    const thrower = gameState.players[grenade.owner];
                    if (thrower) {
                      thrower.kills = (thrower.kills || 0) + 1;
                      addKillfeedMessage(`${thrower.name} killed ${target.name} with HE grenade`);
                    }
                  }
                }
              }
              playSound('explosion');
            }
            
            return false; // Remove grenade
          }
          
          return true;
        });
        
        // Update smoke areas
        gameState.smokeAreas = gameState.smokeAreas.filter(smoke => {
          smoke.duration -= deltaTime;
          return smoke.duration > 0;
        });
        
        // Update flash effects
        gameState.flashEffects = gameState.flashEffects.filter(flash => {
          flash.duration -= deltaTime;
          return flash.duration > 0;
        });
        
        // Update bomb timer
        if (gameState.bomb && gameState.bomb.planted) {
          gameState.bomb.timeLeft -= deltaTime;
          
          if (gameState.bomb.timeLeft <= 0) {
            // Bomb explodes
            playSound('explosion');
            addKillfeedMessage('The bomb has exploded!');
            
            // Kill all CTs near bomb
            for (const target of Object.values(gameState.players)) {
              if (target.team === 'ct' && target.alive) {
                const dist = Math.sqrt(Math.pow(gameState.bomb.x - target.x, 2) + Math.pow(gameState.bomb.y - target.y, 2));
                if (dist < 500) {
                  target.alive = false;
                  target.deaths = (target.deaths || 0) + 1;
                  addKillfeedMessage(`${target.name} was killed by the bomb`);
                }
              }
            }
            
            // T wins round
            endRound('t');
          }
        }
        
        // Update round timer
        if (gameState.phase === 'live') {
          gameState.roundTime -= deltaTime;
          
          if (gameState.roundTime <= 0) {
            // Time ran out
            if (gameState.bomb && gameState.bomb.planted) {
              // If bomb is planted, T wins
              endRound('t');
            } else {
              // Otherwise CT wins
              endRound('ct');
            }
          }
        } else if (gameState.phase === 'freeze') {
          gameState.freezeTime -= deltaTime;
          
          if (gameState.freezeTime <= 0) {
            gameState.phase = 'live';
            addChatMessage('System', 'Round is live!', 'system');
          }
        }
        
        // Check for round end conditions
        const aliveCTs = Object.values(gameState.players).filter(p => p.team === 'ct' && p.alive).length;
        const aliveTs = Object.values(gameState.players).filter(p => p.team === 't' && p.alive).length;
        
        if (gameState.phase === 'live') {
          if (aliveCTs === 0) {
            endRound('t');
          } else if (aliveTs === 0 && (!gameState.bomb || !gameState.bomb.planted)) {
            endRound('ct');
          }
        }
      }
      
      // Bot AI
      function updateBotAI(deltaTime) {
        for (const bot of Object.values(gameState.players)) {
          if (bot.id === gameState.localPlayerId || !bot.alive) continue;
          
          // Simple bot AI
          bot.angle += (Math.random() - 0.5) * 0.1;
          
          // Random movement
          if (Math.random() < 0.02) {
            bot.velocity = {
              x: (Math.random() - 0.5) * CONFIG.PLAYER_SPEED,
              y: (Math.random() - 0.5) * CONFIG.PLAYER_SPEED
            };
          }
          
          if (bot.velocity) {
            bot.x += bot.velocity.x * deltaTime;
            bot.y += bot.velocity.y * deltaTime;
            
            // Keep in bounds
            bot.x = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_WIDTH - CONFIG.PLAYER_RADIUS, bot.x));
            bot.y = Math.max(CONFIG.PLAYER_RADIUS, Math.min(CONFIG.MAP_HEIGHT - CONFIG.PLAYER_RADIUS, bot.y));
          }
          
          // Random shooting
          if (Math.random() < 0.01) {
            const bullet = {
              x: bot.x + Math.cos(bot.angle) * 30,
              y: bot.y + Math.sin(bot.angle) * 30,
              vx: Math.cos(bot.angle) * CONFIG.BULLET_SPEED,
              vy: Math.sin(bot.angle) * CONFIG.BULLET_SPEED,
              damage: 30,
              penetration: 1,
              owner: bot.id,
              team: bot.team
            };
            gameState.bullets.push(bullet);
          }
        }
      }
      
      // Main game loop
      let lastTime = Date.now();
      function gameLoop() {
        const now = Date.now();
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;
        
        // Update game
        updateGame(deltaTime);
        updateBotAI(deltaTime);
        
        // Render
        renderer.render();
        
        // Calculate FPS
        gameState.fps = Math.round(1 / deltaTime);
        
        requestAnimationFrame(gameLoop);
      }
      
      // Initialize game
      function init() {
        console.log('CS 1.6: Starting initialization...');
        
        // Hide loading screen
        setTimeout(() => {
          const loadingScreen = document.getElementById('loading-screen');
          const loadingBar = document.getElementById('loading-bar');
          
          // Animate loading bar
          let progress = 0;
          const loadingInterval = setInterval(() => {
            progress += 10;
            loadingBar.style.width = progress + '%';
            
            if (progress >= 100) {
              clearInterval(loadingInterval);
              setTimeout(() => {
                loadingScreen.style.display = 'none';
              }, 500);
            }
          }, 100);
        }, 100);
        
        // Initialize systems
        input.init();
        renderer.init();
        
        // Set local player ID (this would come from server in multiplayer)
        const playerId = document.getElementById('cs16-container').dataset.live;
        gameState.localPlayerId = playerId || 'player_' + Math.random().toString(36).substr(2, 9);
        
        // Create local player if not exists
        if (!gameState.players[gameState.localPlayerId]) {
          gameState.players[gameState.localPlayerId] = {
            id: gameState.localPlayerId,
            name: 'Player',
            team: 'ct',
            x: 200,
            y: 360,
            angle: 0,
            health: 100,
            armor: 100,
            helmet: true,
            alive: true,
            kills: 0,
            deaths: 0,
            assists: 0,
            money: 16000,
            primary_weapon: 'm4a1',
            secondary_weapon: 'usp',
            current_weapon: 'primary',
            ammo: 30,
            ammo_reserve: 90,
            grenades: {
              flashbang: 2,
              smoke: 1,
              he: 1
            },
            defuse_kit: true,
            velocity: { x: 0, y: 0 },
            walking: false,
            crouching: false,
            reloading: false,
            switching_weapon: false,
            flash_duration: 0,
            in_smoke: false,
            ping: 15,
            fps: 60
          };
        }
        
        gameState.money[gameState.localPlayerId] = 16000;
        
        // Setup chat input handler
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            sendChatMessage();
          } else if (e.key === 'Escape') {
            closeChat();
          }
        });
        
        // Start game
        addChatMessage('System', 'Welcome to Counter-Strike 1.6!', 'system');
        addChatMessage('System', 'Press B to open buy menu, TAB for scoreboard', 'system');
        
        startNewRound();
        
        // Start game loop
        console.log('CS 1.6: Starting game loop...');
        gameLoop();
        
        console.log('CS 1.6: Initialization complete!');
      }
      
      // Start the game
      init();
    })();
    JAVASCRIPT
  end
  
  def start_game_loop
    @async_task = Async do
      while @game_running
        sleep 1.0 / 20  # 20 FPS server update rate
        
        # Update game state
        update_game_state
        
        # Broadcast to clients
        broadcast_game_state
      end
    end
  end
  
  def update_game_state
    # Update round timer
    if @game_state[:phase] == 'live'
      @game_state[:round_time] -= 0.05
      
      if @game_state[:round_time] <= 0
        end_round(@game_state[:bomb][:planted] ? 't' : 'ct')
      end
    elsif @game_state[:phase] == 'freeze'
      @game_state[:freeze_time] -= 0.05
      
      if @game_state[:freeze_time] <= 0
        @game_state[:phase] = 'live'
      end
    end
    
    # Update bomb timer
    if @game_state[:bomb][:planted]
      @game_state[:bomb][:time_left] -= 0.05
      
      if @game_state[:bomb][:time_left] <= 0
        # Bomb explodes
        end_round('t')
      end
    end
    
    # Update bot AI
    update_bot_ai
    
    @game_state[:server_tick] += 1
  end
  
  def update_bot_ai
    @game_state[:players].each do |id, bot|
      next if id == @player_id || !bot[:alive]
      
      # Simple movement AI
      if rand < 0.05
        bot[:x] += (rand - 0.5) * 20
        bot[:y] += (rand - 0.5) * 20
        
        # Keep in bounds
        bot[:x] = [[bot[:x], 50].max, 1230].min
        bot[:y] = [[bot[:y], 50].max, 670].min
      end
      
      # Update angle
      bot[:angle] = (bot[:angle] + (rand - 0.5) * 0.2) % (Math::PI * 2)
      
      # Bot combat AI
      if rand < 0.02
        # Find nearest enemy
        nearest_enemy = find_nearest_enemy(bot)
        if nearest_enemy
          # Aim at enemy
          dx = nearest_enemy[:x] - bot[:x]
          dy = nearest_enemy[:y] - bot[:y]
          bot[:angle] = Math.atan2(dy, dx)
          
          # Shoot if close enough
          distance = Math.sqrt(dx * dx + dy * dy)
          if distance < 500 && rand < bot[:skill_level] * 0.1
            # Bot shoots (would send to clients)
          end
        end
      end
      
      # Bot bomb planting (T side)
      if bot[:team] == 't' && bot[:bomb] && @game_state[:phase] == 'live' && !@game_state[:bomb][:planted]
        @game_state[:bombSites].each do |site, data|
          dist = Math.sqrt((bot[:x] - data[:x])**2 + (bot[:y] - data[:y])**2)
          if dist < data[:radius] && rand < 0.01
            @game_state[:bomb] = {
              planted: true,
              time_left: 35,
              x: bot[:x],
              y: bot[:y],
              planter_id: id,
              site: site
            }
            bot[:bomb] = false
          end
        end
      end
    end
  end
  
  def find_nearest_enemy(bot)
    nearest = nil
    min_distance = Float::INFINITY
    
    @game_state[:players].each do |id, player|
      next if player[:team] == bot[:team] || !player[:alive]
      
      distance = Math.sqrt((player[:x] - bot[:x])**2 + (player[:y] - bot[:y])**2)
      if distance < min_distance
        min_distance = distance
        nearest = player
      end
    end
    
    nearest
  end
  
  def end_round(winner)
    if winner == 'ct'
      @game_state[:ct_score] += 1
    else
      @game_state[:t_score] += 1
    end
    
    # Check for match end
    if @game_state[:ct_score] >= 16 || @game_state[:t_score] >= 16
      @game_state[:phase] = 'ended'
    else
      # Reset for next round
      @game_state[:round] += 1
      @game_state[:phase] = 'freeze'
      @game_state[:freeze_time] = 15
      @game_state[:round_time] = 115
      @game_state[:bomb] = {
        planted: false,
        time_left: 35,
        x: nil,
        y: nil,
        planter_id: nil,
        site: nil
      }
      
      # Reset players
      @game_state[:players].each do |id, player|
        player[:health] = 100
        player[:alive] = true
        player[:x] = player[:team] == 'ct' ? 200 + rand(100) : 1080 - rand(100)
        player[:y] = 300 + rand(200)
      end
    end
  end
  
  def broadcast_game_state
    # Send game state update via WebSocket
    self.script(<<~JAVASCRIPT)
      if (window.updateGameState) {
        window.updateGameState(#{@game_state.to_json});
      }
    JAVASCRIPT
  end
  
  def close
    @game_running = false
    @async_task&.stop
  end
end

Application = Lively::Application[CS16View]