# frozen_string_literal: true

require 'json'
require 'fileutils'

class MatchHistory
  MATCHES_DIR = File.expand_path('../data/matches', __dir__)
  DEMOS_DIR = File.expand_path('../data/demos', __dir__)
  
  def initialize
    FileUtils.mkdir_p(MATCHES_DIR)
    FileUtils.mkdir_p(DEMOS_DIR)
  end
  
  # Record a complete match
  def record_match(match_data)
    match_id = generate_match_id
    
    match_record = {
      match_id: match_id,
      timestamp: Time.now,
      map: match_data[:map],
      mode: match_data[:mode] || 'Classic',
      server_name: match_data[:server_name] || 'Local Server',
      duration: match_data[:duration],
      final_score: match_data[:final_score], # [ct_score, t_score]
      winner: match_data[:winner], # :ct, :t, or nil for draw
      end_reason: match_data[:end_reason] || 'score_limit',
      
      # Players data
      players: format_players_data(match_data[:players]),
      
      # Round-by-round data
      rounds: match_data[:rounds] || [],
      
      # Match statistics
      stats: calculate_match_statistics(match_data),
      
      # Additional metadata
      version: '1.0',
      demo_file: match_data[:demo_file],
      chat_log: match_data[:chat_log] || []
    }
    
    # Save match record
    match_file = File.join(MATCHES_DIR, "#{match_id}.json")
    File.write(match_file, JSON.pretty_generate(match_record))
    
    puts "📝 Match recorded: #{match_id}"
    match_record
  end
  
  # Get match by ID
  def get_match(match_id)
    match_file = File.join(MATCHES_DIR, "#{match_id}.json")
    return nil unless File.exist?(match_file)
    
    JSON.parse(File.read(match_file), symbolize_names: true)
  rescue JSON::ParserError
    nil
  end
  
  # Get recent matches for a player
  def get_player_matches(player_id, limit = 20, offset = 0)
    matches = []
    
    Dir.glob(File.join(MATCHES_DIR, "*.json")).sort.reverse[offset, limit]&.each do |file|
      begin
        match_data = JSON.parse(File.read(file), symbolize_names: true)
        
        # Check if player participated in this match
        if match_data[:players]&.key?(player_id.to_sym)
          matches << {
            match_id: match_data[:match_id],
            timestamp: match_data[:timestamp],
            map: match_data[:map],
            mode: match_data[:mode],
            result: get_player_match_result(match_data, player_id),
            score: match_data[:final_score],
            player_stats: match_data[:players][player_id.to_sym],
            duration: match_data[:duration]
          }
        end
      rescue JSON::ParserError
        next
      end
    end
    
    matches
  end
  
  # Get detailed match statistics
  def get_match_statistics(match_id)
    match = get_match(match_id)
    return nil unless match
    
    {
      basic: {
        match_id: match[:match_id],
        map: match[:map],
        mode: match[:mode],
        duration: match[:duration],
        rounds_played: match[:rounds]&.length || 0,
        final_score: match[:final_score],
        winner: match[:winner]
      },
      
      players: match[:players].map do |player_id, player_data|
        {
          player_id: player_id,
          name: player_data[:name],
          team: player_data[:team],
          kills: player_data[:kills],
          deaths: player_data[:deaths],
          assists: player_data[:assists],
          damage: player_data[:damage],
          headshots: player_data[:headshots],
          accuracy: calculate_accuracy(player_data[:shots_fired], player_data[:shots_hit]),
          kd_ratio: calculate_kd_ratio(player_data[:kills], player_data[:deaths]),
          adr: calculate_adr(player_data[:damage], match[:rounds]&.length || 1),
          mvp_rounds: player_data[:mvp_rounds] || 0,
          bomb_plants: player_data[:bomb_plants] || 0,
          bomb_defuses: player_data[:bomb_defuses] || 0,
          clutches_won: player_data[:clutches_won] || 0,
          first_kills: player_data[:first_kills] || 0,
          entry_frags: player_data[:entry_frags] || 0
        }
      end,
      
      rounds: match[:rounds]&.map { |round| format_round_summary(round) } || [],
      
      weapon_stats: calculate_weapon_statistics(match),
      team_stats: calculate_team_statistics(match),
      timeline: generate_match_timeline(match)
    }
  end
  
  # Search matches with filters
  def search_matches(filters = {})
    results = []
    
    Dir.glob(File.join(MATCHES_DIR, "*.json")).each do |file|
      begin
        match_data = JSON.parse(File.read(file), symbolize_names: true)
        
        # Apply filters
        next if filters[:map] && match_data[:map] != filters[:map]
        next if filters[:mode] && match_data[:mode] != filters[:mode]
        next if filters[:player_id] && !match_data[:players]&.key?(filters[:player_id].to_sym)
        next if filters[:date_from] && Time.parse(match_data[:timestamp]) < filters[:date_from]
        next if filters[:date_to] && Time.parse(match_data[:timestamp]) > filters[:date_to]
        next if filters[:winner] && match_data[:winner] != filters[:winner]
        
        results << {
          match_id: match_data[:match_id],
          timestamp: match_data[:timestamp],
          map: match_data[:map],
          mode: match_data[:mode],
          final_score: match_data[:final_score],
          winner: match_data[:winner],
          duration: match_data[:duration],
          player_count: match_data[:players]&.keys&.length || 0
        }
      rescue JSON::ParserError
        next
      end
    end
    
    # Sort by timestamp (newest first)
    results.sort_by { |match| -Time.parse(match[:timestamp]).to_i }
  end
  
  # Get player performance trends
  def get_player_trends(player_id, days = 30)
    cutoff_date = Time.now - (days * 24 * 60 * 60)
    matches = get_player_matches(player_id, 1000).select do |match|
      Time.parse(match[:timestamp]) >= cutoff_date
    end
    
    return empty_trends if matches.empty?
    
    # Calculate daily aggregates
    daily_stats = {}
    matches.each do |match|
      date = Time.parse(match[:timestamp]).strftime('%Y-%m-%d')
      daily_stats[date] ||= { matches: 0, kills: 0, deaths: 0, wins: 0, damage: 0 }
      
      stats = match[:player_stats]
      daily_stats[date][:matches] += 1
      daily_stats[date][:kills] += stats[:kills] || 0
      daily_stats[date][:deaths] += stats[:deaths] || 0
      daily_stats[date][:wins] += match[:result] == 'win' ? 1 : 0
      daily_stats[date][:damage] += stats[:damage] || 0
    end
    
    # Generate trend data
    {
      period: "#{days} days",
      total_matches: matches.length,
      daily_data: daily_stats.map do |date, stats|
        {
          date: date,
          matches: stats[:matches],
          kills: stats[:kills],
          deaths: stats[:deaths],
          kd_ratio: stats[:deaths] > 0 ? (stats[:kills].to_f / stats[:deaths]).round(2) : stats[:kills],
          win_rate: (stats[:wins].to_f / stats[:matches] * 100).round(1),
          average_damage: (stats[:damage].to_f / stats[:matches]).round(1)
        }
      end.sort_by { |day| day[:date] }
    }
  end
  
  # Get map performance statistics
  def get_map_performance(player_id)
    matches = get_player_matches(player_id, 1000)
    map_stats = {}
    
    matches.each do |match|
      map = match[:map]
      map_stats[map] ||= { matches: 0, wins: 0, kills: 0, deaths: 0, total_damage: 0 }
      
      stats = match[:player_stats]
      map_stats[map][:matches] += 1
      map_stats[map][:wins] += match[:result] == 'win' ? 1 : 0
      map_stats[map][:kills] += stats[:kills] || 0
      map_stats[map][:deaths] += stats[:deaths] || 0
      map_stats[map][:total_damage] += stats[:damage] || 0
    end
    
    map_stats.map do |map, stats|
      {
        map: map,
        matches: stats[:matches],
        win_rate: (stats[:wins].to_f / stats[:matches] * 100).round(1),
        kd_ratio: stats[:deaths] > 0 ? (stats[:kills].to_f / stats[:deaths]).round(2) : stats[:kills],
        average_damage: (stats[:total_damage].to_f / stats[:matches]).round(1),
        favorite: stats[:matches] > 0
      }
    end.sort_by { |map_data| -map_data[:matches] }
  end
  
  # Export match data for analysis
  def export_matches(player_id = nil, format = 'json')
    matches = player_id ? get_player_matches(player_id, 1000) : get_all_matches
    
    case format
    when 'json'
      JSON.pretty_generate(matches)
    when 'csv'
      generate_csv_export(matches)
    else
      matches
    end
  end
  
  # Clean old match records
  def cleanup_old_matches(days_to_keep = 90)
    cutoff_date = Time.now - (days_to_keep * 24 * 60 * 60)
    deleted_count = 0
    
    Dir.glob(File.join(MATCHES_DIR, "*.json")).each do |file|
      begin
        match_data = JSON.parse(File.read(file), symbolize_names: true)
        match_time = Time.parse(match_data[:timestamp])
        
        if match_time < cutoff_date
          File.delete(file)
          deleted_count += 1
        end
      rescue
        # Skip invalid files
        next
      end
    end
    
    puts "🧹 Cleaned up #{deleted_count} old match records"
    deleted_count
  end
  
  private
  
  def generate_match_id
    "match_#{Time.now.strftime('%Y%m%d_%H%M%S')}_#{SecureRandom.hex(4)}"
  end
  
  def format_players_data(players_data)
    return {} unless players_data
    
    formatted = {}
    players_data.each do |player_id, data|
      formatted[player_id] = {
        name: data[:profile]&.display_name || data[:name] || "Player#{player_id}",
        team: data[:team],
        kills: data[:kills] || 0,
        deaths: data[:deaths] || 0,
        assists: data[:assists] || 0,
        damage: data[:damage] || 0,
        headshots: data[:headshots] || 0,
        shots_fired: data[:shots_fired] || 0,
        shots_hit: data[:shots_hit] || 0,
        bomb_plants: data[:bomb_plants] || 0,
        bomb_defuses: data[:bomb_defuses] || 0,
        mvp_rounds: data[:mvp_rounds] || 0,
        money_earned: data[:money_earned] || 0,
        money_spent: data[:money_spent] || 0,
        survival_time: data[:survival_time] || 0,
        weapons_used: data[:weapons_used] || {},
        equipment_purchased: data[:equipment_purchased] || {}
      }
    end
    formatted
  end
  
  def calculate_match_statistics(match_data)
    players = match_data[:players] || {}
    rounds = match_data[:rounds] || []
    
    {
      total_kills: players.values.sum { |p| p[:kills] || 0 },
      total_deaths: players.values.sum { |p| p[:deaths] || 0 },
      total_damage: players.values.sum { |p| p[:damage] || 0 },
      total_headshots: players.values.sum { |p| p[:headshots] || 0 },
      total_shots_fired: players.values.sum { |p| p[:shots_fired] || 0 },
      total_shots_hit: players.values.sum { |p| p[:shots_hit] || 0 },
      rounds_played: rounds.length,
      average_round_duration: rounds.empty? ? 0 : rounds.sum { |r| r[:duration] || 0 } / rounds.length,
      bomb_plants: players.values.sum { |p| p[:bomb_plants] || 0 },
      bomb_defuses: players.values.sum { |p| p[:bomb_defuses] || 0 }
    }
  end
  
  def get_player_match_result(match_data, player_id)
    player_data = match_data[:players][player_id.to_sym]
    return nil unless player_data
    
    player_team = player_data[:team]
    winner = match_data[:winner]
    
    if winner.nil?
      'draw'
    elsif winner.to_s == player_team.to_s
      'win'
    else
      'loss'
    end
  end
  
  def calculate_accuracy(shots_fired, shots_hit)
    return 0.0 if shots_fired.nil? || shots_fired == 0
    ((shots_hit || 0).to_f / shots_fired * 100).round(2)
  end
  
  def calculate_kd_ratio(kills, deaths)
    return kills.to_f if deaths.nil? || deaths == 0
    ((kills || 0).to_f / deaths).round(2)
  end
  
  def calculate_adr(total_damage, rounds_played)
    return 0.0 if rounds_played.nil? || rounds_played == 0
    ((total_damage || 0).to_f / rounds_played).round(1)
  end
  
  def format_round_summary(round_data)
    {
      number: round_data[:number],
      winner: round_data[:winner],
      duration: round_data[:duration],
      end_reason: round_data[:end_reason],
      kills: round_data[:kills]&.length || 0,
      first_kill: round_data[:kills]&.first&.slice(:killer_id, :victim_id, :weapon),
      bomb_events: round_data[:objective_events]&.select { |e| e[:type].to_s.include?('bomb') } || []
    }
  end
  
  def calculate_weapon_statistics(match_data)
    weapon_stats = {}
    
    match_data[:players].each do |_, player_data|
      weapons_used = player_data[:weapons_used] || {}
      weapons_used.each do |weapon, usage_count|
        weapon_stats[weapon] ||= { usage: 0, kills: 0 }
        weapon_stats[weapon][:usage] += usage_count
      end
    end
    
    # Add kill data from rounds if available
    match_data[:rounds]&.each do |round|
      round[:kills]&.each do |kill_event|
        weapon = kill_event[:weapon]
        next unless weapon
        
        weapon_stats[weapon] ||= { usage: 0, kills: 0 }
        weapon_stats[weapon][:kills] += 1
      end
    end
    
    weapon_stats
  end
  
  def calculate_team_statistics(match_data)
    teams = { ct: { players: [], stats: {} }, t: { players: [], stats: {} } }
    
    match_data[:players].each do |player_id, player_data|
      team = player_data[:team].to_sym
      next unless teams[team]
      
      teams[team][:players] << player_id
      stats = teams[team][:stats]
      
      stats[:kills] = (stats[:kills] || 0) + (player_data[:kills] || 0)
      stats[:deaths] = (stats[:deaths] || 0) + (player_data[:deaths] || 0)
      stats[:damage] = (stats[:damage] || 0) + (player_data[:damage] || 0)
      stats[:money_spent] = (stats[:money_spent] || 0) + (player_data[:money_spent] || 0)
    end
    
    teams.each do |team, data|
      player_count = data[:players].length
      next if player_count == 0
      
      data[:stats][:average_kills] = (data[:stats][:kills].to_f / player_count).round(2)
      data[:stats][:average_deaths] = (data[:stats][:deaths].to_f / player_count).round(2)
      data[:stats][:average_damage] = (data[:stats][:damage].to_f / player_count).round(1)
    end
    
    teams
  end
  
  def generate_match_timeline(match_data)
    timeline = []
    start_time = Time.parse(match_data[:timestamp])
    
    # Add match start
    timeline << {
      timestamp: start_time,
      type: 'match_start',
      description: "Match started on #{match_data[:map]}"
    }
    
    # Add round events
    match_data[:rounds]&.each_with_index do |round, index|
      round_start = start_time + (index * 120) # Approximate 2 minute rounds
      
      timeline << {
        timestamp: round_start,
        type: 'round_start',
        description: "Round #{round[:number]} started"
      }
      
      # Add significant round events
      round[:kills]&.each do |kill|
        timeline << {
          timestamp: round_start + rand(0..115), # Random time within round
          type: 'kill',
          description: "#{kill[:killer_id]} killed #{kill[:victim_id]} with #{kill[:weapon]}"
        }
      end
      
      timeline << {
        timestamp: round_start + (round[:duration] || 120),
        type: 'round_end',
        description: "Round #{round[:number]} won by #{round[:winner]} team"
      }
    end
    
    # Add match end
    timeline << {
      timestamp: start_time + (match_data[:duration] || 0),
      type: 'match_end',
      description: "Match ended - #{match_data[:winner]} team victory"
    }
    
    timeline.sort_by { |event| event[:timestamp] }
  end
  
  def get_all_matches(limit = 1000)
    matches = []
    
    Dir.glob(File.join(MATCHES_DIR, "*.json")).sort.reverse.first(limit).each do |file|
      begin
        match_data = JSON.parse(File.read(file), symbolize_names: true)
        matches << {
          match_id: match_data[:match_id],
          timestamp: match_data[:timestamp],
          map: match_data[:map],
          mode: match_data[:mode],
          final_score: match_data[:final_score],
          winner: match_data[:winner],
          duration: match_data[:duration]
        }
      rescue JSON::ParserError
        next
      end
    end
    
    matches
  end
  
  def generate_csv_export(matches)
    return "" if matches.empty?
    
    csv_lines = []
    # Header
    csv_lines << "match_id,timestamp,map,mode,result,kills,deaths,assists,damage,duration"
    
    # Data rows
    matches.each do |match|
      stats = match[:player_stats] || {}
      csv_lines << [
        match[:match_id],
        match[:timestamp],
        match[:map],
        match[:mode],
        match[:result],
        stats[:kills] || 0,
        stats[:deaths] || 0,
        stats[:assists] || 0,
        stats[:damage] || 0,
        match[:duration] || 0
      ].join(',')
    end
    
    csv_lines.join("\n")
  end
  
  def empty_trends
    {
      period: "No data",
      total_matches: 0,
      daily_data: []
    }
  end
end