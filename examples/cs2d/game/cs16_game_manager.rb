# frozen_string_literal: true

require_relative "weapon_config"
require_relative "economy_manager"
require_relative "bomb_system"
require_relative "grenade_system"
require_relative "buy_menu_system"
require_relative "mvp_round_manager"
require_relative "mvp_player"

# CS 1.6 Complete Game Manager
# Integrates all game systems for a full CS 1.6 experience
class CS16GameManager
	attr_reader :players, :round_manager, :economy_manager, :bomb_system, :grenade_system
	attr_reader :game_state, :match_stats, :current_map
	
	# Game states
	GAME_STATES = {
		waiting: 0,      # Waiting for players
		warmup: 1,       # Warmup phase
		ready: 2,        # Ready to start
		playing: 3,      # Match in progress
		halftime: 4,     # Halftime
		overtime: 5,     # Overtime
		ended: 6         # Match ended
	}.freeze
	
	def initialize(map_name = :de_dust2)
		@current_map = map_name
		@game_state = GAME_STATES[:waiting]
		
		# Initialize all subsystems
		@players = {}
		@round_manager = MVPRoundManager.new(self)
		@economy_manager = EconomyManager.new
		@bomb_system = BombSystem.new
		@grenade_system = GrenadeSystem.new
		@buy_menus = {}
		
		# Match statistics
		@match_stats = {
			rounds_played: 0,
			ct_rounds_won: 0,
			t_rounds_won: 0,
			mvp_players: [],
			first_kills: [],
			clutches: [],
			aces: []
		}
		
		# Round tracking
		@round_in_progress = false
		@round_end_reason = nil
		@alive_players = { ct: [], t: [] }
		
		# Timing
		@last_update_time = Time.now.to_f
		@freeze_time_remaining = 0
	end
	
	def add_player(player_id, name, team)
		return false if @players.key?(player_id)
		
		# Create player
		player = MVPPlayer.new(id: player_id, name: name, team: team)
		@players[player_id] = player
		
		# Initialize economy
		@economy_manager.initialize_player(player_id, team)
		player.money = @economy_manager.get_player_money(player_id)
		
		# Create buy menu
		@buy_menus[player_id] = BuyMenuSystem.new(player)
		
		# Assign spawn position
		assign_spawn_position(player)
		
		true
	end
	
	def remove_player(player_id)
		@players.delete(player_id)
		@buy_menus.delete(player_id)
		check_round_end_conditions
	end
	
	def start_match
		return false unless can_start_match?
		
		@game_state = GAME_STATES[:playing]
		@round_manager.start_game
		start_new_round
		
		true
	end
	
	def update(delta_time = nil)
		# Calculate delta time if not provided
		current_time = Time.now.to_f
		delta_time ||= current_time - @last_update_time
		@last_update_time = current_time
		
		# Don't update if not playing
		return unless @game_state == GAME_STATES[:playing]
		
		# Update round manager
		@round_manager.update(delta_time)
		
		# Update bomb system
		bomb_result = @bomb_system.update(delta_time)
		handle_bomb_explosion if bomb_result == :exploded
		
		# Update grenade system
		@grenade_system.update(delta_time)
		apply_grenade_effects
		
		# Update players
		update_players(delta_time)
		
		# Check round end conditions
		check_round_end_conditions
		
		# Handle buy time
		update_buy_time(delta_time)
	end
	
	def handle_player_action(player_id, action, params = {})
		player = @players[player_id]
		return false unless player
		
		case action
		when :buy
			handle_buy_action(player_id, params)
		when :plant_bomb
			handle_plant_bomb(player_id)
		when :defuse_bomb
			handle_defuse_bomb(player_id)
		when :throw_grenade
			handle_throw_grenade(player_id, params)
		when :shoot
			handle_shoot(player_id, params)
		when :move
			handle_move(player_id, params)
		else
			false
		end
	end
	
	def on_round_end(winning_team, reason)
		# Award round end money
		special_players = {
			bomb_planter: @bomb_system.planter_id,
			bomb_defuser: @bomb_system.defuser_id
		}
		
		@economy_manager.end_round(winning_team, reason, special_players)
		
		# Update player money
		@players.each do |player_id, player|
			player.money = @economy_manager.get_player_money(player_id)
		end
		
		# Update match stats
		case winning_team
		when :ct
			@match_stats[:ct_rounds_won] += 1
		when :t
			@match_stats[:t_rounds_won] += 1
		end
		@match_stats[:rounds_played] += 1
		
		# Check for match end
		check_match_end
		
		# Reset for next round
		reset_round
	end
	
	def get_game_state
		{
			state: GAME_STATES.key(@game_state),
			map: @current_map,
			round: @round_manager.get_state,
			scores: {
				ct: @match_stats[:ct_rounds_won],
				t: @match_stats[:t_rounds_won]
			},
			bomb: @bomb_system.get_state_info,
			players: get_players_state,
			can_buy: @round_manager.can_buy?,
			alive_count: {
				ct: @alive_players[:ct].size,
				t: @alive_players[:t].size
			}
		}
	end
	
	private
	
	def can_start_match?
		# Need at least 1 player per team
		ct_count = @players.values.count { |p| p.team == :ct }
		t_count = @players.values.count { |p| p.team == :t }
		
		ct_count > 0 && t_count > 0
	end
	
	def start_new_round
		@round_in_progress = true
		@round_end_reason = nil
		
		# Reset bomb
		@bomb_system.reset
		
		# Assign bomb to random T player
		t_players = @players.values.select { |p| p.team == :t && p.alive }
		if t_players.any?
			bomb_carrier = t_players.sample
			@bomb_system.assign_carrier(bomb_carrier.id)
		end
		
		# Reset players for round
		@players.each_value do |player|
			player.reset_for_round
			assign_spawn_position(player)
		end
		
		# Update alive players
		update_alive_players
		
		# Set freeze time
		@freeze_time_remaining = MVPRoundManager::FREEZE_TIME
	end
	
	def reset_round
		@round_in_progress = false
		
		# Players keep their money and some equipment (armor)
		# But lose weapons
		@players.each_value do |player|
			# Keep armor if they have it
			armor_value = player.armor
			player.reset_for_round
			player.armor = armor_value if armor_value > 0
		end
	end
	
	def update_players(delta_time)
		@players.each_value do |player|
			player.update(delta_time)
			
			# Check for death from environment
			if player.alive && player.health <= 0
				handle_player_death(player.id, nil, :environment)
			end
		end
	end
	
	def update_buy_time(delta_time)
		# Players can't move during freeze time
		if @round_manager.phase == :freeze
			@freeze_time_remaining -= delta_time
		end
	end
	
	def update_alive_players
		@alive_players[:ct] = @players.values.select { |p| p.team == :ct && p.alive }.map(&:id)
		@alive_players[:t] = @players.values.select { |p| p.team == :t && p.alive }.map(&:id)
	end
	
	def check_round_end_conditions
		return unless @round_in_progress
		return if @round_manager.phase == :ended
		
		update_alive_players
		
		# Check elimination
		if @alive_players[:ct].empty?
			@round_manager.end_round(:t, :elimination)
		elsif @alive_players[:t].empty?
			@round_manager.end_round(:ct, :elimination)
		end
		
		# Check bomb conditions
		if @bomb_system.state == BombSystem::STATES[:exploded]
			@round_manager.end_round(:t, :bomb_exploded)
		elsif @bomb_system.state == BombSystem::STATES[:defused]
			@round_manager.end_round(:ct, :bomb_defused)
		end
		
		# Check time
		if @round_manager.phase == :playing && @round_manager.round_time <= 0
			if @bomb_system.state == BombSystem::STATES[:planted]
				# Bomb is planted, T wins if time runs out
				@round_manager.end_round(:t, :time_expired_with_bomb)
			else
				# No bomb planted, CT wins
				@round_manager.end_round(:ct, :time_expired)
			end
		end
	end
	
	def check_match_end
		# First to 16 rounds wins
		if @match_stats[:ct_rounds_won] >= 16
			end_match(:ct)
		elsif @match_stats[:t_rounds_won] >= 16
			end_match(:t)
		elsif @match_stats[:rounds_played] >= 30
			# Maximum rounds reached
			if @match_stats[:ct_rounds_won] > @match_stats[:t_rounds_won]
				end_match(:ct)
			elsif @match_stats[:t_rounds_won] > @match_stats[:ct_rounds_won]
				end_match(:t)
			else
				# Tie - would go to overtime
				@game_state = GAME_STATES[:overtime]
			end
		end
	end
	
	def end_match(winning_team)
		@game_state = GAME_STATES[:ended]
		# TODO: Show final scoreboard, MVP, stats
	end
	
	def handle_buy_action(player_id, params)
		return false unless @round_manager.can_buy?
		
		player = @players[player_id]
		menu = @buy_menus[player_id]
		return false unless player && menu
		
		if params[:quick_buy]
			# Quick buy preset
			menu.quick_buy(params[:quick_buy])
		elsif params[:menu_key]
			# Navigate buy menu
			menu.handle_input(params[:menu_key])
		elsif params[:weapon]
			# Direct weapon purchase
			weapon_config = WeaponConfig.get_weapon(params[:weapon])
			return false unless weapon_config
			
			if @economy_manager.purchase(player_id, weapon_config[:cost], params[:weapon])
				player.add_weapon(params[:weapon].to_sym)
				player.money = @economy_manager.get_player_money(player_id)
				return true
			end
		end
		
		false
	end
	
	def handle_plant_bomb(player_id)
		player = @players[player_id]
		return false unless player && player.alive
		
		# Check if player has bomb
		return false unless @bomb_system.is_carrier?(player_id)
		
		# Check if in bombsite
		player_pos = { x: player.x, y: player.y }
		site = BombSites.get_nearest_bombsite(player_pos, @current_map)
		return false unless BombSites.is_in_bombsite?(player_pos, @current_map, site)
		
		# Start planting
		@bomb_system.start_planting(player_id, site, player_pos)
		true
	end
	
	def handle_defuse_bomb(player_id)
		player = @players[player_id]
		return false unless player && player.alive && player.team == :ct
		
		# Check if near bomb
		bomb_pos = @bomb_system.get_state_info[:bomb_position]
		return false unless bomb_pos
		
		player_pos = { x: player.x, y: player.y }
		distance = Math.sqrt((bomb_pos[:x] - player_pos[:x])**2 + (bomb_pos[:y] - player_pos[:y])**2)
		return false if distance > 100  # Must be close to bomb
		
		# Start defusing
		has_kit = player.has_defuse_kit?
		@bomb_system.start_defusing(player_id, has_kit)
		true
	end
	
	def handle_throw_grenade(player_id, params)
		player = @players[player_id]
		return false unless player && player.alive
		
		grenade_type = params[:type]
		return false unless [:he_grenade, :flashbang, :smoke_grenade].include?(grenade_type)
		
		# Check if player has grenade
		# TODO: Check player inventory
		
		position = { x: player.x, y: player.y }
		angle = params[:angle] || player.angle
		
		@grenade_system.throw_grenade(grenade_type, player_id, position, angle)
		true
	end
	
	def handle_shoot(player_id, params)
		shooter = @players[player_id]
		return false unless shooter && shooter.alive && shooter.can_shoot?
		
		shooter.shoot
		
		# Check for hit
		target_id = params[:target_id]
		target = @players[target_id]
		return false unless target && target.alive
		
		# Calculate damage
		distance = Math.sqrt((target.x - shooter.x)**2 + (target.y - shooter.y)**2)
		weapon = shooter.current_weapon
		damage = WeaponConfig.calculate_damage(
			weapon[:name], 
			distance, 
			target.armor, 
			params[:headshot]
		)
		
		# Apply damage
		target.take_damage(damage)
		
		# Check for kill
		if target.health <= 0
			handle_player_death(target_id, player_id, weapon[:name])
		end
		
		true
	end
	
	def handle_move(player_id, params)
		player = @players[player_id]
		return false unless player && player.alive
		
		# Can't move during freeze time
		return false if @round_manager.phase == :freeze
		
		player.x = params[:x] if params[:x]
		player.y = params[:y] if params[:y]
		player.angle = params[:angle] if params[:angle]
		
		true
	end
	
	def handle_player_death(victim_id, killer_id, weapon)
		victim = @players[victim_id]
		return unless victim
		
		victim.alive = false
		victim.deaths += 1
		
		if killer_id && killer_id != victim_id
			killer = @players[killer_id]
			if killer
				killer.kills += 1
				
				# Award kill money
				reward = @economy_manager.award_kill(killer_id, victim_id, weapon)
				killer.money = @economy_manager.get_player_money(killer_id)
			end
		end
		
		# Drop bomb if carrier dies
		if @bomb_system.is_carrier?(victim_id)
			@bomb_system.drop_bomb({ x: victim.x, y: victim.y })
		end
		
		# Check round end
		check_round_end_conditions
	end
	
	def handle_bomb_explosion
		# Damage all players in radius
		@players.each_value do |player|
			next unless player.alive
			
			player_pos = { x: player.x, y: player.y }
			damage = @bomb_system.calculate_explosion_damage(player_pos)
			
			if damage > 0
				player.take_damage(damage)
				handle_player_death(player.id, nil, :bomb) if player.health <= 0
			end
		end
	end
	
	def apply_grenade_effects
		@players.each_value do |player|
			next unless player.alive
			
			player_pos = { x: player.x, y: player.y }
			
			# HE damage
			he_damage = @grenade_system.get_he_damage(player_pos)
			if he_damage > 0
				player.take_damage(he_damage)
				handle_player_death(player.id, nil, :hegrenade) if player.health <= 0
			end
			
			# Flash effect
			flash_duration = @grenade_system.get_flash_effect(player_pos, player.angle)
			# TODO: Apply flash blindness to player
			
			# Smoke effect
			in_smoke = @grenade_system.is_in_smoke?(player_pos)
			# TODO: Reduce player visibility if in smoke
		end
	end
	
	def assign_spawn_position(player)
		# Assign spawn based on team and map
		spawn_points = get_spawn_points(player.team)
		spawn = spawn_points.sample
		
		player.x = spawn[:x]
		player.y = spawn[:y]
		player.angle = spawn[:angle]
	end
	
	def get_spawn_points(team)
		# Simplified spawn points - would be map-specific
		case team
		when :ct
			[
				{ x: 100, y: 100, angle: 0 },
				{ x: 150, y: 100, angle: 0 },
				{ x: 100, y: 150, angle: 0 },
				{ x: 150, y: 150, angle: 0 },
				{ x: 125, y: 125, angle: 0 }
			]
		when :t
			[
				{ x: 900, y: 900, angle: Math::PI },
				{ x: 950, y: 900, angle: Math::PI },
				{ x: 900, y: 950, angle: Math::PI },
				{ x: 950, y: 950, angle: Math::PI },
				{ x: 925, y: 925, angle: Math::PI }
			]
		else
			[{ x: 500, y: 500, angle: 0 }]
		end
	end
	
	def get_players_state
		@players.transform_values do |player|
			{
				id: player.id,
				name: player.name,
				team: player.team,
				health: player.health,
				armor: player.armor,
				money: player.money,
				alive: player.alive,
				position: { x: player.x, y: player.y },
				angle: player.angle,
				weapon: player.current_weapon[:name],
				has_bomb: @bomb_system.is_carrier?(player.id),
				has_defuse_kit: player.has_defuse_kit?,
				kills: player.kills,
				deaths: player.deaths
			}
		end
	end
end