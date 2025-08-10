# frozen_string_literal: true

class RankSystem
  # Rank definitions with rating thresholds
  RANKS = {
    'Unranked' => { min_rating: 0, max_rating: 999, color: '#808080', icon: '🥉' },
    'Silver I' => { min_rating: 1000, max_rating: 1099, color: '#C0C0C0', icon: '🥈' },
    'Silver II' => { min_rating: 1100, max_rating: 1199, color: '#C0C0C0', icon: '🥈' },
    'Silver III' => { min_rating: 1200, max_rating: 1299, color: '#C0C0C0', icon: '🥈' },
    'Silver IV' => { min_rating: 1300, max_rating: 1399, color: '#C0C0C0', icon: '🥈' },
    'Silver Elite' => { min_rating: 1400, max_rating: 1499, color: '#C0C0C0', icon: '🥈' },
    'Silver Elite Master' => { min_rating: 1500, max_rating: 1599, color: '#C0C0C0', icon: '🥈' },
    
    'Gold Nova I' => { min_rating: 1600, max_rating: 1699, color: '#FFD700', icon: '🥇' },
    'Gold Nova II' => { min_rating: 1700, max_rating: 1799, color: '#FFD700', icon: '🥇' },
    'Gold Nova III' => { min_rating: 1800, max_rating: 1899, color: '#FFD700', icon: '🥇' },
    'Gold Nova Master' => { min_rating: 1900, max_rating: 1999, color: '#FFD700', icon: '🥇' },
    
    'Master Guardian I' => { min_rating: 2000, max_rating: 2099, color: '#228B22', icon: '🎖️' },
    'Master Guardian II' => { min_rating: 2100, max_rating: 2199, color: '#228B22', icon: '🎖️' },
    'Master Guardian Elite' => { min_rating: 2200, max_rating: 2299, color: '#228B22', icon: '🎖️' },
    'Distinguished Master Guardian' => { min_rating: 2300, max_rating: 2399, color: '#32CD32', icon: '🎖️' },
    
    'Legendary Eagle' => { min_rating: 2400, max_rating: 2499, color: '#FF4500', icon: '🦅' },
    'Legendary Eagle Master' => { min_rating: 2500, max_rating: 2599, color: '#FF4500', icon: '🦅' },
    'Supreme Master First Class' => { min_rating: 2600, max_rating: 2699, color: '#FF1493', icon: '⭐' },
    'The Global Elite' => { min_rating: 2700, max_rating: Float::INFINITY, color: '#8A2BE2', icon: '👑' }
  }.freeze
  
  # K-Factor for ELO calculations (how much rating changes per game)
  K_FACTORS = {
    provisional: 50,    # First 10 games
    normal: 25,         # Normal games
    high_rating: 15     # Players above 2400 rating
  }.freeze
  
  def initialize
    @rating_history = {}
  end
  
  # Calculate new ratings after a match
  def calculate_rating_changes(team1_players, team2_players, team1_won, match_data = {})
    team1_avg_rating = calculate_team_average_rating(team1_players)
    team2_avg_rating = calculate_team_average_rating(team2_players)
    
    # Calculate expected win probability for team1
    expected_team1 = calculate_expected_score(team1_avg_rating, team2_avg_rating)
    expected_team2 = 1.0 - expected_team1
    
    # Actual scores (1 for win, 0 for loss)
    actual_team1 = team1_won ? 1.0 : 0.0
    actual_team2 = team1_won ? 0.0 : 1.0
    
    rating_changes = {}
    
    # Calculate rating changes for team1
    team1_players.each do |player|
      k_factor = get_k_factor(player)
      performance_multiplier = calculate_performance_multiplier(player, match_data)
      
      rating_change = (k_factor * performance_multiplier * (actual_team1 - expected_team1)).round
      new_rating = [player.rating + rating_change, 0].max # Minimum rating of 0
      
      rating_changes[player.player_id] = {
        old_rating: player.rating,
        new_rating: new_rating,
        change: rating_change,
        old_rank: get_rank_from_rating(player.rating),
        new_rank: get_rank_from_rating(new_rating)
      }
      
      # Update player rating in their profile
      player.instance_variable_set(:@rating, new_rating)
      update_rank(player)
    end
    
    # Calculate rating changes for team2
    team2_players.each do |player|
      k_factor = get_k_factor(player)
      performance_multiplier = calculate_performance_multiplier(player, match_data)
      
      rating_change = (k_factor * performance_multiplier * (actual_team2 - expected_team2)).round
      new_rating = [player.rating + rating_change, 0].max # Minimum rating of 0
      
      rating_changes[player.player_id] = {
        old_rating: player.rating,
        new_rating: new_rating,
        change: rating_change,
        old_rank: get_rank_from_rating(player.rating),
        new_rank: get_rank_from_rating(new_rating)
      }
      
      # Update player rating in their profile
      player.instance_variable_set(:@rating, new_rating)
      update_rank(player)
    end
    
    rating_changes
  end
  
  # Get rank information from rating
  def get_rank_from_rating(rating)
    RANKS.each do |rank_name, rank_info|
      if rating >= rank_info[:min_rating] && rating <= rank_info[:max_rating]
        return rank_name
      end
    end
    'Unranked'
  end
  
  def get_rank_info(rank_name)
    RANKS[rank_name] || RANKS['Unranked']
  end
  
  def get_next_rank(current_rank)
    rank_names = RANKS.keys
    current_index = rank_names.index(current_rank)
    return nil if current_index.nil? || current_index >= rank_names.length - 1
    rank_names[current_index + 1]
  end
  
  def get_previous_rank(current_rank)
    rank_names = RANKS.keys
    current_index = rank_names.index(current_rank)
    return nil if current_index.nil? || current_index <= 0
    rank_names[current_index - 1]
  end
  
  def rating_needed_for_next_rank(current_rating)
    current_rank = get_rank_from_rating(current_rating)
    next_rank = get_next_rank(current_rank)
    return nil unless next_rank
    
    next_rank_info = get_rank_info(next_rank)
    next_rank_info[:min_rating] - current_rating
  end
  
  def progress_in_current_rank(rating)
    rank = get_rank_from_rating(rating)
    rank_info = get_rank_info(rank)
    
    if rank_info[:max_rating] == Float::INFINITY
      return 100.0 # Global Elite is always 100%
    end
    
    range = rank_info[:max_rating] - rank_info[:min_rating]
    progress = rating - rank_info[:min_rating]
    
    [(progress.to_f / range * 100).round(1), 100.0].min
  end
  
  def calculate_seasonal_decay(player, days_inactive)
    return 0 if days_inactive < 30 # No decay for first 30 days
    
    # Decay only affects players above Gold Nova Master (1900+ rating)
    return 0 if player.rating < 1900
    
    # Calculate decay: 25 rating per week after 30 days inactive
    weeks_inactive = [(days_inactive - 30) / 7.0, 0].max
    decay_amount = (weeks_inactive * 25).round
    
    # Cap maximum decay
    max_decay = player.rating - 1900 # Can't decay below Gold Nova Master
    [decay_amount, max_decay].min
  end
  
  def apply_seasonal_decay(player)
    last_played = player.last_played
    days_inactive = (Time.now - last_played) / (24 * 60 * 60)
    
    decay = calculate_seasonal_decay(player, days_inactive)
    if decay > 0
      new_rating = player.rating - decay
      player.instance_variable_set(:@rating, new_rating)
      update_rank(player)
      
      puts "📉 #{player.display_name}: Rating decayed by #{decay} (#{days_inactive.round} days inactive)"
      return decay
    end
    
    0
  end
  
  # Competitive seasons and leaderboards
  def get_season_leaderboard(season_id = 'current', limit = 100)
    # This would typically query a database of all players
    # For now, we'll return a placeholder structure
    {
      season_id: season_id,
      updated_at: Time.now,
      leaderboard: []
    }
  end
  
  def get_rank_distribution
    # Calculate percentage of players in each rank
    # This would typically query actual player data
    distribution = {}
    RANKS.each_key { |rank| distribution[rank] = 0 }
    
    # Example distribution (would be calculated from real data)
    distribution.merge({
      'Silver I' => 8.2,
      'Silver II' => 9.1,
      'Silver III' => 10.3,
      'Silver IV' => 12.4,
      'Silver Elite' => 11.8,
      'Silver Elite Master' => 9.6,
      'Gold Nova I' => 8.7,
      'Gold Nova II' => 7.9,
      'Gold Nova III' => 6.8,
      'Gold Nova Master' => 5.4,
      'Master Guardian I' => 4.2,
      'Master Guardian II' => 3.1,
      'Master Guardian Elite' => 2.3,
      'Distinguished Master Guardian' => 1.8,
      'Legendary Eagle' => 1.4,
      'Legendary Eagle Master' => 1.0,
      'Supreme Master First Class' => 0.7,
      'The Global Elite' => 0.4
    })
  end
  
  # Tournament and competitive features
  def calculate_tournament_seeding(players)
    players.sort_by { |p| -p.rating }.map.with_index(1) do |player, seed|
      {
        seed: seed,
        player: player,
        rating: player.rating,
        rank: get_rank_from_rating(player.rating)
      }
    end
  end
  
  def create_balanced_teams(players, team_size = 5)
    return [] if players.length < team_size * 2
    
    sorted_players = players.sort_by(&:rating)
    teams = [[], []]
    
    # Snake draft algorithm for balanced teams
    sorted_players.each_with_index do |player, index|
      if (index / team_size) % 2 == 0
        teams[index % 2] << player
      else
        teams[1 - (index % 2)] << player
      end
    end
    
    teams.map do |team|
      {
        players: team,
        average_rating: calculate_team_average_rating(team),
        average_rank: get_rank_from_rating(calculate_team_average_rating(team))
      }
    end
  end
  
  private
  
  def calculate_team_average_rating(players)
    return 0 if players.empty?
    players.sum(&:rating).to_f / players.length
  end
  
  def calculate_expected_score(rating_a, rating_b)
    1.0 / (1.0 + 10**((rating_b - rating_a) / 400.0))
  end
  
  def get_k_factor(player)
    if player.stats[:matches_played] < 10
      K_FACTORS[:provisional]
    elsif player.rating >= 2400
      K_FACTORS[:high_rating]
    else
      K_FACTORS[:normal]
    end
  end
  
  def calculate_performance_multiplier(player, match_data)
    # Base multiplier
    multiplier = 1.0
    
    player_data = match_data.dig(:players, player.player_id)
    return multiplier unless player_data
    
    # Performance bonuses/penalties
    kd_ratio = player_data[:deaths] > 0 ? player_data[:kills].to_f / player_data[:deaths] : player_data[:kills]
    
    # KD ratio impact (±20%)
    if kd_ratio >= 2.0
      multiplier += 0.2
    elsif kd_ratio >= 1.5
      multiplier += 0.1
    elsif kd_ratio < 0.5
      multiplier -= 0.2
    elsif kd_ratio < 0.75
      multiplier -= 0.1
    end
    
    # MVP rounds bonus (+10%)
    if player_data[:mvp_rounds] > 0
      multiplier += 0.1
    end
    
    # Objective participation bonus (+5%)
    if player_data[:bomb_plants] > 0 || player_data[:bomb_defuses] > 0
      multiplier += 0.05
    end
    
    # Cap multiplier between 0.5 and 1.5
    [[multiplier, 0.5].max, 1.5].min
  end
  
  def update_rank(player)
    new_rank = get_rank_from_rating(player.rating)
    old_rank = player.rank
    
    if new_rank != old_rank
      player.instance_variable_set(:@rank, new_rank)
      
      rank_up = RANKS.keys.index(new_rank) > RANKS.keys.index(old_rank)
      if rank_up
        puts "🎉 #{player.display_name} ranked up: #{old_rank} → #{new_rank}!"
        
        # Award XP bonus for ranking up
        bonus_xp = 100 + (RANKS.keys.index(new_rank) * 25)
        player.add_xp(bonus_xp, "Ranked up to #{new_rank}")
      else
        puts "📉 #{player.display_name} ranked down: #{old_rank} → #{new_rank}"
      end
    end
  end
end