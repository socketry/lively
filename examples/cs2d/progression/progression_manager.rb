# frozen_string_literal: true

require_relative "player_profile"
require_relative "statistics_tracker"
require_relative "rank_system"
require_relative "achievement_system"
require_relative "match_history"
require_relative "leaderboards"

class ProgressionManager
	attr_reader :statistics_tracker, :rank_system, :match_history, :leaderboards
		
	# XP reward structure
	XP_REWARDS = {
			# Match rewards
			match_win: 100,
			match_loss: 50,
			match_draw: 75,
			
			# Kill rewards
			kill: 10,
			headshot_kill: 15,
			first_blood: 20,
			ace: 100,
			multi_kill: 25,
			
			# Objective rewards
			bomb_plant: 25,
			bomb_defuse: 30,
			hostage_rescue: 40,
			
			# Performance bonuses
			mvp_round: 50,
			clutch_win: 75,
			no_death_round: 20,
			
			# Assistance rewards
			assist: 5,
			flash_assist: 3,
			
			# Streak bonuses
			kill_streak_5: 25,
			kill_streak_10: 75,
			kill_streak_15: 150,
			win_streak_3: 50,
			win_streak_5: 100,
			win_streak_10: 250,
			
			# Daily bonuses
			daily_first_win: 150,
			daily_login: 25,
			
			# Special events
			weekend_bonus_multiplier: 1.5,
			double_xp_event: 2.0
	}.freeze
		
	# Season and event management
	SEASON_DATA = {
			current_season: 1,
			season_start: Time.new(2025, 1, 1),
			season_end: Time.new(2025, 4, 1),
			season_rewards: {
					1 => { title: "Season 1 Veteran", color: "#4169E1", xp: 1000 }
			}
	}.freeze
		
	def initialize
		@statistics_tracker = StatisticsTracker.new
		@rank_system = RankSystem.new
		@match_history = MatchHistory.new
		@leaderboards = Leaderboards.new
			
		@profiles = {}
		@achievement_systems = {}
		@current_multipliers = {}
			
		# Event tracking
		@daily_bonuses = {}
		@active_events = []
			
		puts "🎮 Progression Manager initialized"
	end
		
	# Player management
	def get_or_create_player(player_id, username = nil)
		return @profiles[player_id] if @profiles[player_id]
			
		profile = @statistics_tracker.get_or_create_profile(player_id, username)
		achievement_system = AchievementSystem.new(profile)
			
		@profiles[player_id] = profile
		@achievement_systems[player_id] = achievement_system
			
		puts "👤 Player profile loaded: #{profile.display_name}"
		profile
	end
		
	def get_player_profile(player_id)
		@profiles[player_id]
	end
		
	def save_all_profiles
		@statistics_tracker.save_all_profiles
		puts "💾 All player profiles saved"
	end
		
	# Match lifecycle integration
	def start_match(map_name, mode, players_data)
		@statistics_tracker.start_match(map_name, mode, players_data)
			
		# Initialize players
		players_data.each do |player_id, data|
			get_or_create_player(player_id, data[:name])
		end
			
		puts "🚀 Match started with progression tracking"
	end
		
	def end_match(final_score, winner_team = nil)
		# End match tracking
		@statistics_tracker.end_match(final_score, winner_team)
			
		# Get match data for rating calculations
		match_data = @statistics_tracker.current_match_data
		return unless match_data && match_data[:players]
			
		# Separate players by team for rating calculations
		team1_players = []
		team2_players = []
			
		match_data[:players].each do |player_id, player_data|
			profile = @profiles[player_id]
			next unless profile
				
			if player_data[:team] == :ct
				team1_players << profile
			else
				team2_players << profile
			end
		end
			
		# Calculate rating changes
		if team1_players.any? && team2_players.any?
			team1_won = (winner_team == :ct)
			rating_changes = @rank_system.calculate_rating_changes(
					team1_players, team2_players, team1_won, match_data
			)
				
			# Apply rating changes and check for achievements
			rating_changes.each do |player_id, change_data|
				profile = @profiles[player_id.to_s] || @profiles[player_id]
				next unless profile
					
				# Check for rank-up achievements
				if change_data[:new_rank] != change_data[:old_rank]
					check_achievements_for_player(player_id, nil, { rank_change: change_data })
				end
					
				puts "📈 #{profile.display_name}: #{change_data[:old_rating]} → #{change_data[:new_rating]} (#{change_data[:change] >= 0 ? '+' : ''}#{change_data[:change]})"
			end
		end
			
		# Record match in history
		@match_history.record_match({
				map: match_data[:map],
				mode: match_data[:mode],
				duration: match_data[:duration],
				final_score: final_score,
				winner: winner_team,
				end_reason: "score_limit",
				players: match_data[:players],
				rounds: match_data[:rounds]
		})
			
		# Process end-of-match XP and achievements
		match_data[:players].each do |player_id, player_data|
			process_match_completion(player_id, player_data, winner_team)
		end
			
		# Update leaderboards (async in real implementation)
		update_leaderboards_async
			
		puts "🏁 Match ended with full progression processing"
	end
		
	# Event tracking methods
	def track_kill(killer_id, victim_id, weapon: nil, headshot: false, damage: 0, assist_ids: [])
		@statistics_tracker.track_kill(killer_id, victim_id, 
				weapon: weapon, headshot: headshot, damage: damage, assist_ids: assist_ids)
			
		# Award XP for kill
		xp_amount = calculate_kill_xp(weapon, headshot, assist_ids.length)
		award_xp(killer_id, xp_amount, "Kill with #{weapon}")
			
		# Award assist XP
		assist_ids.each do |assist_id|
			award_xp(assist_id, XP_REWARDS[:assist], "Assist")
		end
			
		# Check for achievement progress
		check_achievements_for_player(killer_id, nil, { 
				kill: true, weapon: weapon, headshot: headshot 
		})
			
		# Check for kill streaks
		check_kill_streak_bonuses(killer_id)
	end
		
	def track_round_end(winner_team, reason = "elimination")
		@statistics_tracker.end_round(winner_team, reason)
			
		# Award round completion XP
		current_match = @statistics_tracker.current_match_data
		return unless current_match && current_match[:players]
			
		current_match[:players].each do |player_id, player_data|
			won = (player_data[:team] == winner_team)
			xp_amount = won ? 15 : 10
				
			award_xp(player_id, xp_amount, "Round #{won ? 'won' : 'completed'}")
				
			# Survival bonus
			if won && @statistics_tracker.round_stats[:players_alive][player_id]
				award_xp(player_id, XP_REWARDS[:no_death_round], "Survived round")
			end
		end
	end
		
	def track_objective(player_id, type, success: true)
		@statistics_tracker.track_objective(player_id, type, success: success)
			
		if success
			xp_amount = case type
															when :bomb_plant
																XP_REWARDS[:bomb_plant]
															when :bomb_defuse
																XP_REWARDS[:bomb_defuse]
															when :hostage_rescue
																XP_REWARDS[:hostage_rescue]
															else
																10
			end
				
			award_xp(player_id, xp_amount, "#{type.to_s.humanize}")
		end
			
		# Check achievements
		check_achievements_for_player(player_id, nil, { objective: type, success: success })
	end
		
	def track_mvp(player_id)
		@statistics_tracker.track_mvp(player_id)
		award_xp(player_id, XP_REWARDS[:mvp_round], "MVP Round")
			
		check_achievements_for_player(player_id, nil, { mvp: true })
	end
		
	# XP and level management
	def award_xp(player_id, base_amount, reason)
		profile = @profiles[player_id]
		return unless profile
			
		# Apply multipliers
		multiplier = calculate_xp_multiplier(player_id)
		final_amount = (base_amount * multiplier).round
			
		# Award XP
		xp_info = profile.add_xp(final_amount, reason)
			
		# Check for level-up achievements
		if xp_info[:level_up]
			check_achievements_for_player(player_id, nil, { level_up: xp_info[:levels_gained] })
		end
			
		xp_info
	end
		
	def calculate_xp_multiplier(player_id)
		base_multiplier = 1.0
			
		# Weekend bonus
		if Time.now.saturday? || Time.now.sunday?
			base_multiplier *= XP_REWARDS[:weekend_bonus_multiplier]
		end
			
		# Active events
		@active_events.each do |event|
			case event[:type]
			when "double_xp"
				base_multiplier *= XP_REWARDS[:double_xp_event]
			when "bonus_xp"
				base_multiplier *= event[:multiplier] || 1.2
			end
		end
			
		# Player-specific bonuses (premium, etc.)
		player_multiplier = @current_multipliers[player_id] || 1.0
			
		base_multiplier * player_multiplier
	end
		
	# Achievement system integration
	def check_achievements_for_player(player_id, match_stats = nil, event_data = nil)
		achievement_system = @achievement_systems[player_id]
		return unless achievement_system
			
		# Merge event data into match stats if provided
		if event_data && match_stats
			match_stats = match_stats.merge(event_data)
		elsif event_data
			match_stats = event_data
		end
			
		newly_unlocked = achievement_system.check_achievements(match_stats)
			
		newly_unlocked.each do |achievement_id|
			puts "🏆 #{@profiles[player_id]&.display_name} unlocked: #{achievement_id}"
		end
			
		newly_unlocked
	end
		
	# Statistics and reporting
	def get_player_dashboard(player_id)
		profile = @profiles[player_id]
		return nil unless profile
			
		achievement_system = @achievement_systems[player_id]
			
		{
				profile: profile.display_info,
				detailed_stats: profile.detailed_stats,
				achievements: achievement_system&.get_achievement_stats,
				recent_matches: @match_history.get_player_matches(player_id, 10),
				rankings: @leaderboards.get_player_all_rankings(player_id),
				progression: {
						current_level: profile.level,
						xp_progress: profile.xp_progress_to_next_level,
						total_playtime: format_playtime(profile.stats[:total_play_time]),
						rank_info: @rank_system.get_rank_info(profile.rank),
						next_rank: @rank_system.get_next_rank(profile.rank),
						rating_needed: @rank_system.rating_needed_for_next_rank(profile.rating)
				}
		}
	end
		
	def get_leaderboard(category = :rating, limit = 100)
		@leaderboards.generate_leaderboard(category, limit)
	end
		
	def search_players(query)
		@leaderboards.search_players(query)
	end
		
	# Season and event management
	def start_event(event_name, duration_hours = 24, multiplier = 1.5)
		event = {
				name: event_name,
				type: "bonus_xp",
				multiplier: multiplier,
				start_time: Time.now,
				end_time: Time.now + (duration_hours * 3600)
		}
			
		@active_events << event
		puts "🎉 Event started: #{event_name} (#{multiplier}x XP for #{duration_hours}h)"
	end
		
	def end_event(event_name)
		@active_events.reject! { |event| event[:name] == event_name }
		puts "🏁 Event ended: #{event_name}"
	end
		
	def get_active_events
		# Remove expired events
		@active_events.reject! { |event| Time.now > event[:end_time] }
		@active_events
	end
		
	# Daily bonus system
	def claim_daily_bonus(player_id)
		today = Date.today.to_s
		player_bonuses = @daily_bonuses[player_id] ||= {}
			
		return { success: false, reason: "Already claimed today" } if player_bonuses[today]
			
		profile = @profiles[player_id]
		return { success: false, reason: "Player not found" } unless profile
			
		# Award daily login bonus
		xp_info = award_xp(player_id, XP_REWARDS[:daily_login], "Daily login bonus")
		player_bonuses[today] = { claimed_at: Time.now, xp_awarded: XP_REWARDS[:daily_login] }
			
		{
				success: true,
				xp_awarded: XP_REWARDS[:daily_login],
				streak: calculate_login_streak(player_id),
				level_info: xp_info
		}
	end
		
	def get_daily_bonus_status(player_id)
		today = Date.today.to_s
		player_bonuses = @daily_bonuses[player_id] ||= {}
			
		{
				available: !player_bonuses[today],
				streak: calculate_login_streak(player_id),
				next_bonus_amount: XP_REWARDS[:daily_login],
				hours_until_reset: hours_until_daily_reset
		}
	end
		
		private
		
	def process_match_completion(player_id, player_data, winner_team)
		profile = @profiles[player_id]
		return unless profile
			
		won = (player_data[:team] == winner_team)
			
		# Base match completion XP
		base_xp = won ? XP_REWARDS[:match_win] : XP_REWARDS[:match_loss]
		xp_breakdown = { base: base_xp }
			
		# Performance bonuses
		if player_data[:kills] >= 25
			performance_bonus = 75
			award_xp(player_id, performance_bonus, "Outstanding performance")
			xp_breakdown[:performance] = performance_bonus
		elsif player_data[:kills] >= 15
			performance_bonus = 25
			award_xp(player_id, performance_bonus, "Good performance")
			xp_breakdown[:performance] = performance_bonus
		end
			
		# MVP bonus
		if player_data[:mvp_rounds] > 0
			mvp_bonus = player_data[:mvp_rounds] * 25
			award_xp(player_id, mvp_bonus, "MVP rounds")
			xp_breakdown[:mvp] = mvp_bonus
		end
			
		# Check win streak bonus
		if won
			check_win_streak_bonuses(player_id)
		end
			
		# Award base match XP
		xp_info = award_xp(player_id, base_xp, "Match #{won ? 'victory' : 'completion'}")
			
		# Check achievements with full match data
		match_achievements = check_achievements_for_player(player_id, {
				won: won,
				kills: player_data[:kills],
				deaths: player_data[:deaths],
				headshots: player_data[:headshots],
				mvp_rounds: player_data[:mvp_rounds],
				damage: player_data[:damage],
				perfect_game: (won && @statistics_tracker.current_match_data[:final_score][1] == 0)
		})
			
		puts "✨ #{profile.display_name} match completion: #{xp_breakdown.values.sum} total XP"
	end
		
	def calculate_kill_xp(weapon, headshot, assists)
		base_xp = XP_REWARDS[:kill]
		base_xp += XP_REWARDS[:headshot_kill] - XP_REWARDS[:kill] if headshot
		base_xp
	end
		
	def check_kill_streak_bonuses(player_id)
		profile = @profiles[player_id]
		return unless profile
			
		current_streak = profile.instance_variable_get(:@current_kill_streak) || 0
			
		case current_streak
		when 5
			award_xp(player_id, XP_REWARDS[:kill_streak_5], "5 kill streak")
		when 10
			award_xp(player_id, XP_REWARDS[:kill_streak_10], "10 kill streak")
		when 15
			award_xp(player_id, XP_REWARDS[:kill_streak_15], "15 kill streak")
		end
	end
		
	def check_win_streak_bonuses(player_id)
		profile = @profiles[player_id]
		return unless profile
			
		win_streak = profile.stats[:current_win_streak]
			
		case win_streak
		when 3
			award_xp(player_id, XP_REWARDS[:win_streak_3], "3 win streak")
		when 5
			award_xp(player_id, XP_REWARDS[:win_streak_5], "5 win streak")
		when 10
			award_xp(player_id, XP_REWARDS[:win_streak_10], "10 win streak")
		end
	end
		
	def calculate_login_streak(player_id)
		player_bonuses = @daily_bonuses[player_id] ||= {}
		return 0 if player_bonuses.empty?
			
		streak = 0
		date = Date.today
			
		loop do
			break unless player_bonuses[date.to_s]
			streak += 1
			date = date - 1
		end
			
		streak
	end
		
	def hours_until_daily_reset
		tomorrow = Date.today + 1
		reset_time = Time.new(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0)
		((reset_time - Time.now) / 3600).round(1)
	end
		
	def format_playtime(seconds)
		hours = seconds / 3600
		minutes = (seconds % 3600) / 60
		"#{hours}h #{minutes}m"
	end
		
	def update_leaderboards_async
		# In a real implementation, this would be done asynchronously
		# For now, just trigger a cache clear
		@leaderboards.clear_cache
	end
end