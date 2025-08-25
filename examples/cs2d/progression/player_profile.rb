# frozen_string_literal: true

require "json"
require "fileutils"

class PlayerProfile
	PROFILES_DIR = File.expand_path("../data/profiles", __dir__)
		
	attr_accessor :player_id, :username, :display_name, :avatar_color, :custom_title
	attr_reader :level, :xp, :total_xp, :rank, :rating, :created_at, :last_played
		
	# Statistics
	attr_reader :stats
		
	# Achievements and unlocks
	attr_reader :achievements, :unlocked_rewards, :current_rewards
		
	# Match history
	attr_reader :match_history
		
	# Profile customization
	attr_reader :customization
		
	def initialize(player_id, username = nil)
		@player_id = player_id
		@username = username || "Player#{player_id}"
				
		# Initialize default values
		@display_name = @username
		@level = 1
		@xp = 0
		@total_xp = 0
		@rank = "Unranked"
		@rating = 1000
		@created_at = Time.now
		@last_played = Time.now
				
		# Statistics initialization
		@stats = {
						# Core combat stats
						kills: 0,
						deaths: 0,
						assists: 0,
						headshots: 0,
						shots_fired: 0,
						shots_hit: 0,
						damage_dealt: 0,
						damage_taken: 0,
						
						# Game mode stats
						matches_played: 0,
						matches_won: 0,
						matches_lost: 0,
						rounds_played: 0,
						rounds_won: 0,
						rounds_lost: 0,
						
						# Objective stats
						bomb_plants: 0,
						bomb_defuses: 0,
						bomb_explosions: 0,
						hostage_rescues: 0,
						
						# Economy stats
						money_earned: 0,
						money_spent: 0,
						
						# Weapon-specific stats
						weapon_kills: {},
						weapon_usage: {},
						
						# Map-specific stats
						map_wins: {},
						map_losses: {},
						map_performance: {},
						
						# Team stats
						ct_wins: 0,
						ct_losses: 0,
						t_wins: 0,
						t_losses: 0,
						
						# Streak records
						best_kill_streak: 0,
						best_win_streak: 0,
						current_win_streak: 0,
						
						# Time stats
						total_play_time: 0,
						average_match_duration: 0
				}
				
		# Achievements system
		@achievements = {
						unlocked: [],
						progress: {}
				}
				
		# Rewards and unlocks
		@unlocked_rewards = {
						titles: ["Rookie"],
						colors: ["#FFFFFF", "#00FF00"],
						badges: [],
						sprays: [],
						weapon_skins: {}
				}
				
		@current_rewards = {
						title: nil,
						color: "#FFFFFF",
						badge: nil,
						spray: nil
				}
				
		# Match history (last 50 matches)
		@match_history = []
				
		# Profile customization
		@customization = {
						avatar_color: "#FFFFFF",
						preferred_team: nil,
						crosshair_settings: {},
						sound_settings: {},
						display_preferences: {}
				}
				
		# Load existing profile if it exists
		load_profile if profile_exists?
				
		# Ensure directories exist
		FileUtils.mkdir_p(PROFILES_DIR)
	end
		
	def profile_path
		File.join(PROFILES_DIR, "#{@player_id}.json")
	end
		
	def profile_exists?
		File.exist?(profile_path)
	end
		
	def save_profile
		profile_data = {
						player_id: @player_id,
						username: @username,
						display_name: @display_name,
						level: @level,
						xp: @xp,
						total_xp: @total_xp,
						rank: @rank,
						rating: @rating,
						created_at: @created_at,
						last_played: Time.now,
						stats: @stats,
						achievements: @achievements,
						unlocked_rewards: @unlocked_rewards,
						current_rewards: @current_rewards,
						match_history: @match_history.last(50), # Keep only last 50 matches
						customization: @customization
				}
				
		File.write(profile_path, JSON.pretty_generate(profile_data))
		@last_played = Time.now
	end
		
	def load_profile
		return unless profile_exists?
				
		begin
			data = JSON.parse(File.read(profile_path), symbolize_names: true)
						
			@username = data[:username] || @username
			@display_name = data[:display_name] || @username
			@level = data[:level] || 1
			@xp = data[:xp] || 0
			@total_xp = data[:total_xp] || 0
			@rank = data[:rank] || "Unranked"
			@rating = data[:rating] || 1000
			@created_at = data[:created_at] ? Time.parse(data[:created_at]) : Time.now
			@last_played = data[:last_played] ? Time.parse(data[:last_played]) : Time.now
						
			# Merge stats with defaults
			@stats.merge!(data[:stats] || {})
						
			# Load achievements
			@achievements.merge!(data[:achievements] || {})
						
			# Load unlocked rewards
			@unlocked_rewards.merge!(data[:unlocked_rewards] || {})
			@current_rewards.merge!(data[:current_rewards] || {})
						
			# Load match history
			@match_history = data[:match_history] || []
						
			# Load customization
			@customization.merge!(data[:customization] || {})
						
				rescue JSON::ParserError => e
					puts "Error loading profile #{@player_id}: #{e.message}"
		end
	end
		
	# XP and leveling system
	def add_xp(amount, reason = "Game activity")
		@xp += amount
		@total_xp += amount
		old_level = @level
				
		# Check for level up
		while @xp >= xp_required_for_next_level
			level_up!
		end
				
		# Return level up information
		{
						xp_gained: amount,
						reason: reason,
						new_level: @level,
						level_up: @level > old_level,
						levels_gained: @level - old_level
				}
	end
		
	def xp_required_for_level(level)
		# Exponential XP curve: level 1 = 100 XP, level 2 = 300 XP, etc.
		case level
		when 1
			0
		when 2..10
			100 * (level - 1) * level / 2
		when 11..25
			1000 + (level - 10) * 200
		when 26..50
			4000 + (level - 25) * 400
		else
			14000 + (level - 50) * 800
		end
	end
		
	def xp_required_for_next_level
		xp_required_for_level(@level + 1) - xp_required_for_level(@level)
	end
		
	def xp_progress_to_next_level
		current_level_xp = xp_required_for_level(@level)
		next_level_xp = xp_required_for_level(@level + 1)
		total_xp_for_level = next_level_xp - current_level_xp
		current_progress = @total_xp - current_level_xp
				
		{
						current: current_progress,
						required: total_xp_for_level,
						percentage: (current_progress.to_f / total_xp_for_level * 100).round(1)
				}
	end
		
	private def level_up!
		@level += 1
		@xp -= xp_required_for_next_level
				
		# Unlock rewards based on level
		unlock_level_rewards
				
		puts "🎉 #{@display_name} reached level #{@level}!"
	end
		
	private def unlock_level_rewards
		case @level
		when 5
			@unlocked_rewards[:colors] << "#FF0000" unless @unlocked_rewards[:colors].include?("#FF0000")
			@unlocked_rewards[:titles] << "Warrior" unless @unlocked_rewards[:titles].include?("Warrior")
		when 10
			@unlocked_rewards[:colors] << "#0000FF" unless @unlocked_rewards[:colors].include?("#0000FF")
			@unlocked_rewards[:titles] << "Veteran" unless @unlocked_rewards[:titles].include?("Veteran")
		when 25
			@unlocked_rewards[:colors] << "#FFD700" unless @unlocked_rewards[:colors].include?("#FFD700")
			@unlocked_rewards[:titles] << "Elite" unless @unlocked_rewards[:titles].include?("Elite")
		when 50
			@unlocked_rewards[:colors] << "#FF1493" unless @unlocked_rewards[:colors].include?("#FF1493")
			@unlocked_rewards[:titles] << "Legend" unless @unlocked_rewards[:titles].include?("Legend")
		end
	end
		
	# Statistics methods
	def kd_ratio
		return 0.0 if @stats[:deaths] == 0
		(@stats[:kills].to_f / @stats[:deaths]).round(2)
	end
		
	def accuracy_percentage
		return 0.0 if @stats[:shots_fired] == 0
		(@stats[:shots_hit].to_f / @stats[:shots_fired] * 100).round(2)
	end
		
	def headshot_percentage
		return 0.0 if @stats[:kills] == 0
		(@stats[:headshots].to_f / @stats[:kills] * 100).round(2)
	end
		
	def win_rate
		return 0.0 if @stats[:matches_played] == 0
		(@stats[:matches_won].to_f / @stats[:matches_played] * 100).round(2)
	end
		
	def average_damage_per_round
		return 0.0 if @stats[:rounds_played] == 0
		(@stats[:damage_dealt].to_f / @stats[:rounds_played]).round(1)
	end
		
	# Match recording
	def add_match_result(match_data)
		match_record = {
						timestamp: Time.now,
						map: match_data[:map],
						mode: match_data[:mode] || "Classic",
						result: match_data[:result], # 'win', 'loss', 'draw'
						score: match_data[:score], # [ct_score, t_score]
						team: match_data[:team], # :ct or :t
						kills: match_data[:kills] || 0,
						deaths: match_data[:deaths] || 0,
						assists: match_data[:assists] || 0,
						damage: match_data[:damage] || 0,
						mvp: match_data[:mvp] || false,
						duration: match_data[:duration] || 0,
						rating_change: match_data[:rating_change] || 0
				}
				
		@match_history << match_record
		@match_history = @match_history.last(50) # Keep only last 50 matches
				
		match_record
	end
		
	# Profile display methods
	def display_info
		{
						username: @display_name,
						level: @level,
						rank: @rank,
						rating: @rating,
						kd_ratio: kd_ratio,
						win_rate: win_rate,
						accuracy: accuracy_percentage,
						headshot_rate: headshot_percentage,
						matches_played: @stats[:matches_played],
						total_playtime: format_playtime(@stats[:total_play_time]),
						current_title: @current_rewards[:title],
						current_color: @current_rewards[:color]
				}
	end
		
	def detailed_stats
		{
						combat: {
								kills: @stats[:kills],
								deaths: @stats[:deaths],
								assists: @stats[:assists],
								kd_ratio: kd_ratio,
								headshots: @stats[:headshots],
								headshot_rate: headshot_percentage,
								accuracy: accuracy_percentage,
								damage_dealt: @stats[:damage_dealt],
								damage_taken: @stats[:damage_taken]
						},
						matches: {
								played: @stats[:matches_played],
								won: @stats[:matches_won],
								lost: @stats[:matches_lost],
								win_rate: win_rate,
								current_streak: @stats[:current_win_streak],
								best_streak: @stats[:best_win_streak]
						},
						objectives: {
								bomb_plants: @stats[:bomb_plants],
								bomb_defuses: @stats[:bomb_defuses],
								hostage_rescues: @stats[:hostage_rescues]
						},
						progression: {
								level: @level,
								xp_progress: xp_progress_to_next_level,
								total_xp: @total_xp,
								rank: @rank,
								rating: @rating
						}
				}
	end
		
	private def format_playtime(seconds)
		hours = seconds / 3600
		minutes = (seconds % 3600) / 60
		"#{hours}h #{minutes}m"
	end
		
	# Update methods for real-time stat tracking
	def record_kill(weapon: nil, headshot: false, damage: 0)
		@stats[:kills] += 1
		@stats[:headshots] += 1 if headshot
		@stats[:damage_dealt] += damage
				
		if weapon
			@stats[:weapon_kills][weapon] = (@stats[:weapon_kills][weapon] || 0) + 1
		end
				
		# Update kill streak
		@current_kill_streak = (@current_kill_streak || 0) + 1
		@stats[:best_kill_streak] = [@stats[:best_kill_streak], @current_kill_streak].max
	end
		
	def record_death(damage_taken: 0)
		@stats[:deaths] += 1
		@stats[:damage_taken] += damage_taken
		@current_kill_streak = 0
	end
		
	def record_shot(hit: false, weapon: nil)
		@stats[:shots_fired] += 1
		@stats[:shots_hit] += 1 if hit
				
		if weapon
			@stats[:weapon_usage][weapon] = (@stats[:weapon_usage][weapon] || 0) + 1
		end
	end
		
	def record_round_result(won: false, team: nil)
		@stats[:rounds_played] += 1
		@stats[:rounds_won] += 1 if won
		@stats[:rounds_lost] += 1 unless won
				
		if team == :ct
			@stats[:ct_wins] += 1 if won
			@stats[:ct_losses] += 1 unless won
		elsif team == :t
			@stats[:t_wins] += 1 if won
			@stats[:t_losses] += 1 unless won
		end
	end
		
	def record_match_result(won: false, map: nil)
		@stats[:matches_played] += 1
		@stats[:matches_won] += 1 if won
		@stats[:matches_lost] += 1 unless won
				
		if won
			@stats[:current_win_streak] += 1
			@stats[:best_win_streak] = [@stats[:best_win_streak], @stats[:current_win_streak]].max
		else
			@stats[:current_win_streak] = 0
		end
				
		if map
			@stats[:map_wins][map] = (@stats[:map_wins][map] || 0) + (won ? 1 : 0)
			@stats[:map_losses][map] = (@stats[:map_losses][map] || 0) + (won ? 0 : 1)
		end
	end
		
	def record_objective(type, success: true)
		case type
		when :bomb_plant
			@stats[:bomb_plants] += 1 if success
		when :bomb_defuse
			@stats[:bomb_defuses] += 1 if success
		when :bomb_explosion
			@stats[:bomb_explosions] += 1 if success
		when :hostage_rescue
			@stats[:hostage_rescues] += 1 if success
		end
	end
		
	def add_playtime(seconds)
		@stats[:total_play_time] += seconds
	end
		
	def update_money_stats(earned: 0, spent: 0)
		@stats[:money_earned] += earned
		@stats[:money_spent] += spent
	end
end