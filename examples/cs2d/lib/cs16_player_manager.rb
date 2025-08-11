# frozen_string_literal: true

# CS 1.6 Classic Player Management Module
# Handles player creation, bot management, and player-related operations
module CS16PlayerManager
	# Player creation with classic CS 1.6 properties
	def create_player(player_id, team, name = nil)
		{
			id: player_id,
			name: name || "Player_#{player_id[0..7]}",
			team: team,
			x: spawn_position_x(team),
			y: spawn_position_y(team),
			angle: default_angle(team),
			health: 100,
			max_health: 100,
			armor: 0,
			max_armor: 100,
			helmet: false,
			alive: true,
			
			# Statistics
			kills: 0,
			deaths: 0,
			assists: 0,
			mvp_stars: 0,
			damage_given: 0,
			damage_taken: 0,
			adr: 0, # Average Damage per Round
			score: 0,
			
			# Economy
			money: 800, # Classic starting money
			
			# Weapons
			primary_weapon: nil,
			secondary_weapon: default_pistol(team),
			current_weapon: "secondary",
			
			# Equipment
			grenades: {
				flashbang: 0, # Max 2
				smoke: 0, # Max 1
				he: 0 # Max 1
			},
			defuse_kit: team == "ct" ? false : nil, # Only CT can have defuse kit
			bomb: false, # Will be assigned to one T player
			
			# Movement and state
			velocity: { x: 0, y: 0 },
			walking: false,
			crouching: false,
			jumping: false,
			reloading: false,
			switching_weapon: false,
			
			# Effects and status
			flash_duration: 0,
			in_smoke: false,
			last_damage_time: 0,
			spawn_protection: 0, # Brief spawn protection
			
			# Buy system
			can_buy: true,
			buy_zone_time: 0,
			last_buy_time: 0,
			
			# Network and performance
			ping: rand(5..50),
			fps: 100 + rand(0..200),
			packet_loss: 0.0,
			
			# AI (for bots)
			is_bot: false,
			skill_level: rand(1..10),
			ai_state: nil,
			ai_data: {}
		}
	end

	# Bot management
	def create_bot_player(bot_id, team, bot_name, skill_level = nil)
		bot = create_player(bot_id, team, bot_name)
		bot[:is_bot] = true
		bot[:skill_level] = skill_level || rand(3..8) # Bots have varied skill levels
		bot[:ping] = rand(10..80) # Bots have slightly higher ping
		
		# Initialize AI state
		bot[:ai_state] = "patrol"
		bot[:ai_data] = {
			patrol_points: generate_patrol_points(team),
			patrol_index: 0,
			state_timer: 0,
			target: nil,
			last_seen_enemy: nil,
			combat_range: 250 + rand(100), # Varied combat range
			reaction_time: 0.2 + (rand * 0.3), # 0.2-0.5 second reaction time
			accuracy: 0.4 + (skill_level || 5) * 0.1, # Skill affects accuracy
			aggression: rand(0.3..0.8) # How aggressive the bot is
		}
		
		bot
	end

	def add_bot_team(team, count = 4)
		bot_names = {
			"ct" => ["Eagle", "Hawk", "Wolf", "Tiger", "Bear"],
			"t" => ["Phoenix", "Viper", "Shadow", "Ghost", "Reaper"]
		}
		
		count.times do |i|
			bot_id = "bot_#{team}_#{i}"
			bot_name = bot_names[team][i] || "Bot#{i + 1}"
			
			bot = create_bot_player(bot_id, team, bot_name)
			
			# Position bots around spawn area
			bot[:x] = spawn_position_x(team) + (i * 40) - 80
			bot[:y] = spawn_position_y(team) + (i * 25) - 50
			
			# One T bot gets the bomb initially
			if team == "t" && i == 0
				bot[:bomb] = true
			end
			
			@game_state[:players][bot_id] = bot
			
			# Initialize economy
			team_money = team == "ct" ? :ct_money : :t_money
			@game_state[:economy][team_money][bot_id] = 800
		end
	end

	# Player utility methods
	def find_player(player_id)
		@game_state[:players][player_id]
	end

	def get_team_players(team)
		@game_state[:players].select { |id, player| player[:team] == team }
	end

	def get_alive_players(team = nil)
		players = team ? get_team_players(team) : @game_state[:players]
		players.select { |id, player| player[:alive] }
	end

	def get_bot_players
		@game_state[:players].select { |id, player| player[:is_bot] }
	end

	def kill_player(player_id, killer_id = nil, weapon = nil, headshot = false)
		player = find_player(player_id)
		killer = killer_id ? find_player(killer_id) : nil
		
		return unless player&.fetch(:alive)
		
		# Update victim stats
		player[:alive] = false
		player[:health] = 0
		player[:deaths] += 1
		
		# Update killer stats
		if killer && killer[:id] != player_id
			killer[:kills] += 1
			killer[:score] += calculate_kill_score(weapon)
			
			# Add money reward for kill
			kill_reward = calculate_kill_reward(weapon)
			killer[:money] = [killer[:money] + kill_reward, @game_state[:economy][:max_money]].min
		end
		
		# Add to killfeed
		add_to_killfeed(killer&.fetch(:name), player[:name], weapon, headshot)
		
		# Check for round end conditions
		check_round_end_conditions
	end

	def respawn_player(player_id, team = nil)
		player = find_player(player_id)
		return unless player
		
		team ||= player[:team]
		
		# Reset player state
		player[:alive] = true
		player[:health] = 100
		player[:armor] = 0
		player[:helmet] = false
		player[:flash_duration] = 0
		player[:damage_given] = 0
		player[:damage_taken] = 0
		player[:spawn_protection] = 2.0 # 2 seconds of spawn protection
		
		# Reset position
		player[:x] = spawn_position_x(team) + rand(-30..30)
		player[:y] = spawn_position_y(team) + rand(-20..20)
		player[:angle] = default_angle(team)
		
		# Reset weapons to default
		player[:primary_weapon] = nil
		player[:secondary_weapon] = default_pistol(team)
		player[:current_weapon] = "secondary"
		player[:grenades] = { flashbang: 0, smoke: 0, he: 0 }
		player[:defuse_kit] = false
		player[:bomb] = false
	end

	def damage_player(player_id, damage, attacker_id = nil, weapon = nil)
		player = find_player(player_id)
		attacker = attacker_id ? find_player(attacker_id) : nil
		
		return unless player&.fetch(:alive) && damage > 0
		
		# Apply armor reduction
		effective_damage = calculate_damage_with_armor(damage, player[:armor], player[:helmet], weapon)
		
		# Apply damage
		player[:health] -= effective_damage
		player[:damage_taken] += effective_damage
		player[:last_damage_time] = Time.now.to_f
		
		# Update attacker stats
		if attacker && attacker[:id] != player_id
			attacker[:damage_given] += effective_damage
		end
		
		# Check if player died
		if player[:health] <= 0
			kill_player(player_id, attacker_id, weapon)
		end
		
		effective_damage
	end

	def heal_player(player_id, amount)
		player = find_player(player_id)
		return unless player
		
		player[:health] = [player[:health] + amount, player[:max_health]].min
	end

	def add_armor(player_id, armor_points, helmet = false)
		player = find_player(player_id)
		return unless player
		
		player[:armor] = [player[:armor] + armor_points, player[:max_armor]].min
		player[:helmet] = helmet if helmet
	end

	def give_weapon(player_id, weapon_id, weapon_type = "primary")
		player = find_player(player_id)
		return unless player
		
		case weapon_type
		when "primary"
			player[:primary_weapon] = weapon_id
			player[:current_weapon] = "primary"
		when "secondary"
			player[:secondary_weapon] = weapon_id
			player[:current_weapon] = "secondary"
		end
	end

	def give_equipment(player_id, equipment_id)
		player = find_player(player_id)
		return unless player
		
		case equipment_id
		when "defuse_kit"
			player[:defuse_kit] = true if player[:team] == "ct"
		when "kevlar"
			player[:armor] = 100
		when "kevlar_helmet"
			player[:armor] = 100
			player[:helmet] = true
		end
	end

	def give_grenade(player_id, grenade_type)
		player = find_player(player_id)
		return unless player
		
		max_grenades = grenade_type == "flashbang" ? 2 : 1
		current = player[:grenades][grenade_type.to_sym] || 0
		
		if current < max_grenades
			player[:grenades][grenade_type.to_sym] = current + 1
			true
		else
			false
		end
	end

	# Player statistics
	def calculate_player_stats(player_id)
		player = find_player(player_id)
		return unless player
		
		# Calculate K/D ratio
		kd_ratio = player[:deaths] > 0 ? player[:kills].to_f / player[:deaths] : player[:kills].to_f
		
		# Calculate ADR (Average Damage per Round)
		rounds_played = [@game_state[:round] - 1, 1].max
		adr = player[:damage_given].to_f / rounds_played
		player[:adr] = adr.round(1)
		
		# Calculate score (kills * 2 + assists - deaths)
		player[:score] = (player[:kills] * 2) + player[:assists] - player[:deaths]
		
		{
			kills: player[:kills],
			deaths: player[:deaths],
			assists: player[:assists],
			kd_ratio: kd_ratio.round(2),
			adr: player[:adr],
			score: player[:score],
			mvp_stars: player[:mvp_stars],
			damage_given: player[:damage_given],
			damage_taken: player[:damage_taken]
		}
	end

	private

	def spawn_position_x(team)
		team == "ct" ? 200 : 1080
	end

	def spawn_position_y(team)
		360
	end

	def default_angle(team)
		team == "ct" ? 0 : Math::PI
	end

	def default_pistol(team)
		team == "ct" ? "usp" : "glock"
	end

	def generate_patrol_points(team)
		if team == "ct"
			[
				{ x: 200, y: 360 }, # CT spawn
				{ x: 400, y: 300 }, # Mid approach
				{ x: 640, y: 200 }, # Mid control
				{ x: 500, y: 400 }, # Lower tunnels
				{ x: 300, y: 200 }  # Upper area
			]
		else
			[
				{ x: 1080, y: 360 }, # T spawn  
				{ x: 900, y: 300 },  # T approach
				{ x: 700, y: 250 },  # Mid approach
				{ x: 800, y: 450 },  # Lower route
				{ x: 950, y: 200 }   # Upper route
			]
		end
	end

	def calculate_kill_score(weapon)
		# Classic CS scoring system
		case weapon
		when "knife"
			1500
		when /pistol|usp|glock|p228|deagle|fiveseven|elite/
			300
		when /rifle|ak47|m4a1|galil|famas|sg552|aug/
			300
		when /smg|mac10|tmp|mp5|ump45|p90/
			600
		when /shotgun|m3|xm1014/
			900
		when /sniper|awp|scout|g3sg1|sg550/
			100
		when "grenade"
			300
		else
			300
		end
	end

	def calculate_kill_reward(weapon)
		classic_rewards = {
			"knife" => 1500,
			"pistol" => 300,
			"smg" => 600,
			"shotgun" => 900,
			"rifle" => 300,
			"sniper" => 100,
			"grenade" => 300
		}
		
		# Determine weapon category
		category = case weapon
		when "knife"
			"knife"
		when /usp|glock|p228|deagle|fiveseven|elite/
			"pistol"
		when /mac10|tmp|mp5|ump45|p90/
			"smg"
		when /m3|xm1014/
			"shotgun"
		when /ak47|m4a1|galil|famas|sg552|aug/
			"rifle"
		when /awp|scout|g3sg1|sg550/
			"sniper"
		when /hegrenade|flashbang|smokegrenade/
			"grenade"
		else
			"rifle" # Default
		end
		
		classic_rewards[category] || 300
	end

	def calculate_damage_with_armor(damage, armor, helmet, weapon)
		# Simplified armor calculation
		if armor > 0
			# Different weapons have different armor penetration
			penetration = case weapon
			when /ak47|awp|deagle/
				0.9 # High penetration
			when /m4a1|aug|sg552/
				0.85
			when /rifle/
				0.8
			when /pistol|smg/
				0.7 # Lower penetration
			else
				0.75 # Default
			end
			
			# Apply armor reduction
			armor_reduction = 0.5 + (penetration * 0.5)
			effective_damage = damage * armor_reduction
		else
			effective_damage = damage
		end
		
		effective_damage.round
	end

	def add_to_killfeed(killer_name, victim_name, weapon, headshot)
		@game_state[:killfeed].unshift({
			killer: killer_name || "Unknown",
			victim: victim_name,
			weapon: weapon || "unknown",
			headshot: headshot || false,
			timestamp: Time.now.to_f
		})
		
		# Keep only last 5 kills
		@game_state[:killfeed] = @game_state[:killfeed].first(5)
	end

	def check_round_end_conditions
		ct_alive = get_alive_players("ct").size
		t_alive = get_alive_players("t").size
		
		if ct_alive == 0
			end_round("t", "elimination")
		elsif t_alive == 0
			end_round("ct", "elimination")
		end
	end
end