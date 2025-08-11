# frozen_string_literal: true

class AchievementSystem
	# Achievement definitions
	ACHIEVEMENTS = {
				# Combat achievements
				first_blood: {
						name: "First Blood",
						description: "Get your first kill",
						category: "combat",
						icon: "🩸",
						rarity: "common",
						rewards: { xp: 50, title: "Killer" },
						condition: ->(stats) { stats[:kills] >= 1 }
				},
				
				headhunter: {
						name: "Headhunter",
						description: "Get 10 headshot kills",
						category: "combat",
						icon: "🎯",
						rarity: "common",
						rewards: { xp: 100, color: "#FF4500" },
						condition: ->(stats) { stats[:headshots] >= 10 }
				},
				
				sharpshooter: {
						name: "Sharpshooter",
						description: "Achieve 75% accuracy in a match",
						category: "combat",
						icon: "🏹",
						rarity: "uncommon",
						rewards: { xp: 150, badge: "sharpshooter" },
						condition: ->(stats, match_stats) { 
							match_stats && match_stats[:shots_fired] >= 20 && 
								(match_stats[:shots_hit].to_f / match_stats[:shots_fired] * 100) >= 75.0
						}
				},
				
				ace: {
						name: "Ace",
						description: "Kill all 5 enemies in a single round",
						category: "combat",
						icon: "🃏",
						rarity: "rare",
						rewards: { xp: 300, title: "Ace", spray: "ace_spray" },
						condition: ->(stats, match_stats, round_stats) {
							round_stats && round_stats[:kills_in_round] >= 5
						}
				},
				
				rampage: {
						name: "Rampage",
						description: "Get a 10 kill streak",
						category: "combat",
						icon: "🔥",
						rarity: "rare",
						rewards: { xp: 250, title: "Unstoppable" },
						condition: ->(stats) { stats[:best_kill_streak] >= 10 }
				},
				
				untouchable: {
						name: "Untouchable",
						description: "Win a match without dying",
						category: "combat",
						icon: "👻",
						rarity: "epic",
						rewards: { xp: 400, title: "Ghost", color: "#800080" },
						condition: ->(stats, match_stats) {
							match_stats && match_stats[:deaths] == 0 && match_stats[:won]
						}
				},
				
				# Objective achievements
				demolition_expert: {
						name: "Demolition Expert",
						description: "Plant 25 bombs",
						category: "objective",
						icon: "💣",
						rarity: "common",
						rewards: { xp: 200, title: "Bomber" },
						condition: ->(stats) { stats[:bomb_plants] >= 25 }
				},
				
				defusal_specialist: {
						name: "Defusal Specialist",
						description: "Defuse 25 bombs",
						category: "objective",
						icon: "🛡️",
						rarity: "common",
						rewards: { xp: 200, title: "Sapper" },
						condition: ->(stats) { stats[:bomb_defuses] >= 25 }
				},
				
				clutch_master: {
						name: "Clutch Master",
						description: "Win 10 1vX clutch situations",
						category: "objective",
						icon: "⚡",
						rarity: "epic",
						rewards: { xp: 500, title: "Clutch King", badge: "clutch_master" },
						condition: ->(stats) { stats[:clutch_wins] >= 10 }
				},
				
				# Team achievements
				team_player: {
						name: "Team Player",
						description: "Get 50 assists",
						category: "team",
						icon: "🤝",
						rarity: "common",
						rewards: { xp: 150, title: "Support" },
						condition: ->(stats) { stats[:assists] >= 50 }
				},
				
				mvp_legend: {
						name: "MVP Legend",
						description: "Be MVP in 25 matches",
						category: "team",
						icon: "⭐",
						rarity: "rare",
						rewards: { xp: 400, title: "MVP", color: "#FFD700" },
						condition: ->(stats) { stats[:mvp_rounds] >= 25 }
				},
				
				# Win streak achievements
				hot_streak: {
						name: "Hot Streak",
						description: "Win 5 matches in a row",
						category: "streak",
						icon: "🔥",
						rarity: "uncommon",
						rewards: { xp: 200, title: "Hot Shot" },
						condition: ->(stats) { stats[:best_win_streak] >= 5 }
				},
				
				unstoppable_force: {
						name: "Unstoppable Force",
						description: "Win 15 matches in a row",
						category: "streak",
						icon: "⚡",
						rarity: "legendary",
						rewards: { xp: 750, title: "Unstoppable", color: "#FF1493", badge: "unstoppable" },
						condition: ->(stats) { stats[:best_win_streak] >= 15 }
				},
				
				# Weapon mastery achievements
				rifle_master: {
						name: "Rifle Master",
						description: "Get 100 kills with rifles",
						category: "weapon",
						icon: "🔫",
						rarity: "uncommon",
						rewards: { xp: 200, weapon_skin: { ak47: "carbon_fiber", m4a1: "carbon_fiber" } },
						condition: ->(stats) {
							rifle_kills = (stats.dig(:weapon_kills, "ak47") || 0) + 
																					(stats.dig(:weapon_kills, "m4a1") || 0)
							rifle_kills >= 100
						}
				},
				
				awp_god: {
						name: "AWP God",
						description: "Get 50 AWP kills",
						category: "weapon",
						icon: "🎯",
						rarity: "rare",
						rewards: { xp: 300, title: "Sniper", weapon_skin: { awp: "dragon_lore" } },
						condition: ->(stats) { (stats.dig(:weapon_kills, "awp") || 0) >= 50 }
				},
				
				pistol_expert: {
						name: "Pistol Expert",
						description: "Get 75 pistol kills",
						category: "weapon",
						icon: "🔫",
						rarity: "uncommon",
						rewards: { xp: 175, title: "Gunslinger" },
						condition: ->(stats) {
							pistol_kills = (stats.dig(:weapon_kills, "usp") || 0) + 
																						(stats.dig(:weapon_kills, "glock") || 0) + 
																						(stats.dig(:weapon_kills, "deagle") || 0)
							pistol_kills >= 75
						}
				},
				
				# Map achievements
				dust2_veteran: {
						name: "Dust2 Veteran",
						description: "Win 50 matches on Dust2",
						category: "map",
						icon: "🏜️",
						rarity: "uncommon",
						rewards: { xp: 250, badge: "dust2_veteran" },
						condition: ->(stats) { (stats.dig(:map_wins, "dust2") || 0) >= 50 }
				},
				
				inferno_specialist: {
						name: "Inferno Specialist",
						description: "Win 50 matches on Inferno",
						category: "map",
						icon: "🔥",
						rarity: "uncommon",
						rewards: { xp: 250, badge: "inferno_specialist" },
						condition: ->(stats) { (stats.dig(:map_wins, "inferno") || 0) >= 50 }
				},
				
				# Milestone achievements
				centurion: {
						name: "Centurion",
						description: "Get 100 kills",
						category: "milestone",
						icon: "💯",
						rarity: "common",
						rewards: { xp: 200, title: "Centurion" },
						condition: ->(stats) { stats[:kills] >= 100 }
				},
				
				thousand_cuts: {
						name: "Thousand Cuts",
						description: "Get 1000 kills",
						category: "milestone",
						icon: "⚔️",
						rarity: "epic",
						rewards: { xp: 1000, title: "Slayer", color: "#8B0000", badge: "slayer" },
						condition: ->(stats) { stats[:kills] >= 1000 }
				},
				
				veteran: {
						name: "Veteran",
						description: "Play 100 matches",
						category: "milestone",
						icon: "🎖️",
						rarity: "uncommon",
						rewards: { xp: 300, title: "Veteran", color: "#008000" },
						condition: ->(stats) { stats[:matches_played] >= 100 }
				},
				
				no_life: {
						name: "No Life",
						description: "Play for 100 hours",
						category: "milestone",
						icon: "⏰",
						rarity: "rare",
						rewards: { xp: 500, title: "Dedicated", badge: "no_life" },
						condition: ->(stats) { stats[:total_play_time] >= 360000 } # 100 hours in seconds
				},
				
				# Special achievements
				double_agent: {
						name: "Double Agent",
						description: "Win 25 matches as CT and 25 matches as T",
						category: "special",
						icon: "🕵️",
						rarity: "rare",
						rewards: { xp: 350, title: "Double Agent", color: "#4B0082" },
						condition: ->(stats) { stats[:ct_wins] >= 25 && stats[:t_wins] >= 25 }
				},
				
				perfectionist: {
						name: "Perfectionist",
						description: "Win a match 16-0",
						category: "special",
						icon: "💯",
						rarity: "legendary",
						rewards: { xp: 750, title: "Perfect", color: "#FF69B4", spray: "perfect_spray" },
						condition: ->(stats, match_stats) {
							match_stats && match_stats[:perfect_game]
						}
				},
				
				comeback_king: {
						name: "Comeback King",
						description: "Win a match after being down 15-3",
						category: "special",
						icon: "👑",
						rarity: "legendary",
						rewards: { xp: 800, title: "Comeback King", badge: "comeback_king" },
						condition: ->(stats, match_stats) {
							match_stats && match_stats[:comeback_victory]
						}
				}
		}.freeze
		
	# Rarity colors and XP multipliers
	RARITY_INFO = {
				"common" => { color: "#FFFFFF", multiplier: 1.0 },
				"uncommon" => { color: "#1EFF00", multiplier: 1.2 },
				"rare" => { color: "#0070DD", multiplier: 1.5 },
				"epic" => { color: "#A335EE", multiplier: 2.0 },
				"legendary" => { color: "#FF8000", multiplier: 3.0 }
		}.freeze
		
	def initialize(player_profile)
		@player_profile = player_profile
		@pending_checks = []
	end
		
	# Check all achievements for a player
	def check_achievements(match_stats = nil, round_stats = nil)
		newly_unlocked = []
				
		ACHIEVEMENTS.each do |achievement_id, achievement_data|
			next if achievement_unlocked?(achievement_id)
						
			if check_achievement_condition(achievement_id, achievement_data, match_stats, round_stats)
				unlock_achievement(achievement_id, achievement_data)
				newly_unlocked << achievement_id
			end
		end
				
		newly_unlocked
	end
		
	# Check a specific achievement
	def check_achievement(achievement_id, match_stats = nil, round_stats = nil)
		return false if achievement_unlocked?(achievement_id)
				
		achievement_data = ACHIEVEMENTS[achievement_id]
		return false unless achievement_data
				
		if check_achievement_condition(achievement_id, achievement_data, match_stats, round_stats)
			unlock_achievement(achievement_id, achievement_data)
			return true
		end
				
		false
	end
		
	# Get achievement progress (for progressive achievements)
	def get_achievement_progress(achievement_id)
		achievement_data = ACHIEVEMENTS[achievement_id]
		return nil unless achievement_data
				
		case achievement_id
		when :headhunter
			{ current: @player_profile.stats[:headshots], required: 10 }
		when :demolition_expert
			{ current: @player_profile.stats[:bomb_plants], required: 25 }
		when :defusal_specialist
			{ current: @player_profile.stats[:bomb_defuses], required: 25 }
		when :team_player
			{ current: @player_profile.stats[:assists], required: 50 }
		when :centurion
			{ current: @player_profile.stats[:kills], required: 100 }
		when :thousand_cuts
			{ current: @player_profile.stats[:kills], required: 1000 }
		when :veteran
			{ current: @player_profile.stats[:matches_played], required: 100 }
		when :rifle_master
			rifle_kills = (@player_profile.stats.dig(:weapon_kills, "ak47") || 0) + 
																			(@player_profile.stats.dig(:weapon_kills, "m4a1") || 0)
			{ current: rifle_kills, required: 100 }
		when :awp_god
			{ current: @player_profile.stats.dig(:weapon_kills, "awp") || 0, required: 50 }
		when :pistol_expert
			pistol_kills = (@player_profile.stats.dig(:weapon_kills, "usp") || 0) + 
																				(@player_profile.stats.dig(:weapon_kills, "glock") || 0) + 
																				(@player_profile.stats.dig(:weapon_kills, "deagle") || 0)
			{ current: pistol_kills, required: 75 }
		else
			nil
		end
	end
		
	# Get all unlocked achievements
	def get_unlocked_achievements
		unlocked = @player_profile.achievements[:unlocked] || []
		unlocked.map do |achievement_id|
			{
								id: achievement_id,
								**ACHIEVEMENTS[achievement_id.to_sym],
								unlocked_at: get_unlock_timestamp(achievement_id)
						}
		end
	end
		
	# Get achievements by category
	def get_achievements_by_category(category = nil)
		achievements = ACHIEVEMENTS.dup
		achievements = achievements.select { |_, data| data[:category] == category } if category
				
		achievements.map do |id, data|
			unlocked = achievement_unlocked?(id)
			progress = get_achievement_progress(id)
						
			{
								id: id,
								unlocked: unlocked,
								progress: progress,
								unlock_timestamp: unlocked ? get_unlock_timestamp(id) : nil,
								**data
						}
		end
	end
		
	# Get achievement statistics
	def get_achievement_stats
		total_achievements = ACHIEVEMENTS.count
		unlocked_achievements = (@player_profile.achievements[:unlocked] || []).count
		completion_percentage = (unlocked_achievements.to_f / total_achievements * 100).round(1)
				
		category_stats = {}
		ACHIEVEMENTS.values.map { |a| a[:category] }.uniq.each do |category|
			category_achievements = ACHIEVEMENTS.select { |_, data| data[:category] == category }
			category_unlocked = category_achievements.count { |id, _| achievement_unlocked?(id) }
						
			category_stats[category] = {
								total: category_achievements.count,
								unlocked: category_unlocked,
								percentage: (category_unlocked.to_f / category_achievements.count * 100).round(1)
						}
		end
				
		{
						total_achievements: total_achievements,
						unlocked_achievements: unlocked_achievements,
						completion_percentage: completion_percentage,
						categories: category_stats,
						latest_unlock: get_latest_achievement_unlock,
						total_achievement_xp: calculate_total_achievement_xp
				}
	end
		
	# Get daily/weekly achievement challenges
	def get_daily_challenges
		[
						{
								id: :daily_kills,
								name: "Daily Assassin",
								description: "Get 20 kills today",
								reward: { xp: 100 },
								progress: { current: 0, required: 20 }, # Would be calculated from today's stats
								expires_at: Time.now.end_of_day
						},
						{
								id: :daily_wins,
								name: "Victory March",
								description: "Win 3 matches today",
								reward: { xp: 150 },
								progress: { current: 0, required: 3 },
								expires_at: Time.now.end_of_day
						},
						{
								id: :daily_headshots,
								name: "Precision Strike",
								description: "Get 10 headshots today",
								reward: { xp: 75 },
								progress: { current: 0, required: 10 },
								expires_at: Time.now.end_of_day
						}
				]
	end
		
	def get_weekly_challenges
		[
						{
								id: :weekly_matches,
								name: "Dedicated Player",
								description: "Play 20 matches this week",
								reward: { xp: 500, title: "Dedicated" },
								progress: { current: 0, required: 20 },
								expires_at: Time.now.end_of_week
						},
						{
								id: :weekly_bomb_plants,
								name: "Explosive Week",
								description: "Plant 15 bombs this week",
								reward: { xp: 300 },
								progress: { current: 0, required: 15 },
								expires_at: Time.now.end_of_week
						}
				]
	end
		
		private
		
	def achievement_unlocked?(achievement_id)
		(@player_profile.achievements[:unlocked] || []).include?(achievement_id.to_s)
	end
		
	def check_achievement_condition(achievement_id, achievement_data, match_stats, round_stats)
		condition = achievement_data[:condition]
		return false unless condition
				
		begin
			condition.call(@player_profile.stats, match_stats, round_stats)
				rescue => e
					puts "Error checking achievement #{achievement_id}: #{e.message}"
					false
		end
	end
		
	def unlock_achievement(achievement_id, achievement_data)
		# Add to unlocked list
		@player_profile.achievements[:unlocked] ||= []
		@player_profile.achievements[:unlocked] << achievement_id.to_s
				
		# Record unlock timestamp
		@player_profile.achievements[:unlock_timestamps] ||= {}
		@player_profile.achievements[:unlock_timestamps][achievement_id.to_s] = Time.now.to_s
				
		# Apply rewards
		apply_achievement_rewards(achievement_id, achievement_data[:rewards])
				
		# Calculate achievement XP with rarity multiplier
		base_xp = achievement_data.dig(:rewards, :xp) || 0
		rarity_multiplier = RARITY_INFO.dig(achievement_data[:rarity], :multiplier) || 1.0
		total_xp = (base_xp * rarity_multiplier).round
				
		if total_xp > 0
			xp_info = @player_profile.add_xp(total_xp, "Achievement: #{achievement_data[:name]}")
			puts "🏆 Achievement unlocked: #{achievement_data[:name]} (+#{total_xp} XP)"
		else
			puts "🏆 Achievement unlocked: #{achievement_data[:name]}"
		end
	end
		
	def apply_achievement_rewards(achievement_id, rewards)
		return unless rewards
				
		# Apply title rewards
		if title = rewards[:title]
			unless @player_profile.unlocked_rewards[:titles].include?(title)
				@player_profile.unlocked_rewards[:titles] << title
				puts "🎭 New title unlocked: #{title}"
			end
		end
				
		# Apply color rewards
		if color = rewards[:color]
			unless @player_profile.unlocked_rewards[:colors].include?(color)
				@player_profile.unlocked_rewards[:colors] << color
				puts "🎨 New color unlocked: #{color}"
			end
		end
				
		# Apply badge rewards
		if badge = rewards[:badge]
			unless @player_profile.unlocked_rewards[:badges].include?(badge)
				@player_profile.unlocked_rewards[:badges] << badge
				puts "🏅 New badge unlocked: #{badge}"
			end
		end
				
		# Apply spray rewards
		if spray = rewards[:spray]
			unless @player_profile.unlocked_rewards[:sprays].include?(spray)
				@player_profile.unlocked_rewards[:sprays] << spray
				puts "🎯 New spray unlocked: #{spray}"
			end
		end
				
		# Apply weapon skin rewards
		if weapon_skins = rewards[:weapon_skin]
			weapon_skins.each do |weapon, skin|
				@player_profile.unlocked_rewards[:weapon_skins][weapon.to_s] ||= []
				unless @player_profile.unlocked_rewards[:weapon_skins][weapon.to_s].include?(skin)
					@player_profile.unlocked_rewards[:weapon_skins][weapon.to_s] << skin
					puts "🔫 New weapon skin unlocked: #{weapon} - #{skin}"
				end
			end
		end
	end
		
	def get_unlock_timestamp(achievement_id)
		timestamp_str = @player_profile.achievements.dig(:unlock_timestamps, achievement_id.to_s)
		timestamp_str ? Time.parse(timestamp_str) : nil
		rescue
			nil
	end
		
	def get_latest_achievement_unlock
		timestamps = @player_profile.achievements[:unlock_timestamps] || {}
		return nil if timestamps.empty?
				
		latest_id = timestamps.max_by { |_, timestamp| Time.parse(timestamp) rescue Time.at(0) }.first
		{
						id: latest_id.to_sym,
						**ACHIEVEMENTS[latest_id.to_sym],
						unlocked_at: Time.parse(timestamps[latest_id])
				}
		rescue
			nil
	end
		
	def calculate_total_achievement_xp
		unlocked = @player_profile.achievements[:unlocked] || []
		total = 0
				
		unlocked.each do |achievement_id|
			achievement_data = ACHIEVEMENTS[achievement_id.to_sym]
			next unless achievement_data
						
			base_xp = achievement_data.dig(:rewards, :xp) || 0
			rarity_multiplier = RARITY_INFO.dig(achievement_data[:rarity], :multiplier) || 1.0
			total += (base_xp * rarity_multiplier).round
		end
				
		total
	end
end