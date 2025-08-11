#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"

# Load multiplayer infrastructure
require_relative "game/room_manager"
require_relative "game/multiplayer_game_room"

# Load our extracted modules for UI components
require_relative "lib/cs16_game_state"
require_relative "lib/cs16_player_manager" 
require_relative "lib/cs16_hud_components"

# CS 1.6 Classic Multiplayer Implementation
# Integrates existing room system with Live framework
class CS16MultiplayerView < Live::View
	include CS16HudComponents

	# Global room manager (shared across all view instances)
	@@room_manager = RoomManager.new

	def initialize(...)
		super
		@player_id = nil
		@room_id = nil
		@game_room = nil
	end
	
	def bind(page)
		super
		
		@player_id = SecureRandom.uuid
		Console.info(self, "CS16 Multiplayer: Player #{@player_id} connecting...")
		
		# Find or create a room for this player
		@room_id = @@room_manager.find_or_create_room(@player_id)
		@game_room = @@room_manager.get_room(@room_id)
		
		Console.info(self, "CS16 Multiplayer: Player assigned to room #{@room_id}")
		
		# Add player to the room with this view instance
		if @game_room.add_player(@player_id, self)
			Console.info(self, "CS16 Multiplayer: Player successfully added to room")
		else
			Console.error(self, "CS16 Multiplayer: Failed to add player to room")
		end
		
		self.update!
		
		# Setup message handling
		setup_message_handlers
		
		# Initialize game after WebSocket is ready
		Async do
			sleep 2.0
			inject_multiplayer_initialization
		end
	end
	
	def setup_message_handlers
		# Handle incoming WebSocket messages from client
		Console.info(self, "CS16 Multiplayer: Setting up message handlers for player #{@player_id}")
		
		# Set up periodic state updates (since the room's game loop is disabled)
		setup_periodic_updates
	end
	
	def setup_periodic_updates
		# Send periodic updates to clients (replaces room's disabled game loop)
		Async do
			loop do
				sleep(1.0 / 20.0) # 20 FPS updates
				
				break unless @page && @game_room
				
				# Send delta updates to all players in room
				send_delta_update if @game_room
			end
		rescue => error
			Console.error(self, "Periodic update error: #{error.message}")
		end
	end
	
	def send_delta_update
		# Get current state and send as delta update
		current_state = @game_room.get_full_state
		
		send_message({
			type: "game_state_delta",  
			tick: current_state[:tick],
			timestamp: Time.now.to_f * 1000,
			delta: current_state # For now, send full state as delta
		})
	end
	
	# Handle incoming WebSocket messages (Live framework method)
	def call(env)
		super
	end
	
	# Process WebSocket frames
	def websocket_message(message)
		begin
			data = JSON.parse(message)
			handle_client_message(data["action"], data["data"])
		rescue JSON::ParserError => error
			Console.error(self, "Invalid JSON message: #{error.message}")
		rescue => error
			Console.error(self, "WebSocket message error: #{error.message}")
		end
	end
	
	def send_message(message)
		# This method is called by the room to send updates to this player
		return unless @page
		
		begin
			# Convert message to JavaScript and inject via WebSocket
			self.script(<<~JAVASCRIPT)
				if (typeof window.CS16Multiplayer !== 'undefined') {
					window.CS16Multiplayer.handleServerMessage(#{message.to_json});
				} else {
					console.log('CS16 Multiplayer message queued:', #{message.to_json});
					window.CS16MessageQueue = window.CS16MessageQueue || [];
					window.CS16MessageQueue.push(#{message.to_json});
				}
			JAVASCRIPT
		rescue => error
			Console.error(self, "Failed to send message: #{error.message}")
		end
	end
	
	def handle_client_message(action, data)
		# Process messages from client and forward to room
		return unless @game_room
		
		case action
		when "player_move"
			result = @game_room.process_movement(@player_id, data)
			broadcast_movement_update(result) if result[:success]
		when "player_shoot"
			result = @game_room.process_shoot(@player_id, data[:angle], data[:timestamp])
			broadcast_shoot_update(result) if result[:success]
		when "player_reload"
			result = @game_room.process_reload(@player_id)
			broadcast_reload_update(result) if result[:success]
		when "buy_weapon"
			success = @game_room.buy_weapon(@player_id, data[:weapon])
			# Room will broadcast purchase update automatically
		when "change_team"
			@game_room.change_team(@player_id, data[:team])
		when "plant_bomb"
			@game_room.plant_bomb(@player_id)
		when "defuse_bomb"
			@game_room.defuse_bomb(@player_id)
		when "request_full_state"
			send_full_state
		else
			Console.warn(self, "Unknown client action: #{action}")
		end
	end
	
	def inject_multiplayer_initialization
		Console.info(self, "CS16 Multiplayer: Injecting initialization for player #{@player_id}")
		
		# Send initial game state to client
		send_full_state
		
		# Initialize multiplayer client-side system
		self.script(<<~JAVASCRIPT)
			console.log('🌐 CS16 Multiplayer: Starting initialization...');
			
			// Initialize multiplayer system if available
			if (typeof window.CS16Multiplayer !== 'undefined') {
				window.CS16Multiplayer.initialize({
					playerId: '#{@player_id}',
					roomId: '#{@room_id}',
					isMultiplayer: true
				});
				
				// Process any queued messages
				if (window.CS16MessageQueue) {
					window.CS16MessageQueue.forEach(msg => {
						window.CS16Multiplayer.handleServerMessage(msg);
					});
					window.CS16MessageQueue = [];
				}
				
				console.log('✅ CS16 Multiplayer system initialized');
			} else {
				console.warn('⚠️ CS16 Multiplayer system not loaded yet');
			}
		JAVASCRIPT
		
	rescue => error
		Console.error(self, "CS16 Multiplayer: Initialization failed: #{error.message}")
	end
	
	def send_full_state
		return unless @game_room
		
		full_state = @game_room.get_full_state
		send_message({
			type: "full_game_state",
			state: full_state,
			your_player_id: @player_id,
			room_id: @room_id,
			timestamp: Time.now.to_f * 1000
		})
	end
	
	def broadcast_movement_update(result)
		# Movement updates are handled by the room's delta system
		# No need to broadcast individually
	end
	
	def broadcast_shoot_update(result)
		# Shooting updates are handled by the room's event system
		# No need to broadcast individually  
	end
	
	def broadcast_reload_update(result)
		send_message({
			type: "player_reload",
			player_id: @player_id,
			reload_time: result[:reload_time],
			timestamp: Time.now.to_f * 1000
		})
	end
	
	def render(builder)
		render_multiplayer_container(builder)
		render_multiplayer_javascript(builder)
	end
	
	def render_multiplayer_container(builder)
		builder.tag(:div, id: "cs16-multiplayer-container", data: { live: @id }, 
			style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #000; position: relative; font-family: 'Counter-Strike', Arial, sans-serif;") do
			
			# Main game canvas
			builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
				style: "display: block; margin: 0 auto; cursor: crosshair; image-rendering: pixelated; outline: none;",
				tabIndex: 0)
			
			# Render classic HUD components
			render_classic_hud(builder)
			render_classic_buy_menu(builder)
			render_classic_scoreboard(builder)
			render_classic_chatbox(builder)
			render_classic_killfeed(builder)
			
			# Multiplayer-specific UI
			render_room_info(builder)
		end
	end
	
	def render_room_info(builder)
		builder.tag(:div, id: "room-info", 
			style: "position: absolute; top: 10px; right: 10px; color: #fff; font-size: 12px; background: rgba(0,0,0,0.7); padding: 8px; border-radius: 4px;") do
			builder.tag(:div) { builder.text("Room: #{@room_id}") }
			if @game_room
				player_count = @game_room.players.size
				builder.tag(:div) { builder.text("Players: #{player_count}/#{MultiplayerGameRoom::MAX_PLAYERS}") }
			end
		end
	end
	
	def render_multiplayer_javascript(builder)
		# Basic initialization test
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				console.log('🌐🌐🌐 MULTIPLAYER INITIALIZATION TEST');
				console.log('Player ID: #{@player_id}');
				console.log('Room ID: #{@room_id}');
			JAVASCRIPT
		end
		
		# Load the existing CS16 game engine (it should work for multiplayer too)
		builder.tag(:script, src: "/_static/cs16_classic_game.js", type: "text/javascript") do
			# Empty content but forces proper opening/closing tags
		end
		
		# Multiplayer-specific JavaScript
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				console.log('🌐 Setting up multiplayer client...');
				
				// Multiplayer client system
				window.CS16Multiplayer = {
					playerId: null,
					roomId: null,
					gameState: null,
					
					initialize: function(config) {
						console.log('🌐 Initializing multiplayer with config:', config);
						this.playerId = config.playerId;
						this.roomId = config.roomId;
						
						// Initialize the base game if available
						if (typeof window.CS16Classic !== 'undefined') {
							console.log('🌐 Initializing base game engine...');
							window.CS16Classic.initializeGame(this.playerId, true); // true = multiplayer mode
						}
						
						this.setupNetworkHandlers();
					},
					
					setupNetworkHandlers: function() {
						console.log('🌐 Setting up network message handlers');
						
						// Handle keyboard input and send to server
						document.addEventListener('keydown', (e) => {
							this.handleInput(e.code, true);
						});
						
						document.addEventListener('keyup', (e) => {
							this.handleInput(e.code, false);
						});
						
						// Handle mouse input
						const canvas = document.getElementById('game-canvas');
						if (canvas) {
							canvas.addEventListener('click', (e) => {
								this.handleShoot(e);
							});
						}
					},
					
					handleInput: function(key, pressed) {
						// Send movement input to server
						const movement = this.getMovementFromKey(key, pressed);
						if (movement) {
							this.sendToServer('player_move', movement);
						}
					},
					
					handleShoot: function(e) {
						const canvas = e.target;
						const rect = canvas.getBoundingClientRect();
						const x = e.clientX - rect.left;
						const y = e.clientY - rect.top;
						
						// Calculate angle from player position to click
						// This would need actual player position from game state
						this.sendToServer('player_shoot', {
							angle: Math.atan2(y - canvas.height/2, x - canvas.width/2),
							timestamp: Date.now()
						});
					},
					
					getMovementFromKey: function(key, pressed) {
						const movements = {
							'KeyW': { dy: -5 },
							'KeyS': { dy: 5 },
							'KeyA': { dx: -5 },
							'KeyD': { dx: 5 }
						};
						
						if (movements[key] && pressed) {
							return movements[key];
						}
						return null;
					},
					
					sendToServer: function(action, data) {
						console.log('🌐 Sending to server:', action, data);
						
						// Send via WebSocket using Live framework
						if (window.Live && window.Live.send) {
							const message = JSON.stringify({
								action: action,
								data: data,
								timestamp: Date.now()
							});
							window.Live.send(message);
						} else {
							console.warn('🌐 Live WebSocket not available, queuing message');
							this.messageQueue = this.messageQueue || [];
							this.messageQueue.push({ action, data });
						}
					},
					
					handleServerMessage: function(message) {
						console.log('🌐 Received from server:', message.type, message);
						
						switch (message.type) {
							case 'full_game_state':
								this.updateGameState(message.state);
								break;
							case 'player_joined':
								this.handlePlayerJoined(message);
								break;
							case 'player_left':
								this.handlePlayerLeft(message);
								break;
							case 'game_state_delta':
								this.applyStateDelta(message.delta);
								break;
						}
					},
					
					updateGameState: function(state) {
						console.log('🌐 Updating full game state:', state);
						this.gameState = state;
						
						// Update the existing game engine if available
						if (typeof window.CS16Classic !== 'undefined' && window.CS16Classic.updateGameState) {
							window.CS16Classic.updateGameState(state);
						}
					},
					
					applyStateDelta: function(delta) {
						console.log('🌐 Applying state delta:', delta);
						
						// Merge delta into current game state
						if (this.gameState && delta) {
							Object.assign(this.gameState, delta);
							
							// Update the game engine
							if (typeof window.CS16Classic !== 'undefined' && window.CS16Classic.updateGameState) {
								window.CS16Classic.updateGameState(this.gameState);
							}
						}
					},
					
					handlePlayerJoined: function(message) {
						console.log('🌐 Player joined:', message.player.name);
						// Could show notification
					},
					
					handlePlayerLeft: function(message) {
						console.log('🌐 Player left:', message.player_name);
						// Could show notification
					}
				};
				
				console.log('🌐 Multiplayer client system ready');
			JAVASCRIPT
		end
	end
	
	def close
		Console.info(self, "CS16 Multiplayer: Player #{@player_id} disconnecting...")
		
		# Remove player from room
		if @game_room
			@game_room.remove_player(@player_id)
		end
		
		# Clean up room if empty
		if @room_id
			@@room_manager.cleanup_empty_room(@room_id)
		end
		
		super
	end
	
	# Helper method to get room manager for testing
	def self.room_manager
		@@room_manager
	end
end

# Create the multiplayer application
Application = Lively::Application[CS16MultiplayerView]