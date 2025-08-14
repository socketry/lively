#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"
require "erb"
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
		@player_nickname = nil # Display name for the player
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
		
		# Aggressively remove all debug borders with continuous monitoring
		Async do
			sleep 0.5
			self.script(<<~JAVASCRIPT)
				// Ultimate border removal with MutationObserver
				(function() {
					// Create the highest priority style sheet
					const killBordersStyle = document.createElement('style');
					killBordersStyle.id = 'kill-all-borders';
					killBordersStyle.innerHTML = `
						*, *::before, *::after,
						.live, [data-live], [id*="live"],
						div, span, p, h1, h2, h3, h4, h5, h6,
						form, input, select, button, textarea,
						ul, li, a, code, pre {
							border: none !important;
							outline: none !important;
							box-shadow: none !important;
						}
						
						/* Only restore specific intended borders */
						.lobby-container { border: 1px solid rgba(255, 255, 255, 0.08) !important; }
						.form-group { border: 1px solid rgba(255, 255, 255, 0.03) !important; }
						.room-card { border: 1px solid rgba(102, 126, 234, 0.12) !important; }
						.room-card:hover { border-color: #667eea !important; }
						input[type="text"], select { border: 1px solid rgba(102, 126, 234, 0.15) !important; }
						input[type="text"]:focus, select:focus { border-color: #667eea !important; }
						.tab-nav { border: 1px solid rgba(255, 255, 255, 0.04) !important; }
						.player-header { border: 1px solid rgba(255, 255, 255, 0.03) !important; }
						.stats-bar { border: 1px solid rgba(102, 126, 234, 0.1) !important; }
						.tab-content { border: 1px solid rgba(102, 126, 234, 0.1) !important; }
						.room-list-header { border-bottom: 1px solid rgba(102, 126, 234, 0.1) !important; }
						.quick-join-section { border-bottom: 1px solid rgba(102, 126, 234, 0.1) !important; }
					`;
					
					// Remove existing kill-borders style if present
					const existing = document.getElementById('kill-all-borders');
					if (existing) existing.remove();
					
					// Add to head with highest priority
					if (document.head.firstChild) {
						document.head.insertBefore(killBordersStyle, document.head.firstChild);
					} else {
						document.head.appendChild(killBordersStyle);
					}
					
					// Function to remove red borders from an element
					function removeBorders(el) {
						if (el && el.style) {
							if (el.style.border && (el.style.border.includes('red') || el.style.border.includes('rgb(255, 0, 0)') || el.style.border.includes('1px solid'))) {
								el.style.border = 'none';
							}
							if (el.style.outline && (el.style.outline.includes('red') || el.style.outline.includes('rgb(255, 0, 0)'))) {
								el.style.outline = 'none';
							}
							if (el.style.boxShadow && el.style.boxShadow.includes('red')) {
								el.style.boxShadow = 'none';
							}
						}
					}
					
					// Initial cleanup
					document.querySelectorAll('*').forEach(removeBorders);
					
					// Create MutationObserver to continuously remove borders
					const observer = new MutationObserver(function(mutations) {
						mutations.forEach(function(mutation) {
							// Check added nodes
							if (mutation.type === 'childList') {
								mutation.addedNodes.forEach(function(node) {
									if (node.nodeType === 1) { // Element node
										removeBorders(node);
										// Check all descendants
										if (node.querySelectorAll) {
											node.querySelectorAll('*').forEach(removeBorders);
										}
									}
								});
							}
							// Check attribute changes
							else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
								removeBorders(mutation.target);
							}
						});
					});
					
					// Start observing the entire document
					observer.observe(document.body, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: ['style']
					});
					
					// Also periodically clean up (belt and suspenders approach)
					setInterval(function() {
						document.querySelectorAll('*').forEach(function(el) {
							if (el.style && el.style.border && (el.style.border.includes('red') || el.style.border.includes('rgb(255, 0, 0)'))) {
								el.style.border = 'none';
							}
						});
					}, 500);
					
					console.log('Border removal system activated with MutationObserver');
				})();
			JAVASCRIPT
		end
		
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
				const playerNicknameElement = document.getElementById('current-player-nickname');
				if (!playerIdElement) {
					console.log('Player ID element not found, retrying in 100ms...');
					setTimeout(initializePlayerIdWhenReady, 100);
					return;
				}
				
				// Check for existing player ID and nickname cookies
				const existingPlayerId = getCookie('cs2d_player_id');
				const existingNickname = getCookie('cs2d_player_nickname');
				console.log('Checking for existing player cookie:', existingPlayerId);
				console.log('Checking for existing nickname cookie:', existingNickname);
				
				if (existingPlayerId && existingPlayerId.trim() !== '') {
					// Update UI immediately
					playerIdElement.textContent = existingPlayerId;
					
					// Set nickname if available, otherwise use player ID
					const nickname = existingNickname || existingPlayerId.substring(0, 8);
					if (playerNicknameElement) {
						playerNicknameElement.textContent = nickname;
					}
					
					// Send existing player ID and nickname to server
					console.log('Found existing player ID, sending to server:', existingPlayerId);
					window.live.forwardEvent('#{@id}', {type: 'set_player_id_from_cookie'}, {
						player_id: existingPlayerId,
						nickname: nickname
					});
				} else {
					// Set new cookie with current player ID
					const expiry = new Date();
					expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
					document.cookie = 'cs2d_player_id=#{@player_id}; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
					
					// Set default nickname
					const defaultNickname = 'Player_' + '#{@player_id}'.substring(0, 6);
					document.cookie = 'cs2d_player_nickname=' + defaultNickname + '; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
					
					console.log('Set new player ID cookie: #{@player_id}');
					console.log('Set new nickname cookie:', defaultNickname);
					
					// Update UI with server-generated ID and nickname
					playerIdElement.textContent = '#{@player_id}';
					if (playerNicknameElement) {
						playerNicknameElement.textContent = defaultNickname;
					}
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
		cookie_nickname = detail[:nickname]&.strip
		
		if cookie_player_id && !cookie_player_id.empty?
			old_player_id = @player_id
			@player_id = cookie_player_id
			@player_nickname = cookie_nickname || "Player_#{@player_id[0..5]}"
			
			# Update the UI
			self.replace("#current-player-id") do |builder|
				builder.text(@player_id)
			end
			
			Console.info(self, "Updated player ID from cookie: #{old_player_id} -> #{@player_id}")
		end
	rescue => e
		Console.error(self, "Error setting player ID from cookie: #{e.message}")
	end
	
	def handle_update_nickname(detail)
		new_nickname = detail[:nickname]&.strip
		
		# Add timestamp to track rapid events
		timestamp = Time.now.strftime("%H:%M:%S.%3N")
		Console.info(self, "Handling update_nickname at #{timestamp} - Nickname: '#{new_nickname}'")
		
		# Ignore if same as current nickname to prevent unnecessary updates
		if new_nickname == @player_nickname
			Console.info(self, "Nickname unchanged, ignoring update")
			return
		end
		
		if new_nickname && !new_nickname.empty? && new_nickname.length <= 20
			@player_nickname = new_nickname
			Console.info(self, "Successfully updated player nickname: #{@player_nickname}")
			
			# Update only the nickname display element to prevent triggering room list refresh
			self.replace("#current-player-nickname") do |builder|
				builder.text(@player_nickname)
			end
		else
			Console.warn(self, "Invalid nickname provided: '#{new_nickname}' (length: #{new_nickname&.length || 0})")
		end
	rescue => e
		Console.error(self, "Error updating nickname: #{e.message}")
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
		# Encode nickname for URL
		nickname = @player_nickname || "Player_#{player_id[0..5]}"
		encoded_nickname = ERB::Util.url_encode(nickname)
		
		# Use JavaScript to redirect to the room waiting page on port 9293
		self.script(<<~JAVASCRIPT)
			console.log('Redirecting to room waiting page...', {
				room_id: '#{room_id}', 
				player_id: '#{player_id}',
				nickname: '#{nickname}'
			});
			
			// Small delay to let the notification show
			setTimeout(() => {
				// Redirect to static server on port 9293 for room waiting page
				const url = 'http://localhost:9293/room.html?room_id=#{room_id}&player_id=#{player_id}&nickname=#{encoded_nickname}';
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
			builder.tag(:div, class: "empty-state") do
				builder.text(I18n.t("lobby.join.no_rooms"))
			end
		else
			rooms.each do |room|
				room_class = room[:state] == "waiting" ? "room-card" : "room-card room-full"
				builder.tag(:div, class: room_class) do
					builder.tag(:h4) do
						builder.text(room[:room_name])
					end
					
					builder.tag(:p) do
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
							builder.tag(:span, style: "color: #FF9800;") do
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
								style: "padding: 5px; margin-right: 10px;")
							
							if room[:player_count] >= room[:max_players]
								builder.tag(:button, 
									disabled: true,
									class: "btn btn-secondary", style: "cursor: not-allowed; opacity: 0.5;") do
									builder.text(I18n.t("lobby.join.room_full"))
								end
							else
								builder.tag(:button, 
									onclick: forward_join_room(room[:room_id]),
									class: "btn btn-success", style: "margin-right: 10px;") do
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
										class: "btn btn-danger") do
										builder.text("🎮 開始遊戲（您是房主）")
									end
								else
									# Show input for non-creators (e.g., for testing or manual override)
									builder.tag(:input, 
										type: "text", 
										id: "start_player_#{room[:room_id]}", 
										placeholder: "需要輸入房主 ID: #{room[:creator_id][0..7]}...",
										style: "padding: 5px; margin-right: 10px;")
									
									builder.tag(:button, 
										onclick: forward_start_game(room[:room_id]),
										class: "btn btn-danger") do
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
		# Add CSS link
		builder.tag(:link, rel: "stylesheet", type: "text/css", href: "http://localhost:9293/_static/lobby.css") do
		end
		
		# Override debug borders
		builder.tag(:style) do
			builder.raw(<<~CSS)
				/* Remove all debug borders */
				* {
					border: none !important;
					outline: none !important;
				}
				
				/* Compact layout */
				body {
					overflow-x: hidden;
				}
				
				.lobby-container {
					max-width: 1400px !important;
					padding: 1.5rem !important;
					min-height: 100vh;
					display: flex;
					flex-direction: column;
				}
				
				.player-header {
					margin-bottom: 1rem !important;
				}
				
				.main-content {
					display: grid;
					grid-template-columns: minmax(350px, 1fr) minmax(450px, 2fr);
					gap: 2rem;
					align-items: start;
					flex: 1;
				}
				
				.tab-content {
					background: rgba(20, 20, 30, 0.6);
					border: 1px solid rgba(102, 126, 234, 0.1);
					border-radius: 20px;
					padding: 1.5rem;
					backdrop-filter: blur(20px);
					box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
				}
				
				.tab-content h2 {
					color: #667eea;
					margin-bottom: 1.5rem;
					font-size: 1.5rem;
					text-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
				}
				
				.create-section {
					min-height: 400px;
				}
				
				.join-section {
					min-height: 400px;
				}
				
				#stats-bar {
					margin-bottom: 1rem !important;
					padding: 0.5rem 1rem !important;
					font-size: 0.85rem !important;
				}
				
				.room-grid {
					max-height: 400px;
					overflow-y: auto;
					padding-right: 0.5rem;
					scrollbar-width: thin;
					scrollbar-color: rgba(102, 126, 234, 0.3) rgba(255, 255, 255, 0.05);
				}
				
				.room-grid::-webkit-scrollbar {
					width: 6px;
				}
				
				.room-grid::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.02);
					border-radius: 3px;
				}
				
				.room-grid::-webkit-scrollbar-thumb {
					background: rgba(102, 126, 234, 0.3);
					border-radius: 3px;
				}
				
				.room-grid::-webkit-scrollbar-thumb:hover {
					background: rgba(102, 126, 234, 0.5);
				}
				
				.room-card {
					margin-bottom: 1rem !important;
				}
				
				.form-group {
					margin-bottom: 1rem !important;
				}
				
				.room-list-header {
					margin-bottom: 1rem !important;
					padding-bottom: 0.5rem !important;
				}
				
				.quick-join-section {
					margin-bottom: 1.5rem;
					padding-bottom: 1rem;
					border-bottom: 1px solid rgba(102, 126, 234, 0.1);
				}
				
				@media (max-width: 1024px) {
					.main-content {
						grid-template-columns: 1fr;
						gap: 1.5rem;
					}
				}
			CSS
		end
		
		builder.tag(:div, id: "lobby-container", class: "lobby-container") do
			# Header with title, player info, and language switcher
			builder.tag(:div, class: "player-header") do
				builder.tag(:h1) do
					builder.text(I18n.t("lobby.title"))
					builder.tag(:span, style: "font-size: 0.6em; margin-left: 10px;") do
						builder.text(I18n.t("lobby.subtitle"))
					end
				end
				
				builder.tag(:div, class: "player-info") do
					# Player Nickname display with edit button
					builder.tag(:div, style: "display: flex; align-items: center; gap: 8px; margin-bottom: 8px;") do
						builder.tag(:span) do
							builder.text("暱稱:")
						end
						builder.tag(:strong, id: "current-player-nickname", style: "color: #667eea; font-size: 1.1em;") do
							builder.text(@player_nickname || (@player_id ? "Player_#{@player_id[0..5]}" : "Loading..."))
						end
						builder.tag(:button, 
							onclick: "showNicknameEditModal()",
							class: "btn btn-secondary",
							style: "padding: 2px 8px; font-size: 12px;") do
							builder.text("編輯")
						end
					end
					
					# Player ID display with copy hint
					builder.tag(:div, style: "display: flex; align-items: center; gap: 8px;") do
						builder.tag(:span) do
							builder.text(I18n.t("lobby.player.current_id", default: "您的 ID:"))
						end
						builder.tag(:code, id: "current-player-id", class: "player-id", style: "cursor: pointer;", 
							title: "點擊複製完整 ID",
							onclick: "navigator.clipboard.writeText('#{@player_id}').then(() => { alert('已複製玩家 ID: #{@player_id}'); });") do
							builder.text(@player_id)
						end
						builder.tag(:span, style: "color: #4CAF50; font-size: 11px; margin-left: 5px;") do
							builder.text("(點擊複製)")
						end
					end
					
					# Language switcher
					builder.tag(:div, class: "language-buttons") do
						I18n.available_locales.each do |locale|
							is_active = locale == @locale
							button_class = is_active ? "btn btn-primary" : "btn btn-secondary"
							builder.tag(:button,
								onclick: forward_language_change(locale),
								class: button_class) do
								builder.text(I18n.locale_name(locale))
							end
						end
					end
				end
			end
			
			# Stats bar
			builder.tag(:div, id: "stats-bar", class: "stats-bar") do
				builder.text(I18n.t("lobby.stats.loading"))
			end
			
			# Main content grid
			builder.tag(:div, class: "main-content") do
				# Create room section (left side)
				builder.tag(:div, class: "tab-content create-section") do
				builder.tag(:h2) { builder.text(I18n.t("lobby.create.title")) }
				
				builder.tag(:div, id: "create-form") do
					# Player ID (hidden, auto-populated)
					builder.tag(:input, type: "hidden", id: "player_id", value: @player_id)
					
					# Room name
					builder.tag(:div, class: "form-group") do
						builder.tag(:label, for: "room_name") do
							builder.text(I18n.t("lobby.create.room_name"))
						end
						builder.tag(:input, type: "text", id: "room_name",
							placeholder: I18n.t("lobby.create.room_name_placeholder"))
					end
					
					# Max players
					builder.tag(:div, class: "form-group") do
						builder.tag(:label, for: "max_players") do
							builder.text(I18n.t("lobby.create.max_players"))
						end
						builder.tag(:select, id: "max_players") do
							(2..10).each do |n|
								builder.tag(:option, value: n) { builder.text(I18n.t("lobby.create.players_count", count: n)) }
							end
						end
					end
					
					# Map selection
					builder.tag(:div, class: "form-group") do
						builder.tag(:label, for: "map") do
							builder.text(I18n.t("lobby.create.map"))
						end
						builder.tag(:select, id: "map") do
							["de_dust2", "de_inferno", "de_mirage", "de_nuke", "cs_office"].each do |map|
								builder.tag(:option, value: map) { builder.text(map) }
							end
						end
					end
					
					builder.tag(:button, type: "button", 
						onclick: forward_create_room,
						class: "btn btn-primary") do
						builder.text(I18n.t("lobby.create.create_button"))
					end
				end
				end # End create section
				
				# Join room section (right side)
				builder.tag(:div, class: "tab-content join-section") do
				builder.tag(:h2) { builder.text(I18n.t("lobby.join.title")) }
				
				# Quick join button
				builder.tag(:div, class: "quick-join-section") do
					builder.tag(:div, class: "form-group") do
						builder.tag(:label, for: "quick_player_id") do
							builder.text(I18n.t("lobby.join.quick_join_label"))
						end
						builder.tag(:input, type: "text", id: "quick_player_id",
							placeholder: I18n.t("lobby.join.quick_join_placeholder"))
					end
					
					builder.tag(:button, type: "button", onclick: forward_quick_join,
						class: "btn btn-success") do
						builder.text(I18n.t("lobby.join.quick_join_button"))
					end
				end
				
				# Room list with refresh button
				builder.tag(:div, class: "room-list-header") do
					builder.tag(:h3) { builder.text(I18n.t("lobby.join.room_list_title")) }
					builder.tag(:button, 
						onclick: "window.live.forwardEvent('#{@id}', {type: 'manual_refresh'}, {})",
						class: "btn btn-secondary") do
						builder.text("🔄 立即刷新")
					end
				end
				builder.tag(:div, id: "room-list", class: "room-list") do
					builder.tag(:div, id: "room-list-content", class: "room-grid") do
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
				end # End join section
			end # End main-content
		end # End lobby-container
		
		# Nickname Edit Modal
		builder.tag(:div, id: "nickname-modal", style: "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000;") do
			builder.tag(:div, style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2d2d2d; padding: 20px; border-radius: 10px; border: 1px solid #667eea;") do
				builder.tag(:h3, style: "color: #667eea; margin-bottom: 15px;") { builder.text("編輯暱稱") }
				builder.tag(:input, 
					type: "text", 
					id: "nickname-input",
					maxlength: "20",
					style: "width: 250px; padding: 8px; background: #1a1a1a; border: 1px solid #667eea; color: white; border-radius: 5px; margin-bottom: 15px;",
					placeholder: "輸入您的暱稱 (最多20字)")
				builder.tag(:div, style: "display: flex; gap: 10px; justify-content: flex-end;") do
					builder.tag(:button, 
						onclick: "saveNickname()",
						class: "btn btn-primary") do
						builder.text("儲存")
					end
					builder.tag(:button,
						onclick: "closeNicknameModal()",
						class: "btn btn-secondary") do
						builder.text("取消")
					end
				end
			end
		end
		
		# JavaScript for player ID management
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				// Nickname management functions
				function showNicknameEditModal() {
					const modal = document.getElementById('nickname-modal');
					const input = document.getElementById('nickname-input');
					const currentNickname = document.getElementById('current-player-nickname').textContent;
					
					input.value = currentNickname;
					modal.style.display = 'block';
					input.focus();
					input.select();
				}
				
				function closeNicknameModal() {
					document.getElementById('nickname-modal').style.display = 'none';
				}
				
				let isSavingNickname = false; // Prevent multiple simultaneous saves
				
				function saveNickname() {
					// Prevent multiple simultaneous saves
					if (isSavingNickname) {
						console.log('Save already in progress, ignoring');
						return;
					}
					
					const input = document.getElementById('nickname-input');
					const nickname = input.value.trim();
					
					if (nickname && nickname.length > 0) {
						isSavingNickname = true;
						
						// Disable save button to prevent multiple clicks
						const saveBtn = document.querySelector('#nickname-modal .btn-primary');
						if (saveBtn) {
							saveBtn.disabled = true;
							saveBtn.textContent = '儲存中...';
						}
						
						// Update cookie
						const expiry = new Date();
						expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
						document.cookie = 'cs2d_player_nickname=' + nickname + '; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
						
						// Update UI
						document.getElementById('current-player-nickname').textContent = nickname;
						
						// Send to server
						window.live.forwardEvent('#{@id}', {type: 'update_nickname'}, {nickname: nickname});
						
						// Close modal and reset state after a short delay
						setTimeout(() => {
							closeNicknameModal();
							isSavingNickname = false;
							if (saveBtn) {
								saveBtn.disabled = false;
								saveBtn.textContent = '儲存';
							}
						}, 500);
					}
				}
				
				// Close modal on escape key and handle Enter key on nickname input
				document.addEventListener('keydown', function(e) {
					if (e.key === 'Escape') {
						closeNicknameModal();
					}
				});
				
				// Handle Enter key on nickname input field
				document.addEventListener('keydown', function(e) {
					if (e.target.id === 'nickname-input' && e.key === 'Enter') {
						e.preventDefault(); // Prevent form submission
						saveNickname();
					}
				});
				
				// Remove debug borders immediately
				document.addEventListener('DOMContentLoaded', function() {
					// Create style element to override all borders
					const overrideStyle = document.createElement('style');
					overrideStyle.innerHTML = `
						* {
							border: none !important;
							outline: none !important;
							box-shadow: none !important;
						}
						
						[style*="border"] {
							border: none !important;
						}
						
						.live {
							border: none !important;
						}
					`;
					document.head.appendChild(overrideStyle);
					
					// Also remove inline style borders
					document.querySelectorAll('*').forEach(el => {
						if (el.style.border) {
							el.style.border = 'none';
						}
					});
				});
				
				// Player ID management
				
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