#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"

# Load our extracted modules
require_relative "lib/cs16_game_state"
require_relative "lib/cs16_player_manager"
require_relative "lib/cs16_hud_components"

# CS 1.6 Classic Rules Implementation (Refactored)
# Clean, modular implementation with extracted components
class CS16ClassicView < Live::View
	include CS16GameState
	include CS16PlayerManager
	include CS16HudComponents

	def initialize(...)
		super
		# Initialize game state early to prevent nil errors
		initialize_game_state
	end
	
	def bind(page)
		super
		
		@player_id = SecureRandom.uuid
		@game_running = true
		
		# Re-initialize if needed
		initialize_game_state unless @game_state
		
		# Add player with classic CS 1.6 properties
		@game_state[:players][@player_id] = create_classic_player(@player_id, "ct")
		@game_state[:economy][:ct_money][@player_id] = 800 # Start with $800
		
		# Add bots for full 5v5 classic match
		add_classic_bots
		
		self.update!
		
		# Inject JavaScript initialization after WebSocket is ready
		Async do
			sleep 2.0 # Wait for WebSocket and JS to load
			inject_game_initialization
		end
	end
	
	def inject_game_initialization
		# Skip WebSocket injection if page is not bound properly
		# The HTML-based initialization will handle the game startup
		Console.info(self, "CS16 Classic: Using HTML-based initialization instead of WebSocket injection")
	rescue => error
		Console.error(self, "CS16 Classic: WebSocket injection failed: #{error.message}")
	end
	
	def render(builder)
		render_game_container(builder)
		render_javascript_integration(builder)
	end
	
	def render_game_container(builder)
		builder.tag(:div, id: "cs16-classic-container", data: { live: @id }, 
			style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #000; position: relative; font-family: 'Counter-Strike', Arial, sans-serif;") do
			
			# Main game canvas - add focus for keyboard events
			builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
				style: "display: block; margin: 0 auto; cursor: crosshair; image-rendering: pixelated; outline: none;",
				tabIndex: 0)
			
			# Render all HUD components using the extracted module
			render_classic_hud(builder)
			render_classic_buy_menu(builder)
			render_classic_scoreboard(builder)
			render_classic_chatbox(builder)
			render_classic_killfeed(builder)
			
			# Loading screen - DISABLED for debugging
			# render_loading_screen(builder)
		end
	end
	
	def render_loading_screen(builder)
		builder.tag(:div, id: "loading-screen", 
			style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; z-index: 9999;") do
			builder.tag(:div, style: "text-align: center; color: #fff;") do
				builder.tag(:h1, style: "font-size: 48px; margin-bottom: 20px; color: #ff6b00;") do
					builder.text("Counter-Strike 1.6 Classic")
				end
				builder.tag(:div, style: "font-size: 24px;") do
					map_name = @game_state ? @game_state[:map] : "de_dust2"
					builder.text("Loading #{map_name}...")
				end
				builder.tag(:div, style: "margin-top: 20px; font-size: 18px; color: #888;") do
					builder.text("Classic Competitive Rules")
				end
				builder.tag(:div, style: "margin-top: 30px;") do
					builder.tag(:div, style: "width: 400px; height: 20px; background: #333; border: 2px solid #555;") do
						builder.tag(:div, id: "loading-bar", style: "width: 0%; height: 100%; background: linear-gradient(90deg, #ff6b00, #ffaa00); transition: width 0.3s;")
					end
				end
			end
		end
	end
	
	def render_javascript_integration(builder)
		# Simple test first
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				console.log('🚀🚀🚀 BASIC HTML SCRIPT TEST - This should appear first!');
				console.log('🚀🚀🚀 DOM ready state:', document.readyState);
				console.log('🚀🚀🚀 Canvas element exists:', !!document.getElementById('game-canvas'));
				
				// Monitor for external JS loading
				let checkCount = 0;
				const loadChecker = setInterval(() => {
					checkCount++;
					console.log('🔍 Check', checkCount + ':', 'CS16Classic available:', typeof window.CS16Classic !== 'undefined');
					if (typeof window.CS16Classic !== 'undefined' || checkCount >= 10) {
						clearInterval(loadChecker);
						if (typeof window.CS16Classic !== 'undefined') {
							console.log('✅ External JS loaded successfully!');
							console.log('✅ CS16Classic functions:', Object.keys(window.CS16Classic));
						} else {
							console.log('❌ External JS failed to load after 5 seconds');
						}
					}
				}, 500);
			JAVASCRIPT
		end
		
		# Include the external JavaScript file - must have closing tag
		builder.tag(:script, src: "/_static/cs16_classic_game.js", type: "text/javascript") do
			# Empty content but forces proper opening/closing tags
		end
		
		# Initialize the game with the player ID
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				console.log('🎮🎮🎮 INITIALIZATION SCRIPT IS RUNNING!');
				console.log('🎮 CS16 Classic: Starting initialization...');
				
				// Generate player ID in JavaScript if not provided from Ruby
				const playerId = '#{@player_id}' || 'player-' + Math.random().toString(36).substr(2, 9);
				console.log('🎮 Player ID:', playerId);
				
				// Wait for external JS to load (DOM elements are already available)
				function attemptInitialization() {
					console.log('🎮 Checking initialization conditions...');
					console.log('🎮 DOM ready state:', document.readyState);
					console.log('🎮 CS16Classic available:', typeof window.CS16Classic !== 'undefined');
					console.log('🎮 Canvas exists:', !!document.getElementById('game-canvas'));
					
					// Only need external JS and canvas to be ready - don't wait for document.readyState === 'complete'
					if (typeof window.CS16Classic !== 'undefined' && window.CS16Classic.initializeGame && document.getElementById('game-canvas')) {
						console.log('✅ All conditions met, initializing game...');
						try {
							window.CS16Classic.initializeGame(playerId);
							console.log('✅ Game initialization completed successfully!');
							return true;
						} catch (error) {
							console.error('❌ Game initialization failed:', error);
							console.error('❌ Stack trace:', error.stack);
							return false;
						}
					} else {
						console.log('⏳ Conditions not met yet, will retry...');
						if (typeof window.CS16Classic === 'undefined') {
							console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('cs16') || k.toLowerCase().includes('game')));
						}
						return false;
					}
				}
				
				// Try immediate initialization, then use event-driven approach
				console.log('🎮 Starting initialization sequence...');
				
				if (attemptInitialization()) {
					console.log('🎮 Immediate initialization successful!');
				} else {
					console.log('🎮 Immediate initialization failed, setting up retry system...');
					
					// Use a more aggressive retry with shorter intervals
					let attempts = 0;
					const maxAttempts = 10;
					const retryInterval = setInterval(function() {
						attempts++;
						console.log('🎮 Initialization attempt', attempts + '/' + maxAttempts);
						
						if (attemptInitialization()) {
							console.log('🎮 Retry initialization successful!');
							clearInterval(retryInterval);
						} else if (attempts >= maxAttempts) {
							console.error('❌ Failed to initialize after ' + maxAttempts + ' attempts');
							console.log('❌ Final DOM state:', document.readyState);
							console.log('❌ CS16Classic available:', typeof window.CS16Classic !== 'undefined');
							console.log('❌ Canvas available:', !!document.getElementById('game-canvas'));
							clearInterval(retryInterval);
						}
					}, 200);
				}
			JAVASCRIPT
		end
	end
	
	# Server-side game logic methods
	def update_player_state(player_id, state_data)
		player = @game_state[:players][player_id]
		return unless player
		
		# Update player position and state from client
		player[:x] = state_data[:x] if state_data[:x]
		player[:y] = state_data[:y] if state_data[:y]
		player[:angle] = state_data[:angle] if state_data[:angle]
		player[:health] = state_data[:health] if state_data[:health]
		
		# Broadcast updated state to all clients
		broadcast_player_update(player_id, player)
	end
	
	def handle_player_action(player_id, action, data = {})
		player = @game_state[:players][player_id]
		return unless player
		
		case action
		when "shoot"
			handle_player_shoot(player_id, data)
		when "buy_weapon"
			handle_weapon_purchase(player_id, data[:weapon_id])
		when "throw_grenade"
			handle_grenade_throw(player_id, data)
		when "plant_bomb"
			handle_bomb_plant(player_id)
		when "defuse_bomb"
			handle_bomb_defuse(player_id)
		end
	end
	
	def handle_player_shoot(player_id, data)
		player = @game_state[:players][player_id]
		return unless player&.fetch(:alive)
		
		# Server-side bullet validation and damage calculation
		weapon = player[:current_weapon] == "primary" ? player[:primary_weapon] : player[:secondary_weapon]
		weapon_data = classic_weapon_data[weapon&.to_sym]
		
		return unless weapon_data
		
		# Create server-side bullet
		bullet = {
			id: SecureRandom.uuid,
			x: data[:x] || player[:x],
			y: data[:y] || player[:y],
			angle: data[:angle] || player[:angle],
			speed: 1000,
			damage: weapon_data[:damage],
			shooter_id: player_id,
			weapon: weapon,
			timestamp: Time.now.to_f
		}
		
		# Broadcast bullet to all clients
		broadcast_bullet_fired(bullet)
		
		# Check for hits (server-authoritative)
		check_bullet_hits(bullet)
	end
	
	def handle_weapon_purchase(player_id, weapon_id)
		player = @game_state[:players][player_id]
		return unless player&.fetch(:alive) && player[:can_buy]
		
		weapon_data = classic_weapon_data[weapon_id&.to_sym]
		return unless weapon_data
		
		# Check if player can afford the weapon
		if player[:money] >= weapon_data[:price]
			player[:money] -= weapon_data[:price]
			
			# Give weapon to player
			case weapon_data[:category]
			when "pistol"
				give_weapon(player_id, weapon_id, "secondary")
			else
				give_weapon(player_id, weapon_id, "primary")
			end
			
			# Broadcast purchase to all clients
			broadcast_purchase(player_id, weapon_id, weapon_data[:price])
		end
	end
	
	def handle_bomb_plant(player_id)
		player = @game_state[:players][player_id]
		return unless player&.fetch(:bomb) && player[:alive]
		
		# Check if player is in bomb site
		bomb_site = get_bomb_site_at_position(player[:x], player[:y])
		return unless bomb_site
		
		# Plant bomb
		@game_state[:bomb][:planted] = true
		@game_state[:bomb][:x] = player[:x]
		@game_state[:bomb][:y] = player[:y]
		@game_state[:bomb][:planter_id] = player_id
		@game_state[:bomb][:site] = bomb_site
		@game_state[:bomb][:time_left] = 35 # Classic C4 timer
		
		player[:bomb] = false
		player[:money] += @game_state[:economy][:round_bonuses][:plant_bonus]
		
		# Broadcast bomb plant
		broadcast_bomb_planted(player_id, bomb_site)
	end
	
	def handle_bomb_defuse(player_id)
		return unless @game_state[:bomb][:planted]
		
		player = @game_state[:players][player_id]
		return unless player&.fetch(:alive) && player[:team] == "ct"
		
		# Check distance to bomb
		bomb_distance = Math.sqrt(
			(player[:x] - @game_state[:bomb][:x])**2 + 
			(player[:y] - @game_state[:bomb][:y])**2
		)
		
		return unless bomb_distance < 50 # Must be close to bomb
		
		defuse_time = player[:defuse_kit] ? 
			@game_state[:bomb][:defuse_time_kit] : 
			@game_state[:bomb][:defuse_time]
		
		# Start defuse process (would need timer logic)
		start_bomb_defuse(player_id, defuse_time)
	end
	
	# Broadcast methods for real-time updates
	def broadcast_player_update(player_id, player_data)
		self.script(<<~JAVASCRIPT)
			if (typeof gameState !== 'undefined' && gameState.players) {
				gameState.players['#{player_id}'] = #{player_data.to_json};
			}
		JAVASCRIPT
	end
	
	def broadcast_bullet_fired(bullet)
		self.script(<<~JAVASCRIPT)
			if (typeof gameState !== 'undefined') {
				gameState.bullets.push(#{bullet.to_json});
			}
		JAVASCRIPT
	end
	
	def broadcast_purchase(player_id, weapon_id, price)
		self.script(<<~JAVASCRIPT)
			console.log('Player #{player_id} purchased #{weapon_id} for $#{price}');
			// Update player money and weapon in client
		JAVASCRIPT
	end
	
	def broadcast_bomb_planted(player_id, site)
		self.script(<<~JAVASCRIPT)
			console.log('#{@game_state[:players][player_id][:name]} planted the bomb at site #{site}!');
			// Update bomb state in client
		JAVASCRIPT
	end
	
	def close
		@game_running = false
		super
	end
	
	private
	
	def check_bullet_hits(bullet)
		# Server-side hit detection
		@game_state[:players].each do |target_id, target|
			next unless target[:alive] && target_id != bullet[:shooter_id]
			
			# Calculate distance
			distance = Math.sqrt(
				(target[:x] - bullet[:x])**2 + (target[:y] - bullet[:y])**2
			)
			
			# Check hit
			if distance < 16 # Player hit radius
				damage_dealt = damage_player(target_id, bullet[:damage], bullet[:shooter_id], bullet[:weapon])
				
				# Broadcast hit
				broadcast_player_hit(target_id, damage_dealt, bullet[:shooter_id])
			end
		end
	end
	
	def broadcast_player_hit(target_id, damage, shooter_id)
		self.script(<<~JAVASCRIPT)
			console.log('Player hit: #{damage} damage to #{target_id} by #{shooter_id}');
		JAVASCRIPT
	end
	
	def get_bomb_site_at_position(x, y)
		# Simple bomb site detection
		if x >= 150 && x <= 350 && y >= 100 && y <= 300
			"A"
		elsif x >= 900 && x <= 1100 && y >= 400 && y <= 600
			"B"
		else
			nil
		end
	end
	
	def start_bomb_defuse(player_id, defuse_time)
		# Implementation would need a timer system
		# For now, just log the attempt
		puts "Player #{player_id} started defusing (#{defuse_time}s)"
	end
end

# Application constant is defined in application.rb