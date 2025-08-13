#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"
require "lively/application"
require "live"

# Load i18n module and Redis room manager
require_relative "lib/i18n"
require_relative "game/async_redis_room_manager"

# Multiplayer components commented out for now
# require_relative "lib/cs16_game_state"
# require_relative "lib/cs16_player_manager" 
# require_relative "lib/cs16_hud_components"

# Redis lobby with full i18n support
class AsyncRedisLobbyI18nView < Live::View
	# Shared async Redis room manager
	@@room_manager = AsyncRedisRoomManager.new
	
	def initialize(...)
		super
		@player_id = nil # Will be set from cookie or generated in bind
		@room_id = nil
		@custom_player_id = nil
		@room_update_task = nil
		@locale = :zh_TW # Default locale
	end
	
	def bind(page)
		super
		
		# Initialize player ID from cookie or generate new one
		initialize_player_id
		
		# Set locale from browser or default
		detect_locale
		
		# Initial render
		self.update!
		
		Console.info(self, "Starting room list updates...")
		
		# Start periodic room list updates first
		start_room_list_updates
		
		Console.info(self, "Room list updates started")
	end
	
	def initialize_player_id
		# Generate temporary player ID, will be updated from client-side cookie if available
		@player_id = SecureRandom.uuid
		Console.info(self, "Generated temporary player ID: #{@player_id}")
		
		# Inject JavaScript to check for existing cookie and update if found
		Async do
			sleep 1.0 # Increased wait time to ensure all DOM elements are ready
			initialize_player_from_cookie
		end
	end
	
	def get_player_cookie
		# Use JavaScript to read cookies since we're in a Live view context
		# For now, we'll skip cookie reading on server side and rely on client-side persistence
		nil
	rescue => e
		Console.warn(self, "Failed to read player cookie: #{e.message}")
		nil
	end
	
	def initialize_player_from_cookie
		return unless @page
		
		self.script(<<~JAVASCRIPT)
			// Function to get cookie value
			function getCookie(name) {
				const value = "; " + document.cookie;
				const parts = value.split("; " + name + "=");
				if (parts.length === 2) return parts.pop().split(";").shift();
				return null;
			}
			
			// Initialize player ID when DOM is ready
			function initializePlayerIdWhenReady() {
				const playerIdElement = document.getElementById('current-player-id');
				if (!playerIdElement) {
					console.log('Player ID element not found, retrying in 100ms...');
					setTimeout(initializePlayerIdWhenReady, 100);
					return;
				}
				
				// Check for existing player ID cookie
				const existingPlayerId = getCookie('cs2d_player_id');
				console.log('Checking for existing player cookie:', existingPlayerId);
				
				if (existingPlayerId && existingPlayerId.trim() !== '') {
					// Update UI immediately
					playerIdElement.textContent = existingPlayerId;
					
					// Send existing player ID to server
					console.log('Found existing player ID, sending to server:', existingPlayerId);
					window.live.forwardEvent('#{@id}', {type: 'set_player_id_from_cookie'}, {player_id: existingPlayerId});
				} else {
					// Set new cookie with current player ID
					const expiry = new Date();
					expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
					document.cookie = 'cs2d_player_id=#{@player_id}; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
					console.log('Set new player ID cookie: #{@player_id}');
					
					// Update UI with server-generated ID
					playerIdElement.textContent = '#{@player_id}';
				}
			}
			
			// Start initialization
			initializePlayerIdWhenReady();
		JAVASCRIPT
	rescue => e
		Console.warn(self, "Failed to initialize player from cookie: #{e.message}")
	end
	
	def set_player_cookie(player_id)
		return unless @page
		
		# Set cookie via JavaScript since we're in a Live view context
		self.script(<<~JAVASCRIPT)
			const expiry = new Date();
			expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
			document.cookie = 'cs2d_player_id=#{player_id}; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
			console.log('Updated player ID cookie: #{player_id}');
		JAVASCRIPT
	rescue => e
		Console.warn(self, "Failed to set player cookie: #{e.message}")
	end
	
	def detect_locale
		# In a real app, you might detect from Accept-Language header
		# For now, we'll use Traditional Chinese as default
		@locale = :zh_TW
		I18n.locale = @locale
	end
	
	def start_room_list_updates
		@room_update_task = Async do
			# Initial update immediately
			update_stats
			update_room_list
			
			loop do
				sleep 15 # Update every 15 seconds to avoid interrupting form input
				break unless @page # Stop if page is closed
				
				update_stats
				update_room_list
			end
		rescue => e
			Console.error(self, "Room list update error: #{e.message}")
		end
	end
	
	def update_room_list
		return unless @page
		
		begin
			Console.info(self, "Fetching room list from Redis...")
			rooms = @@room_manager.get_room_list
			Console.info(self, "Fetched #{rooms.length} rooms from Redis")
			
			if rooms.any?
				Console.info(self, "Room details: #{rooms.map{|r| "#{r[:room_id]}(#{r[:player_count]}/#{r[:max_players]})"}.join(', ')}")
			else
				Console.warn(self, "No rooms found in Redis")
			end
			
			# Update only the room list section to preserve form inputs
			self.replace("#room-list-content") do |builder|
				render_room_list(builder, rooms)
			end
			
			Console.info(self, "Successfully updated room list UI")
			
		rescue => e
			Console.error(self, "Error updating room list: #{e.message}")
			Console.error(self, e.backtrace.join("\n"))
			
			# Show error in UI
			self.replace("#room-list") do |builder|
				builder.tag(:p, style: "color: red; font-weight: bold;") do
					builder.text("房間列表更新失敗: #{e.message}")
				end
				builder.tag(:p, style: "color: #666; font-size: 14px;") do
					builder.text("請檢查 Redis 連接狀態")
				end
			end
		end
	end
	
	def update_stats
		return unless @page
		
		stats = @@room_manager.get_stats
		
		# Update the stats bar HTML
		self.replace("#stats-bar") do |builder|
			builder.tag(:span) { builder.text("#{I18n.t('lobby.stats.online_rooms')}: #{stats[:total_rooms]} | ") }
			builder.tag(:span) { builder.text("#{I18n.t('lobby.stats.online_players')}: #{stats[:total_players]}") }
		end
	rescue => e
		Console.error(self, "Error updating stats: #{e.message}")
	end
	
	# Handle events from the client using Live framework pattern
	def handle(event)
		Console.info(self, "Handling event: #{event[:type]}")
		
		case event[:type]
		when "create_room"
			handle_create_room(event[:detail])
		when "join_room"
			handle_join_room(event[:detail])
		when "quick_join"
			handle_quick_join(event[:detail])
		when "start_game"
			handle_start_game(event[:detail])
		when "refresh_rooms", "manual_refresh"
			Console.info(self, "Manual refresh requested")
			update_room_list
			update_stats
			show_alert("房間列表已刷新！")
		when "change_language"
			handle_language_change(event[:detail])
		when "set_player_id_from_cookie"
			handle_set_player_id_from_cookie(event[:detail])
		end
	rescue => e
		Console.error(self, "Error handling event: #{e.message}")
		show_alert(I18n.t("lobby.messages.error", message: e.message))
	end
	
	def handle_language_change(detail)
		new_locale = detail[:locale]&.to_sym
		if I18n.available_locales.include?(new_locale)
			@locale = new_locale
			I18n.locale = @locale
			
			# Re-render the entire view with new language
			self.update!
			
			# Restart room updates to use new language
			update_stats
			update_room_list
		end
	end
	
	
	def handle_set_player_id_from_cookie(detail)
		cookie_player_id = detail[:player_id]&.strip
		
		if cookie_player_id && !cookie_player_id.empty?
			old_player_id = @player_id
			@player_id = cookie_player_id
			
			# Update the UI
			self.replace("#current-player-id") do |builder|
				builder.text(@player_id)
			end
			
			Console.info(self, "Updated player ID from cookie: #{old_player_id} -> #{@player_id}")
		end
	rescue => e
		Console.error(self, "Error setting player ID from cookie: #{e.message}")
	end
	
	def handle_create_room(detail)
		Console.info(self, "handle_create_room - received detail: #{detail.inspect}")
		Console.info(self, "Current @player_id: #{@player_id}")
		
		@custom_player_id = detail[:player_id]&.strip
		room_name = detail[:room_name]&.strip
		max_players = detail[:max_players]&.to_i || 10
		map = detail[:map] || "de_dust2"
		
		Console.info(self, "custom_player_id from detail: #{@custom_player_id.inspect}")
		
		# Validate
		if room_name.nil? || room_name.empty?
			show_alert(I18n.t("lobby.messages.room_name_required"))
			return
		end
		
		# Use custom player ID if provided, otherwise use the existing @player_id
		if !@custom_player_id.nil? && !@custom_player_id.empty?
			Console.info(self, "Updating @player_id from #{@player_id} to #{@custom_player_id}")
			@player_id = @custom_player_id
		end
		
		# Log the player ID being used
		Console.info(self, "Creating room with player_id: #{@player_id}")
		
		settings = {
			name: room_name,
			max_players: [2, [max_players, 10].min].max, # Clamp between 2-10
			map: map,
			game_mode: "competitive",
			creator_id: @player_id,
			created_at: Time.now.to_i
		}
		
		@room_id = @@room_manager.create_room(@player_id, settings)
		
		show_alert("房間創建成功！房間 ID: #{@room_id}\n您的玩家 ID: #{@player_id}")
		
		# 跳轉到房間等待頁面（創建者自動進入房間）
		Console.info(self, "Redirecting room creator to room waiting page: room_id=#{@room_id}, player_id=#{@player_id}")
		redirect_to_room(@room_id, @player_id)
		
	rescue => e
		Console.error(self, "Error creating room: #{e.message}")
		show_alert(I18n.t("lobby.messages.room_create_failed", error: e.message))
	end
	
	def handle_join_room(detail)
		@custom_player_id = detail[:player_id]&.strip
		@room_id = detail[:room_id]
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		if @@room_manager.join_room(@player_id, @room_id)
			show_alert(I18n.t("lobby.messages.room_joined", room_id: @room_id))
			
			# 跳轉到房間等待頁面
			Console.info(self, "Redirecting to room waiting page: room_id=#{@room_id}, player_id=#{@player_id}")
			redirect_to_room(@room_id, @player_id)
		else
			show_alert(I18n.t("lobby.messages.room_join_failed"))
		end
		
	rescue => e
		Console.error(self, "Error joining room: #{e.message}")
		show_alert(I18n.t("lobby.messages.error", message: e.message))
	end
	
	def handle_quick_join(detail)
		@custom_player_id = detail[:player_id]&.strip
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		# Find or create a room
		@room_id = @@room_manager.find_or_create_room(@player_id)
		
		if @room_id
			show_alert(I18n.t("lobby.messages.quick_join_success", room_id: @room_id))
			# 立即更新並延遲再次更新
			update_room_list
			Async do
				sleep 0.5
				update_room_list
				update_stats
			end
		else
			show_alert(I18n.t("lobby.messages.quick_join_failed"))
		end
		
	rescue => e
		Console.error(self, "Error in quick join: #{e.message}")
		show_alert(I18n.t("lobby.messages.error", message: e.message))
	end
	
	def handle_start_game(detail)
		@custom_player_id = detail[:player_id]&.strip
		room_id = detail[:room_id]
		
		# Use custom player ID if provided, otherwise use the existing @player_id
		if !@custom_player_id.nil? && !@custom_player_id.empty?
			@player_id = @custom_player_id
		end
		
		# Log the player ID being used
		Console.info(self, "Starting game with player_id: #{@player_id} for room: #{room_id}")
		
		result = @@room_manager.start_game(@player_id, room_id)
		
		if result[:success]
			show_alert("遊戲開始成功！房間 ID: #{room_id}。多人遊戲功能開發中，敬請期待！")
			# 立即更新並延遲再次更新
			update_room_list
			Async do
				sleep 0.5
				update_room_list
				update_stats
			end
		else
			Console.warn(self, "Failed to start game: #{result[:error]}")
			show_alert("遊戲開始失敗: #{result[:error]}\n您的玩家 ID: #{@player_id}")
		end
		
	rescue => e
		Console.error(self, "Error starting game: #{e.message}")
		show_alert(I18n.t("lobby.messages.error", message: e.message))
	end
	
	def redirect_to_room(room_id, player_id)
		# Use JavaScript to redirect to the room waiting page on port 9293
		self.script(<<~JAVASCRIPT)
			console.log('Redirecting to room waiting page...', {room_id: '#{room_id}', player_id: '#{player_id}'});
			
			// Small delay to let the notification show
			setTimeout(() => {
				// Redirect to static server on port 9293 for room waiting page
				const url = 'http://localhost:9293/room.html?room_id=#{room_id}&player_id=#{player_id}';
				console.log('Navigating to:', url);
				window.location.href = url;
			}, 2000); // 2 second delay to show success message
		JAVASCRIPT
	end
	
	def show_alert(message)
		# Create a more user-friendly notification instead of alert()
		self.script(<<~JAVASCRIPT)
			// Create notification element
			const notification = document.createElement('div');
			notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; z-index: 10000; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: Arial, sans-serif;';
			notification.innerHTML = '#{message.gsub("'", "\\'")}';
			
			// Add to page
			document.body.appendChild(notification);
			
			// Auto-remove after 5 seconds
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 5000);
			
			// Also log to console for debugging
			console.log('Notification:', '#{message.gsub("'", "\\'")}');
		JAVASCRIPT
	end
	
	# JavaScript event forwarding functions
	def forward_create_room
		<<~JAVASCRIPT
			(function() {
				// Add small delay to avoid DOM update conflicts
				setTimeout(() => {
					// Use ID-based selectors which are more reliable
					const playerIdInput = document.getElementById('player_id');
					const roomNameInput = document.getElementById('room_name');
					const maxPlayersSelect = document.getElementById('max_players');
					const mapSelect = document.getElementById('map');
					
					// Force re-read values to avoid stale data
					let playerIdValue = playerIdInput ? playerIdInput.value.trim() : '';
					
					// If player ID field is empty, use the current player ID from the page
					if (!playerIdValue) {
						const currentPlayerIdElement = document.getElementById('current-player-id');
						if (currentPlayerIdElement) {
							playerIdValue = currentPlayerIdElement.textContent.trim();
							console.log('Using current player ID from page:', playerIdValue);
						}
					}
					
					const roomNameValue = roomNameInput ? roomNameInput.value.trim() : '';
					const maxPlayersValue = maxPlayersSelect ? maxPlayersSelect.value : '4';
					const mapValue = mapSelect ? mapSelect.value : 'de_dust2';
					
					console.log('Form elements and values:', {
						playerIdInput: !!playerIdInput,
						playerIdValue: playerIdValue,
						roomNameInput: !!roomNameInput,
						roomNameValue: roomNameValue,
						maxPlayersSelect: !!maxPlayersSelect,
						maxPlayersValue: maxPlayersValue,
						mapSelect: !!mapSelect,
						mapValue: mapValue
					});
					
					const detail = {
						player_id: playerIdValue,
						room_name: roomNameValue,
						max_players: maxPlayersValue,
						map: mapValue
					};
					
					console.log('Creating room with details:', detail);
					window.live.forwardEvent('#{@id}', {type: 'create_room'}, detail);
				}, 100); // 100ms delay to let DOM settle
			})()
		JAVASCRIPT
	end
	
	def forward_join_room(room_id)
		<<~JAVASCRIPT
			(function() {
				const detail = {
					player_id: document.getElementById('join_player_#{room_id}')?.value || '',
					room_id: '#{room_id}'
				};
				window.live.forwardEvent('#{@id}', {type: 'join_room'}, detail);
			})()
		JAVASCRIPT
	end
	
	def forward_quick_join
		<<~JAVASCRIPT
			(function() {
				// Use more reliable selector for quick join player ID
				const quickPlayerIdInput = document.querySelector('input[placeholder*="快速加入"]') || 
											document.querySelector('#join-tab input[type="text"]') ||
											document.querySelector('input[id*="quick"]');
				
				const detail = {
					player_id: quickPlayerIdInput ? quickPlayerIdInput.value : ''
				};
				
				console.log('Quick joining with details:', detail);
				window.live.forwardEvent('#{@id}', {type: 'quick_join'}, detail);
			})()
		JAVASCRIPT
	end
	
	def forward_language_change(locale)
		<<~JAVASCRIPT
			(function() {
				const detail = { locale: '#{locale}' };
				window.live.forwardEvent('#{@id}', {type: 'change_language'}, detail);
			})()
		JAVASCRIPT
	end
	
	
	def forward_start_game(room_id)
		<<~JAVASCRIPT
			(function() {
				const detail = {
					player_id: document.getElementById('start_player_#{room_id}')?.value || '',
					room_id: '#{room_id}'
				};
				window.live.forwardEvent('#{@id}', {type: 'start_game'}, detail);
			})()
		JAVASCRIPT
	end
	
	def render_room_list(builder, rooms)
		if rooms.empty?
			builder.tag(:p, style: "color: #666;") do
				builder.text(I18n.t("lobby.join.no_rooms"))
			end
		else
			rooms.each do |room|
				builder.tag(:div, style: "border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: white; margin-bottom: 15px;") do
					builder.tag(:h4, style: "margin: 0 0 10px 0;") do
						builder.text(room[:room_name])
					end
					
					builder.tag(:p, style: "margin: 5px 0; color: #666;") do
						builder.text("#{I18n.t('lobby.join.room_id')}: #{room[:room_id]}")
						builder.tag(:br)
						builder.text("#{I18n.t('lobby.join.players')}: #{room[:player_count]}/#{room[:max_players]}")
						builder.tag(:br)
						builder.text("#{I18n.t('lobby.join.map')}: #{room[:map]}")
						builder.tag(:br)
						state_key = "lobby.room_states.#{room[:state] || 'waiting'}"
						builder.text("#{I18n.t('lobby.join.status')}: #{I18n.t(state_key)}")
						# Show creator ID for debugging
						if room[:creator_id]
							builder.tag(:br)
							builder.tag(:span, style: "color: #FF9800; font-size: 12px;") do
								builder.text("房主 ID: #{room[:creator_id]}")
							end
						end
					end
					
					builder.tag(:div, style: "margin-top: 10px;") do
						if room[:state] == "waiting"
							builder.tag(:input, 
								type: "text", 
								id: "join_player_#{room[:room_id]}", 
								placeholder: I18n.t("lobby.join.player_id_placeholder"),
								style: "padding: 5px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;")
							
							if room[:player_count] >= room[:max_players]
								builder.tag(:button, 
									disabled: true,
									style: "padding: 8px 20px; background: #ccc; color: white; border: none; border-radius: 5px; cursor: not-allowed;") do
									builder.text(I18n.t("lobby.join.room_full"))
								end
							else
								builder.tag(:button, 
									onclick: forward_join_room(room[:room_id]),
									style: "padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;") do
									builder.text(I18n.t("lobby.join.join_button"))
								end
							end
							
							# Show start game button for room creator with minimum players
							total_players = room[:player_count] # TODO: Add bots count if needed
							if total_players >= 2
								builder.tag(:br, style: "margin: 10px 0;")
								
								# Check if current player is the room creator
								is_creator = room[:creator_id] == @player_id
								
								if is_creator
									# If player is creator, show simplified button
									builder.tag(:button, 
										onclick: "window.live.forwardEvent('#{@id}', {type: 'start_game'}, {player_id: '#{@player_id}', room_id: '#{room[:room_id]}'})",
										style: "padding: 10px 24px; background: #FF5722; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;") do
										builder.text("🎮 開始遊戲（您是房主）")
									end
								else
									# Show input for non-creators (e.g., for testing or manual override)
									builder.tag(:input, 
										type: "text", 
										id: "start_player_#{room[:room_id]}", 
										placeholder: "需要輸入房主 ID: #{room[:creator_id][0..7]}...",
										style: "padding: 5px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;")
									
									builder.tag(:button, 
										onclick: forward_start_game(room[:room_id]),
										style: "padding: 8px 20px; background: #FF5722; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;") do
										builder.text(I18n.t("lobby.start.start_button"))
									end
								end
							end
						else
							# Game is in progress or ended
							builder.tag(:p, style: "color: #FF5722; font-weight: bold; margin: 10px 0;") do
								builder.text(I18n.t("lobby.room_states.#{room[:state]}"))
							end
						end
					end
				end
			end
		end
	end
	
	def render(builder)
		builder.tag(:div, id: "lobby-container", style: "max-width: 1200px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;") do
			# Header with title, player info, and language switcher
			builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;") do
				builder.tag(:h1, style: "color: #333; margin: 0;") do
					builder.text(I18n.t("lobby.title"))
					builder.tag(:span, style: "font-size: 0.6em; color: #666; margin-left: 10px;") do
						builder.text(I18n.t("lobby.subtitle"))
					end
				end
				
				builder.tag(:div, style: "display: flex; align-items: center; gap: 20px;") do
					# Player ID display with copy hint
					builder.tag(:div, style: "display: flex; align-items: center; gap: 8px;") do
						builder.tag(:span, style: "color: #666; font-size: 14px;") do
							builder.text(I18n.t("lobby.player.current_id", default: "您的 ID:"))
						end
						builder.tag(:code, id: "current-player-id", style: "background: #ffeb3b; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #333; font-weight: bold; cursor: pointer;", 
							title: "點擊複製完整 ID",
							onclick: "navigator.clipboard.writeText('#{@player_id}').then(() => { alert('已複製玩家 ID: #{@player_id}'); });") do
							builder.text(@player_id)
						end
						builder.tag(:span, style: "color: #4CAF50; font-size: 11px; margin-left: 5px;") do
							builder.text("(點擊複製)")
						end
					end
					
					# Language switcher
					builder.tag(:div, style: "display: flex; gap: 10px;") do
						I18n.available_locales.each do |locale|
							is_active = locale == @locale
							builder.tag(:button,
								onclick: forward_language_change(locale),
								style: "padding: 8px 16px; background: #{is_active ? '#4CAF50' : '#ddd'}; color: #{is_active ? 'white' : '#333'}; border: none; border-radius: 5px; cursor: pointer; font-weight: #{is_active ? 'bold' : 'normal'};") do
								builder.text(I18n.locale_name(locale))
							end
						end
					end
				end
			end
			
			# Stats bar
			builder.tag(:div, id: "stats-bar", style: "background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px;") do
				builder.text(I18n.t("lobby.stats.loading"))
			end
			
			# Tab navigation
			builder.tag(:div, id: "tab-nav", style: "display: flex; gap: 10px; margin-bottom: 20px;") do
				builder.tag(:button, onclick: "showTab('create')", class: "tab-button active",
					style: "padding: 10px 20px; border: none; background: #4CAF50; color: white; cursor: pointer; border-radius: 5px;") do
					builder.text(I18n.t("lobby.tabs.create_room"))
				end
				builder.tag(:button, onclick: "showTab('join')", class: "tab-button",
					style: "padding: 10px 20px; border: none; background: #ddd; color: #333; cursor: pointer; border-radius: 5px;") do
					builder.text(I18n.t("lobby.tabs.join_room"))
				end
			end
			
			# Create room tab
			builder.tag(:div, id: "create-tab", class: "tab-content", style: "display: block;") do
				builder.tag(:h2) { builder.text(I18n.t("lobby.create.title")) }
				
				builder.tag(:div, id: "create-form", style: "max-width: 500px;") do
					# Player ID (hidden, auto-populated)
					builder.tag(:input, type: "hidden", id: "player_id", value: @player_id)
					
					# Room name
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "room_name", style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t("lobby.create.room_name"))
						end
						builder.tag(:input, type: "text", id: "room_name",
							placeholder: I18n.t("lobby.create.room_name_placeholder"),
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;")
					end
					
					# Max players
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "max_players", style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t("lobby.create.max_players"))
						end
						builder.tag(:select, id: "max_players",
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;") do
							(2..10).each do |n|
								builder.tag(:option, value: n) { builder.text(I18n.t("lobby.create.players_count", count: n)) }
							end
						end
					end
					
					# Map selection
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "map", style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t("lobby.create.map"))
						end
						builder.tag(:select, id: "map",
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;") do
							["de_dust2", "de_inferno", "de_mirage", "de_nuke", "cs_office"].each do |map|
								builder.tag(:option, value: map) { builder.text(map) }
							end
						end
					end
					
					builder.tag(:button, type: "button", 
						onclick: forward_create_room,
						style: "padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;") do
						builder.text(I18n.t("lobby.create.create_button"))
					end
				end
			end
			
			# Join room tab
			builder.tag(:div, id: "join-tab", class: "tab-content", style: "display: none;") do
				builder.tag(:h2) { builder.text(I18n.t("lobby.join.title")) }
				
				# Quick join button
				builder.tag(:div, style: "margin-bottom: 30px;") do
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "quick_player_id", style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t("lobby.join.quick_join_label"))
						end
						builder.tag(:input, type: "text", id: "quick_player_id",
							placeholder: I18n.t("lobby.join.quick_join_placeholder"),
							style: "width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;")
					end
					
					builder.tag(:button, type: "button", onclick: forward_quick_join,
						style: "padding: 12px 40px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 18px;") do
						builder.text(I18n.t("lobby.join.quick_join_button"))
					end
				end
				
				# Room list with refresh button
				builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;") do
					builder.tag(:h3, style: "margin: 0;") { builder.text(I18n.t("lobby.join.room_list_title")) }
					builder.tag(:button, 
						onclick: "window.live.forwardEvent('#{@id}', {type: 'manual_refresh'}, {})",
						style: "padding: 8px 16px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;") do
						builder.text("🔄 立即刷新")
					end
				end
				builder.tag(:div, id: "room-list", style: "display: block;") do
					builder.tag(:div, id: "room-list-content", style: "display: grid; gap: 15px;") do
						# Render initial room list immediately
						begin
							rooms = @@room_manager.get_room_list
							render_room_list(builder, rooms)
							Console.info(self, "Initial render: #{rooms.length} rooms displayed")
						rescue => e
							Console.error(self, "Error in initial room list render: #{e.message}")
							builder.tag(:p, style: "color: red;") do
								builder.text("房間列表載入出錯: #{e.message}")
							end
						end
					end
				end
			end
		end
		
		
		# JavaScript for tab switching and player ID management
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				function showTab(tabName) {
					// Hide all tabs
					document.querySelectorAll('.tab-content').forEach(tab => {
						tab.style.display = 'none';
					});
					
					// Deactivate all buttons
					document.querySelectorAll('.tab-button').forEach(btn => {
						btn.style.background = '#ddd';
						btn.style.color = '#333';
					});
					
					// Show selected tab
					document.getElementById(tabName + '-tab').style.display = 'block';
					
					// Activate selected button
					event.target.style.background = '#4CAF50';
					event.target.style.color = 'white';
				}
				
				
				// Function to create room with current form values
				function createRoomWithCurrentValues() {
					// Capture values immediately at click time
					const playerIdInput = document.getElementById('player_id');
					let playerIdValue = playerIdInput ? playerIdInput.value.trim() : '';
					
					console.log('Player ID input element:', playerIdInput);
					console.log('Player ID input value:', playerIdValue);
					console.log('Player ID input type:', playerIdInput ? playerIdInput.type : 'not found');
					
					// If player ID field is empty, use the current player ID from the page
					if (!playerIdValue) {
						const currentPlayerIdElement = document.getElementById('current-player-id');
						if (currentPlayerIdElement) {
							playerIdValue = currentPlayerIdElement.textContent.trim();
							console.log('Using current player ID from page:', playerIdValue);
						}
					}
					
					const roomNameValue = document.getElementById('room_name')?.value.trim() || '';
					const maxPlayersValue = document.getElementById('max_players')?.value || '4';
					const mapValue = document.getElementById('map')?.value || 'de_dust2';
					
					console.log('Creating room at click time with values:', {
						playerIdValue: playerIdValue,
						roomNameValue: roomNameValue,
						maxPlayersValue: maxPlayersValue,
						mapValue: mapValue
					});
					
					// Use event forwarding with captured values
					console.log('FINAL: Sending player_id to server:', playerIdValue);
					window.live.forwardEvent('#{@id}', {type: 'create_room'}, {
						player_id: playerIdValue,
						room_name: roomNameValue,
						max_players: maxPlayersValue,
						map: mapValue
					});
				}
				
				// Initial room list will be updated by periodic updates
				console.log('Room list will update automatically via periodic updates');
			JAVASCRIPT
		end
	end
	
	def close
		# Stop room updates
		@room_update_task&.stop
		
		super
	end
end

# TODO: Add CS16MultiplayerView class later

# Application is defined in application.rb
# Uncomment the line below only for standalone running (not recommended)
# Application = Lively::Application[AsyncRedisLobbyI18nView]