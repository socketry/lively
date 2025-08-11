# frozen_string_literal: true

# CS 1.6 Classic Game State Management Module
# Handles game state initialization and management for CS16 Classic
module CS16GameState
	def initialize_game_state
		@game_state = {
			players: {},
			phase: "warmup",
			round_time: 115, # 1:55 classic round time
			freeze_time: 15, # Classic 15 second freeze time
			buy_time: 90, # Can buy for 90 seconds from round start
			ct_score: 0,
			t_score: 0,
			round: 1,
			max_rounds: 30,
			half_time_round: 15, # Switch sides at round 15
			consecutive_losses: { ct: 0, t: 0 }, # Track for loss bonus
			bomb: {
				planted: false,
				time_left: 35, # Classic C4 timer: 35 seconds
				x: nil,
				y: nil,
				planter_id: nil,
				site: nil,
				plant_time: 3, # 3 seconds to plant
				defuse_time: 10, # 10 seconds without kit
				defuse_time_kit: 5 # 5 seconds with kit
			},
			economy: {
				starting_money: 800,
				max_money: 16000,
				ct_money: {},
				t_money: {},
				round_bonuses: {
					win_elimination: 3250,
					win_bomb_defused: 3500,
					win_bomb_exploded: 3500,
					win_time_expired_ct: 3250,
					loss_base: 1400,
					loss_increment: 500,
					loss_max: 3400,
					plant_bonus: 800, # T team gets bonus for planting
					defuse_bonus: 300 # Individual defuser bonus
				}
			},
			weapons: {},
			grenades: [],
			smoke_areas: [],
			flash_effects: [],
			map: "de_dust2",
			server_tick: 0,
			tick_rate: 64, # Classic 64 tick servers
			killfeed: [],
			chat_messages: [],
			mvp_player: nil,
			team_damage_enabled: false, # Classic: no team damage in competitive
			collision_enabled: true # Classic: player collision is on
		}
	end

	def create_classic_player(id, team)
		{
			id: id,
			name: "Player_#{id[0..7]}",
			team: team,
			x: team == "ct" ? 200 : 1080,
			y: team == "ct" ? 360 : 360,
			angle: 0,
			health: 100,
			armor: 0, # Start with no armor
			helmet: false,
			alive: true,
			kills: 0,
			deaths: 0,
			assists: 0,
			mvp_stars: 0,
			money: 800, # Classic starting money
			primary_weapon: nil, # Start with no primary
			secondary_weapon: team == "ct" ? "usp" : "glock", # Default pistols
			current_weapon: "secondary",
			grenades: {
				flashbang: 0, # Max 2
				smoke: 0, # Max 1
				he: 0 # Max 1
			},
			defuse_kit: false,
			bomb: team == "t" && id == @player_id, # One T starts with bomb
			velocity: { x: 0, y: 0 },
			walking: false,
			crouching: false,
			jumping: false,
			reloading: false,
			switching_weapon: false,
			flash_duration: 0,
			in_smoke: false,
			last_damage_time: 0,
			damage_given: 0,
			damage_taken: 0,
			adr: 0, # Average Damage per Round
			ping: rand(5..50),
			fps: 100 + rand(0..200),
			skill_level: rand(1..10),
			spawn_protection: 0, # Brief spawn protection
			can_buy: true,
			buy_zone_time: 0
		}
	end

	def add_classic_bots
		# Add CT bots for 5v5
		4.times do |i|
			bot_id = "bot_ct_#{i}"
			@game_state[:players][bot_id] = create_classic_player(bot_id, "ct")
			@game_state[:players][bot_id][:name] = ["Eagle", "Hawk", "Wolf", "Tiger"][i]
			@game_state[:players][bot_id][:x] = 200 + (i * 50)
			@game_state[:players][bot_id][:y] = 300 + (i * 30)
			@game_state[:economy][:ct_money][bot_id] = 800
		end
		
		# Add T bots for 5v5
		4.times do |i|
			bot_id = "bot_t_#{i}"
			@game_state[:players][bot_id] = create_classic_player(bot_id, "t")
			@game_state[:players][bot_id][:name] = ["Phoenix", "Viper", "Shadow", "Ghost"][i]
			@game_state[:players][bot_id][:x] = 1080 - (i * 50)
			@game_state[:players][bot_id][:y] = 300 + (i * 30)
			@game_state[:players][bot_id][:bomb] = (i == 0) # First T bot gets bomb
			@game_state[:economy][:t_money][bot_id] = 800
		end
	end

	def start_classic_game_loop
		# Game loop would be handled client-side in JavaScript
		# Server just broadcasts initial state
		broadcast_classic_state
	end

	def update_classic_game_state
		# Server-side game logic updates
		# This would handle authoritative game state, validation, etc.
	end

	def broadcast_classic_state
		# Send game state updates to all connected clients
		self.script(<<~JAVASCRIPT)
			// Update game state from server
			if (typeof gameState !== 'undefined') {
				// Server state synchronization would go here
			}
		JAVASCRIPT
	end

	# Classic CS 1.6 weapon and equipment data
	def classic_weapon_data
		{
			# Pistols
			usp: { name: "USP", price: 0, category: "pistol", damage: 34, ammo: 12, team: "ct" },
			glock: { name: "Glock-18", price: 0, category: "pistol", damage: 28, ammo: 20, team: "t" },
			p228: { name: "P228", price: 600, category: "pistol", damage: 32, ammo: 13 },
			deagle: { name: "Desert Eagle", price: 650, category: "pistol", damage: 48, ammo: 7 },
			fiveseven: { name: "Five-SeveN", price: 750, category: "pistol", damage: 29, ammo: 20, team: "ct" },
			elite: { name: "Dual Berettas", price: 800, category: "pistol", damage: 26, ammo: 30 },

			# SMGs
			mac10: { name: "MAC-10", price: 1400, category: "smg", damage: 27, ammo: 30, team: "t" },
			tmp: { name: "TMP", price: 1250, category: "smg", damage: 26, ammo: 30, team: "ct" },
			mp5: { name: "MP5-Navy", price: 1500, category: "smg", damage: 26, ammo: 30 },
			ump45: { name: "UMP45", price: 1700, category: "smg", damage: 30, ammo: 25 },
			p90: { name: "P90", price: 2350, category: "smg", damage: 25, ammo: 50 },

			# Rifles
			ak47: { name: "AK-47", price: 2500, category: "rifle", damage: 36, ammo: 30, team: "t" },
			m4a1: { name: "M4A1", price: 3100, category: "rifle", damage: 33, ammo: 30, team: "ct" },
			galil: { name: "Galil", price: 2000, category: "rifle", damage: 30, ammo: 35, team: "t" },
			famas: { name: "FAMAS", price: 2250, category: "rifle", damage: 30, ammo: 25, team: "ct" },
			sg552: { name: "SG 552", price: 3500, category: "rifle", damage: 33, ammo: 30, team: "t" },
			aug: { name: "AUG", price: 3500, category: "rifle", damage: 32, ammo: 30, team: "ct" },

			# Snipers
			scout: { name: "Scout", price: 2750, category: "sniper", damage: 75, ammo: 10 },
			awp: { name: "AWP", price: 4750, category: "sniper", damage: 115, ammo: 10 },
			g3sg1: { name: "G3SG1", price: 5000, category: "sniper", damage: 80, ammo: 20, team: "t" },
			sg550: { name: "SG550", price: 4200, category: "sniper", damage: 70, ammo: 30, team: "ct" },

			# Shotguns
			m3: { name: "M3 Super 90", price: 1700, category: "shotgun", damage: 116, ammo: 8 },
			xm1014: { name: "XM1014", price: 3000, category: "shotgun", damage: 88, ammo: 7 },

			# Machine Gun
			m249: { name: "M249", price: 5750, category: "machinegun", damage: 32, ammo: 100 }
		}
	end

	def classic_equipment_data
		{
			kevlar: { name: "Kevlar Vest", price: 650, armor_points: 100 },
			kevlar_helmet: { name: "Kevlar + Helmet", price: 1000, armor_points: 100, helmet: true },
			defuse_kit: { name: "Defuse Kit", price: 200, team: "ct", defuse_time_reduction: 5 },
			nvg: { name: "Night Vision Goggles", price: 1250 }
		}
	end

	def classic_grenade_data
		{
			hegrenade: { name: "HE Grenade", price: 300, damage: 100, radius: 300, max_carry: 1 },
			flashbang: { name: "Flashbang", price: 200, duration: 5, radius: 200, max_carry: 2 },
			smokegrenade: { name: "Smoke Grenade", price: 300, duration: 18, radius: 150, max_carry: 1 }
		}
	end

	# Round management methods
	def start_round
		@game_state[:phase] = "freeze"
		@game_state[:freeze_time] = 15
		@game_state[:round_time] = 115
		@game_state[:buy_time] = 90
		
		# Reset bomb state
		@game_state[:bomb][:planted] = false
		@game_state[:bomb][:time_left] = 35
		@game_state[:bomb][:x] = nil
		@game_state[:bomb][:y] = nil
		@game_state[:bomb][:planter_id] = nil
		@game_state[:bomb][:site] = nil

		# Reset players for new round
		reset_players_for_round
	end

	def end_round(winning_team, reason)
		@game_state[:phase] = "round_end"
		
		# Update scores
		if winning_team == "ct"
			@game_state[:ct_score] += 1
			@game_state[:consecutive_losses][:ct] = 0
			@game_state[:consecutive_losses][:t] += 1
		else
			@game_state[:t_score] += 1
			@game_state[:consecutive_losses][:t] = 0
			@game_state[:consecutive_losses][:ct] += 1
		end
		
		# Calculate money rewards
		calculate_round_end_money(winning_team, reason)
		
		# Check for half-time or game end
		@game_state[:round] += 1
		
		if @game_state[:round] == @game_state[:half_time_round]
			swap_teams
		elsif @game_state[:ct_score] >= 16 || @game_state[:t_score] >= 16
			end_game
		end
	end

	def calculate_round_end_money(winning_team, reason)
		@game_state[:players].each do |player_id, player|
			if player[:team] == winning_team
				# Winner bonus
				bonus = case reason
				when "elimination"
					@game_state[:economy][:round_bonuses][:win_elimination]
				when "bomb_defused"
					@game_state[:economy][:round_bonuses][:win_bomb_defused]
				when "bomb_exploded"
					@game_state[:economy][:round_bonuses][:win_bomb_exploded]
				when "time_expired"
					@game_state[:economy][:round_bonuses][:win_time_expired_ct]
				else
					@game_state[:economy][:round_bonuses][:win_elimination]
				end
				
				player[:money] = [player[:money] + bonus, @game_state[:economy][:max_money]].min
			else
				# Loser bonus (increases with consecutive losses)
				team_key = player[:team] == "ct" ? :ct : :t
				losses = @game_state[:consecutive_losses][team_key]
				
				bonus = [
					@game_state[:economy][:round_bonuses][:loss_base] + 
					(losses * @game_state[:economy][:round_bonuses][:loss_increment]),
					@game_state[:economy][:round_bonuses][:loss_max]
				].min
				
				player[:money] = [player[:money] + bonus, @game_state[:economy][:max_money]].min
			end
		end
	end

	def swap_teams
		@game_state[:players].each do |player_id, player|
			player[:team] = player[:team] == "ct" ? "t" : "ct"
		end
		
		# Swap scores
		ct_score = @game_state[:ct_score]
		@game_state[:ct_score] = @game_state[:t_score]
		@game_state[:t_score] = ct_score
	end

	def end_game
		@game_state[:phase] = "game_over"
		winner = @game_state[:ct_score] > @game_state[:t_score] ? "Counter-Terrorists" : "Terrorists"
		final_score = "#{@game_state[:ct_score]}-#{@game_state[:t_score]}"
		
		# Log game end for debugging
		puts "Game Over! #{winner} win #{final_score}"
	end

	private

	def reset_players_for_round
		@game_state[:players].each do |player_id, player|
			player[:alive] = true
			player[:health] = 100
			player[:flash_duration] = 0
			player[:damage_given] = 0
			player[:damage_taken] = 0
			
			# Reset position to spawn
			if player[:team] == "ct"
				player[:x] = 200 + rand(-50..50)
				player[:y] = 360 + rand(-30..30)
			else
				player[:x] = 1080 + rand(-50..50)  
				player[:y] = 360 + rand(-30..30)
			end
			
			# Give bomb to random T player
			if player[:team] == "t" && rand < 0.2 # 20% chance any T gets bomb
				player[:bomb] = true
			else
				player[:bomb] = false
			end
		end
		
		# Ensure at least one T has bomb
		t_players = @game_state[:players].select { |id, p| p[:team] == "t" }
		if t_players.any? && !t_players.any? { |id, p| p[:bomb] }
			random_t = t_players.to_a.sample
			random_t[1][:bomb] = true
		end
	end
end