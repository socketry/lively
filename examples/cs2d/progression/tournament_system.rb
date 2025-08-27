# frozen_string_literal: true

require "json"
require "fileutils"
require "securerandom"

class TournamentSystem
	TOURNAMENTS_DIR = File.expand_path("../data/tournaments", __dir__)
		
	# Tournament formats
	TOURNAMENT_FORMATS = {
			"single_elimination" => {
					name: "Single Elimination",
					description: "Standard knockout tournament",
					min_players: 4,
					max_players: 64,
					rounds_formula: ->(players) { Math.log2(players).ceil }
			},
			"double_elimination" => {
					name: "Double Elimination",
					description: "Tournament with winners and losers bracket",
					min_players: 4,
					max_players: 32,
					rounds_formula: ->(players) { (Math.log2(players) * 2 - 1).ceil }
			},
			"round_robin" => {
					name: "Round Robin",
					description: "Every player plays every other player",
					min_players: 3,
					max_players: 12,
					rounds_formula: ->(players) { players - 1 }
			},
			"swiss" => {
					name: "Swiss System",
					description: "Players paired based on similar performance",
					min_players: 8,
					max_players: 64,
					rounds_formula: ->(players) { Math.log2(players).ceil + 1 }
			}
	}.freeze
		
	# Prize pool templates
	PRIZE_TEMPLATES = {
			"winner_takes_all" => {
					name: "Winner Takes All",
					distribution: { 1 => 1.0 }
			},
			"top_3" => {
					name: "Top 3",
					distribution: { 1 => 0.6, 2 => 0.3, 3 => 0.1 }
			},
			"top_4" => {
					name: "Top 4",
					distribution: { 1 => 0.5, 2 => 0.25, 3 => 0.15, 4 => 0.1 }
			},
			"top_8" => {
					name: "Top 8",
					distribution: { 1 => 0.4, 2 => 0.2, 3 => 0.15, 4 => 0.1, 5 => 0.05, 6 => 0.05, 7 => 0.025, 8 => 0.025 }
			}
	}.freeze
		
	def initialize(progression_manager)
		@progression_manager = progression_manager
		@rank_system = progression_manager.rank_system
		FileUtils.mkdir_p(TOURNAMENTS_DIR)
	end
		
	# Create a new tournament
	def create_tournament(tournament_data)
		tournament_id = generate_tournament_id
			
		tournament = {
					id: tournament_id,
					name: tournament_data[:name] || "Unnamed Tournament",
					description: tournament_data[:description] || "",
					format: tournament_data[:format] || "single_elimination",
					max_players: tournament_data[:max_players] || 16,
					entry_fee: tournament_data[:entry_fee] || 0,
					prize_pool: tournament_data[:prize_pool] || 0,
					prize_distribution: tournament_data[:prize_distribution] || "top_3",
					
					# Registration settings
					registration_open: tournament_data[:registration_open] != false,
					registration_deadline: tournament_data[:registration_deadline],
					min_rank: tournament_data[:min_rank] || "Unranked",
					max_rank: tournament_data[:max_rank] || "The Global Elite",
					min_level: tournament_data[:min_level] || 1,
					
					# Match settings
					match_format: tournament_data[:match_format] || "bo3", # bo1, bo3, bo5
					maps: tournament_data[:maps] || ["dust2", "inferno", "mirage"],
					server_settings: tournament_data[:server_settings] || {},
					
					# Tournament state
					status: "registration", # registration, active, completed, cancelled
					created_at: Time.now,
					started_at: nil,
					completed_at: nil,
					
					# Participants
					participants: [],
					brackets: {},
					matches: [],
					
					# Results
					final_standings: [],
					
					# Metadata
					created_by: tournament_data[:created_by],
					admins: tournament_data[:admins] || [],
					rules: tournament_data[:rules] || default_tournament_rules
			}
			
		save_tournament(tournament)
			
		puts "🏆 Tournament created: #{tournament[:name]} (#{tournament_id})"
		tournament
	end
		
	# Register player for tournament
	def register_player(tournament_id, player_id)
		tournament = load_tournament(tournament_id)
		return { success: false, message: "Tournament not found" } unless tournament
			
		# Check registration status
		return { success: false, message: "Registration is closed" } unless tournament[:registration_open]
		return { success: false, message: "Tournament has already started" } if tournament[:status] != "registration"
			
		# Check if already registered
		if tournament[:participants].any? { |p| p[:player_id] == player_id }
			return { success: false, message: "Already registered for this tournament" }
		end
			
		# Check player eligibility
		profile = @progression_manager.get_player_profile(player_id)
		return { success: false, message: "Player profile not found" } unless profile
			
		eligibility = check_player_eligibility(tournament, profile)
		return eligibility unless eligibility[:success]
			
		# Check tournament capacity
		if tournament[:participants].length >= tournament[:max_players]
			return { success: false, message: "Tournament is full" }
		end
			
		# Register player
		participant = {
					player_id: player_id,
					player_name: profile.display_name,
					rating: profile.rating,
					rank: profile.rank,
					level: profile.level,
					registered_at: Time.now,
					seed: nil, # Will be assigned when brackets are generated
					status: "active"
			}
			
		tournament[:participants] << participant
		tournament[:prize_pool] += tournament[:entry_fee] if tournament[:entry_fee] > 0
			
		save_tournament(tournament)
			
		{
					success: true,
					message: "Successfully registered for #{tournament[:name]}",
					participant_count: tournament[:participants].length,
					max_players: tournament[:max_players]
			}
	end
		
	# Start tournament (generate brackets)
	def start_tournament(tournament_id)
		tournament = load_tournament(tournament_id)
		return { success: false, message: "Tournament not found" } unless tournament
		return { success: false, message: "Tournament already started" } if tournament[:status] != "registration"
			
		format_info = TOURNAMENT_FORMATS[tournament[:format]]
		return { success: false, message: "Invalid tournament format" } unless format_info
			
		# Check minimum players
		if tournament[:participants].length < format_info[:min_players]
			return { success: false, message: "Need at least #{format_info[:min_players]} players" }
		end
			
		# Assign seeds based on rating
		seeded_participants = tournament[:participants].sort_by { |p| -p[:rating] }
		seeded_participants.each_with_index { |p, i| p[:seed] = i + 1 }
			
		# Generate brackets based on format
		brackets = case tournament[:format]
													when "single_elimination"
														generate_single_elimination_bracket(seeded_participants)
													when "double_elimination"
														generate_double_elimination_bracket(seeded_participants)
													when "round_robin"
														generate_round_robin_bracket(seeded_participants)
													when "swiss"
														generate_swiss_bracket(seeded_participants)
		end
			
		tournament[:brackets] = brackets
		tournament[:status] = "active"
		tournament[:started_at] = Time.now
		tournament[:registration_open] = false
			
		save_tournament(tournament)
			
		puts "🚀 Tournament started: #{tournament[:name]}"
		{
					success: true,
					message: "Tournament started with #{seeded_participants.length} players",
					brackets: brackets
			}
	end
		
	# Report match result
	def report_match_result(tournament_id, match_id, result_data)
		tournament = load_tournament(tournament_id)
		return { success: false, message: "Tournament not found" } unless tournament
		return { success: false, message: "Tournament not active" } if tournament[:status] != "active"
			
		match = tournament[:matches].find { |m| m[:id] == match_id }
		return { success: false, message: "Match not found" } unless match
		return { success: false, message: "Match already completed" } if match[:status] == "completed"
			
		# Validate result
		unless valid_match_result?(result_data, tournament[:match_format])
			return { success: false, message: "Invalid match result" }
		end
			
		# Update match
		match[:status] = "completed"
		match[:result] = result_data
		match[:completed_at] = Time.now
		match[:winner] = determine_match_winner(result_data)
			
		# Update tournament progress
		update_tournament_progress(tournament, match)
			
		save_tournament(tournament)
			
		{
					success: true,
					message: "Match result reported",
					winner: match[:winner],
					tournament_complete: tournament[:status] == "completed"
			}
	end
		
	# Get tournament details
	def get_tournament(tournament_id)
		tournament = load_tournament(tournament_id)
		return nil unless tournament
			
		# Add computed fields
		tournament[:participant_count] = tournament[:participants].length
		tournament[:matches_completed] = tournament[:matches].count { |m| m[:status] == "completed" }
		tournament[:matches_total] = tournament[:matches].length
		tournament[:progress_percentage] = tournament[:matches_total] > 0 ? 
					(tournament[:matches_completed].to_f / tournament[:matches_total] * 100).round(1) : 0
			
		tournament
	end
		
	# List tournaments
	def list_tournaments(filters = {})
		tournaments = []
			
		Dir.glob(File.join(TOURNAMENTS_DIR, "*.json")).each do |file|
			begin
				tournament = JSON.parse(File.read(file), symbolize_names: true)
						
				# Apply filters
				next if filters[:status] && tournament[:status] != filters[:status]
				next if filters[:format] && tournament[:format] != filters[:format]
				next if filters[:player_id] && !tournament[:participants].any? { |p| p[:player_id] == filters[:player_id] }
						
				tournaments << {
								id: tournament[:id],
								name: tournament[:name],
								format: tournament[:format],
								status: tournament[:status],
								participant_count: tournament[:participants].length,
								max_players: tournament[:max_players],
								prize_pool: tournament[:prize_pool],
								created_at: tournament[:created_at],
								started_at: tournament[:started_at]
						}
				rescue JSON::ParserError
					next
			end
		end
			
		tournaments.sort_by { |t| Time.parse(t[:created_at].to_s) }.reverse
	end
		
	# Get player tournament history
	def get_player_tournaments(player_id, limit = 20)
		tournaments = []
			
		Dir.glob(File.join(TOURNAMENTS_DIR, "*.json")).each do |file|
			begin
				tournament = JSON.parse(File.read(file), symbolize_names: true)
						
				participant = tournament[:participants].find { |p| p[:player_id] == player_id }
				next unless participant
						
				# Get player's final placement
				placement = tournament[:final_standings].find_index { |s| s[:player_id] == player_id }
				placement = placement ? placement + 1 : nil
						
				tournaments << {
								id: tournament[:id],
								name: tournament[:name],
								format: tournament[:format],
								status: tournament[:status],
								placement: placement,
								participants: tournament[:participants].length,
								prize_won: calculate_prize_won(tournament, player_id),
								completed_at: tournament[:completed_at]
						}
				rescue JSON::ParserError
					next
			end
		end
			
		tournaments.sort_by { |t| Time.parse((t[:completed_at] || t[:created_at]).to_s) }.reverse.first(limit)
	end
		
	# Get tournament statistics
	def get_tournament_statistics
		stats = {
				total_tournaments: 0,
				active_tournaments: 0,
				completed_tournaments: 0,
				total_participants: 0,
				total_prize_pool: 0,
				formats: Hash.new(0),
				average_participants: 0
		}
			
		Dir.glob(File.join(TOURNAMENTS_DIR, "*.json")).each do |file|
			begin
				tournament = JSON.parse(File.read(file), symbolize_names: true)
						
				stats[:total_tournaments] += 1
				stats[:active_tournaments] += 1 if tournament[:status] == "active"
				stats[:completed_tournaments] += 1 if tournament[:status] == "completed"
				stats[:total_participants] += tournament[:participants].length
				stats[:total_prize_pool] += tournament[:prize_pool] || 0
				stats[:formats][tournament[:format]] += 1
				rescue JSON::ParserError
					next
			end
		end
			
		if stats[:total_tournaments] > 0
			stats[:average_participants] = (stats[:total_participants].to_f / stats[:total_tournaments]).round(1)
		end
			
		stats
	end
		
	# Competitive seasons
	def create_season(season_data)
		season_id = generate_season_id
			
		season = {
					id: season_id,
					name: season_data[:name] || "Season #{season_id}",
					description: season_data[:description] || "",
					start_date: season_data[:start_date] || Time.now,
					end_date: season_data[:end_date] || (Time.now + 90 * 24 * 60 * 60), # 90 days
					
					# Season settings
					placement_matches: season_data[:placement_matches] || 10,
					rating_decay_enabled: season_data[:rating_decay_enabled] != false,
					season_rewards: season_data[:season_rewards] || {},
					
					# Leaderboards
					leaderboards: {},
					
					# Status
					status: "active",
					created_at: Time.now
			}
			
		save_season(season)
		season
	end
		
	def get_current_season
		# In a real implementation, this would track the active season
		{
				id: "season_1",
				name: "Season 1: Foundation",
				start_date: Time.new(2025, 1, 1),
				end_date: Time.new(2025, 4, 1),
				status: "active",
				days_remaining: ((Time.new(2025, 4, 1) - Time.now) / (24 * 60 * 60)).round
		}
	end
		
		private
		
	def generate_tournament_id
		"tournament_#{Time.now.strftime('%Y%m%d_%H%M%S')}_#{SecureRandom.hex(4)}"
	end
		
	def generate_season_id
		"season_#{Time.now.strftime('%Y%m%d')}_#{SecureRandom.hex(3)}"
	end
		
	def save_tournament(tournament)
		filename = "#{tournament[:id]}.json"
		filepath = File.join(TOURNAMENTS_DIR, filename)
		File.write(filepath, JSON.pretty_generate(tournament))
	end
		
	def save_season(season)
		filename = "season_#{season[:id]}.json"
		filepath = File.join(TOURNAMENTS_DIR, filename)
		File.write(filepath, JSON.pretty_generate(season))
	end
		
	def load_tournament(tournament_id)
		filepath = File.join(TOURNAMENTS_DIR, "#{tournament_id}.json")
		return nil unless File.exist?(filepath)
		
		JSON.parse(File.read(filepath), symbolize_names: true)
