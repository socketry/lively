# frozen_string_literal: true

require "lively"
require_relative "game/async_redis_room_manager"
require_relative "lib/i18n"
require_relative "lib/cs16_game_state"
require_relative "lib/cs16_hud_components"
require "json"
require "securerandom"
require "async"

# Initialize i18n
I18n.initialize!

# Unified Single-Page Application for CS2D
# Handles lobby, room waiting, and game views in a single Lively application
class UnifiedSPAView < Live::View
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
		
		# URL hash tracking for client-side routing
		@current_hash = ""
		
		# Track if refresh timer is running
		@refresh_timer_task = nil
		@bound = false
	end

	def bind(page)
		super
		@page = page
		
		# Prevent multiple initialization
		return if @bound
		@bound = true
		
		# Initialize player from cookie
		initialize_player
		
		# Start refresh timer for lobby
		start_refresh_timer if @view_state == :lobby
		
		# Initial render
		self.update!
	end

	def close
		stop_refresh_timer
		stop_game if @game_running
		leave_room if @room_id
		super
	end

	def handle(event)
		case event[:type]
		# Navigation events
		when "navigate"
			handle_navigation(event[:detail])
		when "hash_change"
			handle_hash_change(event[:detail])
		when "refresh_room"
			@room_id ||= event[:detail][:room_id]
			load_room_data
			
		# Lobby events
		when "change_locale"
			@locale = event[:detail][:locale].to_sym
			self.update!
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
				builder.raw(<<~CSS
					.notification {
						position: fixed;
						top: 20px;
						right: 20px;
						padding: 15px 20px;
						border-radius: 8px;
						box-shadow: 0 4px 6px rgba(0,0,0,0.3);
						z-index: 10000;
						animation: slideIn 0.3s ease-out;
						font-size: 14px;
						max-width: 400px;
					}
					.notification.success {
						background: linear-gradient(135deg, #4caf50, #45a049);
						color: white;
					}
					.notification.error {
						background: linear-gradient(135deg, #f44336, #da190b);
						color: white;
					}
					@keyframes slideIn {
						from { transform: translateX(400px); opacity: 0; }
						to { transform: translateX(0); opacity: 1; }
					}
					.modal {
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background: rgba(0,0,0,0.8);
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 9999;
					}
					.modal-content {
						background: #2a2a2a;
						padding: 30px;
						border-radius: 12px;
						box-shadow: 0 10px 30px rgba(0,0,0,0.5);
						max-width: 400px;
						width: 90%;
					}
					.btn {
						padding: 10px 20px;
						border: none;
						border-radius: 6px;
						font-size: 14px;
						cursor: pointer;
						transition: all 0.3s;
					}
					.btn-primary {
						background: linear-gradient(135deg, #667eea, #764ba2);
						color: white;
					}
					.btn-primary:hover {
						transform: translateY(-2px);
						box-shadow: 0 4px 12px rgba(102,126,234,0.4);
					}
					.btn-secondary {
						background: #444;
						color: white;
					}
					.btn-danger {
						background: linear-gradient(135deg, #f44336, #da190b);
						color: white;
					}

					/* New layout utilities */
					.container { max-width: 1200px; margin: 0 auto; }
					.header-bar { position: sticky; top: 0; z-index: 10; }
					.layout-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px; }
					@media (max-width: 900px) { .layout-grid { grid-template-columns: 1fr; } }
					.card { background: #2a2a2a; border-radius: 10px; padding: 16px; }
					.card + .card { margin-top: 16px; }
					.section-title { margin: 0 0 12px 0; font-size: 18px; }
					.rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
					.room-card { background: #333; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
					.room-card:hover { background: #3a3a3a; }
					.pill { padding: 2px 8px; border-radius: 999px; font-size: 12px; }
					.pill.ok { background: rgba(76,175,80,0.15); color: #81c784; }
					.pill.warn { background: rgba(255,152,0,0.15); color: #ffb74d; }
					.pill.full { background: rgba(244,67,54,0.15); color: #e57373; }
					.toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
					.input { width: 100%; padding: 10px; background: #333; border: 1px solid #444; border-radius: 6px; color: white; }
					.player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
					.player-item { background: #333; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
					.avatar { width: 28px; height: 28px; border-radius: 50%; background: #555; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 8px; }
					.meta-dim { font-size: 12px; opacity: 0.7; }
				CSS
				)
			end
		end
	end

	def render_routing_script(builder)
		builder.tag(:script) do
			builder.raw(<<~JS)
				// Client-side routing handler
				window.addEventListener('hashchange', function(e) {
					const hash = window.location.hash;
					window.Live?.event('hash_change', { hash: hash });
				});
				
				// Check initial hash on load
				window.addEventListener('DOMContentLoaded', function() {
					const hash = window.location.hash;
					if (hash) {
						window.Live?.event('hash_change', { hash: hash });
					}
				});
				
				// Navigation helper
				window.navigateTo = function(view, params = {}) {
					let hash = '#' + view;
					if (params.room_id) {
						hash += '/' + params.room_id;
					}
					window.location.hash = hash;
				};
			JS
		end
	end

	def render_lobby(builder)
		builder.tag(:div, id: "lobby", style: "height: 100vh; display: flex; flex-direction: column;") do
			# Header
			builder.tag(:div, class: "header-bar", style: "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);") do
				builder.tag(:div, class: "container", style: "display: flex; justify-content: space-between; align-items: center;") do
					builder.tag(:h1, style: "margin: 0; font-size: 28px; display: flex; align-items: center;") do
						builder.text(I18n.t("lobby.title"))
						builder.tag(:span, style: "margin-left: 10px; font-size: 14px; background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;") do
							builder.text(I18n.t("lobby.subtitle"))
						end
					end
					render_player_info(builder)
				end
			end
			
			# Main content
			builder.tag(:div, style: "flex: 1; overflow-y: auto; padding: 20px;") do
				builder.tag(:div, class: "container") do
					# Layout: left controls, right rooms
					builder.tag(:div, class: "layout-grid") do
						# Left column: controls
						builder.tag(:div) do
							builder.tag(:div, class: "card") do
								builder.tag(:h2, class: "section-title") { builder.text(I18n.t("lobby.buttons.create_room")) }
								render_room_creation_form(builder)
							end
							builder.tag(:div, class: "card") do
								builder.tag(:h2, class: "section-title") { builder.text(I18n.t("lobby.buttons.join_room")) }
								render_join_room_form(builder)
							end
							builder.tag(:div, class: "card") do
								builder.tag(:h2, class: "section-title") { builder.text(I18n.t("lobby.stats.active_rooms")) }
								render_stats_bar(builder)
							end
						end
						# Right column: rooms list
						builder.tag(:div) do
							builder.tag(:div, class: "card") do
								render_rooms_list(builder)
							end
						end
					end
				end
			end
		end
	end

	def render_room_waiting(builder)
		builder.tag(:div, id: "room-waiting", style: "height: 100vh; display: flex; flex-direction: column; background: #1a1a1a;") do
			# Header
			builder.tag(:div, class: "header-bar", style: "background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 16px;") do
				builder.tag(:div, class: "container toolbar") do
					# Left: back/leave
					leave_text = begin
						I18n.t('lobby.buttons.leave')
					rescue
						'Leave'
					end
					builder.tag(:button,
						class: "btn btn-danger",
						onclick: "window.Live.event('leave_room', {})") { builder.text(leave_text) }
					# Center: room id + copy
					builder.tag(:div, style: "display:flex; align-items:center; gap:10px;") do
						builder.tag(:h1, style: "margin: 0; font-size: 22px;") { builder.text("Room: #{@room_id}") }
						builder.tag(:button, class: "btn btn-secondary", onclick: "navigator.clipboard.writeText('#{@room_id}')") { builder.text('Copy ID') }
						builder.tag(:button, class: "btn btn-secondary", onclick: "navigator.clipboard.writeText(location.origin + location.pathname + '#room/#{@room_id}')") { builder.text('Copy Invite Link') }
					end
					# Right: ready info
					if @room_data
						ready = (@room_data[:players] || []).count { |p| p[:ready] }
						total = @room_data[:player_count]
						full = total >= (@room_data[:max_players] || total)
						pill_class = full ? 'pill full' : (ready == total ? 'pill ok' : 'pill warn')
						builder.tag(:span, class: pill_class) { builder.text("#{ready}/#{total} ready") }
					end
				end
			end
			
			# Room info
			if @room_data
				builder.tag(:div, class: "container", style: "flex:1; padding: 20px; overflow-y: auto;") do
					# Players list
					builder.tag(:div, class: "card") do
						builder.tag(:h2, class: "section-title") { builder.text("Players (#{@room_data[:player_count]}/#{@room_data[:max_players]})") }
						builder.tag(:div, class: "player-grid") do
							(@room_data[:players] || []).each do |player|
								builder.tag(:div, class: "player-item") do
									builder.tag(:div, style: "display:flex; align-items:center;") do
										initials = (player[:name] || player[:id]).to_s.split(/\s+/).map{|w| w[0]}.join[0,2].upcase
										builder.tag(:span, class: "avatar") { builder.text(initials)
										}
										builder.tag(:div) do
											builder.tag(:div) { builder.text(player[:name] || player[:id]) }
											if player[:id] == @room_data[:creator_id]
												builder.tag(:div, class: "meta-dim") { builder.text('Host') }
											end
										end
									end
									builder.tag(:span, class: (player[:ready] ? 'pill ok' : 'pill warn')) { builder.text(player[:ready] ? 'Ready' : 'Not Ready') }
								end
							end
						end
					end
					
					# Room settings + actions
					builder.tag(:div, class: "card") do
						builder.tag(:h3, class: "section-title") { builder.text("Settings") }
						builder.tag(:div, class: "meta-dim") { builder.text("Map: #{@room_data[:map] || 'de_dust2'} • Status: #{@room_data[:status] || 'waiting'}") }
						builder.tag(:div, class: "toolbar", style: "margin-top:12px;") do
							if @player_id == @room_data[:creator_id]
								all_ready = (@room_data[:players] || []).all? { |p| p[:ready] }
								can_start = (@room_data[:player_count] || 0) >= 2 && all_ready
								attrs = { class: "btn btn-primary", onclick: "window.Live.event('start_game', {})" }
								attrs[:disabled] = true unless can_start
								builder.tag(:button, **attrs) { builder.text("Start Game") }
							else
								builder.tag(:button, class: "btn btn-secondary", onclick: "window.Live.event('toggle_ready', {})") { builder.text("Toggle Ready") }
							end
							builder.tag(:span, class: "meta-dim") { builder.text("Auto-refreshing room…") }
						end
					end
					
					# Auto refresh script
					builder.tag(:script) do
						builder.raw("(function(){ if(window.__roomRefresh) clearInterval(window.__roomRefresh); window.__roomRefresh = setInterval(function(){ window.Live?.event('refresh_room', {room_id: '#{@room_id}'}); }, 5000); })();")
					end
				end
			else
				builder.tag(:div, style: "padding: 20px; text-align: center;") do
					builder.text("Loading room data...")
				end
			end
		end
	end

	def render_game(builder)
		builder.tag(:div, id: "game-container", style: "width: 100vw; height: 100vh; position: relative; background: #000;") do
			# Game canvas
			builder.tag(:canvas, 
				id: "gameCanvas",
				width: "1024",
				height: "768",
				style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 2px solid #333;")
			
			# HUD overlay
			builder.tag(:div, id: "hud", style: "position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;") do
				render_game_hud(builder)
			end
			
			# Exit button
			builder.tag(:button,
				style: "position: absolute; top: 10px; right: 10px; padding: 10px 20px; background: rgba(244,67,54,0.8); color: white; border: none; border-radius: 4px; cursor: pointer; z-index: 1000;",
				onclick: "if(confirm('Exit game?')) window.Live.event('exit_game', {})") do
				builder.text("Exit Game")
			end
			
			# Game initialization script
			render_game_script(builder)
		end
	end

	def render_game_hud(builder)
		builder.tag(:div, style: "position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 4px; pointer-events: auto;") do
			builder.tag(:div, id: "health", style: "color: #4caf50; font-size: 24px; font-weight: bold;") do
				builder.text("Health: 100")
			end
			builder.tag(:div, id: "ammo", style: "color: #fff; font-size: 18px;") do
				builder.text("Ammo: 30/90")
			end
			builder.tag(:div, id: "money", style: "color: #ffd700; font-size: 18px;") do
				builder.text("$800")
			end
		end
	end

	def render_game_script(builder)
		builder.tag(:script) do
			builder.raw(<<~JS)
				(function() {
					const canvas = document.getElementById('gameCanvas');
					const ctx = canvas.getContext('2d');
					
					// Game state
					let gameState = #{(@game_state || {}).to_json};
					let players = #{@players.to_json};
					let currentPlayerId = '#{@player_id}';
					
					// Input handling
					const keys = {};
					let mouseX = 0, mouseY = 0;
					
					document.addEventListener('keydown', (e) => {
						keys[e.key.toLowerCase()] = true;
						sendInput();
					});
					
					document.addEventListener('keyup', (e) => {
						keys[e.key.toLowerCase()] = false;
						sendInput();
					});
					
					canvas.addEventListener('mousemove', (e) => {
						const rect = canvas.getBoundingClientRect();
						mouseX = e.clientX - rect.left;
						mouseY = e.clientY - rect.top;
						sendInput();
					});
					
					canvas.addEventListener('mousedown', (e) => {
						if (e.button === 0) { // Left click
							window.Live?.event('player_shoot', {
								player_id: currentPlayerId,
								angle: Math.atan2(mouseY - canvas.height/2, mouseX - canvas.width/2)
							});
						}
					});
					
					function sendInput() {
						const movement = {
							up: keys['w'] || keys['arrowup'],
							down: keys['s'] || keys['arrowdown'],
							left: keys['a'] || keys['arrowleft'],
							right: keys['d'] || keys['arrowright']
						};
						
						window.Live?.event('player_move', {
							player_id: currentPlayerId,
							movement: movement,
							mouse: { x: mouseX, y: mouseY }
						});
					}
					
					// Render loop
					function render() {
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						
						// Draw background
						ctx.fillStyle = '#222';
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						// Draw grid
						ctx.strokeStyle = '#333';
						ctx.lineWidth = 1;
						for (let i = 0; i < canvas.width; i += 50) {
							ctx.beginPath();
							ctx.moveTo(i, 0);
							ctx.lineTo(i, canvas.height);
							ctx.stroke();
						}
						for (let i = 0; i < canvas.height; i += 50) {
							ctx.beginPath();
							ctx.moveTo(0, i);
							ctx.lineTo(canvas.width, i);
							ctx.stroke();
						}
						
						// Draw players
						for (const playerId in players) {
							const player = players[playerId];
							if (!player.position) continue;
							
							ctx.save();
							ctx.translate(player.position.x, player.position.y);
							
							// Draw player body
							ctx.fillStyle = playerId === currentPlayerId ? '#4caf50' : '#f44336';
							ctx.beginPath();
							ctx.arc(0, 0, 20, 0, Math.PI * 2);
							ctx.fill();
							
							// Draw player name
							ctx.fillStyle = '#fff';
							ctx.font = '12px Arial';
							ctx.textAlign = 'center';
							ctx.fillText(player.name || playerId.substr(0, 8), 0, -30);
							
							// Draw health bar
							const healthPercent = (player.health || 100) / 100;
							ctx.fillStyle = '#000';
							ctx.fillRect(-25, -25, 50, 4);
							ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
							ctx.fillRect(-25, -25, 50 * healthPercent, 4);
							
							ctx.restore();
						}
						
						// Draw crosshair
						ctx.strokeStyle = '#0f0';
						ctx.lineWidth = 2;
						ctx.beginPath();
						ctx.moveTo(mouseX - 10, mouseY);
						ctx.lineTo(mouseX + 10, mouseY);
						ctx.moveTo(mouseX, mouseY - 10);
						ctx.lineTo(mouseX, mouseY + 10);
						ctx.stroke();
						
						requestAnimationFrame(render);
					}
					
					// Update game state from server
					window.updateGameState = function(newState) {
						gameState = newState;
						if (newState.players) {
							players = newState.players;
						}
						
						// Update HUD
						const currentPlayer = players[currentPlayerId];
						if (currentPlayer) {
							document.getElementById('health').textContent = 'Health: ' + (currentPlayer.health || 100);
							document.getElementById('ammo').textContent = 'Ammo: ' + (currentPlayer.ammo || '30/90');
							document.getElementById('money').textContent = '$' + (currentPlayer.money || 800);
						}
					};
					
					// Start render loop
					render();
					
					// Send heartbeat
					setInterval(() => {
						window.Live?.event('player_action', {
							type: 'heartbeat',
							player_id: currentPlayerId
						});
					}, 1000);
				})();
			JS
		end
	end

	def render_player_info(builder)
		builder.tag(:div, style: "display: flex; align-items: center; gap: 15px;") do
			# Player ID display
			builder.tag(:div, style: "background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px;") do
				builder.tag(:span, style: "font-size: 12px; opacity: 0.8;") do
					builder.text("#{I18n.t('lobby.player_id')}: ")
				end
				builder.tag(:span, id: "player-id-display", style: "font-weight: bold;") do
					builder.text(@player_id || "Loading...")
				end
				builder.tag(:button,
					style: "margin-left: 10px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;",
					onclick: "const modal = document.getElementById('player-id-modal'); if (modal) { modal.dataset.userOpened = 'true'; modal.style.display = 'flex'; }") do
					builder.text(I18n.t("lobby.buttons.edit"))
				end
			end
			
			# Language selector
			builder.tag(:select,
				style: "padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer;",
				onchange: "window.Live.event('change_locale', {locale: this.value})") do
				I18n.available_locales.each do |locale|
					builder.tag(:option, value: locale, selected: locale == @locale) do
						builder.text(I18n.locale_name(locale))
					end
				end
			end
		end
		
		# Player ID edit modal
		render_player_id_modal(builder)
	end

	def render_player_id_modal(builder)
		# Ensure modal is always hidden initially
		builder.tag(:div, id: "player-id-modal", class: "modal", style: "display: none !important;", data: { initialized: "false" }) do
			builder.tag(:div, class: "modal-content") do
				builder.tag(:h2, style: "margin-top: 0;") do
					builder.text(I18n.t("lobby.modal.change_player_id"))
				end
				builder.tag(:input,
					type: "text",
					id: "new-player-id",
					value: @player_name || @player_id,
					placeholder: I18n.t("lobby.modal.enter_new_id"),
					style: "width: 100%; padding: 10px; background: #333; border: 1px solid #444; border-radius: 4px; color: white; margin-bottom: 15px;",
					maxlength: "50")
				builder.tag(:div, style: "display: flex; gap: 10px; justify-content: flex-end;") do
					builder.tag(:button,
						class: "btn btn-secondary",
						onclick: "const modal = document.getElementById('player-id-modal'); if (modal) { modal.dataset.userOpened = 'false'; modal.style.display = 'none'; }") do
						builder.text(I18n.t("lobby.buttons.cancel"))
					end
					builder.tag(:button,
						class: "btn btn-primary",
						onclick: "submitNewPlayerId()") do
						builder.text(I18n.t("lobby.buttons.save"))
					end
				end
			end
		end
		
		# Modal script
		builder.tag(:script) do
			builder.raw(<<~JS)
				// Initialize modal only once
				if (!window.modalInitialized) {
					window.modalInitialized = true;
					
					window.submitNewPlayerId = function() {
						const newId = document.getElementById('new-player-id').value.trim();
						if (newId) {
							window.Live.event('change_player_id', {player_name: newId});
							document.getElementById('player-id-modal').style.display = 'none';
						}
					}
					
					// Close modal on background click or ESC
					document.getElementById('player-id-modal').addEventListener('click', function(e) {
						if (e.target === this) {
							this.style.display = 'none';
						}
					});
					
					document.addEventListener('keydown', function(e) {
						if (e.key === 'Escape') {
							const modal = document.getElementById('player-id-modal');
							if (modal && modal.style.display !== 'none') {
								modal.style.display = 'none';
							}
						} else if (e.key === 'Enter') {
							const modal = document.getElementById('player-id-modal');
							if (modal && modal.style.display === 'flex') {
								window.submitNewPlayerId();
							}
						}
					});
				}
				
				// Always ensure modal starts hidden
				setTimeout(() => {
					const modal = document.getElementById('player-id-modal');
					if (modal && !modal.dataset.userOpened) {
						modal.style.display = 'none';
					}
				}, 100);
			JS
		end
	end

	def render_stats_bar(builder)
		builder.tag(:div, style: "background: #2a2a2a; border-radius: 8px; padding: 15px; display: flex; justify-content: space-around;") do
			builder.tag(:div, style: "text-align: center;") do
				builder.tag(:div, style: "font-size: 24px; font-weight: bold; color: #4caf50;") do
					builder.text(@active_rooms.size.to_s)
				end
				builder.tag(:div, style: "font-size: 12px; opacity: 0.8;") do
					builder.text(I18n.t("lobby.stats.active_rooms"))
				end
			end
		end
	end

	def render_action_buttons(builder); end

	def render_room_creation_form(builder)
		builder.tag(:div, id: "create-room-form") do
			builder.tag(:h2, style: "margin-top: 0;") do
				builder.text(I18n.t("lobby.create_room.title"))
			end
			builder.tag(:form, id: "create-form", onsubmit: "event.preventDefault(); createRoom(); return false;") do
				# Hidden player ID field
				builder.tag(:input, type: "hidden", id: "player_id", value: @player_id)
				
				# Room name
				builder.tag(:div, style: "margin-bottom: 15px;") do
					builder.tag(:label, style: "display: block; margin-bottom: 5px;") do
						builder.text(I18n.t("lobby.create_room.room_name"))
					end
					builder.tag(:input,
						type: "text",
						id: "room_name",
						required: true,
						class: "input")
				end
				
				# Max players
				builder.tag(:div, style: "margin-bottom: 15px;") do
					builder.tag(:label, style: "display: block; margin-bottom: 5px;") do
						builder.text(I18n.t("lobby.create_room.max_players"))
					end
					builder.tag(:select,
						id: "max_players",
						class: "input") do
						[2, 4, 6, 8, 10].each do |num|
							builder.tag(:option, value: num, selected: num == 2) do
								builder.text(num.to_s)
							end
						end
					end
				end
				
				# Map selection
				builder.tag(:div, style: "margin-bottom: 15px;") do
					builder.tag(:label, style: "display: block; margin-bottom: 5px;") do
						builder.text(I18n.t("lobby.create_room.map"))
					end
					builder.tag(:select,
						id: "map",
						class: "input") do
						["de_dust2", "de_inferno", "de_mirage", "de_nuke"].each do |map|
							builder.tag(:option, value: map, selected: map == "de_dust2") do
								builder.text(map)
							end
						end
					end
				end
				
				# Submit button
				builder.tag(:button,
					type: "submit",
					class: "btn btn-primary",
					style: "width: 100%;") do
					builder.text(I18n.t("lobby.buttons.create"))
				end
			end
		end
		
		# Create room script
		builder.tag(:script) do
			builder.raw(<<~JS)
				function createRoom() {
					const form = document.getElementById('create-form');
					const data = {
						room_name: form.room_name.value,
						max_players: parseInt(form.max_players.value),
						map: form.map.value,
						player_id: '#{@player_id}'
					};
					window.Live.event('create_room', data);
					form.reset();
					document.getElementById('create-room-form').style.display = 'none';
				}
			JS
		end
	end

	def render_join_room_form(builder)
		builder.tag(:div, id: "join-room-form") do
			builder.tag(:h2, style: "margin-top: 0;") do
				builder.text(I18n.t("lobby.join_room.title"))
			end
			builder.tag(:form, onsubmit: "event.preventDefault(); joinRoomById(); return false;") do
				builder.tag(:div, style: "margin-bottom: 15px;") do
					builder.tag(:label, style: "display: block; margin-bottom: 5px;") do
						builder.text(I18n.t("lobby.join_room.room_id_label"))
					end
					builder.tag(:input,
						type: "text",
						id: "join_room_id",
						placeholder: I18n.t("lobby.join_room.room_id_placeholder"),
						required: true,
						class: "input")
				end
				builder.tag(:button,
					type: "submit",
					class: "btn btn-primary",
					style: "width: 100%;") do
					builder.text(I18n.t("lobby.buttons.join"))
				end
			end
		end
		
		# Join room script
		builder.tag(:script) do
			builder.raw(<<~JS)
				function joinRoomById() {
					const roomId = document.getElementById('join_room_id').value.trim();
					if (roomId) {
						window.Live.event('join_room', {room_id: roomId});
						document.getElementById('join_room_id').value = '';
						document.getElementById('join-room-form').style.display = 'none';
					}
				}
			JS
		end
	end

	def render_rooms_list(builder)
		builder.tag(:div) do
			builder.tag(:div, class: "toolbar", style: "margin-bottom: 10px;") do
				builder.text(I18n.t("lobby.rooms.title"))
				builder.tag(:div, style: "display:flex; gap:8px; align-items:center;") do
					builder.tag(:input, id: "rooms-filter", class: "input", placeholder: "Filter rooms…", oninput: "filterRooms(this.value)")
					builder.tag(:button, class: "btn btn-secondary", style: "font-size: 14px; padding: 6px 10px;", onclick: "window.Live.event('refresh_rooms', {})") { builder.text("🔄 #{I18n.t('lobby.buttons.refresh')}") }
					builder.tag(:button, class: "btn btn-secondary", style: "font-size: 14px; padding: 6px 10px;", onclick: "window.Live.event('quick_join', {})") { builder.text(I18n.t('lobby.buttons.quick_join')) }
				end
			end
			
			if @active_rooms.empty?
				builder.tag(:div, style: "text-align: center; padding: 40px; opacity: 0.6;") do
					builder.text(I18n.t("lobby.rooms.no_rooms"))
				end
			else
				builder.tag(:div, id: "rooms-grid", class: "rooms-grid") do
					@active_rooms.each do |room|
						render_room_card(builder, room)
					end
				end
			end
			# Client-side filter
			builder.tag(:script) do
				builder.raw(<<~JS)
					function filterRooms(q){
						q = (q||'').toLowerCase();
						document.querySelectorAll('#rooms-grid [data-room]').forEach(function(el){
							const name = (el.dataset.name||'').toLowerCase();
							const id = (el.dataset.id||'').toLowerCase();
							el.style.display = (name.includes(q) || id.includes(q)) ? '' : 'none';
						});
					}
				JS
			end
		end
	end

	def render_room_card(builder, room)
		full = room[:player_count].to_i >= room[:max_players].to_i
		pill = full ? 'pill full' : 'pill ok'
		builder.tag(:div,
			class: "room-card",
			data: {room: true, id: room[:id], name: (room[:name] || "Room #{room[:id]}")}) do
			
			builder.tag(:div) do
				builder.tag(:div, style: "font-weight: bold; font-size: 16px; margin-bottom: 5px;") do
					builder.text(room[:name] || "Room #{room[:id]}")
				end
				builder.tag(:div, style: "font-size: 12px; opacity: 0.8;") do
					builder.text("ID: #{room[:id]} | ")
					builder.text("#{I18n.t('lobby.rooms.map')}: #{room[:map]} | ")
					builder.text("#{I18n.t('lobby.rooms.players')}: #{room[:player_count]}/#{room[:max_players]}")
				end
			end
			builder.tag(:div, style: "display:flex; align-items:center; gap:8px;") do
				builder.tag(:span, class: pill) { builder.text(full ? 'Full' : 'Open') }
				attrs = { class: "btn btn-primary", style: "font-size:14px; padding:8px 16px;", onclick: "event.stopPropagation(); window.Live.event('join_room', {room_id: '#{room[:id]}'})" }
				attrs[:disabled] = true if full
				builder.tag(:button, **attrs) { builder.text(I18n.t("lobby.buttons.join")) }
			end
		end
	end

	def render_notifications(builder)
		if @success_message
			builder.tag(:div, id: "success-notification", class: "notification success") do
				builder.text(@success_message)
			end
			builder.tag(:script) do
				builder.raw("setTimeout(() => { const el = document.getElementById('success-notification'); if(el) el.remove(); }, 3000);")
			end
		end
		
		if @error_message
			builder.tag(:div, id: "error-notification", class: "notification error") do
				builder.text(@error_message)
			end
			builder.tag(:script) do
				builder.raw("setTimeout(() => { const el = document.getElementById('error-notification'); if(el) el.remove(); }, 5000);")
			end
		end
	end

	# Handler methods
	def handle_navigation(detail)
		view = detail[:view].to_sym
		@view_state = view
		
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
			leave_room if @room_id
			refresh_rooms
			start_refresh_timer
		end
		
		self.update!
	end

	def handle_hash_change(detail)
		hash = detail[:hash] || ""
		parts = hash.sub(/^#/, "").split("/")
		view = parts[0] || "lobby"
		
		case view
		when "room"
			if parts[1]
				handle_navigation(view: :room, room_id: parts[1])
			end
		when "game"
			if parts[1]
				handle_navigation(view: :game, room_id: parts[1])
			end
		else
			handle_navigation(view: :lobby)
		end
	end

	def handle_create_room(detail)
		Async do
			begin
				room_id = SecureRandom.hex(8)
				room_data = {
					id: room_id,
					name: detail[:room_name],
					creator_id: @player_id,
					max_players: detail[:max_players].to_i,
					map: detail[:map],
					player_count: 1,
					players: [{ id: @player_id, name: @player_name || @player_id, ready: false }],
					status: "waiting",
					created_at: Time.now.to_i
				}
				
				success = @room_manager.create_room(room_id, room_data)
				
				if success
					@success_message = I18n.t("lobby.messages.room_created", room_id: room_id)
					@room_id = room_id
					@room_data = room_data
					
					# Navigate to room view
					@page.script(<<~JS
						window.navigateTo('room', {room_id: '#{room_id}'});
					JS
					)
					
					@view_state = :room
				else
					@error_message = I18n.t("lobby.messages.room_creation_failed")
				end
				
				self.update!
			rescue => e
				Console.logger.error "Error creating room: #{e.message}"
				@error_message = I18n.t("lobby.messages.room_creation_failed")
				self.update!
			end
		end
	end

	def handle_join_room(detail)
		Async do
			begin
				room_id = detail[:room_id]
				room = @room_manager.get_room(room_id)
				
				if room
					if room[:player_count] < room[:max_players]
						# Add player to room
						player_data = { id: @player_id, name: @player_name || @player_id, ready: false }
						success = @room_manager.add_player_to_room(room_id, @player_id, player_data)
						
						if success
							@success_message = I18n.t("lobby.messages.joined_room", room_id: room_id)
							@room_id = room_id
							@room_data = room
							
							# Navigate to room view
							@page.script(<<~JS
								window.navigateTo('room', {room_id: '#{room_id}'});
							JS
							)
							
							@view_state = :room
						else
							@error_message = I18n.t("lobby.messages.join_failed")
						end
					else
						@error_message = I18n.t("lobby.messages.room_full")
					end
				else
					@error_message = I18n.t("lobby.messages.room_not_found", room_id: room_id)
				end
				
				self.update!
			rescue => e
				Console.logger.error "Error joining room: #{e.message}"
				@error_message = I18n.t("lobby.messages.join_failed")
				self.update!
			end
		end
	end

	def handle_quick_join
		Async do
			rooms = @room_manager.list_rooms
			available_room = rooms.find { |r| r[:player_count] < r[:max_players] }
			
			if available_room
				handle_join_room(room_id: available_room[:id])
			else
				@error_message = I18n.t("lobby.messages.no_available_rooms")
				self.update!
			end
		end
	end

	def handle_leave_room
		leave_room
		@page.script("window.navigateTo('lobby');")
		@view_state = :lobby
		stop_refresh_timer
		start_refresh_timer
		self.update!
	end

	def handle_start_game
		return unless @player_id == @room_data[:creator_id]
		
		@page.script("window.navigateTo('game', {room_id: '#{@room_id}'});")
		@view_state = :game
		initialize_game
		self.update!
	end

	def handle_exit_game
		stop_game
		@page.script("window.navigateTo('room', {room_id: '#{@room_id}'});")
		@view_state = :room
		load_room_data
		self.update!
	end

	def handle_change_player_id(detail)
		@player_name = detail[:player_name]
		set_player_cookie
		self.update!
	end

	def handle_player_move(detail)
		return unless @game_running
		
		player = @players[detail[:player_id]]
		return unless player
		
		# Update player position based on movement
		speed = 5
		player[:position] ||= { x: 512, y: 384 }
		
		if detail[:movement][:up]
			player[:position][:y] -= speed
		end
		if detail[:movement][:down]
			player[:position][:y] += speed
		end
		if detail[:movement][:left]
			player[:position][:x] -= speed
		end
		if detail[:movement][:right]
			player[:position][:x] += speed
		end
		
		# Broadcast update to all players
		broadcast_game_state
	end

	def handle_player_shoot(detail)
		return unless @game_running
		
		# Handle shooting logic
		Console.logger.info "Player #{detail[:player_id]} shot at angle #{detail[:angle]}"
		
		# Add bullet, calculate damage, etc.
		# This would be expanded with full game logic
		
		broadcast_game_state
	end

	def handle_player_action(detail)
		# Handle other player actions (reload, buy, etc.)
		case detail[:type]
		when "heartbeat"
			# Keep player alive
			@players[detail[:player_id]][:last_heartbeat] = Time.now
		end
	end

	# Helper methods
	def initialize_player
		@page.script(<<~JS
			// Initialize player from cookie
			function getCookie(name) {
				const value = `; ${document.cookie}`;
				const parts = value.split(`; ${name}=`);
				if (parts.length === 2) return parts.pop().split(';').shift();
				return null;
			}
			
			let playerId = getCookie('cs2d_player_id');
			if (!playerId) {
				playerId = '#{SecureRandom.uuid}';
				document.cookie = `cs2d_player_id=${playerId}; max-age=${30 * 24 * 60 * 60}; path=/`;
			}
			
			window.Live?.event('change_player_id', {player_name: playerId});
		JS
		)
		
		# Set initial player ID
		@player_id = SecureRandom.uuid
	end

	def set_player_cookie
		@page.script(<<~JS
			document.cookie = `cs2d_player_id=#{@player_id}; max-age=#{30 * 24 * 60 * 60}; path=/`;
			document.getElementById('player-id-display').textContent = '#{@player_name || @player_id}';
		JS
		)
	end

	def start_refresh_timer
		return unless @view_state == :lobby
		return if @refresh_timer_task # Don't start if already running
		
		@refresh_timer_task = Async do
			loop do
				sleep @refresh_interval
				break unless @view_state == :lobby
				
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
			# Don't call update! here - let manual refresh or other events trigger updates
			# self.update!
		end
	end

	def load_room_data
		Async do
			@room_data = @room_manager.get_room(@room_id)
			self.update!
		end
	end

	def leave_room
		return unless @room_id
		
		Async do
			@room_manager.remove_player_from_room(@room_id, @player_id)
			@room_id = nil
			@room_data = nil
		end
	end

	def initialize_game
		@game_running = true
		@game_state = {
			room_id: @room_id,
			map: @room_data[:map] || "de_dust2",
			round: 1,
			time_remaining: 120,
			score: { ct: 0, t: 0 }
		}
		
		# Initialize players
		@room_data[:players].each do |player_data|
			@players[player_data[:id]] = {
				id: player_data[:id],
				name: player_data[:name],
				position: { x: 512 + rand(-100..100), y: 384 + rand(-100..100) },
				health: 100,
				ammo: "30/90",
				money: 800,
				team: @players.size.even? ? "ct" : "t",
				alive: true
			}
		end
		
		@current_player = @players[@player_id]
		
		# Start game loop
		start_game_loop
	end

	def stop_game
		@game_running = false
		@game_state = nil
		@players = {}
		@current_player = nil
	end

	def start_game_loop
		Async do
			while @game_running
				sleep 0.05 # 20 FPS server tick
				
				# Update game state
				update_game_physics
				check_collisions
				
				# Broadcast to all players
				broadcast_game_state
			end
		end
	end

	def update_game_physics
		# Update positions, projectiles, etc.
		@players.each do |id, player|
			# Apply physics updates
		end
	end

	def check_collisions
		# Check player-player, player-wall, bullet-player collisions
	end

	def broadcast_game_state
		return unless @page
		
		state_update = {
			players: @players,
			game_state: @game_state
		}
		
		@page.script(<<~JS
			if (window.updateGameState) {
				window.updateGameState(#{state_update.to_json});
			}
		JS
		)
	end
end
