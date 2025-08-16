#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"
require "lively/application"
require "live"

# Load dependencies
require_relative "lib/i18n"
require_relative "game/async_redis_room_manager"
require_relative "lib/cs16_game_state"
require_relative "lib/cs16_hud_components"

# Enhanced Progressive Lobby - Single Process, Multiple Views
# Uses JavaScript DOM manipulation to avoid server-side rerendering issues
class EnhancedLobbyProgressiveView < Live::View
	# Shared async Redis room manager
	@@room_manager = AsyncRedisRoomManager.new
	
	def initialize(...)
		super
		@player_id = nil
		@room_id = nil
		@custom_player_id = nil
		@room_update_task = nil
		@locale = :zh_TW
		
		# View state management - core of progressive approach
		@current_view = :lobby  # :lobby, :room, :game
		@room_data = nil
		@game_state = nil
		@game_running = false
		
		# Prevent infinite update loops
		@updating = false
	end
	
	def bind(page)
		super
		
		# Initialize player ID and locale
		initialize_player_id
		detect_locale
		
		# Initial render - renders ALL views but shows only lobby
		self.update!
		
		Console.info(self, "Starting enhanced lobby with progressive views...")
		
		# Start room updates
		start_room_list_updates
	end
	
	def initialize_player_id
		@player_id = SecureRandom.uuid
		Console.info(self, "Generated temporary player ID: #{@player_id}")
		
		Async do
			sleep 1.0
			initialize_player_from_cookie
		end
	end
	
	def initialize_player_from_cookie
		return unless @page
		
		self.script(<<~JAVASCRIPT)
			function getCookie(name) {
				const value = "; " + document.cookie;
				const parts = value.split("; " + name + "=");
				if (parts.length === 2) return parts.pop().split(";").shift();
				return null;
			}
			
			function initializePlayerIdWhenReady() {
				const playerIdElement = document.getElementById('current-player-id');
				if (!playerIdElement) {
					setTimeout(initializePlayerIdWhenReady, 100);
					return;
				}
				
				const existingPlayerId = getCookie('cs2d_player_id');
				console.log('Checking for existing player cookie:', existingPlayerId);
				
				if (existingPlayerId && existingPlayerId.trim() !== '') {
					playerIdElement.textContent = existingPlayerId;
					window.live.forwardEvent('#{@id}', {type: 'set_player_id_from_cookie'}, {player_id: existingPlayerId});
				} else {
					const expiry = new Date();
					expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000));
					document.cookie = 'cs2d_player_id=#{@player_id}; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
					playerIdElement.textContent = '#{@player_id}';
				}
			}
			
			initializePlayerIdWhenReady();
		JAVASCRIPT
	rescue => e
		Console.warn(self, "Failed to initialize player from cookie: #{e.message}")
	end
	
	def set_player_cookie(player_id)
		return unless @page
		
		self.script(<<~JAVASCRIPT)
			const expiry = new Date();
			expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000));
			document.cookie = 'cs2d_player_id=#{player_id}; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
			console.log('Updated player ID cookie: #{player_id}');
		JAVASCRIPT
	rescue => e
		Console.warn(self, "Failed to set player cookie: #{e.message}")
	end
	
	def detect_locale
		@locale = :zh_TW
		I18n.locale = @locale
	end
	
	def start_room_list_updates
		@room_update_task = Async do
			update_stats
			update_room_list
			
			loop do
				sleep 15
				break unless @page
				
				update_stats
				update_room_list
				
				# If we're in room view, also update room data
				if @current_view == :room && @room_id
					update_room_data
				end
			end
		rescue => e
			Console.error(self, "Room list update error: #{e.message}")
		end
	end
	
	def update_room_list
		return unless @page
		
		begin
			rooms = @@room_manager.get_room_list
			
			# Update lobby room list via DOM manipulation
			self.script(<<~JAVASCRIPT)
				const roomListElement = document.getElementById('room-list-content');
				if (roomListElement) {
					roomListElement.innerHTML = '#{escape_javascript(render_room_list_html(rooms))}';
					console.log('Updated room list via DOM manipulation');
				}
			JAVASCRIPT
			
		rescue => e
			Console.error(self, "Error updating room list: #{e.message}")
		end
	end
	
	def update_room_data
		return unless @page && @room_id
		
		begin
			@room_data = get_room_data(@room_id)
			
			if @room_data
				# Update room view via DOM manipulation
				self.script(<<~JAVASCRIPT)
					const roomContentElement = document.getElementById('room-view-content');
					if (roomContentElement && document.getElementById('room-view').style.display !== 'none') {
						roomContentElement.innerHTML = '#{escape_javascript(render_room_content_html)}';
						console.log('Updated room data via DOM manipulation');
					}
				JAVASCRIPT
				
				# Check if game has started
				if @room_data[:state] == "playing" && @current_view == :room
					switch_to_game
				end
			end
		rescue => e
			Console.error(self, "Error updating room data: #{e.message}")
		end
	end
	
	def update_stats
		# Update statistics display
		begin
			stats = @@room_manager.get_stats
			total_rooms = stats[:total_rooms] || 0
			total_players = stats[:total_players] || 0
			
			self.script(<<~JAVASCRIPT)
				const statsElement = document.getElementById('lobby-stats');
				if (statsElement) {
					statsElement.innerHTML = '總房間數: #{total_rooms} | 總玩家數: #{total_players}';
				}
			JAVASCRIPT
		rescue => e
			Console.error(self, "Error updating stats: #{e.message}")
		end
	end
	
	# Core view switching - JavaScript only, no server rerender
	def switch_to_view(view, data = {})
		@current_view = view.to_sym
		
		case @current_view
		when :room
			@room_id = data[:room_id]
			@room_data = get_room_data(@room_id) if @room_id
		when :game
			@game_running = true
			initialize_game_state if @room_id
		when :lobby
			@room_id = nil
			@room_data = nil
			@game_running = false
		end
		
		# Switch views via JavaScript DOM manipulation
		self.script(<<~JAVASCRIPT)
			// Hide all views
			document.getElementById('lobby-view').style.display = 'none';
			document.getElementById('room-view').style.display = 'none';
			document.getElementById('game-view').style.display = 'none';
			
			// Show target view
			document.getElementById('#{view}-view').style.display = 'block';
			
			// Update content if needed
			#{generate_view_update_js(view, data)}
			
			console.log('Switched to view: #{view}');
		JAVASCRIPT
	end
	
	def generate_view_update_js(view, data)
		case view.to_sym
		when :room
			if @room_data
				"document.getElementById('room-view-content').innerHTML = '#{escape_javascript(render_room_content_html)}';"
			else
				"document.getElementById('room-view-content').innerHTML = '<p>Loading room data...</p>';"
			end
		when :game
			"document.getElementById('game-canvas').style.display = 'block'; initializeGameCanvas();"
		else
			""
		end
	end
	
	def initialize_game_state
		@game_state = CS16GameState.new(@room_id, @player_id) if defined?(CS16GameState)
		Console.info(self, "Game state initialized for room #{@room_id}")
	end
	
	# Event handling
	def handle(event)
		Console.info(self, "Handling event: #{event[:type]}")
		
		case event[:type]
		when "set_player_id_from_cookie"
			handle_set_player_id_from_cookie(event[:detail])
			
		when "change_player_id"
			handle_change_player_id(event[:detail])
			
		when "change_language"
			handle_change_language(event[:detail])
			
		when "create_room"
			handle_create_room(event[:detail])
			
		when "join_room"
			handle_join_room(event[:detail])
			
		when "quick_join"
			handle_quick_join(event[:detail])
			
		when "start_game"
			handle_start_game(event[:detail])
		
		# Room view events
		when "leave_room"
			handle_leave_room
			
		when "toggle_ready"
			handle_toggle_ready
		
		# Game events
		when "exit_game"
			handle_exit_game
			
		when "player_move"
			handle_player_move(event[:detail]) if @game_running
			
		when "player_shoot"
			handle_player_shoot(event[:detail]) if @game_running
			
		else
			Console.warn(self, "Unknown event type: #{event[:type]}")
		end
	rescue => e
		Console.error(self, "Error handling event #{event[:type]}: #{e.message}")
		show_notification("處理請求時發生錯誤: #{e.message}", "error")
	end
	
	# Event handlers
	def handle_set_player_id_from_cookie(detail)
		@player_id = detail[:player_id] if detail[:player_id]
		Console.info(self, "Player ID updated from cookie: #{@player_id}")
	end
	
	def handle_change_player_id(detail)
		return unless detail[:player_id] && !detail[:player_id].empty?
		
		old_id = @player_id
		@player_id = detail[:player_id].strip
		
		set_player_cookie(@player_id)
		Console.info(self, "Player ID changed from #{old_id} to #{@player_id}")
		
		show_notification("玩家 ID 已更新為: #{@player_id}", "success")
	end
	
	def handle_change_language(detail)
		@locale = detail[:locale].to_sym
		I18n.locale = @locale
		
		# Update UI text via JavaScript
		self.script(<<~JAVASCRIPT)
			// Update all translatable text
			document.querySelectorAll('[data-i18n]').forEach(el => {
				const key = el.getAttribute('data-i18n');
				// In a real implementation, you'd load translations client-side
				console.log('Would translate key: ' + key);
			});
		JAVASCRIPT
		
		show_notification("語言已切換", "success")
	end
	
	def handle_create_room(detail)
		Console.info(self, "Creating room with details: #{detail}")
		
		Async do
			begin
				creator_id = (!detail[:player_id].nil? && !detail[:player_id].empty?) ? detail[:player_id] : @player_id
				settings = {
					name: detail[:room_name],
					max_players: detail[:max_players].to_i,
					map: detail[:map]
				}
				room_id = @@room_manager.create_room(creator_id, settings)
				
				if room_id
					show_notification("房間 '#{detail[:room_name]}' 創建成功！", "success")
					
					# Switch to room view
					switch_to_view(:room, room_id: room_id)
				else
					show_notification("創建房間失敗", "error")
				end
			rescue => e
				Console.error(self, "Error creating room: #{e.message}")
				show_notification("創建房間失敗: #{e.message}", "error")
			end
		end
	end
	
	def handle_join_room(detail)
		Console.info(self, "Joining room: #{detail[:room_id]}")
		
		Async do
			begin
				player_id = (!detail[:player_id].nil? && !detail[:player_id].empty?) ? detail[:player_id] : @player_id
				success = @@room_manager.join_room(player_id, detail[:room_id])
				
				if success
					show_notification("成功加入房間！", "success")
					switch_to_view(:room, room_id: detail[:room_id])
				else
					show_notification("加入房間失敗", "error")
				end
			rescue => e
				Console.error(self, "Error joining room: #{e.message}")
				show_notification("加入房間失敗: #{e.message}", "error")
			end
		end
	end
	
	def handle_quick_join(detail)
		# Find available room and join
		Async do
			rooms = @@room_manager.get_room_list
			available_room = rooms.find { |r| r[:player_count] < r[:max_players] && r[:state] == "waiting" }
			
			if available_room
				handle_join_room(room_id: available_room[:room_id], player_id: detail[:player_id])
			else
				show_notification("沒有可用的房間", "error")
			end
		end
	end
	
	def handle_start_game(detail)
		return unless @room_data && @player_id == @room_data[:creator_id]
		
		Async do
			begin
				result = @@room_manager.start_game(@player_id, @room_id)
				if result[:success]
					show_notification("遊戲開始！", "success")
					switch_to_view(:game)
				else
					show_notification("開始遊戲失敗: #{result[:error]}", "error")
				end
			rescue => e
				Console.error(self, "Error starting game: #{e.message}")
				show_notification("開始遊戲失敗: #{e.message}", "error")
			end
		end
	end
	
	def handle_leave_room
		return unless @room_id
		
		Async do
			@@room_manager.leave_room(@room_id, @player_id)
			switch_to_view(:lobby)
			show_notification("已離開房間", "success")
		end
	end
	
	def handle_toggle_ready
		# Toggle player ready status in room
		Console.info(self, "Toggle ready status for player #{@player_id}")
	end
	
	def handle_exit_game
		@game_running = false
		switch_to_view(:room, room_id: @room_id)
		show_notification("已退出遊戲", "success")
	end
	
	def handle_player_move(detail)
		# Handle player movement in game
		return unless @game_state
		
		@game_state.update_player_position(@player_id, detail[:x], detail[:y])
	end
	
	def handle_player_shoot(detail)
		# Handle player shooting in game
		return unless @game_state
		
		@game_state.player_shoot(@player_id, detail[:angle], detail[:weapon])
	end
	
	def show_notification(message, type = "info")
		color = case type
		when "success" then "#4CAF50"
		when "error" then "#f44336" 
		when "warning" then "#ff9800"
		else "#2196F3"
		end
		
		self.script(<<~JAVASCRIPT)
			const notification = document.createElement('div');
			notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #{color}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: Arial, sans-serif;';
			notification.innerHTML = '#{escape_javascript(message)}';
			
			document.body.appendChild(notification);
			
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 5000);
			
			console.log('Notification (#{type}):', '#{escape_javascript(message)}');
		JAVASCRIPT
	end
	
	# Render method - renders ALL views but shows only current one
	def render(builder)
		builder.tag(:html, lang: I18n.locale) do
			render_head(builder)
			builder.tag(:body, style: "margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; overflow-x: hidden;") do
				
				# Render all three views - visibility controlled by JavaScript
				render_lobby_view(builder)
				render_room_view(builder)
				render_game_view(builder)
				
				# Global JavaScript for view management
				render_global_javascript(builder)
			end
		end
	end
	
	def render_head(builder)
		builder.tag(:head) do
			builder.tag(:meta, charset: "UTF-8")
			builder.tag(:meta, name: "viewport", content: "width=device-width, initial-scale=1.0")
			builder.tag(:title) do
				builder.text(I18n.t('lobby.title'))
			end
			
			# Global styles
			builder.tag(:style) do
				builder.raw(<<~CSS)
					* { box-sizing: border-box; }
					
					.view { display: none; min-height: 100vh; }
					.view.active { display: block; }
					
					.container {
						max-width: 1200px;
						margin: 0 auto;
						padding: 20px;
					}
					
					.card {
						background: rgba(255, 255, 255, 0.95);
						border-radius: 15px;
						padding: 30px;
						margin-bottom: 20px;
						box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
						backdrop-filter: blur(10px);
						border: 1px solid rgba(255, 255, 255, 0.2);
					}
					
					.btn {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						padding: 12px 24px;
						border-radius: 8px;
						cursor: pointer;
						font-size: 16px;
						font-weight: 600;
						transition: all 0.3s ease;
						box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
					}
					
					.btn:hover {
						transform: translateY(-2px);
						box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
					}
					
					.btn:disabled {
						background: #ccc;
						cursor: not-allowed;
						transform: none;
					}
					
					.btn-success {
						background: linear-gradient(135deg, #00b09b, #96c93d);
					}
					
					.btn-danger {
						background: linear-gradient(135deg, #f85032, #e73827);
					}
					
					.form-group {
						margin-bottom: 20px;
					}
					
					.form-group label {
						display: block;
						margin-bottom: 8px;
						font-weight: 600;
						color: #333;
					}
					
					.form-control {
						width: 100%;
						padding: 12px;
						border: 2px solid #e0e0e0;
						border-radius: 8px;
						font-size: 16px;
						transition: border-color 0.3s ease;
					}
					
					.form-control:focus {
						outline: none;
						border-color: #667eea;
						box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
					}
					
					.room-card {
						background: rgba(255, 255, 255, 0.9);
						border-radius: 10px;
						padding: 20px;
						margin-bottom: 15px;
						border: 1px solid rgba(255, 255, 255, 0.3);
						transition: all 0.3s ease;
					}
					
					.room-card:hover {
						transform: translateY(-2px);
						box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
					}
					
					#game-canvas {
						border: 3px solid #333;
						border-radius: 10px;
						display: block;
						margin: 20px auto;
						background: #000;
					}
					
					.stats-bar {
						background: rgba(255, 255, 255, 0.2);
						padding: 15px;
						border-radius: 10px;
						margin-bottom: 20px;
						color: white;
						font-weight: 600;
						text-align: center;
					}
				CSS
			end
		end
	end
	
	def render_lobby_view(builder)
		builder.tag(:div, id: "lobby-view", class: "view active") do
			builder.tag(:div, class: "container") do
				# Header
				builder.tag(:div, class: "card") do
					builder.tag(:h1, style: "margin: 0 0 20px 0; color: #333; text-align: center; font-size: 2.5em;") do
						builder.text("🎮 #{I18n.t('lobby.title')}")
					end
					
					# Stats bar
					builder.tag(:div, id: "lobby-stats", class: "stats-bar") do
						builder.text("載入中...")
					end
					
					# Player info
					builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 10px;") do
						builder.tag(:div, style: "display: flex; align-items: center; gap: 15px;") do
							builder.tag(:strong, style: "color: #667eea;") do
								builder.text("#{I18n.t('lobby.player_id')}: ")
							end
							builder.tag(:span, id: "current-player-id", style: "font-family: monospace; background: white; padding: 5px 10px; border-radius: 5px; border: 1px solid #ddd;") do
								builder.text("Loading...")
							end
							builder.tag(:button, class: "btn", onclick: "showPlayerModal()", style: "padding: 6px 12px; font-size: 14px;") do
								builder.text(I18n.t('lobby.edit'))
							end
						end
						
						# Language selector
						render_language_selector(builder)
					end
				end
				
				# Create room form
				render_create_room_form(builder)
				
				# Room list
				render_room_list_section(builder)
				
				# Player ID modal
				render_player_modal(builder)
			end
		end
	end
	
	def render_room_view(builder)
		builder.tag(:div, id: "room-view", class: "view", style: "display: none;") do
			builder.tag(:div, class: "container") do
				builder.tag(:div, class: "card") do
					builder.tag(:h1, style: "margin: 0 0 20px 0; color: #333;") do
						builder.text("🏠 房間等待室")
					end
					
					builder.tag(:div, id: "room-view-content") do
						builder.tag(:p) do
							builder.text("載入房間資訊中...")
						end
					end
					
					# Room controls
					builder.tag(:div, style: "margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; display: flex; gap: 15px;") do
						builder.tag(:button, class: "btn btn-success", onclick: "startGame()", id: "start-game-btn", style: "display: none;") do
							builder.text("開始遊戲")
						end
						
						builder.tag(:button, class: "btn", onclick: "toggleReady()") do
							builder.text("準備/取消準備")
						end
						
						builder.tag(:button, class: "btn btn-danger", onclick: "leaveRoom()") do
							builder.text("離開房間")
						end
					end
				end
			end
		end
	end
	
	def render_game_view(builder)
		builder.tag(:div, id: "game-view", class: "view", style: "display: none;") do
			builder.tag(:div, class: "container") do
				builder.tag(:div, class: "card", style: "text-align: center;") do
					builder.tag(:h1, style: "margin: 0 0 20px 0; color: #333;") do
						builder.text("🎮 CS2D 遊戲")
					end
					
					# Game canvas
					builder.tag(:canvas, id: "game-canvas", width: 960, height: 540) do
					end
					
					# Game controls
					builder.tag(:div, style: "margin-top: 20px; display: flex; gap: 15px; justify-content: center;") do
						builder.tag(:button, class: "btn btn-danger", onclick: "exitGame()") do
							builder.text("退出遊戲")
						end
					end
					
					# Game instructions
					builder.tag(:div, style: "margin-top: 20px; text-align: left; color: #666;") do
						builder.tag(:h3) do
							builder.text("遊戲操作說明:")
						end
						builder.tag(:ul) do
							builder.tag(:li) do
								builder.text("WASD - 移動")
							end
							builder.tag(:li) do
								builder.text("滑鼠 - 瞄準和射擊")
							end
							builder.tag(:li) do
								builder.text("R - 重新裝彈")
							end
							builder.tag(:li) do
								builder.text("Space - 跳躍")
							end
						end
					end
				end
			end
		end
	end
	
	def render_language_selector(builder)
		builder.tag(:select, onchange: "changeLanguage(this.value)", 
			style: "padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; font-size: 14px;") do
			[[:en, "English"], [:zh_TW, "繁體中文"]].each do |locale, name|
				if locale == @locale
					builder.tag(:option, value: locale, selected: true) do
						builder.text(name)
					end
				else
					builder.tag(:option, value: locale) do
						builder.text(name)
					end
				end
			end
		end
	end
	
	def render_create_room_form(builder)
		builder.tag(:div, class: "card") do
			builder.tag(:h2, style: "margin-top: 0; color: #333;") do
				builder.text("#{I18n.t('lobby.create_room')} 🏗️")
			end
			
			builder.tag(:form, onsubmit: "event.preventDefault(); createRoom(); return false;") do
				builder.tag(:div, style: "display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;") do
					# Room name
					builder.tag(:div, class: "form-group") do
						builder.tag(:label) do
							builder.text(I18n.t('lobby.room_name'))
						end
						builder.tag(:input, type: "text", id: "room_name", class: "form-control", required: true, placeholder: "輸入房間名稱...")
					end
					
					# Max players
					builder.tag(:div, class: "form-group") do
						builder.tag(:label) do
							builder.text(I18n.t('lobby.max_players'))
						end
						builder.tag(:select, id: "max_players", class: "form-control") do
							[2, 4, 6, 8, 10].each do |num|
								builder.tag(:option, value: num) do
									builder.text("#{num} 人")
								end
							end
						end
					end
				end
				
				builder.tag(:div, style: "display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;") do
					# Map selection
					builder.tag(:div, class: "form-group") do
						builder.tag(:label) do
							builder.text("地圖")
						end
						builder.tag(:select, id: "map", class: "form-control") do
							["de_dust2", "de_inferno", "de_mirage", "de_cache"].each do |map|
								builder.tag(:option, value: map) do
									builder.text(map)
								end
							end
						end
					end
					
					# Hidden player ID field
					builder.tag(:input, type: "hidden", id: "player_id")
				end
				
				builder.tag(:button, type: "submit", class: "btn", style: "width: 200px;") do
					builder.text("🚀 #{I18n.t('lobby.create_room')}")
				end
			end
		end
	end
	
	def render_room_list_section(builder)
		builder.tag(:div, class: "card") do
			builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;") do
				builder.tag(:h2, style: "margin: 0; color: #333;") do
					builder.text("#{I18n.t('lobby.available_rooms')} 🏠")
				end
				
				builder.tag(:div, style: "display: flex; gap: 10px;") do
					builder.tag(:button, class: "btn", onclick: "refreshRooms()") do
						builder.text("🔄 #{I18n.t('lobby.refresh')}")
					end
					
					builder.tag(:button, class: "btn btn-success", onclick: "quickJoin()") do
						builder.text("⚡ #{I18n.t('lobby.quick_join')}")
					end
				end
			end
			
			builder.tag(:div, id: "room-list-content") do
				builder.tag(:p, style: "text-align: center; color: #666;") do
					builder.text("載入房間列表中...")
				end
			end
		end
	end
	
	def render_player_modal(builder)
		builder.tag(:div, id: "player-modal", 
			style: "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; backdrop-filter: blur(5px);") do
			builder.tag(:div, style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 40px; border-radius: 15px; min-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);") do
				builder.tag(:h2, style: "margin-top: 0; color: #333; text-align: center;") do
					builder.text("✏️ #{I18n.t('lobby.change_player_id')}")
				end
				
				builder.tag(:div, class: "form-group") do
					builder.tag(:label) do
						builder.text("新的玩家 ID:")
					end
					builder.tag(:input, type: "text", id: "new-player-id", class: "form-control", placeholder: "輸入新的玩家 ID...")
				end
				
				builder.tag(:div, style: "display: flex; gap: 15px; justify-content: center; margin-top: 30px;") do
					builder.tag(:button, class: "btn btn-success", onclick: "savePlayerId()") do
						builder.text("💾 #{I18n.t('lobby.save')}")
					end
					builder.tag(:button, class: "btn", onclick: "hidePlayerModal()") do
						builder.text("❌ #{I18n.t('lobby.cancel')}")
					end
				end
			end
		end
	end
	
	def render_global_javascript(builder)
		builder.tag(:script) do
			builder.raw(<<~JS)
				// Global JavaScript for enhanced progressive lobby
				
				// View management
				function switchToView(viewName, data = {}) {
					console.log('Switching to view:', viewName, data);
					
					// Hide all views
					document.querySelectorAll('.view').forEach(view => {
						view.style.display = 'none';
						view.classList.remove('active');
					});
					
					// Show target view
					const targetView = document.getElementById(viewName + '-view');
					if (targetView) {
						targetView.style.display = 'block';
						targetView.classList.add('active');
					}
				}
				
				// Player ID management
				function showPlayerModal() {
					const modal = document.getElementById('player-modal');
					const input = document.getElementById('new-player-id');
					const currentId = document.getElementById('current-player-id').textContent;
					
					input.value = currentId;
					modal.style.display = 'block';
				}
				
				function hidePlayerModal() {
					document.getElementById('player-modal').style.display = 'none';
				}
				
				function savePlayerId() {
					const newId = document.getElementById('new-player-id').value.trim();
					if (newId) {
						window.live.forwardEvent('#{@id}', {type: 'change_player_id'}, {player_id: newId});
						hidePlayerModal();
						document.getElementById('current-player-id').textContent = newId;
					}
				}
				
				// Language management
				function changeLanguage(locale) {
					window.live.forwardEvent('#{@id}', {type: 'change_language'}, {locale: locale});
				}
				
				// Room creation
				function createRoom() {
					const roomName = document.getElementById('room_name').value.trim();
					const maxPlayers = document.getElementById('max_players').value;
					const map = document.getElementById('map').value;
					const playerId = document.getElementById('current-player-id').textContent.trim();
					
					if (!roomName) {
						alert('請輸入房間名稱！');
						return;
					}
					
					const detail = {
						room_name: roomName,
						max_players: maxPlayers,
						map: map,
						player_id: playerId
					};
					
					console.log('Creating room with details:', detail);
					window.live.forwardEvent('#{@id}', {type: 'create_room'}, detail);
				}
				
				// Room joining
				function joinRoom(roomId) {
					const playerId = document.getElementById('current-player-id').textContent.trim();
					const detail = {
						room_id: roomId,
						player_id: playerId
					};
					
					console.log('Joining room:', detail);
					window.live.forwardEvent('#{@id}', {type: 'join_room'}, detail);
				}
				
				function quickJoin() {
					const playerId = document.getElementById('current-player-id').textContent.trim();
					window.live.forwardEvent('#{@id}', {type: 'quick_join'}, {player_id: playerId});
				}
				
				// Room management
				function leaveRoom() {
					if (confirm('確定要離開房間嗎？')) {
						window.live.forwardEvent('#{@id}', {type: 'leave_room'}, {});
					}
				}
				
				function startGame() {
					if (confirm('確定要開始遊戲嗎？')) {
						window.live.forwardEvent('#{@id}', {type: 'start_game'}, {});
					}
				}
				
				function toggleReady() {
					window.live.forwardEvent('#{@id}', {type: 'toggle_ready'}, {});
				}
				
				// Game management
				function exitGame() {
					if (confirm('確定要退出遊戲嗎？')) {
						window.live.forwardEvent('#{@id}', {type: 'exit_game'}, {});
					}
				}
				
				// Game canvas initialization
				function initializeGameCanvas() {
					const canvas = document.getElementById('game-canvas');
					if (!canvas) return;
					
					const ctx = canvas.getContext('2d');
					
					// Simple game loop demonstration
					function gameLoop() {
						// Clear canvas
						ctx.fillStyle = '#2a2a2a';
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						// Draw game elements
						ctx.fillStyle = '#4CAF50';
						ctx.fillRect(50, 50, 100, 100);
						
						// Draw player
						ctx.fillStyle = '#2196F3';
						ctx.fillRect(canvas.width/2 - 15, canvas.height/2 - 15, 30, 30);
						
						// Draw instructions
						ctx.fillStyle = 'white';
						ctx.font = '16px Arial';
						ctx.textAlign = 'center';
						ctx.fillText('遊戲畫面 - 使用 WASD 移動', canvas.width/2, 50);
						ctx.fillText('這是遊戲演示，實際遊戲邏輯需要進一步開發', canvas.width/2, canvas.height - 30);
						
						requestAnimationFrame(gameLoop);
					}
					
					// Start game loop
					gameLoop();
					
					// Add keyboard controls
					document.addEventListener('keydown', handleKeyDown);
					canvas.addEventListener('click', handleCanvasClick);
				}
				
				function handleKeyDown(event) {
					// Handle WASD movement
					switch(event.key.toLowerCase()) {
						case 'w':
							console.log('Move up');
							window.live.forwardEvent('#{@id}', {type: 'player_move'}, {direction: 'up'});
							break;
						case 's':
							console.log('Move down');
							window.live.forwardEvent('#{@id}', {type: 'player_move'}, {direction: 'down'});
							break;
						case 'a':
							console.log('Move left');
							window.live.forwardEvent('#{@id}', {type: 'player_move'}, {direction: 'left'});
							break;
						case 'd':
							console.log('Move right');
							window.live.forwardEvent('#{@id}', {type: 'player_move'}, {direction: 'right'});
							break;
					}
				}
				
				function handleCanvasClick(event) {
					const canvas = event.target;
					const rect = canvas.getBoundingClientRect();
					const x = event.clientX - rect.left;
					const y = event.clientY - rect.top;
					
					console.log('Click at:', x, y);
					window.live.forwardEvent('#{@id}', {type: 'player_shoot'}, {x: x, y: y});
				}
				
				// Utility functions
				function refreshRooms() {
					console.log('Refreshing rooms...');
					// Room list will be updated automatically by the periodic update
				}
				
				// Modal click-outside-to-close
				document.addEventListener('click', function(event) {
					const modal = document.getElementById('player-modal');
					if (event.target === modal) {
						hidePlayerModal();
					}
				});
				
				// ESC key to close modals
				document.addEventListener('keydown', function(event) {
					if (event.key === 'Escape') {
						hidePlayerModal();
					}
				});
				
				console.log('Enhanced Progressive Lobby JavaScript initialized');
			JS
		end
	end
	
	# HTML generation for DOM updates
	def render_room_list_html(rooms)
		if rooms.empty?
			"<p style='color: #666; text-align: center; font-style: italic;'>#{I18n.t('lobby.join.no_rooms')}</p>"
		else
			rooms.map do |room|
				<<~HTML
					<div class="room-card">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<h3 style="margin: 0 0 10px 0; color: #333;">#{escape_html(room[:room_name])}</h3>
								<p style="margin: 5px 0; color: #666; line-height: 1.4;">
									🆔 #{room[:room_id]}<br>
									👥 #{room[:player_count]}/#{room[:max_players]} 玩家<br>
									🗺️ #{room[:map]}<br>
									📊 #{room[:state] == 'waiting' ? '等待中' : '遊戲中'}
								</p>
							</div>
							<div>
								#{if room[:state] == 'waiting' && room[:player_count] < room[:max_players]
									"<button class='btn btn-success' onclick='joinRoom(\"#{room[:room_id]}\")'>加入房間</button>"
								elsif room[:player_count] >= room[:max_players]
									"<span style='color: #f44336; font-weight: bold;'>房間已滿</span>"
								else
									"<span style='color: #ff9800; font-weight: bold;'>遊戲中</span>"
								end}
							</div>
						</div>
					</div>
				HTML
			end.join
		end
	end
	
	def render_room_content_html
		return "<p>載入房間資訊中...</p>" unless @room_data
		
		players_html = (@room_data[:players] || []).map do |player|
			"<li style='padding: 5px 0; color: #333;'>#{escape_html(player[:name] || player[:id])} #{player[:id] == @room_data[:creator_id] ? '👑' : ''}</li>"
		end.join
		
		<<~HTML
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
				<div>
					<h3 style="color: #333; margin-bottom: 15px;">🏠 房間資訊</h3>
					<p><strong>房間名稱:</strong> #{escape_html(@room_data[:room_name])}</p>
					<p><strong>地圖:</strong> #{@room_data[:map]}</p>
					<p><strong>玩家數量:</strong> #{@room_data[:player_count]}/#{@room_data[:max_players]}</p>
					<p><strong>狀態:</strong> #{@room_data[:state] == 'waiting' ? '等待中' : '遊戲中'}</p>
				</div>
				<div>
					<h3 style="color: #333; margin-bottom: 15px;">👥 玩家列表</h3>
					<ul style="list-style: none; padding: 0;">
						#{players_html}
					</ul>
				</div>
			</div>
			
			<script>
				// Show start game button only for room creator
				const startBtn = document.getElementById('start-game-btn');
				const currentPlayerId = document.getElementById('current-player-id').textContent.trim();
				if (startBtn && currentPlayerId === '#{@room_data[:creator_id]}') {
					startBtn.style.display = 'inline-block';
				}
			</script>
		HTML
	end
	
	# Helper method to get room data as hash (compatible with our view code)
	def get_room_data(room_id)
		return nil unless room_id
		
		@@room_manager.class.class_eval do
			def get_room_data_as_hash(room_id)
				with_redis do |redis|
					room_data_json = redis.get("room:#{room_id}:data")
					return nil unless room_data_json
					
					room_data = JSON.parse(room_data_json)
					player_count = redis.hlen("room:#{room_id}:players")
					
					# Get players list
					player_keys = redis.hkeys("room:#{room_id}:players")
					players = player_keys.map { |player_id| { id: player_id, name: player_id } }
					
					{
						room_id: room_id,
						room_name: room_data["name"],
						name: room_data["name"], # Alias for compatibility
						player_count: player_count,
						current_players: player_count,
						max_players: room_data["max_players"],
						map: room_data["map"],
						game_mode: room_data["game_mode"],
						creator_id: room_data["creator_id"],
						state: room_data["state"],
						players: players
					}
				end
			end
		end
		
		@@room_manager.get_room_data_as_hash(room_id)
	end
	
	# Utility methods
	def escape_javascript(str)
		str.to_s.gsub('\\', '\\\\').gsub("'", "\\'").gsub("\n", '\\n').gsub("\r", '\\r')
	end
	
	def escape_html(str)
		str.to_s.gsub('&', '&amp;').gsub('<', '&lt;').gsub('>', '&gt;').gsub('"', '&quot;').gsub("'", '&#39;')
	end
	
	def switch_to_game
		switch_to_view(:game)
	end
end

# Application entry point
Application = Lively::Application[EnhancedLobbyProgressiveView]