# frozen_string_literal: true

require_relative "player_profile"

class StatisticsTracker
	attr_reader :match_start_time, :current_match_data
		
	def initialize
		@profiles = {}
		@match_start_time = nil
		@current_match_data = {}
		@round_start_time = nil
		@round_stats = {}
				
		# Real-time tracking data
		@pending_events = []
		@event_queue = []
	end
		
	# Profile management
	def get_or_create_profile(player_id, username = nil)
		@profiles[player_id] ||= PlayerProfile.new(player_id, username)
	end
		
	def get_profile(player_id)
		@profiles[player_id]
	end
		
	def save_all_profiles
		@profiles.each_value(&:save_profile)
	end
		
	# Match lifecycle management
	def start_match(map_name, mode = "Classic", players = {})
		@match_start_time = Time.now
		@current_match_data = {
						map: map_name,
						mode: mode,
						start_time: @match_start_time,
						players: {},
						rounds: [],
						final_score: [0, 0]
				}
				
		# Initialize player data for this match
		players.each do |player_id, player_data|
			profile = get_or_create_profile(player_id, player_data[:name])
			@current_match_data[:players][player_id] = {
								profile: profile,
								team: player_data[:team],
								kills: 0,
								deaths: 0,
								assists: 0,
								damage: 0,
								headshots: 0,
								shots_fired: 0,
								shots_hit: 0,
								bomb_plants: 0,
								bomb_defuses: 0,
								mvp_rounds: 0,
								money_earned: 0,
								money_spent: 0,
								equipment_purchased: {},
								weapons_used: {},
								survival_time: 0
						}
		end
				
		puts "📊 Match started: #{map_name} (#{mode})"
	end
		
	def end_match(final_score, winner_team = nil)
		return unless @match_start_time
				
		match_duration = Time.now - @match_start_time
		@current_match_data[:end_time] = Time.now
		@current_match_data[:duration] = match_duration
		@current_match_data[:final_score] = final_score
		@current_match_data[:winner] = winner_team
				
		# Process final statistics for all players
		@current_match_data[:players].each do |player_id, player_data|
			profile = player_data[:profile]
			team = player_data[:team]
			won = (winner_team == team)
						
			# Update profile with match results
			profile.record_match_result(won: won, map: @current_match_data[:map])
			profile.add_playtime(match_duration)
						
			# Add match to history
			match_record = profile.add_match_result({
								map: @current_match_data[:map],
								mode: @current_match_data[:mode],
								result: won ? "win" : (winner_team ? "loss" : "draw"),
								score: final_score,
								team: team,
								kills: player_data[:kills],
								deaths: player_data[:deaths],
								assists: player_data[:assists],
								damage: player_data[:damage],
								mvp: player_data[:mvp_rounds] > 0,
								duration: match_duration,
								rating_change: 0 # Will be calculated by RankSystem
						})
						
			# Calculate XP rewards
			xp_reward = calculate_xp_reward(player_data, won)
			xp_info = profile.add_xp(xp_reward[:total], "Match completion")
						
			# Update money statistics
			profile.update_money_stats(
								earned: player_data[:money_earned],
								spent: player_data[:money_spent]
						)
						
			# Save profile
			profile.save_profile
						
			puts "💾 #{profile.display_name}: +#{xp_reward[:total]} XP (Level #{profile.level})"
		end
				
		# Reset match data
		@match_start_time = nil
		@current_match_data = {}
				
		puts "🏁 Match ended. Duration: #{format_duration(match_duration)}"
	end
		
	# Round lifecycle management
	def start_round(round_number)
		@round_start_time = Time.now
		@round_stats = {
						number: round_number,
						start_time: @round_start_time,
						players_alive: {},
						kills: [],
						damage_events: [],
						objective_events: []
				}
				
		# Initialize round stats for each player
		@current_match_data[:players].each do |player_id, player_data|
			@round_stats[:players_alive][player_id] = true
		end
	end
		
	def end_round(winner_team, reason = "time")
		return unless @round_start_time
				
		round_duration = Time.now - @round_start_time
		@round_stats[:end_time] = Time.now
		@round_stats[:duration] = round_duration
		@round_stats[:winner] = winner_team
		@round_stats[:end_reason] = reason
				
		# Update round statistics for all players
		@current_match_data[:players].each do |player_id, player_data|
			profile = player_data[:profile]
			team = player_data[:team]
			won = (winner_team == team)
						
			profile.record_round_result(won: won, team: team)
						
			# Add survival time if player survived the round
			if @round_stats[:players_alive][player_id]
				player_data[:survival_time] += round_duration
			end
		end
				
		# Store round data
		@current_match_data[:rounds] << @round_stats
		@round_start_time = nil
	end
		
	# Event tracking methods
	def track_kill(killer_id, victim_id, weapon: nil, headshot: false, damage: 0, assist_ids: [])
		return unless @current_match_data[:players]
				
		# Update killer stats
		if killer_data = @current_match_data[:players][killer_id]
			killer_profile = killer_data[:profile]
			killer_profile.record_kill(weapon: weapon, headshot: headshot, damage: damage)
						
			killer_data[:kills] += 1
			killer_data[:headshots] += 1 if headshot
			killer_data[:damage] += damage
			killer_data[:weapons_used][weapon] = (killer_data[:weapons_used][weapon] || 0) + 1 if weapon
		end
				
		# Update victim stats
		if victim_data = @current_match_data[:players][victim_id]
			victim_profile = victim_data[:profile]
			victim_profile.record_death(damage_taken: damage)
						
			victim_data[:deaths] += 1
			@round_stats[:players_alive][victim_id] = false if @round_stats
		end
				
		# Update assist stats
		assist_ids.each do |assist_id|
			if assist_data = @current_match_data[:players][assist_id]
				assist_data[:assists] += 1
			end
		end
				
		# Record kill event
		kill_event = {
						timestamp: Time.now,
						killer_id: killer_id,
						victim_id: victim_id,
						weapon: weapon,
						headshot: headshot,
						damage: damage,
						assists: assist_ids,
						round: @round_stats&.dig(:number)
				}
				
		@round_stats[:kills] << kill_event if @round_stats
				
		puts "💀 Kill tracked: #{killer_id} → #{victim_id} (#{weapon}#{headshot ? ', HS' : ''})"
	end
		
	def track_damage(attacker_id, victim_id, damage, weapon: nil)
		return unless @current_match_data[:players]
				
		# Update attacker damage stats
		if attacker_data = @current_match_data[:players][attacker_id]
			attacker_data[:damage] += damage
		end
				
		# Record damage event
		damage_event = {
						timestamp: Time.now,
						attacker_id: attacker_id,
						victim_id: victim_id,
						damage: damage,
						weapon: weapon
				}
				
		@round_stats[:damage_events] << damage_event if @round_stats
	end
		
	def track_shot(player_id, weapon: nil, hit: false)
		return unless @current_match_data[:players]
				
		if player_data = @current_match_data[:players][player_id]
			player_profile = player_data[:profile]
			player_profile.record_shot(hit: hit, weapon: weapon)
						
			player_data[:shots_fired] += 1
			player_data[:shots_hit] += 1 if hit
			player_data[:weapons_used][weapon] = (player_data[:weapons_used][weapon] || 0) + 1 if weapon
		end
	end
		
	def track_objective(player_id, type, success: true)
		return unless @current_match_data[:players]
				
		if player_data = @current_match_data[:players][player_id]
			player_profile = player_data[:profile]
			player_profile.record_objective(type, success: success)
						
			case type
			when :bomb_plant
				player_data[:bomb_plants] += 1 if success
			when :bomb_defuse
				player_data[:bomb_defuses] += 1 if success
			end
		end
				
		# Record objective event
		objective_event = {
						timestamp: Time.now,
						player_id: player_id,
						type: type,
						success: success
				}
				
		@round_stats[:objective_events] << objective_event if @round_stats
				
		puts "🎯 Objective tracked: #{player_id} #{type} (#{success ? 'success' : 'failed'})"
	end
		
	def track_purchase(player_id, item, cost)
		return unless @current_match_data[:players]
				
		if player_data = @current_match_data[:players][player_id]
			player_data[:money_spent] += cost
			player_data[:equipment_purchased][item] = (player_data[:equipment_purchased][item] || 0) + 1
		end
	end
		
	def track_money_reward(player_id, amount, reason = "round_reward")
		return unless @current_match_data[:players]
				
		if player_data = @current_match_data[:players][player_id]
			player_data[:money_earned] += amount
		end
	end
		
	def track_mvp(player_id)
		return unless @current_match_data[:players]
				
		if player_data = @current_match_data[:players][player_id]
			player_data[:mvp_rounds] += 1
		end
				
		puts "⭐ MVP tracked: #{player_id}"
	end
		
	# Analytics and reporting
	def get_match_summary
		return nil unless @current_match_data[:players]
				
		summary = {
						map: @current_match_data[:map],
						mode: @current_match_data[:mode],
						duration: @current_match_data[:duration],
						rounds: @current_match_data[:rounds]&.length || 0,
						players: {}
				}
				
		@current_match_data[:players].each do |player_id, player_data|
			summary[:players][player_id] = {
								name: player_data[:profile].display_name,
								team: player_data[:team],
								kills: player_data[:kills],
								deaths: player_data[:deaths],
								assists: player_data[:assists],
								damage: player_data[:damage],
								headshots: player_data[:headshots],
								accuracy: calculate_accuracy(player_data),
								mvp_rounds: player_data[:mvp_rounds]
						}
		end
				
		summary
	end
		
	def get_player_session_stats(player_id)
		return nil unless @current_match_data[:players] && @current_match_data[:players][player_id]
				
		player_data = @current_match_data[:players][player_id]
		{
						kills: player_data[:kills],
						deaths: player_data[:deaths],
						assists: player_data[:assists],
						damage: player_data[:damage],
						headshots: player_data[:headshots],
						accuracy: calculate_accuracy(player_data),
						money_earned: player_data[:money_earned],
						money_spent: player_data[:money_spent],
						survival_time: player_data[:survival_time]
				}
	end
		
	def get_leaderboard(category = :kills, limit = 10)
		return [] unless @current_match_data[:players]
				
		players_data = @current_match_data[:players].map do |player_id, data|
			{
								player_id: player_id,
								name: data[:profile].display_name,
								value: data[category] || 0,
								team: data[:team]
						}
		end
				
		players_data.sort_by { |p| -p[:value] }.first(limit)
	end
		
		private
		
	def calculate_accuracy(player_data)
		return 0.0 if player_data[:shots_fired] == 0
		(player_data[:shots_hit].to_f / player_data[:shots_fired] * 100).round(2)
	end
		
	def calculate_xp_reward(player_data, won)
		base_xp = won ? 100 : 50
		kill_xp = player_data[:kills] * 10
		assist_xp = player_data[:assists] * 5
		objective_xp = (player_data[:bomb_plants] + player_data[:bomb_defuses]) * 25
		mvp_xp = player_data[:mvp_rounds] * 50
		headshot_bonus = player_data[:headshots] * 5
				
		total = base_xp + kill_xp + assist_xp + objective_xp + mvp_xp + headshot_bonus
				
		{
						base: base_xp,
						kills: kill_xp,
						assists: assist_xp,
						objectives: objective_xp,
						mvp: mvp_xp,
						headshots: headshot_bonus,
						total: total
				}
	end
		
	def format_duration(seconds)
		minutes = seconds / 60
		seconds = seconds % 60
		"#{minutes}m #{seconds.round}s"
	end
end