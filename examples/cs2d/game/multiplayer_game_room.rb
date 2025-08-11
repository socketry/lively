# frozen_string_literal: true

require_relative "player"
require_relative "bullet"
require_relative "game_state"

class MultiplayerGameRoom
	attr_reader :room_id, :players, :bots, :bullets, :game_state, :room_settings, :room_state
		
	TICK_RATE = 30 # 30 updates per second
	TICK_INTERVAL = 1.0 / TICK_RATE
	MAX_PLAYERS = 10
	
	# Room states
	STATE_WAITING = "waiting"
	STATE_STARTING = "starting" 
	STATE_PLAYING = "playing"
	STATE_FINISHED = "finished"
		
	def initialize(room_id, settings = {})
		@room_id = room_id
		@players = {}
		@bots = {}
		@player_views = {} # Store view references for direct communication
		@bullets = []
		@game_state = GameState.new
		@room_settings = default_room_settings.merge(settings)
		@room_state = STATE_WAITING
				
		# Network optimization
		@last_state_snapshot = {}
		@state_history = [] # For lag compensation
		@tick_count = 0
		@last_tick_time = Time.now
				
		# Authoritative game state
		@authoritative_state = {
						tick: 0,
						timestamp: Time.now.to_f * 1000,
						players: {},
						bullets: [],
						round_info: {},
						game_events: []
				}
				
		# Room management
		@vote_kicks = {}
		@team_balance_enabled = true
				
		# Start the game loop
		# Disabled: Game loop causes async context issues with Live framework
		# Updates will be triggered by player actions instead
		# start_game_loop
	end
		
	def add_player(player_id, view)
		return false if (@players.size + @bots.size) >= MAX_PLAYERS
				
		# Auto-balance teams
		team = determine_team_for_new_player
				
		player = Player.new(
						id: player_id,
						name: generate_player_name(player_id),
						team: team,
						x: get_spawn_position(team)[:x],
						y: get_spawn_position(team)[:y]
				)
				
		@players[player_id] = player
		@player_views[player_id] = view
				
		broadcast_to_all_players({
						type: "player_joined",
						player: player_data(player),
						room_info: get_room_info,
						timestamp: Time.now.to_f * 1000
				})
				
		# Send full state to new player
		view.send_message({
						type: "full_game_state",
						state: get_full_state,
						your_player_id: player_id,
						timestamp: Time.now.to_f * 1000
				})
				
		true
	end
		
	def remove_player(player_id)
		player = @players.delete(player_id)
		@player_views.delete(player_id)
		@vote_kicks.delete(player_id)
				
		if player
			broadcast_to_all_players({
								type: "player_left",
								player_id: player_id,
								player_name: player.name,
								timestamp: Time.now.to_f * 1000
						})
		end
				
		check_round_end_conditions
	end
		
	def get_player(player_id)
		@players[player_id]
	end
		
	def get_player_view(player_id)
		@player_views[player_id]
	end
	
	# Bot management methods
	def add_bot(bot_id, bot_name = nil, difficulty = "normal")
		return false if (@players.size + @bots.size) >= MAX_PLAYERS
		
		# Auto-balance teams
		team = determine_team_for_new_player
		
		bot = Player.new(
			id: bot_id,
			name: bot_name || generate_bot_name(bot_id),
			team: team,
			x: get_spawn_position(team)[:x],
			y: get_spawn_position(team)[:y],
			is_bot: true,
			bot_difficulty: difficulty
		)
		
		@bots[bot_id] = bot
		
		broadcast_to_all_players({
			type: "bot_joined",
			bot: player_data(bot),
			room_info: get_room_info,
			timestamp: Time.now.to_f * 1000
		})
		
		true
	end
	
	def remove_bot(bot_id)
		bot = @bots.delete(bot_id)
		
		if bot
			broadcast_to_all_players({
				type: "bot_left",
				bot_id: bot_id,
				bot_name: bot.name,
				timestamp: Time.now.to_f * 1000
			})
		end
		
		check_round_end_conditions
	end
	
	def get_bot(bot_id)
		@bots[bot_id]
	end
	
	def get_all_entities
		@players.merge(@bots)
	end
		
	def process_movement(player_id, input)
		player = @players[player_id]
		return { success: false } unless player && !player.dead?
				
		# Extract movement input
		dx = input[:dx] || 0
		dy = input[:dy] || 0
				
		# Apply movement with collision detection
		old_position = { x: player.x, y: player.y }
		new_x = player.x + dx
		new_y = player.y + dy
				
		# Validate movement (bounds checking, collision detection)
		if valid_position?(new_x, new_y, player_id)
			player.x = new_x.clamp(20, 1260)
			player.y = new_y.clamp(20, 700)
			player.last_update = Time.now
						
			# Update authoritative state
			update_player_in_authoritative_state(player_id, player)
						
			return {
								success: true,
								position: { x: player.x, y: player.y },
								old_position: old_position
						}
		else
			return {
								success: false,
								position: old_position,
								reason: "invalid_position"
						}
		end
	end
		
	def process_shoot(player_id, angle, timestamp)
		player = @players[player_id]
		return { success: false } unless player && !player.dead? && player.can_shoot?
				
		weapon = player.current_weapon
				
		# Create bullet with server-authoritative ID
		bullet_id = "#{@tick_count}_#{player_id}_#{Time.now.to_i}"
		bullet = Bullet.new(
						id: bullet_id,
						owner_id: player_id,
						x: player.x,
						y: player.y,
						angle: angle,
						damage: weapon[:damage],
						speed: weapon[:bullet_speed],
						penetration: weapon[:penetration]
				)
				
		@bullets << bullet
		player.shoot!
				
		# Check for immediate hits with lag compensation
		hits = check_bullet_hits(bullet, timestamp)
				
		{
						success: true,
						bullet_id: bullet_id,
						position: { x: player.x, y: player.y },
						hits: hits
				}
	end
		
	def process_reload(player_id)
		player = @players[player_id]
		return { success: false } unless player && !player.dead?
				
		if player.can_reload?
			player.reload!
			{
								success: true,
								reload_time: player.current_weapon[:reload_time]
						}
		else
			{
								success: false,
								reason: "cannot_reload"
						}
		end
	end
		
	def change_team(player_id, new_team)
		player = @players[player_id]
		return unless player
		return unless [:ct, :t].include?(new_team.to_sym)
				
		old_team = player.team
		player.team = new_team.to_sym
		player.reset_for_new_round
				
		broadcast_to_all_players({
						type: "team_changed",
						player_id: player_id,
						old_team: old_team,
						new_team: new_team,
						timestamp: Time.now.to_f * 1000
				})
	end
		
	def buy_weapon(player_id, weapon_name)
		player = @players[player_id]
		return false unless player && !player.dead? && @game_state.buy_time?
				
		weapon_info = WEAPONS[weapon_name.to_sym]
		return false unless weapon_info
				
		if player.money >= weapon_info[:price]
			player.money -= weapon_info[:price]
			player.add_weapon(weapon_name.to_sym)
						
			broadcast_to_all_players({
								type: "weapon_purchased",
								player_id: player_id,
								weapon: weapon_name,
								player_money: player.money,
								timestamp: Time.now.to_f * 1000
						})
						
			true
		else
			false
		end
	end
		
	def plant_bomb(player_id)
		player = @players[player_id]
		return false unless player && player.team == :t && !player.dead?
				
		# Check if player is in bomb site
		bomb_site = get_bomb_site_at_position(player.x, player.y)
		return false unless bomb_site
				
		@game_state.start_bomb_plant(player_id, bomb_site)
				
		broadcast_to_all_players({
						type: "bomb_plant_started",
						player_id: player_id,
						bomb_site: bomb_site,
						plant_time: 3.0,
						timestamp: Time.now.to_f * 1000
				})
				
		true
	end
		
	def defuse_bomb(player_id)
		player = @players[player_id]
		return false unless player && player.team == :ct && !player.dead?
		return false unless @game_state.bomb_planted?
				
		defuse_time = player.has_defuse_kit ? 5.0 : 10.0
		@game_state.start_bomb_defuse(player_id, defuse_time)
				
		broadcast_to_all_players({
						type: "bomb_defuse_started",
						player_id: player_id,
						defuse_time: defuse_time,
						timestamp: Time.now.to_f * 1000
				})
				
		true
	end
		
	def vote_kick(voter_id, target_id)
		return false unless @players[voter_id] && @players[target_id]
				
		@vote_kicks[target_id] ||= []
		@vote_kicks[target_id] << voter_id unless @vote_kicks[target_id].include?(voter_id)
				
		required_votes = (@players.size / 2.0).ceil
				
		if @vote_kicks[target_id].size >= required_votes
			kick_player(target_id)
			@vote_kicks.delete(target_id)
			true
		else
			broadcast_to_all_players({
								type: "vote_kick_update",
								target_id: target_id,
								votes: @vote_kicks[target_id].size,
								required: required_votes,
								timestamp: Time.now.to_f * 1000
						})
			false
		end
	end
		
	def broadcast_to_all_players(message)
		@player_views.each do |player_id, view|
			view.send_message(message)
		end
	end
		
	def get_full_state
		{
						tick: @tick_count,
						timestamp: Time.now.to_f * 1000,
						players: players_data,
						bullets: bullets_data,
						round_info: {
								time_left: @game_state.round_time_left,
								phase: @game_state.current_phase,
								scores: @game_state.scores,
								round_number: @game_state.round_number
						},
						bomb_info: @game_state.bomb_info,
						room_settings: @room_settings
				}
	end
		
	def get_room_info
		{
						room_id: @room_id,
						player_count: @players.size,
						max_players: MAX_PLAYERS,
						map: @room_settings[:map],
						game_mode: @room_settings[:game_mode],
						round_time: @room_settings[:round_time],
						players: @players.values.map { |p| { id: p.id, name: p.name, team: p.team } }
				}
	end
		
	def apply_lag_compensation(target_time)
		# Store current state
		@pre_rollback_state = deep_copy_state
				
		# Find the appropriate historical state
		target_state = find_state_at_time(target_time)
		return unless target_state
				
		# Rollback to that state
		restore_state(target_state)
	end
		
	def restore_current_state
		return unless @pre_rollback_state
				
		restore_state(@pre_rollback_state)
		@pre_rollback_state = nil
	end
		
	def reconcile_client_state(player_id, predicted_state, sequence)
		player = @players[player_id]
		return unless player
				
		# Compare client prediction with server state
		server_position = { x: player.x, y: player.y }
		client_position = predicted_state[:position]
				
		# If there's a significant difference, send correction
		distance = Math.sqrt(
						(server_position[:x] - client_position[:x]) ** 2 +
						(server_position[:y] - client_position[:y]) ** 2
				)
				
		if distance > 10 # Tolerance threshold
			get_player_view(player_id)&.send_message({
								type: "position_correction",
								sequence: sequence,
								authoritative_position: server_position,
								timestamp: Time.now.to_f * 1000
						})
		end
	end
		
	def empty?
		@players.empty?
	end
		
	def cleanup
		@game_loop_thread&.kill
	end
		
		private
		
	def start_game_loop
		@game_loop_thread = Thread.new do
			loop do
				start_time = Time.now
								
				update_game_state
				broadcast_state_updates
								
				# Maintain consistent tick rate
				elapsed = Time.now - start_time
				sleep_time = TICK_INTERVAL - elapsed
				sleep(sleep_time) if sleep_time > 0
								
				@tick_count += 1
				@last_tick_time = Time.now
			end
				rescue => e
					puts "Game loop error: #{e.message}"
					puts e.backtrace
		end
	end
		
	def update_game_state
		# Update bullets
		update_bullets
				
		# Update game state (round timer, bomb timer, etc.)
		@game_state.update(TICK_INTERVAL)
				
		# Check win conditions
		check_round_end_conditions
				
		# Store state snapshot for lag compensation
		store_state_snapshot if (@tick_count % 5) == 0 # Store every 5 ticks
				
		# Clean up old state history (keep last 2 seconds)
		cleanup_old_state_history
	end
		
	def update_bullets
		@bullets.each do |bullet|
			bullet.update
						
			# Check for hits
			@players.each do |id, player|
				next if id == bullet.owner_id
				next if player.dead?
								
				if bullet.hits?(player.x, player.y, 15)
					process_bullet_hit(bullet, player)
				end
			end
		end
				
		# Remove expired bullets
		@bullets.reject! { |b| b.hit || b.out_of_bounds? }
	end
		
	def process_bullet_hit(bullet, player)
		return if bullet.hit
				
		damage = calculate_damage(bullet, player)
		player.take_damage(damage)
		bullet.hit = true
				
		# Award kill money and update stats
		if player.dead?
			killer = @players[bullet.owner_id]
			if killer
				killer.money += 300
				killer.kills += 1
			end
						
			broadcast_to_all_players({
								type: "player_killed",
								victim_id: player.id,
								killer_id: bullet.owner_id,
								weapon: killer&.current_weapon&.[](:name),
								timestamp: Time.now.to_f * 1000
						})
		else
			broadcast_to_all_players({
								type: "player_hit",
								victim_id: player.id,
								damage: damage,
								health_remaining: player.health,
								timestamp: Time.now.to_f * 1000
						})
		end
	end
		
	def broadcast_state_updates
		# Create delta update (only send changes)
		current_state = create_state_snapshot
		delta_update = calculate_delta_update(@last_state_snapshot, current_state)
				
		if delta_update[:has_changes]
			message = {
								type: "game_state_delta",
								tick: @tick_count,
								timestamp: Time.now.to_f * 1000,
								delta: delta_update[:delta]
						}
						
			broadcast_to_all_players(message)
		end
				
		@last_state_snapshot = current_state
	end
		
	def create_state_snapshot
		{
						players: @players.transform_values { |p| player_data(p) },
						bullets: @bullets.map { |b| bullet_data(b) },
						round_time: @game_state.round_time_left,
						scores: @game_state.scores,
						game_events: @game_state.recent_events
				}
	end
		
	def calculate_delta_update(old_state, new_state)
		delta = {}
		has_changes = false
				
		# Check for player changes
		if old_state[:players] != new_state[:players]
			delta[:players] = new_state[:players]
			has_changes = true
		end
				
		# Check for bullet changes
		if old_state[:bullets] != new_state[:bullets]
			delta[:bullets] = new_state[:bullets]
			has_changes = true
		end
				
		# Check for round time changes
		if old_state[:round_time] != new_state[:round_time]
			delta[:round_time] = new_state[:round_time]
			has_changes = true
		end
				
		# Check for score changes
		if old_state[:scores] != new_state[:scores]
			delta[:scores] = new_state[:scores]
			has_changes = true
		end
				
		# Always include new game events
		if new_state[:game_events] && !new_state[:game_events].empty?
			delta[:game_events] = new_state[:game_events]
			has_changes = true
		end
				
		{ has_changes: has_changes, delta: delta }
	end
		
	def check_round_end_conditions
		return unless @game_state.round_active?
				
		ct_alive = @players.values.count { |p| p.team == :ct && !p.dead? }
		t_alive = @players.values.count { |p| p.team == :t && !p.dead? }
				
		if ct_alive == 0 && t_alive > 0
			end_round(:t, "elimination")
		elsif t_alive == 0 && ct_alive > 0
			end_round(:ct, "elimination")
		elsif @game_state.round_time_left <= 0
			end_round(:ct, "time")
		elsif @game_state.bomb_exploded?
			end_round(:t, "bomb_explosion")
		elsif @game_state.bomb_defused?
			end_round(:ct, "bomb_defused")
		end
	end
		
	def end_round(winning_team, reason)
		@game_state.end_round(winning_team, reason)
				
		# Award money
		award_round_money(winning_team, reason)
				
		broadcast_to_all_players({
						type: "round_ended",
						winning_team: winning_team,
						reason: reason,
						scores: @game_state.scores,
						round_number: @game_state.round_number,
						timestamp: Time.now.to_f * 1000
				})
				
		# Start new round after delay
		Thread.new do
			sleep(5) # 5 second delay
			start_new_round
		end
	end
		
	def start_new_round
		@bullets.clear
				
		@players.each do |_, player|
			player.reset_for_new_round
			spawn_pos = get_spawn_position(player.team)
			player.x = spawn_pos[:x]
			player.y = spawn_pos[:y]
		end
				
		@game_state.start_new_round
				
		broadcast_to_all_players({
						type: "round_started",
						round_number: @game_state.round_number,
						buy_time: @game_state.buy_time,
						timestamp: Time.now.to_f * 1000
				})
	end
		
	def award_round_money(winning_team, reason)
		case reason
		when "elimination", "bomb_defused"
			award_team_money(winning_team, 3250)
			award_team_money(winning_team == :ct ? :t : :ct, 1400)
		when "time"
			award_team_money(:ct, 3250)
			award_team_money(:t, 1400)
		when "bomb_explosion"
			award_team_money(:t, 3500)
			award_team_money(:ct, 1400)
		end
	end
		
	def award_team_money(team, amount)
		@players.values.select { |p| p.team == team }.each do |player|
			player.money = [player.money + amount, 16000].min
		end
	end
		
	def player_data(player)
		{
						id: player.id,
						name: player.name,
						team: player.team,
						x: player.x,
						y: player.y,
						health: player.health,
						armor: player.armor,
						money: player.money,
						kills: player.kills,
						deaths: player.deaths,
						dead: player.dead?,
						weapon: player.current_weapon[:name],
						ammo: player.ammo_info
				}
	end
		
	def bullet_data(bullet)
		{
						id: bullet.id,
						x: bullet.x,
						y: bullet.y,
						angle: bullet.angle,
						owner_id: bullet.owner_id
				}
	end
		
	def bullets_data
		@bullets.map { |bullet| bullet_data(bullet) }
	end
		
	def players_data
		@players.transform_values { |player| player_data(player) }
	end
		
	def determine_team_for_new_player
		return :ct if @team_balance_enabled.nil?
		return :ct if @players.empty?
				
		ct_count = @players.values.count { |p| p.team == :ct }
		t_count = @players.values.count { |p| p.team == :t }
				
		ct_count <= t_count ? :ct : :t
	end
		
	def generate_player_name(player_id)
		"Player#{player_id[0..4]}"
	end
		
	def get_spawn_position(team)
		spawn_points = team == :ct ? ct_spawn_points : t_spawn_points
		spawn_points.sample
	end
		
	def ct_spawn_points
		[
						{ x: 100, y: 100 },
						{ x: 150, y: 100 },
						{ x: 100, y: 150 },
						{ x: 150, y: 150 },
						{ x: 125, y: 125 }
				]
	end
		
	def t_spawn_points
		[
						{ x: 1100, y: 600 },
						{ x: 1150, y: 600 },
						{ x: 1100, y: 650 },
						{ x: 1150, y: 650 },
						{ x: 1125, y: 625 }
				]
	end
		
	def valid_position?(x, y, player_id)
		# Basic bounds checking
		return false if x < 20 || x > 1260 || y < 20 || y > 700
				
		# Check collision with other players (simple)
		@players.each do |id, player|
			next if id == player_id || player.dead?
						
			distance = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2)
			return false if distance < 25 # Players can't overlap
		end
				
		true
	end
		
	def get_bomb_site_at_position(x, y)
		bomb_sites = [
						{ id: :a, x: 200, y: 200, radius: 50 },
						{ id: :b, x: 1000, y: 500, radius: 50 }
				]
				
		bomb_sites.each do |site|
			distance = Math.sqrt((x - site[:x]) ** 2 + (y - site[:y]) ** 2)
			return site[:id] if distance <= site[:radius]
		end
				
		nil
	end
		
	def kick_player(player_id)
		player = @players[player_id]
		return unless player
				
		broadcast_to_all_players({
						type: "player_kicked",
						player_id: player_id,
						player_name: player.name,
						timestamp: Time.now.to_f * 1000
				})
				
		remove_player(player_id)
	end
		
	def calculate_damage(bullet, player)
		# Base damage
		damage = bullet.damage
				
		# Distance falloff (simplified)
		distance = Math.sqrt((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2)
		if distance > 500
			damage *= 0.8
		elsif distance > 1000
			damage *= 0.6
		end
				
		# Armor reduction
		if player.armor > 0
			damage *= 0.5
		end
				
		damage.to_i
	end
		
	def store_state_snapshot
		snapshot = {
						timestamp: Time.now.to_f * 1000,
						tick: @tick_count,
						players: @players.transform_values { |p| { x: p.x, y: p.y, health: p.health } },
						bullets: @bullets.map { |b| { x: b.x, y: b.y, angle: b.angle } }
				}
				
		@state_history << snapshot
	end
		
	def cleanup_old_state_history
		cutoff_time = (Time.now.to_f * 1000) - 2000 # 2 seconds
		@state_history.reject! { |state| state[:timestamp] < cutoff_time }
	end
		
	def find_state_at_time(target_time)
		@state_history.reverse.find { |state| state[:timestamp] <= target_time }
	end
		
	def deep_copy_state
		{
						players: @players.transform_values { |p| { x: p.x, y: p.y, health: p.health } },
						bullets: @bullets.map { |b| { x: b.x, y: b.y, angle: b.angle, hit: b.hit } }
				}
	end
		
	def restore_state(state)
		# Restore player positions
		state[:players].each do |id, player_state|
			next unless @players[id]
						
			@players[id].x = player_state[:x]
			@players[id].y = player_state[:y]
			@players[id].health = player_state[:health] if player_state[:health]
		end
				
		# Restore bullet positions (if needed)
		if state[:bullets]
			@bullets.each_with_index do |bullet, index|
				if bullet_state = state[:bullets][index]
					bullet.x = bullet_state[:x]
					bullet.y = bullet_state[:y]
					bullet.angle = bullet_state[:angle]
					bullet.hit = bullet_state[:hit] if bullet_state.key?(:hit)
				end
			end
		end
	end
		
	def check_bullet_hits(bullet, timestamp)
		hits = []
				
		# Use lag compensation for hit detection
		apply_lag_compensation(timestamp)
				
		@players.each do |id, player|
			next if id == bullet.owner_id || player.dead?
						
			if bullet.hits?(player.x, player.y, 15)
				hits << {
										player_id: id,
										damage: calculate_damage(bullet, player),
										position: { x: player.x, y: player.y }
								}
			end
		end
				
		restore_current_state
		hits
	end
		
	def update_player_in_authoritative_state(player_id, player)
		@authoritative_state[:players][player_id] = {
						x: player.x,
						y: player.y,
						health: player.health,
						armor: player.armor,
						weapon: player.current_weapon[:name],
						last_update: Time.now.to_f * 1000
				}
	end
		
	# Room state management
	def can_start_game?
		total_players = @players.size + @bots.size
		total_players >= 2 && @room_state == STATE_WAITING
	end
	
	def start_game
		return false unless can_start_game?
		
		@room_state = STATE_PLAYING
		@game_state.start_new_round
		
		broadcast_to_all_players({
			type: "game_started",
			room_state: @room_state,
			timestamp: Time.now.to_f * 1000
		})
		
		true
	end
	
	def end_game
		@room_state = STATE_FINISHED
		
		broadcast_to_all_players({
			type: "game_ended",
			room_state: @room_state,
			timestamp: Time.now.to_f * 1000
		})
	end
	
	def reset_room
		@room_state = STATE_WAITING
		@players.clear
		@bots.clear
		@player_views.clear
		@bullets.clear
		@game_state = GameState.new
	end
	
	def can_add_player?
		(@players.size + @bots.size) < MAX_PLAYERS && @room_state == STATE_WAITING
	end
	
	def empty?
		@players.empty? && @bots.empty?
	end
	
	def get_player_list
		@players.map do |id, player|
			{
				id: id,
				name: player.name,
				team: player.team,
				is_bot: false,
				health: player.health,
				money: player.money
			}
		end
	end
	
	def get_bot_list  
		@bots.map do |id, bot|
			{
				id: id,
				name: bot.name,
				team: bot.team,
				is_bot: true,
				difficulty: bot.bot_difficulty || "normal",
				health: bot.health
			}
		end
	end
	
	def get_room_info
		{
			room_id: @room_id,
			state: @room_state,
			player_count: @players.size,
			bot_count: @bots.size,
			max_players: MAX_PLAYERS,
			settings: @room_settings
		}
	end
	
	def generate_bot_name(bot_id)
		bot_names = [
			"Alpha", "Bravo", "Charlie", "Delta", "Echo", 
			"Foxtrot", "Golf", "Hotel", "India", "Juliet"
		]
		bot_names.sample || "Bot_#{bot_id.split('_').last}"
	end
	
	def cleanup
		# Clean up any resources when room is destroyed
		@players.clear
		@bots.clear
		@player_views.clear
		@bullets.clear
	end

	def default_room_settings
		{
						map: "de_dust2",
						max_rounds: 30,
						round_time: 115, # seconds
						buy_time: 20,   # seconds
						game_mode: "competitive",
						friendly_fire: false,
						auto_balance: true
				}
	end
		
	WEAPONS = {
				glock: { name: "Glock-18", price: 400, damage: 28, rate: 0.15, magazine: 20, bullet_speed: 20, penetration: 1 },
				usp: { name: "USP-S", price: 500, damage: 35, rate: 0.17, magazine: 12, bullet_speed: 20, penetration: 1 },
				deagle: { name: "Desert Eagle", price: 700, damage: 48, rate: 0.225, magazine: 7, bullet_speed: 25, penetration: 2 },
				ak47: { name: "AK-47", price: 2700, damage: 36, rate: 0.1, magazine: 30, bullet_speed: 22, penetration: 2 },
				m4a1: { name: "M4A1", price: 3100, damage: 33, rate: 0.09, magazine: 30, bullet_speed: 23, penetration: 2 },
				awp: { name: "AWP", price: 4750, damage: 115, rate: 1.45, magazine: 10, bullet_speed: 30, penetration: 3 },
				mp5: { name: "MP5", price: 1500, damage: 26, rate: 0.075, magazine: 30, bullet_speed: 20, penetration: 1 },
				p90: { name: "P90", price: 2350, damage: 26, rate: 0.07, magazine: 50, bullet_speed: 21, penetration: 1 }
		}.freeze
end