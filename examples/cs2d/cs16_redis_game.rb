#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"

# Load Redis room manager and game infrastructure
require_relative "game/async_redis_room_manager"
require_relative "game/multiplayer_game_room"

# Load our extracted modules for UI components
require_relative "lib/cs16_game_state"
require_relative "lib/cs16_player_manager" 
require_relative "lib/cs16_hud_components"
require_relative "lib/i18n"

# CS 1.6 Multiplayer Game with Redis Backend
# Handles actual gameplay after players are ready from room waiting
class CS16RedisGameView < Live::View
	include CS16HudComponents

	# Global Redis room manager (shared across all view instances)
	@@room_manager = AsyncRedisRoomManager.new

	def initialize(...)
		super
		@player_id = nil
		@room_id = nil
		@game_room = nil
		@room_data = nil
		@players = []
		@game_started = false
	end
	
	def bind(page)
		super
		
		# Get room_id and player_id from URL parameters
		request = page.request
		@room_id = request.params["room_id"]
		@player_id = request.params["player_id"]
		
		Console.info(self, "CS16 Redis Game: Player #{@player_id} connecting to room #{@room_id}...")
		
		unless @room_id && @player_id
			show_error("錯誤：未提供房間 ID 或玩家 ID")
			return
		end
		
		# Verify room exists and is in playing state
		unless verify_game_access
			show_error("無法進入遊戲：房間不存在、未開始，或您不在此房間中")
			return
		end
		
		Console.info(self, "CS16 Redis Game: Player verified, starting game...")
		
		# Get room players (including bots)
		@players = @@room_manager.get_room_players(@room_id)
		
		# Initial render
		self.update!
		
		# Start game initialization
		initialize_game
	end
	
	def verify_game_access
		@room_data = @@room_manager.get_room_info(@room_id)
		return false unless @room_data
		
		# Check if room is in playing state
		return false unless @room_data[:state] == "playing"
		
		# Check if player is in room
		players = @@room_manager.get_room_players(@room_id)
		player_in_room = players.any? { |p| p[:id] == @player_id }
		
		return player_in_room
	end
	
	def initialize_game
		Async do
			# Wait a moment for page to render
			sleep 0.5
			
			# Initialize game state
			@game_started = true
			
			# Show loading message
			show_game_status("🎮 初始化遊戲中...")
			
			# Create game room instance if not exists
			# Convert room_data to settings format for ensure_room_instance
			settings = {
				name: @room_data[:name],
				max_players: @room_data[:max_players],
				map: @room_data[:map],
				game_mode: @room_data[:game_mode]
			}
			@game_room = @@room_manager.ensure_room_instance(@room_id, settings)
			
			# Add player to game room
			if @game_room && @game_room.add_player(@player_id, self)
				Console.info(self, "Player #{@player_id} successfully added to game room")
				show_game_status("✅ 已連接到遊戲伺服器")
				
				# Start game loop after short delay
				sleep 1
				start_game_loop
			else
				Console.error(self, "Failed to add player to game room")
				show_error("無法連接到遊戲伺服器")
			end
		end
	rescue => e
		Console.error(self, "Error initializing game: #{e.message}")
		show_error("遊戲初始化失敗: #{e.message}")
	end
	
	def start_game_loop
		show_game_status("🚀 遊戲開始！")
		
		# Update UI to show game interface
		self.replace("#game-content") do |builder|
			render_game_interface(builder)
		end
		
		# Inject game JavaScript
		self.script(<<~JAVASCRIPT)
			console.log('Starting CS16 Redis Game...');
			if (window.GameEngine) {
				window.GameEngine.initialize('#{@player_id}', '#{@room_id}');
			} else {
				console.error('GameEngine not found. Game JavaScript may not be loaded.');
			}
		JAVASCRIPT
	rescue => e
		Console.error(self, "Error starting game loop: #{e.message}")
		show_error("遊戲啟動失敗: #{e.message}")
	end
	
	# Handle client events from game
	def handle(event)
		return unless @game_started && @game_room
		
		Console.info(self, "Handling game event: #{event[:type]}")
		
		case event[:type]
		when "player_move"
			@game_room.handle_player_move(@player_id, event[:detail])
		when "player_shoot"
			@game_room.handle_player_shoot(@player_id, event[:detail])
		when "player_reload"
			@game_room.handle_player_reload(@player_id)
		when "buy_weapon"
			@game_room.handle_buy_weapon(@player_id, event[:detail])
		when "leave_game"
			handle_leave_game
		else
			Console.warn(self, "Unknown game event: #{event[:type]}")
		end
	rescue => e
		Console.error(self, "Error handling game event: #{e.message}")
	end
	
	def handle_leave_game
		Console.info(self, "Player #{@player_id} leaving game")
		
		# Remove player from game room
		@game_room&.remove_player(@player_id)
		
		# Leave Redis room
		@@room_manager.leave_room(@player_id)
		
		# Redirect to lobby
		self.script(<<~JAVASCRIPT)
			alert('已離開遊戲');
			window.location.href = '/';
		JAVASCRIPT
	rescue => e
		Console.error(self, "Error leaving game: #{e.message}")
	end
	
	def show_error(message)
		self.script(<<~JAVASCRIPT)
			alert('#{message.gsub("'", "\\'")}');
			window.location.href = '/';
		JAVASCRIPT
	end
	
	def show_game_status(message)
		self.replace("#game-status") do |builder|
			builder.tag(:div, style: "text-align: center; padding: 20px; color: #333; font-size: 18px;") do
				builder.text(message)
			end
		end
	rescue => e
		Console.error(self, "Error showing game status: #{e.message}")
	end
	
	# Render game interface
	def render_game_interface(builder)
		builder.tag(:div, id: "cs16-game-container", style: "width: 100%; height: 100vh; position: relative;") do
			# Game canvas
			builder.tag(:canvas, id: "game-canvas", 
				width: "800", height: "600",
				style: "display: block; margin: 0 auto; border: 2px solid #333; background: #000;") do
			end
			
			# Game HUD overlay
			builder.tag(:div, id: "game-hud", style: "position: absolute; top: 10px; left: 10px; right: 10px; color: white; font-family: monospace;") do
				# Player info
				builder.tag(:div, style: "display: flex; justify-content: space-between;") do
					builder.tag(:div) do
						builder.text("玩家: #{@player_id}")
					end
					builder.tag(:div) do
						builder.text("房間: #{@room_id}")
					end
					builder.tag(:div) do
						builder.text("玩家數: #{@players.length}")
					end
				end
			end
			
			# Game controls info
			builder.tag(:div, style: "text-align: center; margin-top: 10px; color: #666;") do
				builder.tag(:p) { builder.text("🎮 使用 WASD 移動，滑鼠瞄準射擊，R 重新裝彈") }
				builder.tag(:button, 
					onclick: "if(confirm('確定要離開遊戲嗎？')) { window.live.forwardEvent('#{@id}', {type: 'leave_game'}, {}); }",
					style: "padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;") do
					builder.text("離開遊戲")
				end
			end
		end
		
		# Load game JavaScript
		builder.tag(:script, src: "/_static/cs16_classic_game.js") do
			# Force explicit closing tag for script
		end
	end
	
	def render(builder)
		builder.tag(:html) do
			builder.tag(:head) do
				builder.tag(:title) { builder.text("CS2D - 遊戲中") }
				builder.tag(:meta, charset: "UTF-8")
				builder.tag(:meta, name: "viewport", content: "width=device-width, initial-scale=1.0")
				builder.tag(:style) do
					builder.raw(<<~CSS)
						body {
							margin: 0;
							padding: 0;
							background: #222;
							font-family: Arial, sans-serif;
							overflow: hidden;
						}
						#game-status {
							background: rgba(0, 0, 0, 0.8);
							color: white;
							position: fixed;
							top: 0;
							left: 0;
							right: 0;
							z-index: 1000;
						}
					CSS
				end
			end
			
			builder.tag(:body) do
				# Game status overlay
				builder.tag(:div, id: "game-status") do
					# Will be populated by show_game_status
				end
				
				# Game content
				builder.tag(:div, id: "game-content") do
					# Initial loading message
					builder.tag(:div, style: "display: flex; justify-content: center; align-items: center; height: 100vh; color: white; font-size: 24px;") do
						builder.text("🎮 載入遊戲中...")
					end
				end
			end
		end
	end
	
	def close
		# Clean up when view is closed
		@game_room&.remove_player(@player_id)
		Console.info(self, "CS16 Redis Game view closed for player #{@player_id}")
		super
	end
end

# Application created in main_server.rb