# frozen_string_literal: true

require 'json'
require 'fileutils'

class Leaderboards
  LEADERBOARDS_DIR = File.expand_path('../data/leaderboards', __dir__)
  CACHE_DURATION = 300 # 5 minutes cache
  
  LEADERBOARD_CATEGORIES = {
    rating: {
      name: 'Competitive Rating',
      description: 'Players ranked by competitive rating',
      sort_key: :rating,
      sort_order: :desc,
      min_matches: 10,
      icon: '🏆',
      color: '#FFD700'
    },
    
    level: {
      name: 'Player Level',
      description: 'Players ranked by level and XP',
      sort_key: :level,
      sort_order: :desc,
      secondary_key: :total_xp,
      icon: '⭐',
      color: '#00FF00'
    },
    
    kd_ratio: {
      name: 'K/D Ratio',
      description: 'Players with the highest kill/death ratio',
      sort_key: :kd_ratio,
      sort_order: :desc,
      min_matches: 5,
      icon: '💀',
      color: '#FF4500'
    },
    
    accuracy: {
      name: 'Accuracy',
      description: 'Players with the highest shooting accuracy',
      sort_key: :accuracy,
      sort_order: :desc,
      min_shots: 100,
      icon: '🎯',
      color: '#00BFFF'
    },
    
    headshots: {
      name: 'Headshot Rate',
      description: 'Players with the highest headshot percentage',
      sort_key: :headshot_rate,
      sort_order: :desc,
      min_kills: 50,
      icon: '🧠',
      color: '#FF1493'
    },
    
    wins: {
      name: 'Total Wins',
      description: 'Players with the most match victories',
      sort_key: :matches_won,
      sort_order: :desc,
      icon: '🏅',
      color: '#32CD32'
    },
    
    win_rate: {
      name: 'Win Rate',
      description: 'Players with the highest win percentage',
      sort_key: :win_rate,
      sort_order: :desc,
      min_matches: 10,
      icon: '📈',
      color: '#4169E1'
    },
    
    playtime: {
      name: 'Playtime',
      description: 'Most dedicated players by total playtime',
      sort_key: :total_play_time,
      sort_order: :desc,
      icon: '⏰',
      color: '#8A2BE2'
    },
    
    bomb_expert: {
      name: 'Bomb Expert',
      description: 'Players with the most bomb plants and defuses',
      sort_key: :bomb_score,
      sort_order: :desc,
      icon: '💣',
      color: '#FF6347'
    },
    
    clutch_king: {
      name: 'Clutch Master',
      description: 'Players who excel in clutch situations',
      sort_key: :clutch_success_rate,
      sort_order: :desc,
      min_clutches: 10,
      icon: '⚡',
      color: '#DA70D6'
    },
    
    damage_dealer: {
      name: 'Damage Per Round',
      description: 'Players with the highest average damage per round',
      sort_key: :damage_per_round,
      sort_order: :desc,
      min_rounds: 50,
      icon: '🔥',
      color: '#DC143C'
    },
    
    first_blood: {
      name: 'First Blood',
      description: 'Players who get the most first kills',
      sort_key: :first_blood_rate,
      sort_order: :desc,
      min_rounds: 50,
      icon: '🩸',
      color: '#8B0000'
    }
  }.freeze
  
  # Weekly and monthly categories
  SEASONAL_CATEGORIES = {
    weekly_rating: { period: 'week', base_category: :rating },
    weekly_wins: { period: 'week', base_category: :wins },
    monthly_rating: { period: 'month', base_category: :rating },
    monthly_wins: { period: 'month', base_category: :wins }
  }.freeze
  
  def initialize
    FileUtils.mkdir_p(LEADERBOARDS_DIR)
    @cache = {}
    @cache_timestamps = {}
  end
  
  # Generate leaderboard for a specific category
  def generate_leaderboard(category, limit = 100, force_refresh = false)
    return nil unless LEADERBOARD_CATEGORIES[category]
    
    cache_key = "#{category}_#{limit}"
    
    # Return cached version if still valid
    if !force_refresh && cached_and_valid?(cache_key)
      return @cache[cache_key]
    end
    
    category_info = LEADERBOARD_CATEGORIES[category]
    profiles = load_all_profiles
    
    # Filter and calculate stats for each profile
    eligible_players = profiles.filter_map do |profile|
      player_stats = calculate_leaderboard_stats(profile, category_info)
      next unless meets_requirements?(player_stats, category_info)
      player_stats
    end
    
    # Sort players according to category rules
    sorted_players = sort_players(eligible_players, category_info)
    
    # Take top players and add ranking
    leaderboard_data = sorted_players.first(limit).map.with_index(1) do |player, rank|
      player.merge(rank: rank, rank_change: calculate_rank_change(player[:player_id], category, rank))
    end
    
    leaderboard = {
      category: category,
      category_info: category_info,
      generated_at: Time.now,
      total_eligible: eligible_players.count,
      players: leaderboard_data
    }
    
    # Cache the result
    @cache[cache_key] = leaderboard
    @cache_timestamps[cache_key] = Time.now
    
    # Save to file for persistence
    save_leaderboard(category, leaderboard)
    
    leaderboard
  end
  
  # Get multiple leaderboards at once
  def generate_multiple_leaderboards(categories, limit = 50)
    results = {}
    
    categories.each do |category|
      results[category] = generate_leaderboard(category, limit)
    end
    
    results
  end
  
  # Get player's ranking in a specific category
  def get_player_ranking(player_id, category)
    leaderboard = generate_leaderboard(category, 1000)
    return nil unless leaderboard
    
    player_entry = leaderboard[:players].find { |p| p[:player_id] == player_id }
    
    if player_entry
      {
        rank: player_entry[:rank],
        total_players: leaderboard[:total_eligible],
        percentile: calculate_percentile(player_entry[:rank], leaderboard[:total_eligible]),
        category: category,
        value: player_entry[LEADERBOARD_CATEGORIES[category][:sort_key]],
        rank_change: player_entry[:rank_change]
      }
    else
      {
        rank: nil,
        reason: 'Not eligible or insufficient data',
        requirements: LEADERBOARD_CATEGORIES[category].select { |k, v| k.to_s.start_with?('min_') }
      }
    end
  end
  
  # Get player's rankings across all categories
  def get_player_all_rankings(player_id)
    rankings = {}
    
    LEADERBOARD_CATEGORIES.each_key do |category|
      rankings[category] = get_player_ranking(player_id, category)
    end
    
    rankings
  end
  
  # Get seasonal leaderboards
  def generate_seasonal_leaderboard(category, period = 'week', limit = 100)
    return nil unless %w[week month season].include?(period)
    
    case period
    when 'week'
      start_date = Time.now.beginning_of_week
    when 'month'
      start_date = Time.now.beginning_of_month
    when 'season'
      # Assuming 3-month seasons
      start_date = Time.now.beginning_of_quarter
    end
    
    # Load profiles and filter by date
    profiles = load_all_profiles
    category_info = LEADERBOARD_CATEGORIES[category]
    
    eligible_players = profiles.filter_map do |profile|
      # Only consider recent activity for seasonal leaderboards
      next if profile.last_played < start_date
      
      player_stats = calculate_leaderboard_stats(profile, category_info)
      next unless meets_requirements?(player_stats, category_info)
      
      # Add seasonal marker
      player_stats[:seasonal] = true
      player_stats[:period] = period
      player_stats[:period_start] = start_date
      
      player_stats
    end
    
    sorted_players = sort_players(eligible_players, category_info)
    
    leaderboard_data = sorted_players.first(limit).map.with_index(1) do |player, rank|
      player.merge(rank: rank)
    end
    
    {
      category: category,
      period: period,
      period_start: start_date,
      period_end: Time.now,
      category_info: category_info,
      generated_at: Time.now,
      total_eligible: eligible_players.count,
      players: leaderboard_data
    }
  end
  
  # Get leaderboard summary for dashboard
  def get_leaderboard_summary
    summary = {
      total_categories: LEADERBOARD_CATEGORIES.count,
      last_updated: @cache_timestamps.values.max,
      top_players: {},
      trending_players: [],
      category_leaders: {}
    }
    
    # Get #1 player from each major category
    %i[rating level kd_ratio wins].each do |category|
      leaderboard = generate_leaderboard(category, 1)
      if leaderboard && !leaderboard[:players].empty?
        summary[:category_leaders][category] = leaderboard[:players].first
      end
    end
    
    summary
  end
  
  # Search players in leaderboards
  def search_players(query, limit = 20)
    results = []
    profiles = load_all_profiles
    
    query_lower = query.downcase
    matching_profiles = profiles.select do |profile|
      profile.display_name.downcase.include?(query_lower) ||
      profile.username.downcase.include?(query_lower)
    end
    
    matching_profiles.first(limit).each do |profile|
      player_summary = {
        player_id: profile.player_id,
        username: profile.username,
        display_name: profile.display_name,
        level: profile.level,
        rating: profile.rating,
        rank: profile.rank,
        rankings: {}
      }
      
      # Get top rankings for this player
      %i[rating level kd_ratio wins].each do |category|
        ranking = get_player_ranking(profile.player_id, category)
        player_summary[:rankings][category] = ranking if ranking && ranking[:rank]
      end
      
      results << player_summary
    end
    
    results
  end
  
  # Get historical leaderboard data
  def get_historical_data(category, player_id = nil, days = 30)
    # This would typically query historical leaderboard snapshots
    # For now, return placeholder structure
    {
      category: category,
      player_id: player_id,
      period_days: days,
      data_points: [], # Would contain daily/weekly ranking snapshots
      message: "Historical tracking would be implemented with regular leaderboard snapshots"
    }
  end
  
  # Clear cache for category or all
  def clear_cache(category = nil)
    if category
      cache_key = "#{category}_*"
      @cache.select { |key, _| key.start_with?("#{category}_") }.each do |key, _|
        @cache.delete(key)
        @cache_timestamps.delete(key)
      end
    else
      @cache.clear
      @cache_timestamps.clear
    end
    
    puts "🗑️ Cleared leaderboard cache#{category ? " for #{category}" : ""}"
  end
  
  # Export leaderboard data
  def export_leaderboard(category, format = 'json')
    leaderboard = generate_leaderboard(category, 1000)
    return nil unless leaderboard
    
    case format
    when 'json'
      JSON.pretty_generate(leaderboard)
    when 'csv'
      generate_csv_export(leaderboard)
    when 'txt'
      generate_text_export(leaderboard)
    else
      leaderboard
    end
  end
  
  private
  
  def load_all_profiles
    profiles = []
    profiles_dir = File.expand_path('../data/profiles', __dir__)
    
    return profiles unless Dir.exist?(profiles_dir)
    
    Dir.glob(File.join(profiles_dir, "*.json")).each do |file|
      begin
        profile_data = JSON.parse(File.read(file), symbolize_names: true)
        # Create a minimal profile object with necessary data
        profile = OpenStruct.new(profile_data)
        profiles << profile
      rescue JSON::ParserError, StandardError
        next
      end
    end
    
    profiles
  end
  
  def calculate_leaderboard_stats(profile, category_info)
    stats = profile.stats || {}
    
    {
      player_id: profile.player_id,
      username: profile.username,
      display_name: profile.display_name,
      level: profile.level || 1,
      rating: profile.rating || 1000,
      rank: profile.rank || 'Unranked',
      total_xp: profile.total_xp || 0,
      
      # Combat stats
      kills: stats[:kills] || 0,
      deaths: stats[:deaths] || 0,
      assists: stats[:assists] || 0,
      headshots: stats[:headshots] || 0,
      shots_fired: stats[:shots_fired] || 0,
      shots_hit: stats[:shots_hit] || 0,
      damage_dealt: stats[:damage_dealt] || 0,
      
      # Match stats
      matches_played: stats[:matches_played] || 0,
      matches_won: stats[:matches_won] || 0,
      matches_lost: stats[:matches_lost] || 0,
      rounds_played: stats[:rounds_played] || 0,
      rounds_won: stats[:rounds_won] || 0,
      
      # Objective stats
      bomb_plants: stats[:bomb_plants] || 0,
      bomb_defuses: stats[:bomb_defuses] || 0,
      
      # Calculated stats
      kd_ratio: calculate_kd_ratio(stats[:kills] || 0, stats[:deaths] || 0),
      accuracy: calculate_accuracy(stats[:shots_fired] || 0, stats[:shots_hit] || 0),
      headshot_rate: calculate_headshot_rate(stats[:kills] || 0, stats[:headshots] || 0),
      win_rate: calculate_win_rate(stats[:matches_played] || 0, stats[:matches_won] || 0),
      damage_per_round: calculate_damage_per_round(stats[:damage_dealt] || 0, stats[:rounds_played] || 0),
      bomb_score: (stats[:bomb_plants] || 0) + (stats[:bomb_defuses] || 0),
      
      # Placeholder for stats that need match history analysis
      clutch_success_rate: 0.0,
      first_blood_rate: 0.0,
      
      # Meta
      total_play_time: stats[:total_play_time] || 0,
      last_played: profile.last_played || Time.now
    }
  end
  
  def meets_requirements?(player_stats, category_info)
    # Check minimum requirements
    return false if category_info[:min_matches] && player_stats[:matches_played] < category_info[:min_matches]
    return false if category_info[:min_kills] && player_stats[:kills] < category_info[:min_kills]
    return false if category_info[:min_shots] && player_stats[:shots_fired] < category_info[:min_shots]
    return false if category_info[:min_rounds] && player_stats[:rounds_played] < category_info[:min_rounds]
    return false if category_info[:min_clutches] && player_stats[:clutch_success_rate] == 0
    
    true
  end
  
  def sort_players(players, category_info)
    sort_key = category_info[:sort_key]
    sort_order = category_info[:sort_order]
    secondary_key = category_info[:secondary_key]
    
    players.sort do |a, b|
      primary_comparison = if sort_order == :desc
        b[sort_key] <=> a[sort_key]
      else
        a[sort_key] <=> b[sort_key]
      end
      
      # Use secondary key for ties
      if primary_comparison == 0 && secondary_key
        if sort_order == :desc
          b[secondary_key] <=> a[secondary_key]
        else
          a[secondary_key] <=> b[secondary_key]
        end
      else
        primary_comparison || 0
      end
    end
  end
  
  def calculate_rank_change(player_id, category, current_rank)
    # This would compare with previous leaderboard data
    # For now, return a placeholder
    0
  end
  
  def calculate_percentile(rank, total)
    return 0 if total <= 1
    ((total - rank + 1).to_f / total * 100).round(1)
  end
  
  def cached_and_valid?(cache_key)
    @cache.key?(cache_key) && 
    @cache_timestamps[cache_key] && 
    (Time.now - @cache_timestamps[cache_key]) < CACHE_DURATION
  end
  
  def save_leaderboard(category, leaderboard_data)
    filename = "#{category}_#{Time.now.strftime('%Y%m%d_%H%M')}.json"
    filepath = File.join(LEADERBOARDS_DIR, filename)
    
    File.write(filepath, JSON.pretty_generate(leaderboard_data))
    
    # Keep only recent leaderboard files (last 10)
    cleanup_old_leaderboards(category)
  end
  
  def cleanup_old_leaderboards(category)
    pattern = File.join(LEADERBOARDS_DIR, "#{category}_*.json")
    files = Dir.glob(pattern).sort
    
    # Keep only the 10 most recent files
    files[0...-10].each do |file|
      File.delete(file)
    rescue StandardError
      next
    end
  end
  
  # Statistical calculation helpers
  def calculate_kd_ratio(kills, deaths)
    return kills.to_f if deaths == 0
    (kills.to_f / deaths).round(2)
  end
  
  def calculate_accuracy(shots_fired, shots_hit)
    return 0.0 if shots_fired == 0
    (shots_hit.to_f / shots_fired * 100).round(2)
  end
  
  def calculate_headshot_rate(kills, headshots)
    return 0.0 if kills == 0
    (headshots.to_f / kills * 100).round(2)
  end
  
  def calculate_win_rate(matches_played, matches_won)
    return 0.0 if matches_played == 0
    (matches_won.to_f / matches_played * 100).round(2)
  end
  
  def calculate_damage_per_round(total_damage, rounds_played)
    return 0.0 if rounds_played == 0
    (total_damage.to_f / rounds_played).round(1)
  end
  
  # Export helpers
  def generate_csv_export(leaderboard)
    lines = []
    
    # Header
    headers = %w[rank player_id display_name level rating kills deaths kd_ratio win_rate matches_played]
    lines << headers.join(',')
    
    # Data
    leaderboard[:players].each do |player|
      row = headers.map { |header| player[header.to_sym] || 0 }
      lines << row.join(',')
    end
    
    lines.join("\n")
  end
  
  def generate_text_export(leaderboard)
    lines = []
    lines << "#{leaderboard[:category_info][:name]} Leaderboard"
    lines << "Generated at: #{leaderboard[:generated_at]}"
    lines << "Total eligible players: #{leaderboard[:total_eligible]}"
    lines << ""
    lines << "Rank | Player | Rating | Level | K/D | Wins"
    lines << "=" * 50
    
    leaderboard[:players].each do |player|
      lines << sprintf("%4d | %-20s | %6d | %5d | %4.2f | %4d",
        player[:rank],
        player[:display_name].slice(0, 20),
        player[:rating],
        player[:level],
        player[:kd_ratio],
        player[:matches_won])
    end
    
    lines.join("\n")
  end
end