rescue JSON::ParserError
	nil
	end
		
	def check_player_eligibility(tournament, profile)
		# Check rank requirements
		if tournament[:min_rank] != "Unranked"
			player_rank_index = RankSystem::RANKS.keys.index(profile.rank)
			min_rank_index = RankSystem::RANKS.keys.index(tournament[:min_rank])
				
			if player_rank_index && min_rank_index && player_rank_index < min_rank_index
				return { success: false, message: "Minimum rank required: #{tournament[:min_rank]}" }
			end
		end
			
		if tournament[:max_rank] != "The Global Elite"
			player_rank_index = RankSystem::RANKS.keys.index(profile.rank)
			max_rank_index = RankSystem::RANKS.keys.index(tournament[:max_rank])
					
			if player_rank_index && max_rank_index && player_rank_index > max_rank_index
				return { success: false, message: "Maximum rank allowed: #{tournament[:max_rank]}" }
			end
		end
			
		# Check level requirement
		if profile.level < tournament[:min_level]
			return { success: false, message: "Minimum level required: #{tournament[:min_level]}" }
		end
			
		{ success: true }
	end
		
	def generate_single_elimination_bracket(participants)
		bracket_size = next_power_of_2(participants.length)
		bracket = { rounds: [] }
			
		# First round
		first_round_matches = []
		participants.each_slice(2).with_index do |pair, index|
			if pair.length == 2
				first_round_matches << create_match("R1M#{index + 1}", pair[0], pair[1])
			else
				# Bye - player advances automatically
				first_round_matches << create_bye_match("R1M#{index + 1}", pair[0])
			end
		end
			
		bracket[:rounds] << { round: 1, matches: first_round_matches }
			
		# Generate subsequent rounds
		current_matches = first_round_matches
		round = 2
			
		while current_matches.length > 1
			next_matches = []
			current_matches.each_slice(2).with_index do |pair, index|
				next_matches << create_match("R#{round}M#{index + 1}", nil, nil, {
								depends_on: [pair[0][:id], pair[1][:id]]
						})
			end
					
			bracket[:rounds] << { round: round, matches: next_matches }
			current_matches = next_matches
			round += 1
		end
			
		bracket
	end
		
	def generate_double_elimination_bracket(participants)
		# Simplified double elimination - would need more complex logic for full implementation
		winners_bracket = generate_single_elimination_bracket(participants)
			
		{
					winners_bracket: winners_bracket,
					losers_bracket: { rounds: [] }, # Would be populated with losers from winners bracket
					grand_final: []
			}
	end
		
	def generate_round_robin_bracket(participants)
		matches = []
		match_id = 1
			
		participants.each_with_index do |player1, i|
			participants[(i + 1)..-1].each do |player2|
				matches << create_match("RR#{match_id}", player1, player2)
				match_id += 1
			end
		end
			
		{ type: "round_robin", matches: matches }
	end
		
	def generate_swiss_bracket(participants)
		# Swiss system pairs players with similar records each round
		{ 
				type: "swiss",
				rounds: [],
				current_round: 1,
				pairings: []
		}
	end
		
	def create_match(match_id, player1, player2, metadata = {})
		{
				id: match_id,
				player1: player1,
				player2: player2,
				status: "pending", # pending, active, completed
				result: nil,
				winner: nil,
				created_at: Time.now,
				**metadata
		}
	end
		
	def create_bye_match(match_id, player)
		{
				id: match_id,
				player1: player,
				player2: nil,
				status: "completed",
				result: { type: "bye" },
				winner: player[:player_id],
				created_at: Time.now
		}
	end
		
	def next_power_of_2(n)
		return 1 if n <= 1
		(2**(Math.log2(n - 1).ceil))
	end
		
	def valid_match_result?(result_data, format)
		return false unless result_data[:scores] && result_data[:scores].is_a?(Array)
			
		case format
		when "bo1"
			result_data[:scores].length == 1
		when "bo3"
			result_data[:scores].length <= 3 && 
						result_data[:scores].sum { |s| [s[:player1_score], s[:player2_score]].max } >= 2
		when "bo5"
			result_data[:scores].length <= 5 && 
						result_data[:scores].sum { |s| [s[:player1_score], s[:player2_score]].max } >= 3
		else
			false
		end
	end
		
	def determine_match_winner(result_data)
		player1_wins = 0
		player2_wins = 0
			
		result_data[:scores].each do |score|
			if score[:player1_score] > score[:player2_score]
				player1_wins += 1
			else
				player2_wins += 1
			end
		end
			
		player1_wins > player2_wins ? result_data[:player1_id] : result_data[:player2_id]
	end
		
	def update_tournament_progress(tournament, completed_match)
		# Update bracket progression based on format
		case tournament[:format]
		when "single_elimination"
			advance_single_elimination(tournament, completed_match)
		when "round_robin"
			update_round_robin_standings(tournament)
		end
			
		# Check if tournament is complete
		if all_matches_completed?(tournament)
			complete_tournament(tournament)
		end
	end
		
	def advance_single_elimination(tournament, match)
		# Find next match that depends on this one
		tournament[:matches].each do |next_match|
			depends_on = next_match.dig(:metadata, :depends_on) || []
			next unless depends_on.include?(match[:id])
				
			# Advance winner to next match
			if next_match[:player1].nil?
				next_match[:player1] = tournament[:participants].find { |p| p[:player_id] == match[:winner] }
			elsif next_match[:player2].nil?
				next_match[:player2] = tournament[:participants].find { |p| p[:player_id] == match[:winner] }
				next_match[:status] = "pending" # Both players set, match can begin
			end
		end
	end
		
	def update_round_robin_standings(tournament)
		standings = {}
			
		tournament[:participants].each do |p|
			standings[p[:player_id]] = { wins: 0, losses: 0, points: 0 }
		end
			
		tournament[:matches].select { |m| m[:status] == "completed" }.each do |match|
			winner = match[:winner]
			loser = match[:player1][:player_id] == winner ? match[:player2][:player_id] : match[:player1][:player_id]
					
			standings[winner][:wins] += 1
			standings[winner][:points] += 3
			standings[loser][:losses] += 1
		end
			
		tournament[:current_standings] = standings
	end
		
	def all_matches_completed?(tournament)
		tournament[:matches].all? { |m| m[:status] == "completed" }
	end
		
	def complete_tournament(tournament)
		tournament[:status] = "completed"
		tournament[:completed_at] = Time.now
			
		# Calculate final standings
		tournament[:final_standings] = calculate_final_standings(tournament)
			
		# Distribute prizes
		distribute_prizes(tournament)
			
		puts "🏁 Tournament completed: #{tournament[:name]}"
	end
		
	def calculate_final_standings(tournament)
		case tournament[:format]
		when "single_elimination"
			calculate_elimination_standings(tournament)
		when "round_robin"
			calculate_round_robin_standings(tournament)
		else
			[]
		end
	end
		
	def calculate_elimination_standings(tournament)
		standings = []
			
		# Winner is the winner of the final match
		final_match = tournament[:matches].find { |m| m[:id].start_with?("R") && m[:status] == "completed" }
		if final_match
			winner = tournament[:participants].find { |p| p[:player_id] == final_match[:winner] }
			standings << { placement: 1, **winner, eliminated_in: "Final" }
		end
			
		standings
	end
		
	def calculate_round_robin_standings(tournament)
		current_standings = tournament[:current_standings] || {}
			
		current_standings.map.with_index(1) do |(player_id, stats), placement|
			participant = tournament[:participants].find { |p| p[:player_id] == player_id }
			{ placement: placement, **participant, **stats }
		end.sort_by { |s| [-s[:points], -s[:wins]] }
	end
		
	def distribute_prizes(tournament)
		return if tournament[:prize_pool] <= 0 || tournament[:final_standings].empty?
			
		distribution = PRIZE_TEMPLATES.dig(tournament[:prize_distribution], :distribution) || { 1 => 1.0 }
			
		distribution.each do |placement, percentage|
			standing = tournament[:final_standings][placement - 1]
			next unless standing
					
			prize_amount = (tournament[:prize_pool] * percentage).round
			standing[:prize_won] = prize_amount
					
			# In a real implementation, you would transfer the prize to the player
			puts "💰 Prize awarded: #{standing[:player_name]} - $#{prize_amount} (#{placement}#{placement_suffix(placement)} place)"
		end
	end
		
	def calculate_prize_won(tournament, player_id)
		standing = tournament[:final_standings]&.find { |s| s[:player_id] == player_id }
		standing&.dig(:prize_won) || 0
	end
		
	def placement_suffix(placement)
		case placement
		when 1 then "st"
		when 2 then "nd"
		when 3 then "rd"
		else "th"
		end
	end
		
	def default_tournament_rules
		[
				"All matches must be played on the designated server",
				"Players must use their registered account",
				"Cheating or exploiting will result in immediate disqualification",
				"Match results must be reported within 30 minutes of completion",
				"Disputes will be resolved by tournament administrators",
				"Prize distribution will occur within 48 hours of tournament completion"
		]
	end
end