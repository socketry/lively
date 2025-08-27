# frozen_string_literal: true

# CS 1.6 Economy Management System
# Handles money distribution, round rewards, and economic tracking
class EconomyManager
	
	# CS 1.6 authentic economy values
	ECONOMY_CONFIG = {
		# Starting and limits
		starting_money: 800,
		max_money: 16000,
		min_money: 0,
		
		# Round end rewards
		round_win_rewards: {
			elimination: 3250,      # Win by killing all enemies
			time_expire_ct: 3250,   # CT wins by time
			bomb_exploded: 3500,    # T wins by bomb
			bomb_defused: 3500,     # CT wins by defuse
			hostages_rescued: 3500  # CT wins by rescue (cs_ maps)
		},
		
		# Loss bonuses (consecutive losses)
		loss_bonus_progression: [
			1400,  # 1st loss
			1900,  # 2nd loss  
			2400,  # 3rd loss
			2900,  # 4th loss
			3400   # 5th+ loss (capped)
		],
		
		# Special bonuses
		bomb_plant_bonus: 800,      # All T players when bomb planted (even if lose)
		bomb_plant_reward: 300,     # Individual who plants
		bomb_defuse_reward: 300,    # Individual who defuses
		hostage_rescue_reward: 150, # Per hostage rescued
		hostage_interact_reward: 150, # For leading hostages
		
		# Kill rewards by weapon type
		kill_rewards: {
			knife: 1500,
			pistol: 300,
			smg: 600,
			shotgun: 900,
			rifle: 300,
			sniper: 100,
			awp: 100,
			grenade: 300,
			team_kill: -3300  # Penalty for team killing
		},
		
		# Objective penalties
		hostage_killed_penalty: -3300,
		suicide_penalty: 0
	}.freeze
	
	def initialize
		@player_economies = {}
		@loss_streaks = { ct: 0, t: 0 }
		@round_number = 0
	end
	
	def initialize_player(player_id, team)
		@player_economies[player_id] = {
			money: ECONOMY_CONFIG[:starting_money],
			kills_this_round: 0,
			earned_this_round: 0,
			spent_this_round: 0,
			equipment_value: 0,
			team: team,
			stats: {
				total_earned: ECONOMY_CONFIG[:starting_money],
				total_spent: 0,
				rounds_survived: 0,
				rounds_played: 0
			}
		}
	end
	
	def get_player_money(player_id)
		@player_economies[player_id]&.dig(:money) || 0
	end
	
	def can_afford?(player_id, amount)
		get_player_money(player_id) >= amount
	end
	
	def purchase(player_id, amount, item_name = nil)
		return false unless can_afford?(player_id, amount)
		
		economy = @player_economies[player_id]
		return false unless economy
		
		economy[:money] -= amount
		economy[:spent_this_round] += amount
		economy[:equipment_value] += amount
		economy[:stats][:total_spent] += amount
		
		log_purchase(player_id, amount, item_name) if item_name
		
		true
	end
	
	def award_kill(killer_id, victim_id, weapon_type, headshot = false)
		return unless @player_economies[killer_id]
		
		killer_economy = @player_economies[killer_id]
		victim_economy = @player_economies[victim_id]
		
		# Check for team kill
		if killer_economy[:team] == victim_economy[:team]
			reward = ECONOMY_CONFIG[:kill_rewards][:team_kill]
		else
			reward = get_kill_reward(weapon_type)
		end
		
		add_money(killer_id, reward)
		killer_economy[:kills_this_round] += 1 unless reward < 0
		
		# Track the kill
		log_kill(killer_id, victim_id, weapon_type, reward, headshot)
		
		reward
	end
	
	def end_round(winning_team, reason, special_players = {})
		@round_number += 1
		
		# Track loss streaks
		losing_team = winning_team == :ct ? :t : :ct
		@loss_streaks[winning_team] = 0
		@loss_streaks[losing_team] += 1
		
		# Process each player
		@player_economies.each do |player_id, economy|
			round_reward = 0
			
			if economy[:team] == winning_team
				# Winner reward
				round_reward = get_win_reward(reason)
				economy[:stats][:rounds_survived] += 1 if player_alive?(player_id)
			else
				# Loser reward (loss bonus)
				round_reward = get_loss_bonus(@loss_streaks[losing_team])
				
				# T bomb plant bonus (even when losing)
				if reason == :bomb_planted_but_defused && economy[:team] == :t
					round_reward += ECONOMY_CONFIG[:bomb_plant_bonus]
				end
			end
			
			# Individual bonuses
			if special_players[:bomb_planter] == player_id
				round_reward += ECONOMY_CONFIG[:bomb_plant_reward]
			elsif special_players[:bomb_defuser] == player_id
				round_reward += ECONOMY_CONFIG[:bomb_defuse_reward]
			end
			
			# Award money
			add_money(player_id, round_reward)
			economy[:earned_this_round] = round_reward
			economy[:stats][:rounds_played] += 1
			
			# Reset round tracking
			economy[:kills_this_round] = 0
			economy[:spent_this_round] = 0
			economy[:equipment_value] = calculate_equipment_value(player_id)
		end
		
		log_round_end(winning_team, reason)
	end
	
	def award_objective(player_id, objective_type)
		return unless @player_economies[player_id]
		
		reward = case objective_type
		when :bomb_planted
			ECONOMY_CONFIG[:bomb_plant_reward]
		when :bomb_defused
			ECONOMY_CONFIG[:bomb_defuse_reward]
		when :hostage_rescued
			ECONOMY_CONFIG[:hostage_rescue_reward]
		when :hostage_touched
			ECONOMY_CONFIG[:hostage_interact_reward]
		else
			0
		end
		
		add_money(player_id, reward)
		log_objective(player_id, objective_type, reward)
		
		reward
	end
	
	def penalize(player_id, penalty_type)
		penalty = case penalty_type
		when :team_kill
			ECONOMY_CONFIG[:kill_rewards][:team_kill]
		when :hostage_killed
			ECONOMY_CONFIG[:hostage_killed_penalty]
		when :suicide
			ECONOMY_CONFIG[:suicide_penalty]
		else
			0
		end
		
		add_money(player_id, penalty)
		log_penalty(player_id, penalty_type, penalty)
		
		penalty
	end
	
	def get_team_economy(team)
		total_money = 0
		total_equipment = 0
		player_count = 0
		
		@player_economies.each do |_, economy|
			next unless economy[:team] == team
			
			total_money += economy[:money]
			total_equipment += economy[:equipment_value]
			player_count += 1
		end
		
		{
			total_money: total_money,
			average_money: player_count > 0 ? total_money / player_count : 0,
			total_equipment_value: total_equipment,
			average_equipment_value: player_count > 0 ? total_equipment / player_count : 0,
			player_count: player_count,
			loss_streak: @loss_streaks[team],
			next_loss_bonus: get_loss_bonus(@loss_streaks[team] + 1)
		}
	end
	
	def get_player_economy_stats(player_id)
		economy = @player_economies[player_id]
		return nil unless economy
		
		{
			current_money: economy[:money],
			equipment_value: economy[:equipment_value],
			earned_this_round: economy[:earned_this_round],
			spent_this_round: economy[:spent_this_round],
			kills_this_round: economy[:kills_this_round],
			total_stats: economy[:stats]
		}
	end
	
	def reset_for_half_time
		# Swap team loss streaks
		@loss_streaks[:ct], @loss_streaks[:t] = @loss_streaks[:t], @loss_streaks[:ct]
		
		# Swap player teams and reset money
		@player_economies.each do |_, economy|
			economy[:team] = economy[:team] == :ct ? :t : :ct
			economy[:money] = ECONOMY_CONFIG[:starting_money]
			economy[:equipment_value] = 0
		end
	end
	
	def reset_match
		@player_economies.clear
		@loss_streaks = { ct: 0, t: 0 }
		@round_number = 0
	end
	
	private
	
	def add_money(player_id, amount)
		economy = @player_economies[player_id]
		return unless economy
		
		economy[:money] += amount
		economy[:money] = economy[:money].clamp(ECONOMY_CONFIG[:min_money], ECONOMY_CONFIG[:max_money])
		economy[:stats][:total_earned] += amount if amount > 0
	end
	
	def get_kill_reward(weapon_type)
		case weapon_type.to_s.downcase
		when "knife"
			ECONOMY_CONFIG[:kill_rewards][:knife]
		when "glock", "usp", "p228", "deagle", "fiveseven", "elite"
			ECONOMY_CONFIG[:kill_rewards][:pistol]
		when "mac10", "tmp", "mp5", "ump45", "p90"
			ECONOMY_CONFIG[:kill_rewards][:smg]
		when "m3", "xm1014"
			ECONOMY_CONFIG[:kill_rewards][:shotgun]
		when "famas", "galil", "ak47", "m4a1", "aug", "sg552"
			ECONOMY_CONFIG[:kill_rewards][:rifle]
		when "scout", "g3sg1"
			ECONOMY_CONFIG[:kill_rewards][:rifle]
		when "awp"
			ECONOMY_CONFIG[:kill_rewards][:awp]
		when "hegrenade", "flashbang", "smokegrenade"
			ECONOMY_CONFIG[:kill_rewards][:grenade]
		else
			300  # Default reward
		end
	end
	
	def get_win_reward(reason)
		case reason
		when :elimination
			ECONOMY_CONFIG[:round_win_rewards][:elimination]
		when :time_expire
			ECONOMY_CONFIG[:round_win_rewards][:time_expire_ct]
		when :bomb_exploded
			ECONOMY_CONFIG[:round_win_rewards][:bomb_exploded]
		when :bomb_defused
			ECONOMY_CONFIG[:round_win_rewards][:bomb_defused]
		when :hostages_rescued
			ECONOMY_CONFIG[:round_win_rewards][:hostages_rescued]
		else
			3250  # Default win reward
		end
	end
	
	def get_loss_bonus(consecutive_losses)
		return 0 if consecutive_losses <= 0
		
		index = [consecutive_losses - 1, ECONOMY_CONFIG[:loss_bonus_progression].length - 1].min
		ECONOMY_CONFIG[:loss_bonus_progression][index]
	end
	
	def calculate_equipment_value(player_id)
		# This would calculate based on actual equipment the player has
		# For now, return the tracked value
		@player_economies[player_id]&.dig(:equipment_value) || 0
	end
	
	def player_alive?(player_id)
		# This would check actual player state
		# Placeholder for integration
		true
	end
	
	# Logging methods for debugging/stats
	def log_purchase(player_id, amount, item_name)
		# Log purchase for statistics
	end
	
	def log_kill(killer_id, victim_id, weapon_type, reward, headshot)
		# Log kill for statistics
	end
	
	def log_round_end(winning_team, reason)
		# Log round end for statistics
	end
	
	def log_objective(player_id, objective_type, reward)
		# Log objective completion
	end
	
	def log_penalty(player_id, penalty_type, amount)
		# Log penalties
	end
end