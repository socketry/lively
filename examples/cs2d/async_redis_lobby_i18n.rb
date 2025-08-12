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
			sleep 0.5 # Wait for page to load
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
			
			// Check for existing player ID cookie
			const existingPlayerId = getCookie('cs2d_player_id');
			console.log('Checking for existing player cookie:', existingPlayerId);
			
			if (existingPlayerId && existingPlayerId.trim() !== '') {
				// Send existing player ID to server
				console.log('Found existing player ID, sending to server:', existingPlayerId);
				window.live.forwardEvent('#{@id}', {type: 'set_player_id_from_cookie'}, {player_id: existingPlayerId});
			} else {
				// Set new cookie with current player ID
				const expiry = new Date();
				expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
				document.cookie = 'cs2d_player_id=#{@player_id}; expires=' + expiry.toUTCString() + '; path=/; SameSite=Lax';
				console.log('Set new player ID cookie: #{@player_id}');
			}
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
				sleep 3 # Update every 3 seconds
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
		
		rooms = @@room_manager.get_room_list
		Console.info(self, "Updating room list with #{rooms.length} rooms: #{rooms.map{|r| r[:room_id]}.join(', ')}")
		
		# Update the room list HTML directly
		self.replace("#room-list") do |builder|
			render_room_list(builder, rooms)
		end
	rescue => e
		Console.error(self, "Error updating room list: #{e.message}")
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
		when "refresh_rooms"
			update_room_list
		when "change_language"
			handle_language_change(event[:detail])
		when "change_player_id"
			handle_change_player_id(event[:detail])
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
	
	def handle_change_player_id(detail)
		new_player_id = detail[:new_player_id]&.strip
		
		# Validate new player ID
		if new_player_id.nil? || new_player_id.empty?
			show_alert(I18n.t("lobby.player.id_required", default: "Player ID cannot be empty"))
			return
		end
		
		if new_player_id.length > 50
			show_alert(I18n.t("lobby.player.id_too_long", default: "Player ID must be 50 characters or less"))
			return
		end
		
		# Check if player ID actually changed
		if new_player_id == @player_id
			# Modal will be closed by client-side JavaScript
			return
		end
		
		# Update player ID and cookie
		old_player_id = @player_id
		@player_id = new_player_id
		set_player_cookie(@player_id)
		
		# Update the UI
		self.replace("#current-player-id") do |builder|
			builder.text(@player_id)
		end
		
		# Show success message (modal will be closed by client-side JavaScript)
		show_alert(I18n.t("lobby.player.id_changed", 
			default: "Player ID changed from #{old_player_id} to #{@player_id}", 
			old_id: old_player_id, 
			new_id: @player_id))
		
		Console.info(self, "Player ID changed from #{old_player_id} to #{@player_id}")
	rescue => e
		Console.error(self, "Error changing player ID: #{e.message}")
		show_alert(I18n.t("lobby.messages.error", message: e.message))
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
		@custom_player_id = detail[:player_id]&.strip
		room_name = detail[:room_name]&.strip
		max_players = detail[:max_players]&.to_i || 10
		map = detail[:map] || "de_dust2"
		
		# Validate
		if room_name.nil? || room_name.empty?
			show_alert(I18n.t("lobby.messages.room_name_required"))
			return
		end
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		settings = {
			name: room_name,
			max_players: [2, [max_players, 10].min].max, # Clamp between 2-10
			map: map,
			game_mode: "competitive",
			creator_id: @player_id,
			created_at: Time.now.to_i
		}
		
		@room_id = @@room_manager.create_room(@player_id, settings)
		
		show_alert(I18n.t("lobby.messages.room_created", room_id: @room_id))
		update_room_list
		
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
			update_room_list
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
			update_room_list
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
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		result = @@room_manager.start_game(@player_id, room_id)
		
		if result[:success]
			show_alert("遊戲開始成功！房間 ID: #{room_id}。多人遊戲功能開發中，敬請期待！")
			update_room_list
		else
			show_alert(I18n.t("lobby.messages.game_start_failed", error: result[:error]))
		end
		
	rescue => e
		Console.error(self, "Error starting game: #{e.message}")
		show_alert(I18n.t("lobby.messages.error", message: e.message))
	end
	
	def show_alert(message)
		self.script(<<~JAVASCRIPT)
			alert('#{message.gsub("'", "\\'")}');
		JAVASCRIPT
	end
	
	# JavaScript event forwarding functions
	def forward_create_room
		<<~JAVASCRIPT
			(function() {
				const detail = {
					player_id: document.getElementById('player_id').value,
					room_name: document.getElementById('room_name').value,
					max_players: document.getElementById('max_players').value,
					map: document.getElementById('map').value
				};
				window.live.forwardEvent('#{@id}', {type: 'create_room'}, detail);
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
				const detail = {
					player_id: document.getElementById('quick_player_id').value
				};
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
	
	def forward_change_player_id
		<<~JAVASCRIPT
			(function() {
				const detail = {
					new_player_id: document.getElementById('new-player-id').value
				};
				window.live.forwardEvent('#{@id}', {type: 'change_player_id'}, detail);
				// Close modal immediately after sending
				setTimeout(() => {
					const modal = document.getElementById('player-id-modal');
					if (modal) {
						modal.style.display = 'none';
					}
				}, 100);
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
								builder.tag(:input, 
									type: "text", 
									id: "start_player_#{room[:room_id]}", 
									placeholder: I18n.t("lobby.start.creator_id_placeholder"),
									style: "padding: 5px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;")
								
								builder.tag(:button, 
									onclick: forward_start_game(room[:room_id]),
									style: "padding: 8px 20px; background: #FF5722; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;") do
									builder.text(I18n.t("lobby.start.start_button"))
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
					# Player ID display and edit
					builder.tag(:div, style: "display: flex; align-items: center; gap: 8px;") do
						builder.tag(:span, style: "color: #666; font-size: 14px;") do
							builder.text(I18n.t("lobby.player.current_id", default: "Player ID:"))
						end
						builder.tag(:code, id: "current-player-id", style: "background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #333;") do
							builder.text(@player_id)
						end
						builder.tag(:button, 
							onclick: "togglePlayerIdEdit()",
							style: "padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;") do
							builder.text(I18n.t("lobby.player.edit", default: "Edit"))
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
					# Player ID
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "player_id", style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t("lobby.create.player_id"))
						end
						builder.tag(:input, type: "text", id: "player_id",
							placeholder: I18n.t("lobby.create.player_id_placeholder"),
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;")
					end
					
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
					
					builder.tag(:button, type: "button", onclick: forward_create_room,
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
				
				# Room list
				builder.tag(:h3) { builder.text(I18n.t("lobby.join.room_list_title")) }
				builder.tag(:div, id: "room-list", style: "display: grid; gap: 15px;") do
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
		
		# Player ID edit modal
		builder.tag(:div, id: "player-id-modal", onclick: "event.target === this && cancelPlayerIdEdit()", style: "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;") do
			builder.tag(:div, style: "background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;") do
				builder.tag(:h3, style: "margin: 0 0 20px 0; color: #333;") do
					builder.text(I18n.t("lobby.player.change_id", default: "Change Player ID"))
				end
				builder.tag(:p, style: "color: #666; margin-bottom: 20px;") do
					builder.text(I18n.t("lobby.player.id_explanation", default: "Your Player ID is stored in a cookie and persists across sessions. You can change it if needed."))
				end
				builder.tag(:div, style: "margin-bottom: 20px;") do
					builder.tag(:label, for: "new-player-id", style: "display: block; margin-bottom: 5px; font-weight: bold;") do
						builder.text(I18n.t("lobby.player.new_id", default: "New Player ID:"))
					end
					builder.tag(:input, 
						type: "text", 
						id: "new-player-id", 
						value: @player_id,
						onkeydown: "if(event.key === 'Enter') { #{forward_change_player_id} }",
						style: "width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;")
				end
				builder.tag(:div, style: "display: flex; justify-content: flex-end; gap: 10px;") do
					builder.tag(:button, 
						onclick: "cancelPlayerIdEdit()",
						style: "padding: 10px 20px; background: #ddd; color: #333; border: none; border-radius: 4px; cursor: pointer;") do
						builder.text(I18n.t("lobby.player.cancel", default: "Cancel"))
					end
					builder.tag(:button, 
						onclick: forward_change_player_id,
						style: "padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;") do
						builder.text(I18n.t("lobby.player.save", default: "Save"))
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
				
				function togglePlayerIdEdit() {
					console.log('Opening player ID edit modal');
					const modal = document.getElementById('player-id-modal');
					if (modal) {
						modal.style.display = 'flex';
						
						// Focus the input field
						setTimeout(() => {
							const input = document.getElementById('new-player-id');
							if (input) {
								input.focus();
								input.select(); // Select all text for easy editing
							}
						}, 100);
					} else {
						console.error('Player ID modal not found');
					}
				}
				
				function cancelPlayerIdEdit() {
					console.log('Closing player ID edit modal');
					const modal = document.getElementById('player-id-modal');
					if (modal) {
						modal.style.display = 'none';
					} else {
						console.error('Player ID modal not found when trying to close');
					}
				}
				
				// Close modal on escape key
				document.addEventListener('keydown', (e) => {
					if (e.key === 'Escape') {
						const modal = document.getElementById('player-id-modal');
						if (modal && modal.style.display === 'flex') {
							cancelPlayerIdEdit();
						}
					}
				});
				
				// Make functions globally available
				window.togglePlayerIdEdit = togglePlayerIdEdit;
				window.cancelPlayerIdEdit = cancelPlayerIdEdit;
				
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

# Create application - for now just use the lobby view
# TODO: Add proper routing for multiplayer
Application = Lively::Application[AsyncRedisLobbyI18nView]