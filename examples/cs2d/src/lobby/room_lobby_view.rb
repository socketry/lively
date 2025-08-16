#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"

# Load multiplayer infrastructure
require_relative "game/room_manager"
require_relative "game/multiplayer_game_room"

# Create a single global room manager instance
GLOBAL_ROOM_MANAGER = RoomManager.new
puts "🔧 Initializing GLOBAL_ROOM_MANAGER: #{GLOBAL_ROOM_MANAGER.object_id}"

# Room Lobby System - 玩家創建和加入房間的界面
class RoomLobbyView < Live::View
	# Use the global room manager instance
	def room_manager
		puts "📍 Accessing room_manager: #{GLOBAL_ROOM_MANAGER.object_id} with #{GLOBAL_ROOM_MANAGER.get_room_list.size} rooms"
		GLOBAL_ROOM_MANAGER
	end
	
	# Room states
	ROOM_STATE_WAITING = "waiting"
	ROOM_STATE_STARTING = "starting"
	ROOM_STATE_PLAYING = "playing"
	ROOM_STATE_FINISHED = "finished"

	def initialize(...)
		super
		@player_id = nil
		@custom_player_id = nil
		@room_id = nil
		@game_room = nil
		@room_state = ROOM_STATE_WAITING
		@is_room_creator = false
		@show_create_form = true
		@show_join_form = false
		@joined_room = false
	end
	
	def bind(page)
		super
		self.update!
		
		# Handle WebSocket messages
		setup_message_handlers
	end
	
	def setup_message_handlers
		# Handle incoming messages from client
	end
	
	# Handle WebSocket messages from client
	def call(env)
		if env.dig("rack.websocket")
			# WebSocket connection established
			super
		else
			# Handle HTTP requests
			request = Rack::Request.new(env)
			
			puts "🔍 HTTP Request: #{request.request_method} #{request.path}"
			
			if request.post?
				puts "📮 POST request received"
				handle_form_submission(request)
			end
			
			super
		end
	end
	
	def handle_form_submission(request)
		action = request.params["action"]
		
		puts "📋 Form action: #{action}"
		puts "📋 Form params: #{request.params.inspect}"
		
		case action
		when "create_room"
			handle_create_room(request)
		when "join_room"
			handle_join_room(request)
		when "add_bot"
			handle_add_bot(request)
		when "start_game"
			handle_start_game(request)
		when "leave_room"
			handle_leave_room(request)
		end
	end
	
	def handle_create_room(request)
		@custom_player_id = request.params["player_id"]&.strip
		room_name = request.params["room_name"]&.strip
		max_players = request.params["max_players"]&.to_i || 10
		
		return if @custom_player_id.nil? || @custom_player_id.empty?
		
		# Use custom player ID or generate one
		@player_id = @custom_player_id.empty? ? SecureRandom.uuid : @custom_player_id
		
		# Create new room with custom settings
		settings = {
			name: room_name || "#{@player_id}'s Room",
			max_players: max_players,
			creator_id: @player_id,
			created_at: Time.now
		}
		
		@room_id = room_manager.create_room(@player_id, settings)
		@game_room = room_manager.get_room(@room_id)
		@is_room_creator = true
		@joined_room = true
		@show_create_form = false
		
		puts "✅ Room created: #{@room_id}, Total rooms: #{room_manager.get_room_list.size}"
		
		# Add creator as first player
		@game_room.add_player(@player_id, self)
		
		send_room_update_to_all_players
		self.update!
	end
	
	def handle_join_room(request)
		@custom_player_id = request.params["player_id"]&.strip
		target_room_id = request.params["room_id"]&.strip
		
		return if @custom_player_id.nil? || @custom_player_id.empty?
		return if target_room_id.nil? || target_room_id.empty?
		
		@player_id = @custom_player_id.empty? ? SecureRandom.uuid : @custom_player_id
		
		# Try to join the specified room
		target_room = room_manager.get_room(target_room_id)
		
		if target_room && target_room.can_add_player?
			@room_id = target_room_id
			@game_room = target_room
			@is_room_creator = false
			@joined_room = true
			@show_create_form = false
			
			room_manager.join_room(@player_id, @room_id)
			@game_room.add_player(@player_id, self)
			
			send_room_update_to_all_players
			self.update!
		else
			# Room is full or doesn't exist
			send_error_message("無法加入房間：房間已滿或不存在")
		end
	end
	
	def handle_add_bot(request)
		return unless @joined_room && @game_room
		
		bot_id = "Bot_#{SecureRandom.hex(4)}"
		bot_name = request.params["bot_name"] || bot_id
		bot_difficulty = request.params["bot_difficulty"] || "normal"
		
		if @game_room.add_bot(bot_id, bot_name, bot_difficulty)
			send_room_update_to_all_players
			self.update!
		end
	end
	
	def handle_start_game(request)
		return unless @joined_room && @game_room && @is_room_creator
		
		if @game_room.can_start_game?
			@room_state = ROOM_STATE_STARTING
			@game_room.start_game
			
			# Redirect all players to the actual game
			redirect_to_game
		else
			send_error_message("無法開始遊戲：需要至少2個玩家")
		end
	end
	
	def handle_leave_room(request)
		if @joined_room && @game_room
			@game_room.remove_player(@player_id)
			room_manager.leave_room(@player_id)
			
			# Cleanup room if empty
			room_manager.cleanup_empty_room(@room_id) if @game_room.empty?
			
			reset_lobby_state
			send_room_update_to_all_players
			self.update!
		end
	end
	
	def reset_lobby_state
		@room_id = nil
		@game_room = nil
		@player_id = nil
		@custom_player_id = nil
		@is_room_creator = false
		@joined_room = false
		@show_create_form = true
		@show_join_form = false
		@room_state = ROOM_STATE_WAITING
	end
	
	def send_room_update_to_all_players
		return unless @game_room
		
		room_data = get_room_data
		
		@game_room.players.each do |player_id, player_view|
			next unless player_view.respond_to?(:send_message)
			
			player_view.send_message({
				type: "room_update",
				room_data: room_data,
				timestamp: Time.now.to_f * 1000
			})
		end
	end
	
	def get_room_data
		return {} unless @game_room
		
		{
			room_id: @room_id,
			room_name: @game_room.room_settings[:name] || @room_id,
			state: @room_state,
			players: @game_room.get_player_list,
			bots: @game_room.get_bot_list,
			max_players: @game_room.room_settings[:max_players] || 10,
			creator_id: @game_room.room_settings[:creator_id],
			can_start: @game_room.can_start_game?
		}
	end
	
	def send_message(message)
		return unless @page
		
		self.script(<<~JAVASCRIPT)
			if (typeof window.RoomLobby !== 'undefined') {
				window.RoomLobby.handleServerMessage(#{message.to_json});
			}
		JAVASCRIPT
	end
	
	def send_error_message(error_text)
		send_message({
			type: "error",
			message: error_text,
			timestamp: Time.now.to_f * 1000
		})
	end
	
	def redirect_to_game
		# Redirect all players in the room to the actual game
		send_message({
			type: "redirect_to_game",
			room_id: @room_id,
			game_url: "/game/#{@room_id}",
			timestamp: Time.now.to_f * 1000
		})
	end

	def render(builder)
		builder.tag(:html, lang: "zh-TW") do
			render_head(builder)
			render_body(builder)
		end
	end

	def render_head(builder)
		builder.tag(:head) do
			builder.tag(:meta, charset: "utf-8")
			builder.tag(:meta, name: "viewport", content: "width=device-width, initial-scale=1")
			builder.tag(:title) { builder.text("CS 1.6 Classic - 房間大廳") }
			builder.tag(:link, rel: "stylesheet", href: "/_static/style.css")
			
			builder.tag(:style) do
				builder.raw(<<~CSS)
					body {
						margin: 0;
						padding: 0;
						background: #1a1a1a;
						color: #ffffff;
						overflow-y: auto;
					}
					
					.lobby-container {
						max-width: 1200px;
						margin: 0 auto;
						padding: 20px;
						background: #1a1a1a;
						color: #ffffff;
						min-height: 100vh;
						overflow-y: auto;
					}
					
					.lobby-header {
						text-align: center;
						margin-bottom: 30px;
						border-bottom: 2px solid #333;
						padding-bottom: 20px;
					}
					
					.form-section {
						background: #2a2a2a;
						border: 1px solid #444;
						border-radius: 8px;
						padding: 20px;
						margin-bottom: 20px;
					}
					
					.form-group {
						margin-bottom: 15px;
					}
					
					.form-group label {
						display: block;
						margin-bottom: 5px;
						color: #cccccc;
						font-weight: bold;
					}
					
					.form-group input, .form-group select {
						width: 100%;
						padding: 10px;
						background: #333;
						border: 1px solid #555;
						border-radius: 4px;
						color: #ffffff;
						font-size: 16px;
					}
					
					.btn {
						background: #4CAF50;
						border: none;
						color: white;
						padding: 12px 24px;
						text-align: center;
						text-decoration: none;
						display: inline-block;
						font-size: 16px;
						margin: 4px 2px;
						cursor: pointer;
						border-radius: 4px;
						transition: background-color 0.3s;
					}
					
					.btn:hover {
						background: #45a049;
					}
					
					.btn-secondary {
						background: #2196F3;
					}
					
					.btn-secondary:hover {
						background: #1976D2;
					}
					
					.btn-danger {
						background: #f44336;
					}
					
					.btn-danger:hover {
						background: #da190b;
					}
					
					.room-info {
						background: #1a4d1a;
						border: 1px solid #4CAF50;
						border-radius: 8px;
						padding: 20px;
						margin-bottom: 20px;
					}
					
					.player-list {
						display: grid;
						grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
						gap: 10px;
						margin-top: 15px;
					}
					
					.player-card {
						background: #333;
						border: 1px solid #555;
						border-radius: 4px;
						padding: 10px;
						text-align: center;
					}
					
					.player-card.bot {
						background: #2a2a4d;
						border-color: #4d4d7a;
					}
					
					.player-card.creator {
						background: #4d2a2a;
						border-color: #7a4d4d;
					}
					
					.room-list {
						max-height: 400px;
						overflow-y: auto;
					}
					
					.room-item {
						background: #2a2a2a;
						border: 1px solid #444;
						border-radius: 4px;
						padding: 15px;
						margin-bottom: 10px;
						display: flex;
						justify-content: space-between;
						align-items: center;
					}
					
					.room-item:hover {
						background: #333;
					}
					
					.error-message {
						background: #4d1a1a;
						border: 1px solid #f44336;
						border-radius: 4px;
						padding: 10px;
						color: #ffcccc;
						margin-bottom: 20px;
					}
					
					.success-message {
						background: #1a4d1a;
						border: 1px solid #4CAF50;
						border-radius: 4px;
						padding: 10px;
						color: #ccffcc;
						margin-bottom: 20px;
					}
					
					.tabs {
						display: flex;
						margin-bottom: 20px;
					}
					
					.tab {
						background: #333;
						border: 1px solid #555;
						color: white;
						padding: 10px 20px;
						cursor: pointer;
						margin-right: 2px;
					}
					
					.tab.active {
						background: #4CAF50;
						border-color: #4CAF50;
					}
					
					.tab:hover {
						background: #444;
					}
					
					.tab.active:hover {
						background: #45a049;
					}
				CSS
			end
		end
	end

	def render_body(builder)
		builder.tag(:body) do
			builder.tag(:div, class: "lobby-container") do
				render_lobby_header(builder)
				
				if @joined_room && @game_room
					render_room_interface(builder)
				else
					render_main_menu(builder)
				end
			end
			
			# Load JavaScript for interactivity
			render_javascript(builder)
		end
	end

	def render_lobby_header(builder)
		builder.tag(:div, class: "lobby-header") do
			builder.tag(:h1) { builder.text("🎮 CS 1.6 Classic 房間大廳") }
			builder.tag(:p) { builder.text("創建房間或加入現有房間開始多人遊戲") }
		end
	end

	def render_main_menu(builder)
		# Tab navigation
		builder.tag(:div, class: "tabs") do
			builder.tag(:div, class: "tab #{@show_create_form ? 'active' : ''}", onclick: "showCreateForm()") do
				builder.text("創建房間")
			end
			builder.tag(:div, class: "tab #{@show_join_form ? 'active' : ''}", onclick: "showJoinForm()") do
				builder.text("加入房間")
			end
		end

		# Create room form
		builder.tag(:div, id: "create-form", style: @show_create_form ? "" : "display: none;") do
			render_create_room_form(builder)
		end

		# Join room form
		builder.tag(:div, id: "join-form", style: @show_join_form ? "" : "display: none;") do
			render_join_room_form(builder)
		end

		# Available rooms list
		render_available_rooms(builder)
	end

	def render_create_room_form(builder)
		builder.tag(:div, class: "form-section") do
			builder.tag(:h2) { builder.text("🆕 創建新房間") }
			
			builder.tag(:form, method: "post", action: "") do
				builder.tag(:input, type: "hidden", name: "action", value: "create_room")
				
				builder.tag(:div, class: "form-group") do
					builder.tag(:label, for: "player_id") { builder.text("玩家 ID:") }
					builder.tag(:input, type: "text", id: "player_id", name: "player_id", placeholder: "輸入你的玩家 ID", required: true)
				end
				
				builder.tag(:div, class: "form-group") do
					builder.tag(:label, for: "room_name") { builder.text("房間名稱:") }
					builder.tag(:input, type: "text", id: "room_name", name: "room_name", placeholder: "輸入房間名稱 (可選)")
				end
				
				builder.tag(:div, class: "form-group") do
					builder.tag(:label, for: "max_players") { builder.text("最大玩家數:") }
					builder.tag(:select, id: "max_players", name: "max_players") do
						(2..10).each do |num|
							selected = num == 10 ? "selected" : ""
							builder.tag(:option, value: num.to_s, **{ selected: selected }.compact) do
								builder.text("#{num} 人")
							end
						end
					end
				end
				
				builder.tag(:button, type: "submit", class: "btn") do
					builder.text("🎯 創建房間")
				end
			end
		end
	end

	def render_join_room_form(builder)
		builder.tag(:div, class: "form-section") do
			builder.tag(:h2) { builder.text("🚪 加入房間") }
			
			builder.tag(:form, method: "post", action: "") do
				builder.tag(:input, type: "hidden", name: "action", value: "join_room")
				
				builder.tag(:div, class: "form-group") do
					builder.tag(:label, for: "join_player_id") { builder.text("玩家 ID:") }
					builder.tag(:input, type: "text", id: "join_player_id", name: "player_id", placeholder: "輸入你的玩家 ID", required: true)
				end
				
				builder.tag(:div, class: "form-group") do
					builder.tag(:label, for: "room_id") { builder.text("房間 ID:") }
					builder.tag(:input, type: "text", id: "room_id", name: "room_id", placeholder: "輸入房間 ID", required: true)
				end
				
				builder.tag(:button, type: "submit", class: "btn btn-secondary") do
					builder.text("🎮 加入房間")
				end
			end
		end
	end

	def render_available_rooms(builder)
		room_list = room_manager.get_room_list
		
		builder.tag(:div, class: "form-section") do
			builder.tag(:h2) { builder.text("🏠 可用房間 (#{room_list.length})") }
			
			if room_list.empty?
				builder.tag(:p) { builder.text("目前沒有可用的房間。創建一個新房間開始遊戲！") }
			else
				builder.tag(:div, class: "room-list") do
					room_list.each do |room_info|
						render_room_item(builder, room_info)
					end
				end
			end
		end
	end

	def render_room_item(builder, room_info)
		builder.tag(:div, class: "room-item") do
			builder.tag(:div) do
				builder.tag(:h4) { builder.text("🏠 #{room_info[:room_name] || room_info[:room_id]}") }
				builder.tag(:p) { builder.text("房間 ID: #{room_info[:room_id]}") }
				builder.tag(:p) { builder.text("玩家: #{room_info[:player_count]}/#{room_info[:max_players]}") }
			end
			
			builder.tag(:div) do
				if room_info[:player_count] < room_info[:max_players]
					builder.tag(:button, class: "btn btn-secondary", onclick: "joinRoom('#{room_info[:room_id]}')") do
						builder.text("加入")
					end
				else
					builder.tag(:span, style: "color: #ff6666;") { builder.text("房間已滿") }
				end
			end
		end
	end

	def render_room_interface(builder)
		room_data = get_room_data
		
		builder.tag(:div, class: "room-info") do
			builder.tag(:h2) { builder.text("🏠 #{room_data[:room_name]}") }
			builder.tag(:p) { builder.text("房間 ID: #{@room_id}") }
			builder.tag(:p) { builder.text("狀態: #{get_room_state_text(@room_state)}") }
			builder.tag(:p) { builder.text("玩家: #{room_data[:players].length}/#{room_data[:max_players]}") }
			
			if @is_room_creator
				builder.tag(:p) { builder.text("👑 你是房主") }
			end
		end

		# Player list
		render_player_list(builder, room_data)

		# Room controls
		render_room_controls(builder, room_data)
	end

	def render_player_list(builder, room_data)
		builder.tag(:div, class: "form-section") do
			builder.tag(:h3) { builder.text("👥 玩家列表") }
			
			builder.tag(:div, class: "player-list") do
				# Render human players
				room_data[:players].each do |player|
					css_class = "player-card"
					css_class += " creator" if player[:id] == room_data[:creator_id]
					
					builder.tag(:div, class: css_class) do
						builder.tag(:h4) { builder.text("👤 #{player[:name] || player[:id]}") }
						builder.tag(:p) { builder.text("人類玩家") }
						if player[:id] == room_data[:creator_id]
							builder.tag(:p) { builder.text("👑 房主") }
						end
					end
				end
				
				# Render bots
				room_data[:bots].each do |bot|
					builder.tag(:div, class: "player-card bot") do
						builder.tag(:h4) { builder.text("🤖 #{bot[:name]}") }
						builder.tag(:p) { builder.text("Bot (#{bot[:difficulty]})") }
					end
				end
				
				# Empty slots
				empty_slots = room_data[:max_players] - room_data[:players].length - room_data[:bots].length
				empty_slots.times do |i|
					builder.tag(:div, class: "player-card", style: "opacity: 0.3;") do
						builder.tag(:h4) { builder.text("⭕ 空位") }
						builder.tag(:p) { builder.text("等待玩家...") }
					end
				end
			end
		end
	end

	def render_room_controls(builder, room_data)
		builder.tag(:div, class: "form-section") do
			builder.tag(:h3) { builder.text("🎮 房間控制") }
			
			# Add bot form (only for room creator)
			if @is_room_creator && (room_data[:players].length + room_data[:bots].length) < room_data[:max_players]
				builder.tag(:form, method: "post", action: "", style: "display: inline-block; margin-right: 10px;") do
					builder.tag(:input, type: "hidden", name: "action", value: "add_bot")
					builder.tag(:input, type: "text", name: "bot_name", placeholder: "Bot 名稱", style: "width: 150px; margin-right: 5px;")
					builder.tag(:select, name: "bot_difficulty", style: "width: 100px; margin-right: 5px;") do
						builder.tag(:option, value: "easy") { builder.text("簡單") }
						builder.tag(:option, value: "normal", selected: "selected") { builder.text("普通") }
						builder.tag(:option, value: "hard") { builder.text("困難") }
					end
					builder.tag(:button, type: "submit", class: "btn") { builder.text("🤖 添加 Bot") }
				end
			end
			
			builder.tag(:div, style: "margin-top: 15px;") do
				# Start game button (only for room creator)
				if @is_room_creator && room_data[:can_start]
					builder.tag(:form, method: "post", action: "", style: "display: inline-block; margin-right: 10px;") do
						builder.tag(:input, type: "hidden", name: "action", value: "start_game")
						builder.tag(:button, type: "submit", class: "btn") { builder.text("🚀 開始遊戲") }
					end
				elsif @is_room_creator
					builder.tag(:button, class: "btn", disabled: "disabled") { builder.text("需要至少2個玩家才能開始") }
				end
				
				# Leave room button
				builder.tag(:form, method: "post", action: "", style: "display: inline-block;") do
					builder.tag(:input, type: "hidden", name: "action", value: "leave_room")
					builder.tag(:button, type: "submit", class: "btn btn-danger") { builder.text("🚪 離開房間") }
				end
			end
		end
	end

	def get_room_state_text(state)
		case state
		when ROOM_STATE_WAITING
			"等待中"
		when ROOM_STATE_STARTING
			"準備開始"
		when ROOM_STATE_PLAYING
			"遊戲中"
		when ROOM_STATE_FINISHED
			"已結束"
		else
			"未知"
		end
	end

	def render_javascript(builder)
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				// Room Lobby JavaScript
				window.RoomLobby = {
					initialize: function() {
						console.log('🏠 Room Lobby initialized');
						
						// Setup Live.js connection
						if (typeof window.Live !== 'undefined') {
							this.setupLiveConnection();
						}
					},
					
					setupLiveConnection: function() {
						// Handle messages from server
						console.log('📡 Setting up Live connection for room lobby');
					},
					
					handleServerMessage: function(message) {
						console.log('📥 Received server message:', message);
						
						switch (message.type) {
							case 'room_update':
								this.handleRoomUpdate(message.room_data);
								break;
							case 'error':
								this.showError(message.message);
								break;
							case 'redirect_to_game':
								this.redirectToGame(message.game_url);
								break;
						}
					},
					
					handleRoomUpdate: function(roomData) {
						console.log('🔄 Room update:', roomData);
						// Reload page to show updated room state
						location.reload();
					},
					
					showError: function(errorMessage) {
						alert('❌ 錯誤: ' + errorMessage);
					},
					
					redirectToGame: function(gameUrl) {
						console.log('🎮 Redirecting to game:', gameUrl);
						// For now, just show a message
						alert('🎮 遊戲即將開始！');
						// TODO: Implement actual game redirection
						// window.location.href = gameUrl;
					}
				};
				
				// Tab switching functions
				function showCreateForm() {
					document.getElementById('create-form').style.display = 'block';
					document.getElementById('join-form').style.display = 'none';
					
					document.querySelector('.tab:nth-child(1)').classList.add('active');
					document.querySelector('.tab:nth-child(2)').classList.remove('active');
				}
				
				function showJoinForm() {
					document.getElementById('create-form').style.display = 'none';
					document.getElementById('join-form').style.display = 'block';
					
					document.querySelector('.tab:nth-child(1)').classList.remove('active');
					document.querySelector('.tab:nth-child(2)').classList.add('active');
				}
				
				// Quick join function
				function joinRoom(roomId) {
					const playerId = prompt('請輸入你的玩家 ID:');
					if (playerId) {
						document.getElementById('join_player_id').value = playerId;
						document.getElementById('room_id').value = roomId;
						showJoinForm();
					}
				}
				
				// Initialize when page loads
				document.addEventListener('DOMContentLoaded', function() {
					window.RoomLobby.initialize();
				});
			JAVASCRIPT
		end
	end
end

# Create the application
Application = Lively::Application[RoomLobbyView]