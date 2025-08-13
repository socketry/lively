# frozen_string_literal: true

require "lively"
require "live"
require_relative "game/async_redis_room_manager"
require_relative "lib/i18n"
require_relative "lib/cs16_game_state"
require_relative "lib/cs16_hud_components"
require "json"
require "securerandom"
require "async"

# Initialize i18n
I18n.initialize!

# Fixed Unified Single-Page Application for CS2D
# Solves the infinite rendering loop issue while maintaining single-page architecture
class FixedUnifiedSPAView < Live::View
	def initialize
		super
		@view_state = :lobby  # :lobby, :room, :game
		@player_id = nil
		@player_name = nil
		@room_id = nil
		@room_data = nil
		@game_state = nil
		@locale = :zh_TW
		@last_refresh = Time.now
		@refresh_interval = 15
		@room_manager = AsyncRedisRoomManager.new
		@active_rooms = []
		@error_message = nil
		@success_message = nil
		
		# Game-specific state
		@players = {}
		@current_player = nil
		@game_running = false
		
		# FIX: Track update state to prevent infinite loops
		@updating = false
		@needs_update = false
		@refresh_timer_task = nil
		@page = nil
	end

	def bind(page)
		# FIX: Don't call super multiple times
		return if @page
		
		super
		@page = page
		
		# Initialize player from cookie on first bind only
		Async do
			initialize_player
			
			# Start refresh timer for lobby
			start_refresh_timer if @view_state == :lobby
			
			# Initial render
			safe_update!
		end
	end

	def close
		stop_refresh_timer
		stop_game if @game_running
		leave_room if @room_id
		@page = nil
		super
	end

	# FIX: Safe update method that prevents infinite loops
	def safe_update!
		return if @updating
		return unless @page
		
		@updating = true
		begin
			self.update!
		ensure
			@updating = false
			
			# If another update was requested during update, do it now
			if @needs_update
				@needs_update = false
				Async do
					sleep 0.1  # Small delay to prevent rapid updates
					safe_update!
				end
			end
		end
	end

	# FIX: Request update instead of direct update
	def request_update!
		if @updating
			@needs_update = true
		else
			safe_update!
		end
	end

	def handle(event)
		# Prevent handling events during updates
		return if @updating
		
		case event[:type]
		# Navigation events
		when "navigate"
			handle_navigation(event[:detail])
		when "hash_change"
			handle_hash_change(event[:detail])
			
		# Lobby events
		when "change_locale"
			@locale = event[:detail][:locale].to_sym
			request_update!
		when "change_player_id"
			handle_change_player_id(event[:detail])
		when "create_room"
			handle_create_room(event[:detail])
		when "join_room"
			handle_join_room(event[:detail])
		when "quick_join"
			handle_quick_join
		when "refresh_rooms"
			refresh_rooms
			
		# Room events  
		when "leave_room"
			handle_leave_room
		when "start_game"
			handle_start_game
		when "toggle_ready"
			handle_toggle_ready
			
		# Game events
		when "player_move"
			handle_player_move(event[:detail]) if @game_running
		when "player_shoot"
			handle_player_shoot(event[:detail]) if @game_running
		when "player_action"
			handle_player_action(event[:detail]) if @game_running
		when "exit_game"
			handle_exit_game
			
		else
			Console.logger.warn "Unknown event type: #{event[:type]}"
		end
	end

	def render(builder)
		builder.tag(:html, lang: I18n.locale) do
			render_head(builder)
			builder.tag(:body, style: "margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a1a; color: #e0e0e0; overflow: hidden;") do
				# Client-side routing handler
				render_routing_script(builder)
				
				# Render current view
				case @view_state
				when :lobby
					render_lobby(builder)
				when :room
					render_room_waiting(builder)
				when :game
					render_game(builder)
				end
				
				# Notifications
				render_notifications(builder)
			end
		end
	end

	private

	def render_head(builder)
		builder.tag(:head) do
			builder.tag(:meta, charset: "UTF-8")
			builder.tag(:meta, name: "viewport", content: "width=device-width, initial-scale=1.0")
			builder.tag(:title) do
				builder.text(I18n.t('lobby.title'))
			end
			builder.tag(:style) do
				builder.raw(<<~CSS)
					* { box-sizing: border-box; }
					
					.container {
						max-width: 1200px;
						margin: 0 auto;
						padding: 20px;
					}
					
					.header {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						padding: 20px;
						border-radius: 10px;
						margin-bottom: 30px;
						box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
					}
					
					.header h1 {
						margin: 0;
						font-size: 2.5em;
						text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
					}
					
					.notification {
						position: fixed;
						top: 20px;
						right: 20px;
						padding: 15px 20px;
						border-radius: 8px;
						animation: slideIn 0.3s ease;
						z-index: 10000;
						max-width: 400px;
						box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
					}
					
					.notification.success {
						background: linear-gradient(135deg, #00b09b, #96c93d);
						color: white;
					}
					
					.notification.error {
						background: linear-gradient(135deg, #f85032, #e73827);
						color: white;
					}
					
					@keyframes slideIn {
						from {
							transform: translateX(400px);
							opacity: 0;
						}
						to {
							transform: translateX(0);
							opacity: 1;
						}
					}
					
					.btn {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						padding: 12px 24px;
						border-radius: 6px;
						cursor: pointer;
						font-size: 16px;
						transition: all 0.3s;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
					}
					
					.btn:hover {
						transform: translateY(-2px);
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
					}
					
					.room-card {
						background: rgba(255, 255, 255, 0.05);
						border: 1px solid rgba(255, 255, 255, 0.1);
						border-radius: 8px;
						padding: 15px;
						margin-bottom: 15px;
						transition: all 0.3s;
					}
					
					.room-card:hover {
						background: rgba(255, 255, 255, 0.08);
						transform: translateX(5px);
					}
					
					#game-canvas {
						border: 2px solid #444;
						display: block;
						margin: 0 auto;
					}
				CSS
			end
		end
	end

	def render_routing_script(builder)
		builder.tag(:script) do
			builder.raw(<<~JS)
				// Client-side routing handler
				window.addEventListener('hashchange', function() {
					const hash = window.location.hash.slice(1);
					const parts = hash.split('/');
					const view = parts[0] || 'lobby';
					const id = parts[1];
					
					window.liveSocket?.send({
						type: 'hash_change',
						detail: { view: view, id: id }
					});
				});
				
				// Initialize routing on load
				document.addEventListener('DOMContentLoaded', function() {
					if (!window.location.hash) {
						window.location.hash = '#lobby';
					} else {
						window.dispatchEvent(new HashChangeEvent('hashchange'));
					}
				});
			JS
		end
	end

	def render_lobby(builder)
		builder.tag(:div, class: "container") do
			# Header
			builder.tag(:div, class: "header") do
				builder.tag(:h1) do
					builder.text(I18n.t('lobby.title'))
				end
				
				# Player info and language selector
				builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; margin-top: 15px;") do
					# Player ID display
					builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
						builder.tag(:span) do
							builder.text("#{I18n.t('lobby.player_id')}: #{@player_id || 'Loading...'}")
						end
						builder.tag(:button, class: "btn", style: "padding: 6px 12px; font-size: 14px;", 
							onclick: "document.getElementById('player-modal').style.display='block'") do
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
			render_room_list(builder)
			
			# Player ID modal
			render_player_modal(builder)
		end
	end

	def render_room_waiting(builder)
		builder.tag(:div, class: "container") do
			builder.tag(:div, class: "header") do
				builder.tag(:h1) do
					builder.text("Room: #{@room_data[:name] rescue 'Loading...'}")
				end
			end
			
			if @room_data
				# Room info
				builder.tag(:div, style: "background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;") do
					builder.tag(:h2) do
						builder.text("Room Settings")
					end
					builder.tag(:p) do
						builder.text("Map: #{@room_data[:map]}")
					end
					builder.tag(:p) do
						builder.text("Max Players: #{@room_data[:max_players]}")
					end
					builder.tag(:p) do
						builder.text("Current Players: #{@room_data[:current_players]}/#{@room_data[:max_players]}")
					end
				end
				
				# Player list
				builder.tag(:div, style: "background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;") do
					builder.tag(:h2) do
						builder.text("Players")
					end
					builder.tag(:ul) do
						(@room_data[:players] || []).each do |player|
							builder.tag(:li) do
								builder.text("#{player[:name]} #{player[:id] == @room_data[:creator_id] ? '(Host)' : ''}")
							end
						end
					end
				end
				
				# Actions
				builder.tag(:div, style: "display: flex; gap: 10px;") do
					if @player_id == @room_data[:creator_id]
						builder.tag(:button, class: "btn", onclick: "window.liveSocket?.send({type: 'start_game'})") do
							builder.text("Start Game")
						end
					end
					
					builder.tag(:button, class: "btn", style: "background: linear-gradient(135deg, #f85032, #e73827);",
						onclick: "window.liveSocket?.send({type: 'leave_room'})") do
						builder.text("Leave Room")
					end
				end
			else
				builder.tag(:p) do
					builder.text("Loading room data...")
				end
			end
		end
	end

	def render_game(builder)
		builder.tag(:div, style: "text-align: center; padding: 20px;") do
			builder.tag(:h1, style: "color: white; margin-bottom: 20px;") do
				builder.text("CS2D Game")
			end
			
			# Game canvas
			builder.tag(:canvas, id: "game-canvas", width: 960, height: 540)
			
			# Exit button
			builder.tag(:div, style: "margin-top: 20px;") do
				builder.tag(:button, class: "btn", onclick: "window.liveSocket?.send({type: 'exit_game'})") do
					builder.text("Exit to Room")
				end
			end
			
			# Initialize game
			builder.tag(:script) do
				builder.raw(<<~JS)
					// Initialize game engine
					const canvas = document.getElementById('game-canvas');
					const ctx = canvas.getContext('2d');
					
					// Simple game loop for demonstration
					function gameLoop() {
						ctx.fillStyle = '#2a2a2a';
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						ctx.fillStyle = 'white';
						ctx.font = '24px Arial';
						ctx.textAlign = 'center';
						ctx.fillText('Game Running', canvas.width/2, canvas.height/2);
						
						requestAnimationFrame(gameLoop);
					}
					
					gameLoop();
				JS
			end
		end
	end

	def render_notifications(builder)
		if @error_message
			builder.tag(:div, class: "notification error", id: "error-notification") do
				builder.text(@error_message)
			end
			builder.tag(:script) do
				builder.raw(<<~JS)
					setTimeout(() => {
						const notification = document.getElementById('error-notification');
						if (notification) notification.remove();
					}, 5000);
				JS
			end
			@error_message = nil
		end
		
		if @success_message
			builder.tag(:div, class: "notification success", id: "success-notification") do
				builder.text(@success_message)
			end
			builder.tag(:script) do
				builder.raw(<<~JS)
					setTimeout(() => {
						const notification = document.getElementById('success-notification');
						if (notification) notification.remove();
					}, 5000);
				JS
			end
			@success_message = nil
		end
	end

	def render_language_selector(builder)
		builder.tag(:select, onchange: "window.liveSocket?.send({type: 'change_locale', detail: {locale: this.value}})",
			style: "padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);") do
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
		builder.tag(:div, style: "background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 30px;") do
			builder.tag(:h2) do
				builder.text(I18n.t('lobby.create_room'))
			end
			
			builder.tag(:form, id: "create-room-form", onsubmit: "event.preventDefault(); createRoom(); return false;") do
				builder.tag(:div, style: "display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;") do
					# Room name
					builder.tag(:div) do
						builder.tag(:label, style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t('lobby.room_name'))
						end
						builder.tag(:input, type: "text", id: "room_name", required: true,
							style: "width: 100%; padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);")
					end
					
					# Max players
					builder.tag(:div) do
						builder.tag(:label, style: "display: block; margin-bottom: 5px;") do
							builder.text(I18n.t('lobby.max_players'))
						end
						builder.tag(:select, id: "max_players",
							style: "width: 100%; padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);") do
							[2, 4, 6, 8, 10].each do |num|
								builder.tag(:option, value: num) do
									builder.text(num.to_s)
								end
							end
						end
					end
				end
				
				builder.tag(:button, type: "submit", class: "btn") do
					builder.text(I18n.t('lobby.create_room'))
				end
			end
			
			builder.tag(:script) do
				builder.raw(<<~JS)
					function createRoom() {
						const roomName = document.getElementById('room_name').value;
						const maxPlayers = document.getElementById('max_players').value;
						
						window.liveSocket?.send({
							type: 'create_room',
							detail: {
								room_name: roomName,
								max_players: parseInt(maxPlayers)
							}
						});
					}
				JS
			end
		end
	end

	def render_room_list(builder)
		builder.tag(:div) do
			builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;") do
				builder.tag(:h2) do
					builder.text(I18n.t('lobby.available_rooms'))
				end
				
				builder.tag(:div, style: "display: flex; gap: 10px;") do
					builder.tag(:button, class: "btn", onclick: "window.liveSocket?.send({type: 'refresh_rooms'})") do
						builder.text(I18n.t('lobby.refresh'))
					end
					
					builder.tag(:button, class: "btn", style: "background: linear-gradient(135deg, #00b09b, #96c93d);",
						onclick: "window.liveSocket?.send({type: 'quick_join'})") do
						builder.text(I18n.t('lobby.quick_join'))
					end
				end
			end
			
			if @active_rooms.empty?
				builder.tag(:p, style: "text-align: center; color: #888;") do
					builder.text(I18n.t('lobby.no_rooms'))
				end
			else
				@active_rooms.each do |room|
					builder.tag(:div, class: "room-card") do
						builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center;") do
							builder.tag(:div) do
								builder.tag(:h3, style: "margin: 0 0 10px 0;") do
									builder.text(room[:name])
								end
								builder.tag(:p, style: "margin: 0; color: #aaa;") do
									builder.text("#{I18n.t('lobby.players')}: #{room[:current_players]}/#{room[:max_players]}")
								end
								builder.tag(:p, style: "margin: 0; color: #aaa;") do
									builder.text("#{I18n.t('lobby.map')}: #{room[:map]}")
								end
							end
							
							if room[:current_players] < room[:max_players]
								builder.tag(:button, class: "btn", 
									onclick: "window.liveSocket?.send({type: 'join_room', detail: {room_id: '#{room[:id]}'}})")do
									builder.text(I18n.t('lobby.join'))
								end
							else
								builder.tag(:span, style: "color: #f85032;") do
									builder.text(I18n.t('lobby.full'))
								end
							end
						end
					end
				end
			end
		end
	end

	def render_player_modal(builder)
		builder.tag(:div, id: "player-modal", 
			style: "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999;") do
			builder.tag(:div, style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2a2a2a; padding: 30px; border-radius: 10px; min-width: 300px;") do
				builder.tag(:h2, style: "margin-top: 0;") do
					builder.text(I18n.t('lobby.change_player_id'))
				end
				
				builder.tag(:input, type: "text", id: "new-player-id", value: @player_id,
					style: "width: 100%; padding: 10px; margin: 15px 0; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;")
				
				builder.tag(:div, style: "display: flex; gap: 10px;") do
					builder.tag(:button, class: "btn", onclick: "savePlayerId()") do
						builder.text(I18n.t('lobby.save'))
					end
					builder.tag(:button, class: "btn", style: "background: #666;", 
						onclick: "document.getElementById('player-modal').style.display='none'") do
						builder.text(I18n.t('lobby.cancel'))
					end
				end
			end
		end
		
		builder.tag(:script) do
			builder.raw(<<~JS)
				function savePlayerId() {
					const newId = document.getElementById('new-player-id').value;
					if (newId && newId.trim()) {
						window.liveSocket?.send({
							type: 'change_player_id',
							detail: { player_id: newId.trim() }
						});
						document.getElementById('player-modal').style.display = 'none';
					}
				}
			JS
		end
	end

	# Event handlers
	def handle_navigation(detail)
		view = detail[:view].to_sym
		
		# Stop refresh timer when leaving lobby
		stop_refresh_timer if view != :lobby
		
		case view
		when :room
			@room_id = detail[:room_id]
			load_room_data
		when :game
			@room_id = detail[:room_id]
			initialize_game
		when :lobby
			refresh_rooms
			start_refresh_timer
		end
		
		@view_state = view
		request_update!
	end

	def handle_hash_change(detail)
		view = (detail[:view] || 'lobby').to_sym
		@view_state = view
		
		case view
		when :room
			@room_id = detail[:id]
			load_room_data if @room_id
		when :game
			@room_id = detail[:id]
			initialize_game if @room_id
		when :lobby
			refresh_rooms
			start_refresh_timer
		end
		
		request_update!
	end

	def handle_create_room(detail)
		Async do
			begin
				room = @room_manager.create_room(
					name: detail[:room_name],
					max_players: detail[:max_players].to_i,
					creator_id: @player_id
				)
				
				if room
					@success_message = I18n.t("lobby.messages.room_created", room_id: room[:id])
					@room_id = room[:id]
					@room_data = room
					
					# Navigate to room
					@view_state = :room
					stop_refresh_timer
					
					request_update!
					
					# Update URL hash
					script(<<~JS)
						window.location.hash = '#room/#{room[:id]}';
					JS
				end
			rescue => e
				Console.error(self, "Room creation failed", e)
				@error_message = I18n.t("lobby.messages.room_creation_failed")
				request_update!
			end
		end
	end

	def handle_join_room(detail)
		Async do
			begin
				room_id = detail[:room_id]
				success = @room_manager.join_room(room_id, @player_id, @player_name)
				
				if success
					@room_id = room_id
					@room_data = @room_manager.get_room(room_id)
					@success_message = I18n.t("lobby.messages.joined_room")
					
					# Navigate to room
					@view_state = :room
					stop_refresh_timer
					
					request_update!
					
					# Update URL hash
					script(<<~JS)
						window.location.hash = '#room/#{room_id}';
					JS
				else
					@error_message = I18n.t("lobby.messages.join_failed")
					request_update!
				end
			rescue => e
				Console.error(self, "Join room failed", e)
				@error_message = I18n.t("lobby.messages.join_failed")
				request_update!
			end
		end
	end

	def handle_quick_join
		Async do
			available_room = @active_rooms.find { |r| r[:current_players] < r[:max_players] }
			
			if available_room
				handle_join_room(room_id: available_room[:id])
			else
				@error_message = I18n.t("lobby.messages.no_available_rooms")
				request_update!
			end
		end
	end

	def handle_leave_room
		leave_room
		@view_state = :lobby
		@room_id = nil
		@room_data = nil
		start_refresh_timer
		request_update!
		
		# Update URL hash
		script(<<~JS)
			window.location.hash = '#lobby';
		JS
	end

	def handle_start_game
		return unless @player_id == @room_data[:creator_id]
		
		@view_state = :game
		initialize_game
		request_update!
		
		# Update URL hash
		script(<<~JS)
			window.location.hash = '#game/#{@room_id}';
		JS
	end

	def handle_exit_game
		stop_game
		@view_state = :room
		load_room_data
		request_update!
		
		# Update URL hash
		script(<<~JS)
			window.location.hash = '#room/#{@room_id}';
		JS
	end

	def handle_change_player_id(detail)
		@player_id = detail[:player_id]
		@player_name = @player_id  # For simplicity
		set_player_cookie
		request_update!
	end

	# Helper methods
	def initialize_player
		# Generate or retrieve player ID from cookie
		script(<<~JS)
			(function() {
				function getCookie(name) {
					const value = `; ${document.cookie}`;
					const parts = value.split(`; ${name}=`);
					if (parts.length === 2) return parts.pop().split(';').shift();
					return null;
				}
				
				let playerId = getCookie('cs2d_player_id');
				if (!playerId) {
					playerId = 'Player_' + Math.random().toString(36).substr(2, 9);
					document.cookie = `cs2d_player_id=${playerId}; max-age=${30*24*60*60}; path=/`;
				}
				
				window.liveSocket?.send({
					type: 'change_player_id',
					detail: { player_id: playerId }
				});
			})();
		JS
	end

	def set_player_cookie
		script(<<~JS)
			document.cookie = `cs2d_player_id=#{@player_id}; max-age=${30*24*60*60}; path=/`;
		JS
	end

	def start_refresh_timer
		return unless @view_state == :lobby
		return if @refresh_timer_task
		
		@refresh_timer_task = Async do
			loop do
				sleep @refresh_interval
				break unless @view_state == :lobby && @page
				
				refresh_rooms
			end
		end
	end
	
	def stop_refresh_timer
		if @refresh_timer_task
			@refresh_timer_task.stop
			@refresh_timer_task = nil
		end
	end

	def refresh_rooms
		Async do
			@active_rooms = @room_manager.list_rooms
			# Don't call update here - causes issues
		end
	end

	def load_room_data
		Async do
			@room_data = @room_manager.get_room(@room_id)
			request_update!
		end
	end

	def leave_room
		return unless @room_id
		
		Async do
			@room_manager.leave_room(@room_id, @player_id)
		end
	end

	def initialize_game
		@game_running = true
		# Initialize game state here
	end

	def stop_game
		@game_running = false
		# Clean up game resources here
	end

	def handle_player_move(detail)
		# Handle player movement in game
	end

	def handle_player_shoot(detail)
		# Handle player shooting in game
	end

	def handle_player_action(detail)
		# Handle other player actions in game
	end

	def handle_toggle_ready
		# Handle ready state toggle in room
	end

	# Script injection helper
	def script(javascript)
		return unless @page
		
		@page.execute(<<~JS)
			(function() {
				#{javascript}
			})();
		JS
	end
end

# Application entry point
Application = Lively::Application[FixedUnifiedSPAView]