#!/usr/bin/env lively
# frozen_string_literal: true

require 'securerandom'
require 'json'

class CS2DView < Live::View
  # Game constants
  WEAPONS = {
    # Pistols
    'usp' => { name: 'USP', price: 0, damage: 33, rate: 400, ammo: 12, reserve: 100, speed: 1.0 },
    'glock' => { name: 'Glock-18', price: 0, damage: 28, rate: 400, ammo: 20, reserve: 120, speed: 1.0 },
    'deagle' => { name: 'Desert Eagle', price: 700, damage: 48, rate: 267, ammo: 7, reserve: 35, speed: 0.95 },
    
    # Rifles
    'ak47' => { name: 'AK-47', price: 2700, damage: 36, rate: 600, ammo: 30, reserve: 90, speed: 0.88 },
    'm4a1' => { name: 'M4A1', price: 3100, damage: 33, rate: 666, ammo: 30, reserve: 90, speed: 0.9 },
    'awp' => { name: 'AWP', price: 4750, damage: 115, rate: 41, ammo: 10, reserve: 30, speed: 0.85 },
    
    # SMGs
    'mp5' => { name: 'MP5', price: 1500, damage: 26, rate: 750, ammo: 30, reserve: 120, speed: 0.95 },
    'p90' => { name: 'P90', price: 2350, damage: 26, rate: 857, ammo: 50, reserve: 100, speed: 0.93 },
    
    # Equipment
    'kevlar' => { name: 'Kevlar Vest', price: 650 },
    'kevlar_helmet' => { name: 'Kevlar + Helmet', price: 1000 },
    'defuse_kit' => { name: 'Defuse Kit', price: 400 },
    'flashbang' => { name: 'Flashbang', price: 200 },
    'hegrenade' => { name: 'HE Grenade', price: 300 },
    'smokegrenade' => { name: 'Smoke Grenade', price: 300 }
  }
  
  ROUND_TIME = 115 # seconds
  BUY_TIME = 15 # seconds
  BOMB_TIMER = 35 # seconds
  DEFUSE_TIME = 5 # seconds (with kit: 2.5)
  
  def initialize(...)
    super
    @player_id = nil
    @game_state = {
      round: 1,
      ct_score: 0,
      t_score: 0,
      round_time: ROUND_TIME,
      phase: 'warmup', # warmup, buy_time, round_active, round_end
      bomb_planted: false,
      bomb_site: nil,
      bomb_timer: nil,
      bomb_position: nil,
      defusing_player: nil,
      defuse_start_time: nil,
      players: {},
      bots: {},
      grenades: [],
      dropped_weapons: [],
      kill_feed: [],
      round_winner: nil,
      mvp_player: nil
    }
    @game_running = false
    @last_bot_update = Time.now
    @last_round_update = Time.now
  end
  
  def bind(page)
    super
    @player_id = SecureRandom.uuid
    
    # Initialize player with full state
    player_team = 'ct' # Player starts as CT
    spawn_point = get_spawn_point(player_team)
    
    @game_state[:players][@player_id] = {
      id: @player_id,
      name: "Player",
      team: player_team,
      x: spawn_point[:x],
      y: spawn_point[:y],
      angle: 0,
      health: 100,
      armor: 0,
      money: 800,
      weapons: ['usp'],
      current_weapon: 'usp',
      ammo: { 'usp' => 12 },
      reserve_ammo: { 'usp' => 100 },
      grenades: [],
      has_bomb: false,
      has_defuse_kit: false,
      alive: true,
      kills: 0,
      deaths: 0,
      score: 0,
      is_bot: false,
      last_shot: 0
    }
    
    # Initialize bots
    initialize_bots
    
    @game_running = true
    
    # Start in buy time
    @game_state[:phase] = 'buy_time'
    @game_state[:round_time] = BUY_TIME
    
    # Start game loop
    start_game_loop
    
    # Send initial game state to client
    broadcast_game_state
    
    self.update!
  end
  
  def close
    @game_running = false
    @game_loop&.stop if @game_loop
    @game_state[:players].delete(@player_id) if @player_id
    super
  end
  
  def handle(event)
    return unless @player_id && @game_running
    
    case event[:type]
    when "player_move"
      handle_player_move(event)
    when "player_shoot"
      handle_player_shoot(event)
    when "player_reload"
      handle_player_reload(event)
    when "buy_weapon"
      handle_buy_weapon(event)
    when "plant_bomb"
      handle_plant_bomb(event)
    when "defuse_bomb"
      handle_defuse_bomb(event)
    when "drop_weapon"
      handle_drop_weapon(event)
    when "chat_message"
      handle_chat(event)
    when "change_team"
      handle_team_change(event)
    when "player_angle"
      handle_player_angle(event)
    when "throw_grenade"
      handle_throw_grenade(event)
    end
  end
  
  def handle_player_move(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    # Apply weapon speed modifier
    weapon = WEAPONS[player[:current_weapon]]
    speed_modifier = weapon ? weapon[:speed] : 1.0
    
    dx = (event[:dx] || 0) * speed_modifier
    dy = (event[:dy] || 0) * speed_modifier
    
    player[:x] += dx
    player[:y] += dy
    
    # Bounds checking
    player[:x] = [[player[:x], 20].max, 1260].min
    player[:y] = [[player[:y], 20].max, 700].min
    
    broadcast_game_state
  end
  
  def handle_player_angle(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    player[:angle] = event[:angle] if event[:angle]
  end
  
  def handle_player_shoot(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    weapon = WEAPONS[player[:current_weapon]]
    return unless weapon && weapon[:ammo]
    
    # Check fire rate
    now = Time.now.to_f * 1000
    fire_delay = 60000.0 / weapon[:rate] # Convert RPM to ms between shots
    return if now - player[:last_shot] < fire_delay
    
    # Check ammo
    current_ammo = player[:ammo][player[:current_weapon]] || 0
    return if current_ammo <= 0
    
    # Deduct ammo
    player[:ammo][player[:current_weapon]] -= 1
    player[:last_shot] = now
    
    # Play sound
    play_sound('shoot')
    
    # Check for hit
    angle = event[:angle] || player[:angle]
    check_bullet_hit(player, angle, weapon[:damage])
    
    broadcast_game_state
  end
  
  def handle_player_reload(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    weapon_key = player[:current_weapon]
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:ammo]
    
    current_ammo = player[:ammo][weapon_key] || 0
    reserve = player[:reserve_ammo][weapon_key] || 0
    
    return if current_ammo >= weapon[:ammo] || reserve <= 0
    
    # Calculate reload amount
    needed = weapon[:ammo] - current_ammo
    reload_amount = [needed, reserve].min
    
    # Perform reload
    player[:ammo][weapon_key] = current_ammo + reload_amount
    player[:reserve_ammo][weapon_key] = reserve - reload_amount
    
    play_sound('reload')
    broadcast_game_state
  end
  
  def handle_buy_weapon(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    return unless @game_state[:phase] == 'buy_time'
    
    weapon_key = event[:weapon]
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:price]
    
    if player[:money] >= weapon[:price]
      player[:money] -= weapon[:price]
      
      if weapon_key.include?('grenade')
        player[:grenades] << weapon_key unless player[:grenades].include?(weapon_key)
      elsif weapon_key.include?('kevlar')
        player[:armor] = weapon_key == 'kevlar_helmet' ? 100 : 100
      elsif weapon_key == 'defuse_kit'
        player[:has_defuse_kit] = true if player[:team] == 'ct'
      else
        player[:weapons] << weapon_key unless player[:weapons].include?(weapon_key)
        player[:current_weapon] = weapon_key
      end
      
      play_sound('buy')
      broadcast_game_state
    end
  end
  
  def handle_plant_bomb(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive] && player[:team] == 't' && player[:has_bomb]
    return if @game_state[:bomb_planted]
    
    # Check if at bomb site
    site = at_bomb_site?(player[:x], player[:y])
    return unless site
    
    @game_state[:bomb_planted] = true
    @game_state[:bomb_site] = site
    @game_state[:bomb_timer] = BOMB_TIMER
    player[:has_bomb] = false
    
    play_sound('bomb_plant')
    add_to_kill_feed("#{player[:name]} planted the bomb at site #{site}")
    
    # Start bomb countdown
    start_bomb_timer
    
    broadcast_game_state
  end
  
  def handle_defuse_bomb(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive] && player[:team] == 'ct'
    return unless @game_state[:bomb_planted]
    
    # Check if near bomb
    site = @game_state[:bomb_site]
    return unless at_bomb_site?(player[:x], player[:y]) == site
    
    defuse_time = player[:has_defuse_kit] ? 2.5 : DEFUSE_TIME
    
    # Start defusing (simplified - instant for now)
    @game_state[:bomb_planted] = false
    @game_state[:bomb_timer] = nil
    
    play_sound('bomb_defuse')
    add_to_kill_feed("#{player[:name]} defused the bomb!")
    
    # CT wins the round
    end_round('ct')
    
    broadcast_game_state
  end
  
  def handle_throw_grenade(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    grenade_type = event[:grenade_type]
    return unless player[:grenades].include?(grenade_type)
    
    player[:grenades].delete_at(player[:grenades].index(grenade_type))
    
    # Create grenade effect
    play_sound('grenade_throw')
    
    # Apply grenade effects (simplified)
    case grenade_type
    when 'flashbang'
      apply_flashbang_effect(player[:x], player[:y])
    when 'hegrenade'
      apply_he_damage(player[:x], player[:y])
    when 'smokegrenade'
      apply_smoke_effect(player[:x], player[:y])
    end
    
    broadcast_game_state
  end
  
  def handle_team_change(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    new_team = event[:team]
    return unless ['ct', 't'].include?(new_team)
    return if player[:team] == new_team
    
    player[:team] = new_team
    spawn_point = get_spawn_point(new_team)
    player[:x] = spawn_point[:x]
    player[:y] = spawn_point[:y]
    
    # Reset equipment for new team
    player[:weapons] = [new_team == 'ct' ? 'usp' : 'glock']
    player[:current_weapon] = new_team == 'ct' ? 'usp' : 'glock'
    player[:has_bomb] = false
    
    broadcast_game_state
  end
  
  def handle_drop_weapon(event)
    # Drop current weapon logic
  end
  
  def handle_chat(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    message = event[:message]
    return if message.nil? || message.strip.empty?
    
    chat_message = {
      player: player[:name],
      team: player[:team],
      message: message,
      timestamp: Time.now.to_f
    }
    
    broadcast_chat_message(chat_message)
  end
  
  private
  
  def start_round_timer
    # Simplified: Timer is handled client-side to avoid async issues
    # The game state phase and time are managed through player actions
  end
  
  def start_bomb_timer
    # Simplified: Bomb timer is handled client-side to avoid async issues
    # The bomb timer countdown is managed in JavaScript
    return unless @game_state[:bomb_planted]
    broadcast_game_state
  end
  
  def end_round(winning_team)
    @game_state[:phase] = 'round_end'
    
    if winning_team == 'ct'
      @game_state[:ct_score] += 1
      award_money('ct', 3250) # Win bonus
      award_money('t', 1400) # Loss bonus
    else
      @game_state[:t_score] += 1
      award_money('t', 3250)
      award_money('ct', 1400)
    end
    
    add_to_kill_feed("#{winning_team.upcase} wins the round!")
    broadcast_game_state
  end
  
  def start_new_round
    @game_state[:round] += 1
    @game_state[:phase] = 'buy_time'
    @game_state[:round_time] = BUY_TIME
    @game_state[:bomb_planted] = false
    @game_state[:bomb_site] = nil
    @game_state[:bomb_timer] = nil
    
    # Respawn all players
    @game_state[:players].each do |id, player|
      player[:alive] = true
      player[:health] = 100
      spawn_point = get_spawn_point(player[:team])
      player[:x] = spawn_point[:x]
      player[:y] = spawn_point[:y]
      
      # Give bomb to random T
      if player[:team] == 't'
        player[:has_bomb] = @game_state[:players].values.none? { |p| p[:has_bomb] && p[:team] == 't' }
      end
    end
    
    broadcast_game_state
  end
  
  def check_bullet_hit(shooter, angle, damage)
    # Simplified hit detection
    @game_state[:players].each do |id, target|
      next if id == shooter[:id] || !target[:alive]
      next if target[:team] == shooter[:team] # No friendly fire
      
      # Very simplified distance and angle check
      dx = target[:x] - shooter[:x]
      dy = target[:y] - shooter[:y]
      distance = Math.sqrt(dx * dx + dy * dy)
      
      if distance < 500 # Max bullet range
        target_angle = Math.atan2(dy, dx)
        angle_diff = (target_angle - angle).abs
        
        if angle_diff < 0.1 # Hit cone
          # Apply damage
          target[:health] -= damage * (target[:armor] > 0 ? 0.5 : 1)
          target[:armor] = [target[:armor] - damage * 0.5, 0].max
          
          if target[:health] <= 0
            target[:alive] = false
            target[:deaths] += 1
            shooter[:kills] += 1
            shooter[:money] += 300 # Kill reward
            
            add_to_kill_feed("#{shooter[:name]} killed #{target[:name]}")
            play_sound('death')
            
            # Check for round end
            check_round_end
          end
          
          return true # Hit registered
        end
      end
    end
    false
  end
  
  def check_round_end
    ct_alive = @game_state[:players].values.count { |p| p[:team] == 'ct' && p[:alive] }
    t_alive = @game_state[:players].values.count { |p| p[:team] == 't' && p[:alive] }
    
    if ct_alive == 0
      end_round('t')
    elsif t_alive == 0
      end_round('ct')
    end
  end
  
  def apply_flashbang_effect(x, y)
    # Apply flash effect to nearby players
    @game_state[:players].each do |id, player|
      next unless player[:alive]
      
      dx = player[:x] - x
      dy = player[:y] - y
      distance = Math.sqrt(dx * dx + dy * dy)
      
      if distance < 200
        # Send flash effect to client
        self.script("window.game && window.game.applyFlashEffect(#{(200 - distance) / 200});")
      end
    end
  end
  
  def apply_he_damage(x, y)
    # Apply explosion damage to nearby players
    @game_state[:players].each do |id, player|
      next unless player[:alive]
      
      dx = player[:x] - x
      dy = player[:y] - y
      distance = Math.sqrt(dx * dx + dy * dy)
      
      if distance < 150
        damage = ((150 - distance) / 150) * 80
        player[:health] -= damage
        
        if player[:health] <= 0
          player[:alive] = false
          player[:deaths] += 1
          add_to_kill_feed("Grenade killed #{player[:name]}")
        end
      end
    end
  end
  
  def apply_smoke_effect(x, y)
    # Create smoke cloud
    self.script("window.game && window.game.createSmokeCloud(#{x}, #{y});")
  end
  
  def at_bomb_site?(x, y)
    # Check if player is at bomb site A
    if (x - 200).abs < 60 && (y - 200).abs < 60
      return 'A'
    end
    # Check if player is at bomb site B
    if (x - 1080).abs < 60 && (y - 520).abs < 60
      return 'B'
    end
    nil
  end
  
  def get_spawn_point(team)
    if team == 'ct'
      { x: 100 + rand(100), y: 300 + rand(100) }
    else
      { x: 1100 + rand(100), y: 300 + rand(100) }
    end
  end
  
  def award_money(team, amount)
    @game_state[:players].each do |_, player|
      if player[:team] == team
        player[:money] = [player[:money] + amount, 16000].min # Max money
      end
    end
  end
  
  def add_to_kill_feed(message)
    @game_state[:kill_feed] << {
      message: message,
      timestamp: Time.now.to_f
    }
    # Keep only last 5 messages
    @game_state[:kill_feed] = @game_state[:kill_feed].last(5)
  end
  
  def play_sound(sound_name)
    self.script("window.game && window.game.playSound('#{sound_name}');")
  end
  
  def broadcast_game_state
    self.script("window.game && window.game.updateGameState(#{@game_state.to_json});")
  end
  
  def broadcast_chat_message(message)
    self.script("window.game && window.game.receiveChatMessage(#{message.to_json});")
  end
  
  # Bot AI Methods
  def initialize_bots
    # Create 4 terrorist bots
    4.times do |i|
      bot_id = "bot_t_#{i}"
      spawn_point = get_spawn_point('t')
      
      @game_state[:bots][bot_id] = {
        id: bot_id,
        name: ["Phoenix", "Leet", "Guerilla", "Elite"][i],
        team: 't',
        x: spawn_point[:x],
        y: spawn_point[:y],
        angle: 0,
        health: 100,
        armor: 0,
        money: 800,
        weapons: ['glock', 'ak47'],
        current_weapon: 'ak47',
        ammo: { 'glock' => 20, 'ak47' => 30 },
        reserve_ammo: { 'glock' => 120, 'ak47' => 90 },
        grenades: [],
        has_bomb: i == 0, # First bot gets bomb
        has_defuse_kit: false,
        alive: true,
        kills: 0,
        deaths: 0,
        score: 0,
        is_bot: true,
        last_shot: 0,
        target: nil,
        path: [],
        state: 'roaming', # roaming, attacking, planting, defusing
        last_think: Time.now
      }
      
      @game_state[:players][bot_id] = @game_state[:bots][bot_id]
    end
  end
  
  def start_game_loop
    @game_loop = Async do
      while @game_running
        update_game_state
        sleep 0.05 # 20 FPS update rate
      end
    end
  end
  
  def update_game_state
    now = Time.now
    
    # Update round timer
    if now - @last_round_update > 1
      update_round_timer
      @last_round_update = now
    end
    
    # Update bots
    if now - @last_bot_update > 0.1 # 10 Hz bot updates
      update_bots
      @last_bot_update = now
    end
    
    # Update grenades
    update_grenades
    
    # Check defuse progress
    check_defuse_progress
    
    # Check weapon pickups
    check_weapon_pickups
    
    broadcast_game_state if @game_running
  end
  
  def update_round_timer
    case @game_state[:phase]
    when 'buy_time'
      @game_state[:round_time] -= 1
      if @game_state[:round_time] <= 0
        @game_state[:phase] = 'round_active'
        @game_state[:round_time] = ROUND_TIME
        add_to_kill_feed("Round #{@game_state[:round]} started!")
      end
    when 'round_active'
      if @game_state[:bomb_planted]
        @game_state[:bomb_timer] -= 1
        if @game_state[:bomb_timer] <= 0
          # Bomb explodes
          end_round('t')
          add_to_kill_feed("The bomb has exploded!")
        end
      else
        @game_state[:round_time] -= 1
        if @game_state[:round_time] <= 0
          # Time runs out
          end_round('ct')
          add_to_kill_feed("Time has run out!")
        end
      end
    when 'round_end'
      # Wait a few seconds then start new round
      start_new_round if @game_state[:round_time] <= 0
    end
  end
  
  def update_bots
    @game_state[:bots].each do |bot_id, bot|
      next unless bot[:alive]
      
      # Bot AI decision making
      case bot[:state]
      when 'roaming'
        bot_roam(bot)
      when 'attacking'
        bot_attack(bot)
      when 'planting'
        bot_plant_bomb(bot)
      end
    end
  end
  
  def bot_roam(bot)
    # Find nearest enemy
    nearest_enemy = find_nearest_enemy(bot)
    
    if nearest_enemy
      dist = calculate_distance(bot, nearest_enemy)
      if dist < 300 # Engagement range
        bot[:state] = 'attacking'
        bot[:target] = nearest_enemy[:id]
      else
        # Move towards enemy
        move_bot_towards(bot, nearest_enemy)
      end
    elsif bot[:has_bomb] && @game_state[:phase] == 'round_active'
      # Move to bomb site
      bot[:state] = 'planting'
      site = ['A', 'B'].sample
      move_bot_to_site(bot, site)
    else
      # Random patrol
      bot[:angle] += (rand - 0.5) * 0.2
      move_bot_forward(bot, 3)
    end
  end
  
  def bot_attack(bot)
    target = @game_state[:players][bot[:target]]
    
    if target && target[:alive]
      # Face target
      dx = target[:x] - bot[:x]
      dy = target[:y] - bot[:y]
      bot[:angle] = Math.atan2(dy, dx)
      
      # Check if can shoot
      dist = Math.sqrt(dx * dx + dy * dy)
      if dist < 400 && bot[:ammo][bot[:current_weapon]] > 0
        bot_shoot(bot)
      else
        # Move closer
        move_bot_towards(bot, target)
      end
      
      # Reload if needed
      if bot[:ammo][bot[:current_weapon]] == 0
        bot_reload(bot)
      end
    else
      bot[:state] = 'roaming'
      bot[:target] = nil
    end
  end
  
  def bot_plant_bomb(bot)
    return unless bot[:has_bomb]
    
    site = at_bomb_site?(bot[:x], bot[:y])
    if site
      # Plant bomb
      @game_state[:bomb_planted] = true
      @game_state[:bomb_site] = site
      @game_state[:bomb_timer] = BOMB_TIMER
      @game_state[:bomb_position] = { x: bot[:x], y: bot[:y] }
      bot[:has_bomb] = false
      bot[:state] = 'roaming'
      add_to_kill_feed("#{bot[:name]} planted the bomb at site #{site}!")
    else
      # Move to nearest bomb site
      move_bot_to_site(bot, 'A')
    end
  end
  
  def bot_shoot(bot)
    weapon = WEAPONS[bot[:current_weapon]]
    return unless weapon
    
    # Fire rate check
    now = Time.now.to_f * 1000
    fire_delay = 60000.0 / weapon[:rate]
    return if now - bot[:last_shot] < fire_delay
    
    # Shoot
    bot[:ammo][bot[:current_weapon]] -= 1
    bot[:last_shot] = now
    
    # Check hit
    check_bullet_hit(bot, bot[:angle], weapon[:damage])
  end
  
  def bot_reload(bot)
    weapon_key = bot[:current_weapon]
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:ammo]
    
    current = bot[:ammo][weapon_key] || 0
    reserve = bot[:reserve_ammo][weapon_key] || 0
    
    return if current >= weapon[:ammo] || reserve <= 0
    
    needed = weapon[:ammo] - current
    reload_amount = [needed, reserve].min
    
    bot[:ammo][weapon_key] = current + reload_amount
    bot[:reserve_ammo][weapon_key] = reserve - reload_amount
  end
  
  def move_bot_towards(bot, target)
    dx = target[:x] - bot[:x]
    dy = target[:y] - bot[:y]
    dist = Math.sqrt(dx * dx + dy * dy)
    
    return if dist < 50
    
    # Normalize and apply speed
    speed = 3 * (WEAPONS[bot[:current_weapon]][:speed] || 1.0)
    bot[:x] += (dx / dist) * speed
    bot[:y] += (dy / dist) * speed
    
    # Bounds
    bot[:x] = [[bot[:x], 20].max, 1260].min
    bot[:y] = [[bot[:y], 20].max, 700].min
  end
  
  def move_bot_forward(bot, speed)
    bot[:x] += Math.cos(bot[:angle]) * speed
    bot[:y] += Math.sin(bot[:angle]) * speed
    
    # Bounds and collision
    bot[:x] = [[bot[:x], 20].max, 1260].min
    bot[:y] = [[bot[:y], 20].max, 700].min
  end
  
  def move_bot_to_site(bot, site)
    target = site == 'A' ? { x: 200, y: 200 } : { x: 1080, y: 520 }
    move_bot_towards(bot, target)
  end
  
  def find_nearest_enemy(bot)
    nearest = nil
    min_dist = Float::INFINITY
    
    @game_state[:players].each do |id, player|
      next if player[:team] == bot[:team] || !player[:alive] || player[:is_bot]
      
      dist = calculate_distance(bot, player)
      if dist < min_dist
        min_dist = dist
        nearest = player
      end
    end
    
    nearest
  end
  
  def calculate_distance(obj1, obj2)
    dx = obj2[:x] - obj1[:x]
    dy = obj2[:y] - obj1[:y]
    Math.sqrt(dx * dx + dy * dy)
  end
  
  def update_grenades
    @game_state[:grenades].each do |grenade|
      # Physics update
      grenade[:x] += grenade[:vx]
      grenade[:y] += grenade[:vy]
      grenade[:vx] *= 0.98 # Friction
      grenade[:vy] *= 0.98
      grenade[:timer] -= 0.05
      
      # Explode when timer expires
      if grenade[:timer] <= 0
        case grenade[:type]
        when 'flashbang'
          apply_flashbang_effect(grenade[:x], grenade[:y])
        when 'hegrenade'
          apply_he_damage(grenade[:x], grenade[:y])
        when 'smokegrenade'
          apply_smoke_effect(grenade[:x], grenade[:y])
        end
        @game_state[:grenades].delete(grenade)
      end
    end
  end
  
  def check_defuse_progress
    return unless @game_state[:defusing_player] && @game_state[:defuse_start_time]
    
    player = @game_state[:players][@game_state[:defusing_player]]
    return unless player && player[:alive]
    
    defuse_time = player[:has_defuse_kit] ? 2.5 : DEFUSE_TIME
    elapsed = Time.now - @game_state[:defuse_start_time]
    
    if elapsed >= defuse_time
      # Defuse complete
      @game_state[:bomb_planted] = false
      @game_state[:bomb_timer] = nil
      @game_state[:defusing_player] = nil
      @game_state[:defuse_start_time] = nil
      
      add_to_kill_feed("#{player[:name]} defused the bomb!")
      player[:money] += 300
      end_round('ct')
    end
  end
  
  def check_weapon_pickups
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    @game_state[:dropped_weapons].each do |weapon|
      dist = calculate_distance(player, weapon)
      if dist < 30
        # Pick up weapon
        if !player[:weapons].include?(weapon[:weapon])
          player[:weapons] << weapon[:weapon]
          player[:ammo][weapon[:weapon]] = weapon[:ammo]
          player[:reserve_ammo][weapon[:weapon]] = weapon[:reserve]
          player[:current_weapon] = weapon[:weapon]
          @game_state[:dropped_weapons].delete(weapon)
          play_sound('pickup')
        end
      end
    end
  end
  
  def send_message(message)
    self.script("window.game && window.game.receiveMessage(#{message.to_json});")
  end
  
  def render(builder)
    render_game_container(builder)
    render_game_scripts(builder)
  end
  
  def render_game_container(builder)
    builder.tag(:div, id: "cs2d-container", data: { live: @id }, 
                style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #000; position: relative;") do
      # Game canvas
      builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
                 style: "display: block; margin: 0 auto; cursor: crosshair;",
                 tabIndex: 0)
      
      # Game UI overlay
      builder.tag(:div, id: "game-ui", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
        render_hud(builder)
        render_kill_feed(builder)
        render_buy_menu(builder)
        render_scoreboard(builder)
        render_chat(builder)
      end
    end
  end
  
  def render_hud(builder)
    # Top HUD - Round info and scores
    builder.tag(:div, style: "position: absolute; top: 0; left: 0; right: 0; height: 80px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;") do
      # Team scores
      builder.tag(:div, style: "display: flex; gap: 20px; font-family: 'Arial', sans-serif;") do
        builder.tag(:div, id: "ct-score", style: "color: #5B9BD5; font-size: 32px; font-weight: bold;") { builder.text("CT: #{@game_state[:ct_score]}") }
        builder.tag(:div, style: "color: white; font-size: 32px;") { builder.text("-") }
        builder.tag(:div, id: "t-score", style: "color: #FFA500; font-size: 32px; font-weight: bold;") { builder.text("T: #{@game_state[:t_score]}") }
      end
      
      # Round timer
      builder.tag(:div, id: "round-timer", style: "font-size: 36px; font-weight: bold; color: white; font-family: 'monospace';") do
        minutes = @game_state[:round_time] / 60
        seconds = @game_state[:round_time] % 60
        builder.text(sprintf("%d:%02d", minutes, seconds))
      end
      
      # Round info
      builder.tag(:div, style: "text-align: right; color: white; font-family: 'Arial', sans-serif;") do
        builder.tag(:div, id: "round-number", style: "font-size: 18px;") { builder.text("Round #{@game_state[:round]}") }
        builder.tag(:div, id: "game-phase", style: "font-size: 14px; color: #aaa;") { builder.text(@game_state[:phase].capitalize.gsub('_', ' ')) }
      end
    end
    
    # Bottom HUD - Player stats
    builder.tag(:div, style: "position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: flex-end; padding: 20px;") do
      # Health and armor
      builder.tag(:div, style: "display: flex; flex-direction: column; gap: 5px;") do
        builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
          builder.tag(:div, style: "width: 40px; height: 40px; background: url('/_static/health_icon.png') center/contain no-repeat;")
          builder.tag(:div, style: "width: 200px; height: 30px; background: rgba(0,0,0,0.5); border: 2px solid #333; position: relative;") do
            builder.tag(:div, id: "health-bar", style: "height: 100%; width: 100%; background: linear-gradient(to right, #ff0000, #ff6666);")
            builder.tag(:div, id: "health-text", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;") { builder.text("100") }
          end
        end
        
        builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
          builder.tag(:div, style: "width: 40px; height: 40px; background: url('/_static/armor_icon.png') center/contain no-repeat;")
          builder.tag(:div, style: "width: 200px; height: 30px; background: rgba(0,0,0,0.5); border: 2px solid #333; position: relative;") do
            builder.tag(:div, id: "armor-bar", style: "height: 100%; width: 0%; background: linear-gradient(to right, #4444ff, #6666ff);")
            builder.tag(:div, id: "armor-text", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;") { builder.text("0") }
          end
        end
      end
      
      # Weapon and ammo
      builder.tag(:div, style: "display: flex; flex-direction: column; align-items: center; gap: 5px;") do
        builder.tag(:div, id: "weapon-icon", style: "width: 120px; height: 60px; background: url('/_static/weapons/usp.png') center/contain no-repeat;")
        builder.tag(:div, id: "weapon-name", style: "color: white; font-size: 18px; font-weight: bold;") { builder.text("USP") }
        builder.tag(:div, id: "ammo-display", style: "color: white; font-size: 24px; font-family: monospace;") { builder.text("12 / 100") }
      end
      
      # Money and equipment
      builder.tag(:div, style: "display: flex; flex-direction: column; align-items: flex-end; gap: 5px;") do
        builder.tag(:div, id: "money", style: "color: #00ff00; font-size: 28px; font-weight: bold; font-family: monospace;") { builder.text("$800") }
        builder.tag(:div, id: "equipment", style: "display: flex; gap: 5px;") do
          # Grenade icons would go here
        end
      end
    end
  end
  
  def render_kill_feed(builder)
    builder.tag(:div, id: "kill-feed", style: "position: absolute; top: 100px; right: 20px; width: 300px; display: flex; flex-direction: column; gap: 5px; pointer-events: none;") do
      # Kill feed entries will be added dynamically
    end
  end
  
  def render_buy_menu(builder)
    builder.tag(:div, id: "buy-menu", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); border: 2px solid #444; padding: 20px; display: none; pointer-events: auto; min-width: 600px;") do
      builder.tag(:h2, style: "color: white; margin: 0 0 20px 0; text-align: center;") { builder.text("Buy Menu") }
      
      # Weapon categories
      builder.tag(:div, style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;") do
        # Pistols
        builder.tag(:div, class: "weapon-category") do
          builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("Pistols") }
          render_weapon_list(builder, ['deagle'])
        end
        
        # Rifles
        builder.tag(:div, class: "weapon-category") do
          builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("Rifles") }
          render_weapon_list(builder, ['ak47', 'm4a1', 'awp'])
        end
        
        # SMGs
        builder.tag(:div, class: "weapon-category") do
          builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("SMGs") }
          render_weapon_list(builder, ['mp5', 'p90'])
        end
      end
      
      # Equipment
      builder.tag(:div, style: "margin-top: 20px; border-top: 1px solid #444; padding-top: 10px;") do
        builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("Equipment") }
        render_weapon_list(builder, ['kevlar', 'kevlar_helmet', 'defuse_kit', 'flashbang', 'hegrenade', 'smokegrenade'])
      end
      
      builder.tag(:div, style: "text-align: center; margin-top: 20px; color: #888;") { builder.text("Press B to close") }
    end
  end
  
  def render_weapon_list(builder, weapons)
    builder.tag(:div, style: "display: flex; flex-direction: column; gap: 5px;") do
      weapons.each do |weapon_key|
        weapon = WEAPONS[weapon_key]
        builder.tag(:div, class: "weapon-item", "data-weapon": weapon_key,
                   style: "padding: 5px 10px; background: rgba(255,255,255,0.1); cursor: pointer; color: white; display: flex; justify-content: space-between;",
                   onmouseover: "this.style.background='rgba(255,255,255,0.2)'",
                   onmouseout: "this.style.background='rgba(255,255,255,0.1)'",
                   onclick: "window.game.buyWeapon('#{weapon_key}')") do
          builder.tag(:span) { builder.text(weapon[:name]) }
          builder.tag(:span, style: "color: #00ff00;") { builder.text("$#{weapon[:price]}") }
        end
      end
    end
  end
  
  def render_scoreboard(builder)
    builder.tag(:div, id: "scoreboard", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); padding: 20px; display: none; pointer-events: none; min-width: 800px;") do
      builder.tag(:h2, style: "color: white; text-align: center; margin: 0 0 20px 0;") { builder.text("Scoreboard") }
      
      builder.tag(:div, style: "display: flex; gap: 40px;") do
        # CT Team
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #5B9BD5; margin: 0 0 10px 0;") { builder.text("Counter-Terrorists") }
          builder.tag(:table, id: "ct-scoreboard", style: "width: 100%; color: white;") do
            builder.tag(:thead) do
              builder.tag(:tr) do
                builder.tag(:th, style: "text-align: left;") { builder.text("Player") }
                builder.tag(:th, style: "text-align: center;") { builder.text("K") }
                builder.tag(:th, style: "text-align: center;") { builder.text("D") }
                builder.tag(:th, style: "text-align: center;") { builder.text("Score") }
              end
            end
            builder.tag(:tbody, id: "ct-players")
          end
        end
        
        # T Team
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #FFA500; margin: 0 0 10px 0;") { builder.text("Terrorists") }
          builder.tag(:table, id: "t-scoreboard", style: "width: 100%; color: white;") do
            builder.tag(:thead) do
              builder.tag(:tr) do
                builder.tag(:th, style: "text-align: left;") { builder.text("Player") }
                builder.tag(:th, style: "text-align: center;") { builder.text("K") }
                builder.tag(:th, style: "text-align: center;") { builder.text("D") }
                builder.tag(:th, style: "text-align: center;") { builder.text("Score") }
              end
            end
            builder.tag(:tbody, id: "t-players")
          end
        end
      end
    end
  end
  
  def render_chat(builder)
    builder.tag(:div, id: "chat-container", style: "position: absolute; bottom: 140px; left: 20px; width: 400px; height: 200px; pointer-events: none;") do
      builder.tag(:div, id: "chat-messages", style: "height: 170px; overflow-y: auto; background: rgba(0,0,0,0.5); padding: 5px; display: none;")
      builder.tag(:input, id: "chat-input", type: "text", placeholder: "Press T to chat...",
                 style: "width: 100%; background: rgba(0,0,0,0.7); border: 1px solid #444; color: white; padding: 5px; display: none; pointer-events: auto;")
    end
  end
  
  def render_game_scripts(builder)
    builder.tag(:script, type: "text/javascript") do
      # Combine all game scripts into one
      combined_script = [
        client_game_script,
        # Initialize the game
        "window.initCS2DGame('#{@id}', '#{@player_id}');"
      ].join("\n\n")
      
      builder.raw(combined_script)
    end
  end
  
  def client_game_script
    <<~JAVASCRIPT
      // CS2D Complete Game Implementation
      #{game_core_script}
      #{game_renderer_script}
      #{game_network_script}
      #{game_audio_script}
      #{game_input_script}
      #{game_ui_script}
      #{game_init_script}
    JAVASCRIPT
  end
  
  def game_core_script
    <<~JAVASCRIPT
      class CS2DGame {
        constructor(viewId, playerId) {
          this.viewId = viewId;
          this.playerId = playerId;
          this.canvas = document.getElementById('game-canvas');
          this.ctx = this.canvas.getContext('2d');
          
          // Game state - initialize with empty state
          this.gameState = {
            players: {},
            bots: {},
            round: 1,
            ct_score: 0,
            t_score: 0,
            round_time: 15,
            phase: 'buy_time',
            bomb_planted: false,
            bomb_site: null,
            bomb_timer: null,
            bomb_position: null,
            grenades: [],
            dropped_weapons: [],
            kill_feed: []
          };
          this.localPlayer = null;
          
          // Client prediction
          this.inputSequence = 0;
          this.pendingInputs = [];
          this.lastServerUpdate = Date.now();
          this.interpolationDelay = 100; // ms
          
          // Performance optimization
          this.objectPool = new ObjectPool(() => ({}));
          this.frustumCuller = new FrustumCuller();
          this.dirtyRects = [];
          
          // Initialize subsystems
          this.renderer = new GameRenderer(this);
          this.network = new NetworkManager(this);
          this.audio = new AudioManager(this);
          this.input = new InputManager(this);
          this.ui = new UIManager(this);
          
          // Start client-side timers
          this.startTimers();
          
          // Don't start game loop until we have game state
          this.lastTime = Date.now();
          this.running = false;
          
          // Request initial game state
          console.log('CS2D waiting for initial game state...');
          
          // Draw initial loading screen
          this.drawLoadingScreen();
        }
        
        startTimers() {
          // Client-side round timer
          setInterval(() => {
            if (this.gameState.phase === 'buy_time' || this.gameState.phase === 'round_active') {
              this.gameState.round_time--;
              if (this.gameState.round_time <= 0) {
                if (this.gameState.phase === 'buy_time') {
                  this.gameState.phase = 'round_active';
                  this.gameState.round_time = 115;
                }
              }
            }
            
            // Client-side bomb timer
            if (this.gameState.bomb_planted && this.gameState.bomb_timer > 0) {
              this.gameState.bomb_timer--;
              if (this.gameState.bomb_timer < 10) {
                this.audio.play('bomb_beep');
              }
            }
            
            this.ui.update();
          }, 1000);
        }
        
        gameLoop() {
          if (!this.running) return;
          
          const now = Date.now();
          const dt = (now - this.lastTime) / 1000;
          this.lastTime = now;
          
          this.update(dt);
          this.render();
          
          requestAnimationFrame(() => this.gameLoop());
        }
        
        update(dt) {
          // Client-side prediction
          this.input.processInput(dt);
          
          // Interpolate other players
          this.interpolatePlayers(dt);
          
          // Update local effects
          this.updateEffects(dt);
          
          // Update UI
          this.ui.update();
        }
        
        render() {
          this.renderer.render();
        }
        
        interpolatePlayers(dt) {
          // Smooth movement for other players
          Object.values(this.gameState.players).forEach(player => {
            if (player.id !== this.playerId) {
              // Interpolation logic here
            }
          });
        }
        
        updateEffects(dt) {
          // Update visual effects
        }
        
        // API methods
        updateGameState(newState) {
          // Server reconciliation
          const oldLocal = this.gameState.players[this.playerId];
          this.gameState = newState;
          
          // Update local player reference
          this.localPlayer = this.gameState.players[this.playerId];
          
          if (this.localPlayer) {
            // Apply pending inputs
            this.reconcileState();
            
            // Start game loop if not already running
            if (!this.running) {
              this.running = true;
              this.lastTime = Date.now();
              this.gameLoop();
            }
          }
        }
        
        drawLoadingScreen() {
          this.ctx.fillStyle = '#000';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '48px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('CS2D Loading...', this.canvas.width / 2, this.canvas.height / 2 - 50);
          
          this.ctx.font = '24px Arial';
          this.ctx.fillText('Connecting to server...', this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
        
        reconcileState() {
          // Reconcile with server state
          const serverState = this.gameState.players[this.playerId];
          
          // Remove acknowledged inputs
          this.pendingInputs = this.pendingInputs.filter(input => 
            input.sequence > serverState.lastProcessedInput
          );
          
          // Replay pending inputs
          this.pendingInputs.forEach(input => {
            this.applyInput(input);
          });
        }
        
        applyInput(input) {
          // Apply input to local state
        }
        
        playSound(soundName) {
          this.audio.play(soundName);
        }
        
        buyWeapon(weaponKey) {
          this.network.sendEvent('buy_weapon', { weapon: weaponKey });
        }
        
        receiveChatMessage(message) {
          this.ui.addChatMessage(message);
        }
        
        applyFlashEffect(intensity) {
          this.renderer.flashEffect(intensity);
        }
        
        createSmokeCloud(x, y) {
          this.renderer.addSmoke(x, y);
        }
      }
      
      // Object pooling for performance
      class ObjectPool {
        constructor(createFn) {
          this.createFn = createFn;
          this.pool = [];
        }
        
        get() {
          return this.pool.pop() || this.createFn();
        }
        
        release(obj) {
          this.pool.push(obj);
        }
      }
      
      // Frustum culling for rendering optimization
      class FrustumCuller {
        constructor() {
          this.viewBounds = { x: 0, y: 0, width: 1280, height: 720 };
        }
        
        isInView(x, y, radius = 50) {
          return x + radius > this.viewBounds.x &&
                 x - radius < this.viewBounds.x + this.viewBounds.width &&
                 y + radius > this.viewBounds.y &&
                 y - radius < this.viewBounds.y + this.viewBounds.height;
        }
      }
    JAVASCRIPT
  end
  
  def game_renderer_script
    <<~JAVASCRIPT
      class GameRenderer {
        constructor(game) {
          this.game = game;
          this.ctx = game.ctx;
          this.canvas = game.canvas;
          
          // Visual effects
          this.flashAlpha = 0;
          this.smokeClouds = [];
          this.bloodSplatters = [];
          this.bulletTrails = [];
          
          // Sprite cache
          this.sprites = {};
          this.loadSprites();
        }
        
        loadSprites() {
          // Load weapon sprites, player sprites, etc.
        }
        
        render() {
          // Clear canvas
          this.ctx.fillStyle = '#1a1a1a';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          // Draw map
          this.drawMap();
          
          // Draw game objects in order
          this.drawBombSites();
          this.drawDroppedWeapons();
          this.drawPlayers();
          this.drawBullets();
          this.drawGrenades();
          this.drawEffects();
          
          // Draw UI elements
          this.drawCrosshair();
          this.drawMiniMap();
          this.drawFlashEffect();
        }
        
        drawMap() {
          // Draw map grid
          this.ctx.strokeStyle = '#333';
          this.ctx.lineWidth = 1;
          
          for (let x = 0; x <= 1280; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 720);
            this.ctx.stroke();
          }
          
          for (let y = 0; y <= 720; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(1280, y);
            this.ctx.stroke();
          }
          
          // Draw walls/obstacles
          this.ctx.fillStyle = '#444';
          
          // Top wall
          this.ctx.fillRect(0, 0, 1280, 20);
          // Bottom wall
          this.ctx.fillRect(0, 700, 1280, 20);
          // Left wall
          this.ctx.fillRect(0, 0, 20, 720);
          // Right wall
          this.ctx.fillRect(1260, 0, 20, 720);
          
          // Map obstacles
          this.ctx.fillRect(400, 100, 80, 200);
          this.ctx.fillRect(800, 100, 80, 200);
          this.ctx.fillRect(300, 400, 200, 80);
          this.ctx.fillRect(780, 400, 200, 80);
          this.ctx.fillRect(100, 300, 100, 40);
          this.ctx.fillRect(1080, 300, 100, 40);
          
          // Mid obstacles
          this.ctx.fillRect(590, 200, 100, 20);
          this.ctx.fillRect(590, 500, 100, 20);
          this.ctx.fillRect(640, 220, 20, 280);
        }
        
        drawBombSites() {
          // Site A
          this.drawBombSite(200, 200, 'A', this.game.gameState.bomb_site === 'A');
          
          // Site B
          this.drawBombSite(1080, 520, 'B', this.game.gameState.bomb_site === 'B');
        }
        
        drawBombSite(x, y, label, hasBomb) {
          // Draw bomb site area
          this.ctx.fillStyle = hasBomb ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 0, 0.1)';
          this.ctx.strokeStyle = hasBomb ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 0, 0.5)';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(x, y, 60, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // Draw label
          this.ctx.fillStyle = hasBomb ? '#f00' : '#ff0';
          this.ctx.font = 'bold 24px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(label, x, y);
          
          // Draw bomb if planted
          if (hasBomb && this.game.gameState.bomb_planted) {
            // Pulsing bomb indicator
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y + 30, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Timer
            if (this.game.gameState.bomb_timer) {
              this.ctx.fillStyle = '#fff';
              this.ctx.font = 'bold 16px monospace';
              this.ctx.fillText(this.game.gameState.bomb_timer + 's', x, y - 30);
            }
          }
        }
        
        drawPlayers() {
          Object.values(this.game.gameState.players).forEach(player => {
            if (!player.alive) return;
            if (!this.game.frustumCuller.isInView(player.x, player.y)) return;
            
            this.drawPlayer(player);
          });
        }
        
        drawPlayer(player) {
          const isLocal = player.id === this.game.playerId;
          const color = player.team === 'ct' ? '#5B9BD5' : '#FFA500';
          
          // Player shadow
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          this.ctx.beginPath();
          this.ctx.ellipse(player.x, player.y + 5, 18, 8, 0, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Player body
          this.ctx.fillStyle = isLocal ? '#0f0' : color;
          this.ctx.strokeStyle = isLocal ? '#fff' : '#000';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // Weapon direction
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(player.x, player.y);
          this.ctx.lineTo(
            player.x + Math.cos(player.angle || 0) * 25,
            player.y + Math.sin(player.angle || 0) * 25
          );
          this.ctx.stroke();
          
          // Player name
          if (!isLocal) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 25);
          }
          
          // Health bar
          if (!isLocal && player.health < 100) {
            const barWidth = 30;
            const barHeight = 4;
            
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth, barHeight);
            
            const healthColor = player.health > 66 ? '#0f0' : player.health > 33 ? '#fa0' : '#f00';
            this.ctx.fillStyle = healthColor;
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth * (player.health/100), barHeight);
          }
          
          // Bomb carrier indicator
          if (player.has_bomb) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText('💣', player.x, player.y + 30);
          }
          
          // Defuse kit indicator
          if (player.has_defuse_kit) {
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('🔧', player.x + 20, player.y);
          }
        }
        
        drawBullets() {
          // Draw bullet trails
          this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
          this.ctx.lineWidth = 1;
          
          this.bulletTrails.forEach((trail, index) => {
            const alpha = 1 - (Date.now() - trail.time) / 100;
            if (alpha <= 0) {
              this.bulletTrails.splice(index, 1);
              return;
            }
            
            this.ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.moveTo(trail.x1, trail.y1);
            this.ctx.lineTo(trail.x2, trail.y2);
            this.ctx.stroke();
          });
        }
        
        drawGrenades() {
          // Draw thrown grenades
          if (!this.game.gameState.grenades) return;
          
          this.game.gameState.grenades.forEach(grenade => {
            // Grenade body
            let color = '#888';
            if (grenade.type === 'flashbang') color = '#fff';
            else if (grenade.type === 'hegrenade') color = '#f00';
            else if (grenade.type === 'smokegrenade') color = '#888';
            
            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.arc(grenade.x, grenade.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Trail effect
            this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(grenade.x, grenade.y);
            this.ctx.lineTo(grenade.x - grenade.vx * 2, grenade.y - grenade.vy * 2);
            this.ctx.stroke();
          });
        }
        
        drawDroppedWeapons() {
          // Draw weapons on ground
          if (!this.game.gameState.dropped_weapons) return;
          
          this.game.gameState.dropped_weapons.forEach(weapon => {
            // Weapon box
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.strokeStyle = '#ff0';
            this.ctx.lineWidth = 2;
            
            this.ctx.fillRect(weapon.x - 15, weapon.y - 10, 30, 20);
            this.ctx.strokeRect(weapon.x - 15, weapon.y - 10, 30, 20);
            
            // Weapon name
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(weapon.weapon.toUpperCase(), weapon.x, weapon.y);
          });
        }
        
        drawEffects() {
          // Draw smoke clouds
          this.smokeClouds.forEach((smoke, index) => {
            const age = Date.now() - smoke.time;
            if (age > 15000) {
              this.smokeClouds.splice(index, 1);
              return;
            }
            
            const alpha = Math.min(1, age / 1000) * Math.max(0, 1 - age / 15000);
            const radius = 50 + age / 100;
            
            this.ctx.fillStyle = `rgba(128, 128, 128, ${alpha * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(smoke.x, smoke.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
          });
          
          // Draw blood splatters
          this.bloodSplatters.forEach((blood, index) => {
            const age = Date.now() - blood.time;
            if (age > 5000) {
              this.bloodSplatters.splice(index, 1);
              return;
            }
            
            const alpha = 1 - age / 5000;
            this.ctx.fillStyle = `rgba(150, 0, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(blood.x, blood.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
          });
        }
        
        drawCrosshair() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          const mouseX = this.game.input.mouseX;
          const mouseY = this.game.input.mouseY;
          
          this.ctx.strokeStyle = '#0f0';
          this.ctx.lineWidth = 2;
          
          // Draw crosshair lines
          this.ctx.beginPath();
          this.ctx.moveTo(mouseX - 15, mouseY);
          this.ctx.lineTo(mouseX - 5, mouseY);
          this.ctx.moveTo(mouseX + 5, mouseY);
          this.ctx.lineTo(mouseX + 15, mouseY);
          this.ctx.moveTo(mouseX, mouseY - 15);
          this.ctx.lineTo(mouseX, mouseY - 5);
          this.ctx.moveTo(mouseX, mouseY + 5);
          this.ctx.lineTo(mouseX, mouseY + 15);
          this.ctx.stroke();
        }
        
        drawMiniMap() {
          const mapSize = 150;
          const mapX = this.canvas.width - mapSize - 20;
          const mapY = 20;
          const scale = mapSize / 1280;
          
          // Background
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          this.ctx.fillRect(mapX, mapY, mapSize, mapSize * (720/1280));
          
          // Border
          this.ctx.strokeStyle = '#666';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(mapX, mapY, mapSize, mapSize * (720/1280));
          
          // Draw map features
          this.ctx.fillStyle = '#333';
          // Simplified walls on minimap
          const walls = [
            [400, 100, 80, 200],
            [800, 100, 80, 200],
            [300, 400, 200, 80],
            [780, 400, 200, 80],
            [590, 200, 100, 20],
            [590, 500, 100, 20],
            [640, 220, 20, 280]
          ];
          
          walls.forEach(wall => {
            this.ctx.fillRect(
              mapX + wall[0] * scale,
              mapY + wall[1] * scale,
              wall[2] * scale,
              wall[3] * scale
            );
          });
          
          // Draw bomb sites
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          this.ctx.beginPath();
          this.ctx.arc(mapX + 200 * scale, mapY + 200 * scale, 8, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#ff0';
          this.ctx.font = '10px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('A', mapX + 200 * scale, mapY + 200 * scale + 3);
          
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          this.ctx.beginPath();
          this.ctx.arc(mapX + 1080 * scale, mapY + 520 * scale, 8, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillText('B', mapX + 1080 * scale, mapY + 520 * scale + 3);
          
          // Draw players
          Object.values(this.game.gameState.players).forEach(player => {
            if (!player.alive) return;
            
            const isLocal = player.id === this.game.playerId;
            const color = isLocal ? '#0f0' : (player.team === 'ct' ? '#5B9BD5' : '#FFA500');
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(
              mapX + player.x * scale,
              mapY + player.y * scale,
              isLocal ? 4 : 3,
              0,
              Math.PI * 2
            );
            this.ctx.fill();
            
            // Draw view direction for local player
            if (isLocal) {
              this.ctx.strokeStyle = color;
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(mapX + player.x * scale, mapY + player.y * scale);
              this.ctx.lineTo(
                mapX + (player.x + Math.cos(player.angle || 0) * 50) * scale,
                mapY + (player.y + Math.sin(player.angle || 0) * 50) * scale
              );
              this.ctx.stroke();
            }
          });
          
          // Draw bomb if planted
          if (this.game.gameState.bomb_planted && this.game.gameState.bomb_position) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(
              mapX + this.game.gameState.bomb_position.x * scale,
              mapY + this.game.gameState.bomb_position.y * scale,
              5,
              0,
              Math.PI * 2
            );
            this.ctx.fill();
          }
        }
        
        drawFlashEffect() {
          if (this.flashAlpha > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.flashAlpha -= 0.02;
          }
        }
        
        flashEffect(intensity) {
          this.flashAlpha = intensity;
        }
        
        addSmoke(x, y) {
          this.smokeClouds.push({ x, y, time: Date.now() });
        }
        
        addBlood(x, y) {
          this.bloodSplatters.push({ x, y, time: Date.now() });
        }
        
        addBulletTrail(x1, y1, x2, y2) {
          this.bulletTrails.push({ x1, y1, x2, y2, time: Date.now() });
        }
      }
    JAVASCRIPT
  end
  
  def game_network_script
    <<~JAVASCRIPT
      class NetworkManager {
        constructor(game) {
          this.game = game;
        }
        
        sendEvent(type, data) {
          const element = document.getElementById('cs2d-container');
          if (element && element.live) {
            // Use the live instance attached to the element
            element.live.forward({
              type: type,
              ...data
            });
          } else {
            console.warn('Live.js not properly initialized on element');
          }
        }
        
        sendMovement(dx, dy) {
          this.sendEvent('player_move', { dx, dy });
        }
        
        sendShoot(angle) {
          this.sendEvent('player_shoot', { angle });
        }
        
        sendReload() {
          this.sendEvent('player_reload', {});
        }
        
        sendBuyWeapon(weapon) {
          this.sendEvent('buy_weapon', { weapon });
        }
        
        sendPlantBomb() {
          this.sendEvent('plant_bomb', {});
        }
        
        sendDefuseBomb() {
          this.sendEvent('defuse_bomb', {});
        }
        
        sendChat(message) {
          this.sendEvent('chat_message', { message });
        }
        
        sendThrowGrenade(type) {
          this.sendEvent('throw_grenade', { grenade_type: type });
        }
      }
    JAVASCRIPT
  end
  
  def game_audio_script
    <<~JAVASCRIPT
      class AudioManager {
        constructor(game) {
          this.game = game;
          this.sounds = {};
          this.loadSounds();
        }
        
        loadSounds() {
          const soundNames = [
            'shoot', 'reload', 'buy', 'death', 'bomb_plant', 
            'bomb_defuse', 'bomb_beep', 'bomb_explode', 
            'grenade_throw', 'flashbang', 'footstep'
          ];
          
          soundNames.forEach(name => {
            this.sounds[name] = new Audio(`/_static/sounds/${name}.mp3`);
            this.sounds[name].preload = 'auto';
          });
        }
        
        play(soundName) {
          if (this.sounds[soundName]) {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = 0.5;
            sound.play().catch(e => console.log('Audio play failed:', e));
          }
        }
        
        playFootstep() {
          // Play footstep with variation
          this.play('footstep');
        }
      }
    JAVASCRIPT
  end
  
  def game_input_script
    <<~JAVASCRIPT
      class InputManager {
        constructor(game) {
          this.game = game;
          this.keys = {};
          this.mouseX = 0;
          this.mouseY = 0;
          this.mouseDown = false;
          
          this.lastShootTime = 0;
          this.shootCooldown = 100;
          
          this.setupEventListeners();
        }
        
        setupEventListeners() {
          // Keyboard
          document.addEventListener('keydown', (e) => this.handleKeyDown(e));
          document.addEventListener('keyup', (e) => this.handleKeyUp(e));
          
          // Mouse
          this.game.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
          this.game.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
          this.game.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
          this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
          
          // Focus canvas
          this.game.canvas.focus();
        }
        
        handleKeyDown(e) {
          const key = e.key.toLowerCase();
          this.keys[key] = true;
          
          // Prevent default for game keys
          if (['w','a','s','d','b','t','tab','g','e','f'].includes(key)) {
            e.preventDefault();
          }
          
          // Handle specific keys
          switch(key) {
            case 'b':
              this.game.ui.toggleBuyMenu();
              break;
            case 't':
              this.game.ui.openChat();
              break;
            case 'tab':
              this.game.ui.showScoreboard();
              break;
            case 'r':
              this.game.network.sendReload();
              break;
            case 'g':
              this.game.network.sendEvent('drop_weapon', {});
              break;
            case 'e':
              this.tryPlantOrDefuse();
              break;
            case 'f':
              this.throwFlashbang();
              break;
            case '1':
            case '2':
            case '3':
              this.switchWeapon(parseInt(key) - 1);
              break;
          }
        }
        
        handleKeyUp(e) {
          const key = e.key.toLowerCase();
          this.keys[key] = false;
          
          if (key === 'tab') {
            this.game.ui.hideScoreboard();
          }
        }
        
        handleMouseMove(e) {
          const rect = this.game.canvas.getBoundingClientRect();
          const scaleX = this.game.canvas.width / rect.width;
          const scaleY = this.game.canvas.height / rect.height;
          
          this.mouseX = (e.clientX - rect.left) * scaleX;
          this.mouseY = (e.clientY - rect.top) * scaleY;
          
          // Update player angle
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (localPlayer && localPlayer.alive) {
            const dx = this.mouseX - localPlayer.x;
            const dy = this.mouseY - localPlayer.y;
            const angle = Math.atan2(dy, dx);
            
            this.game.network.sendEvent('player_angle', { angle });
          }
        }
        
        handleMouseDown(e) {
          if (e.button === 0) { // Left click
            this.mouseDown = true;
            this.shoot();
          } else if (e.button === 2) { // Right click
            // Secondary fire or scope
          }
        }
        
        handleMouseUp(e) {
          if (e.button === 0) {
            this.mouseDown = false;
          }
        }
        
        processInput(dt) {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          // Movement
          let dx = 0, dy = 0;
          const speed = 300 * dt; // pixels per second
          
          if (this.keys['w']) dy -= speed;
          if (this.keys['s']) dy += speed;
          if (this.keys['a']) dx -= speed;
          if (this.keys['d']) dx += speed;
          
          if (dx !== 0 || dy !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              dx = (dx / length) * speed;
              dy = (dy / length) * speed;
            }
            
            // Apply client prediction
            localPlayer.x += dx;
            localPlayer.y += dy;
            
            // Bounds checking
            localPlayer.x = Math.max(20, Math.min(1260, localPlayer.x));
            localPlayer.y = Math.max(20, Math.min(700, localPlayer.y));
            
            // Send to server
            this.game.network.sendMovement(dx, dy);
            
            // Play footstep sound
            if (Math.random() < 0.1) {
              this.game.audio.playFootstep();
            }
          }
          
          // Auto fire for certain weapons
          if (this.mouseDown) {
            const weapon = this.game.gameState.players[this.game.playerId].current_weapon;
            if (weapon && ['p90', 'mp5', 'ak47', 'm4a1'].includes(weapon)) {
              this.shoot();
            }
          }
        }
        
        shoot() {
          const now = Date.now();
          const localPlayer = this.game.gameState.players[this.game.playerId];
          
          if (!localPlayer || !localPlayer.alive) return;
          if (now - this.lastShootTime < this.shootCooldown) return;
          
          this.lastShootTime = now;
          
          const dx = this.mouseX - localPlayer.x;
          const dy = this.mouseY - localPlayer.y;
          const angle = Math.atan2(dy, dx);
          
          // Visual feedback
          this.game.renderer.addBulletTrail(
            localPlayer.x + Math.cos(angle) * 20,
            localPlayer.y + Math.sin(angle) * 20,
            localPlayer.x + Math.cos(angle) * 500,
            localPlayer.y + Math.sin(angle) * 500
          );
          
          this.game.network.sendShoot(angle);
        }
        
        tryPlantOrDefuse() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          if (localPlayer.team === 't' && localPlayer.has_bomb) {
            this.game.network.sendPlantBomb();
          } else if (localPlayer.team === 'ct' && this.game.gameState.bomb_planted) {
            this.game.network.sendDefuseBomb();
          }
        }
        
        throwFlashbang() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          if (localPlayer.grenades && localPlayer.grenades.includes('flashbang')) {
            this.game.network.sendThrowGrenade('flashbang');
          }
        }
        
        switchWeapon(index) {
          // Switch to weapon at index
        }
      }
    JAVASCRIPT
  end
  
  def game_ui_script
    <<~JAVASCRIPT
      class UIManager {
        constructor(game) {
          this.game = game;
          this.buyMenuOpen = false;
          this.scoreboardVisible = false;
          this.chatOpen = false;
        }
        
        update() {
          this.updateHUD();
          this.updateKillFeed();
        }
        
        updateHUD() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer) return;
          
          // Update health
          const healthBar = document.getElementById('health-bar');
          const healthText = document.getElementById('health-text');
          if (healthBar) healthBar.style.width = localPlayer.health + '%';
          if (healthText) healthText.textContent = localPlayer.health;
          
          // Update armor
          const armorBar = document.getElementById('armor-bar');
          const armorText = document.getElementById('armor-text');
          if (armorBar) armorBar.style.width = localPlayer.armor + '%';
          if (armorText) armorText.textContent = localPlayer.armor;
          
          // Update money
          const money = document.getElementById('money');
          if (money) money.textContent = '$' + localPlayer.money;
          
          // Update ammo
          const ammoDisplay = document.getElementById('ammo-display');
          if (ammoDisplay) {
            const weapon = #{WEAPONS.to_json}[localPlayer.current_weapon];
            if (weapon && weapon.ammo) {
              ammoDisplay.textContent = weapon.ammo + ' / ' + weapon.reserve;
            }
          }
          
          // Update weapon name
          const weaponName = document.getElementById('weapon-name');
          if (weaponName) {
            const weapon = #{WEAPONS.to_json}[localPlayer.current_weapon];
            if (weapon) weaponName.textContent = weapon.name;
          }
          
          // Update round timer
          const timer = document.getElementById('round-timer');
          if (timer) {
            const minutes = Math.floor(this.game.gameState.round_time / 60);
            const seconds = this.game.gameState.round_time % 60;
            timer.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
          }
          
          // Update scores
          const ctScore = document.getElementById('ct-score');
          const tScore = document.getElementById('t-score');
          if (ctScore) ctScore.textContent = 'CT: ' + this.game.gameState.ct_score;
          if (tScore) tScore.textContent = 'T: ' + this.game.gameState.t_score;
          
          // Update phase
          const phase = document.getElementById('game-phase');
          if (phase) {
            const phaseText = this.game.gameState.phase.replace('_', ' ');
            phase.textContent = phaseText.charAt(0).toUpperCase() + phaseText.slice(1);
          }
        }
        
        updateKillFeed() {
          const killFeed = document.getElementById('kill-feed');
          if (!killFeed) return;
          
          killFeed.innerHTML = '';
          this.game.gameState.kill_feed.forEach(entry => {
            const div = document.createElement('div');
            div.style.cssText = 'background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; margin-bottom: 5px; font-size: 14px; animation: slideIn 0.3s;';
            div.textContent = entry.message;
            killFeed.appendChild(div);
          });
        }
        
        toggleBuyMenu() {
          const menu = document.getElementById('buy-menu');
          if (!menu) return;
          
          if (this.game.gameState.phase !== 'buy_time') {
            return;
          }
          
          this.buyMenuOpen = !this.buyMenuOpen;
          menu.style.display = this.buyMenuOpen ? 'block' : 'none';
        }
        
        showScoreboard() {
          const scoreboard = document.getElementById('scoreboard');
          if (!scoreboard) return;
          
          this.scoreboardVisible = true;
          scoreboard.style.display = 'block';
          
          // Update player lists
          this.updateScoreboard();
        }
        
        hideScoreboard() {
          const scoreboard = document.getElementById('scoreboard');
          if (scoreboard) {
            scoreboard.style.display = 'none';
          }
          this.scoreboardVisible = false;
        }
        
        updateScoreboard() {
          const ctPlayers = document.getElementById('ct-players');
          const tPlayers = document.getElementById('t-players');
          
          if (ctPlayers) {
            ctPlayers.innerHTML = '';
            Object.values(this.game.gameState.players)
              .filter(p => p.team === 'ct')
              .forEach(player => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${player.name}</td>
                  <td style="text-align: center;">${player.kills}</td>
                  <td style="text-align: center;">${player.deaths}</td>
                  <td style="text-align: center;">${player.score}</td>
                `;
                ctPlayers.appendChild(row);
              });
          }
          
          if (tPlayers) {
            tPlayers.innerHTML = '';
            Object.values(this.game.gameState.players)
              .filter(p => p.team === 't')
              .forEach(player => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${player.name}</td>
                  <td style="text-align: center;">${player.kills}</td>
                  <td style="text-align: center;">${player.deaths}</td>
                  <td style="text-align: center;">${player.score}</td>
                `;
                tPlayers.appendChild(row);
              });
          }
        }
        
        openChat() {
          const chatInput = document.getElementById('chat-input');
          const chatMessages = document.getElementById('chat-messages');
          
          if (chatInput && chatMessages) {
            this.chatOpen = true;
            chatInput.style.display = 'block';
            chatMessages.style.display = 'block';
            chatInput.focus();
            
            chatInput.onkeydown = (e) => {
              if (e.key === 'Enter') {
                const message = chatInput.value.trim();
                if (message) {
                  this.game.network.sendChat(message);
                  chatInput.value = '';
                }
                this.closeChat();
              } else if (e.key === 'Escape') {
                this.closeChat();
              }
            };
          }
        }
        
        closeChat() {
          const chatInput = document.getElementById('chat-input');
          const chatMessages = document.getElementById('chat-messages');
          
          if (chatInput) {
            chatInput.style.display = 'none';
            chatInput.value = '';
          }
          if (chatMessages) {
            setTimeout(() => {
              chatMessages.style.display = 'none';
            }, 5000);
          }
          this.chatOpen = false;
        }
        
        addChatMessage(message) {
          const chatMessages = document.getElementById('chat-messages');
          if (!chatMessages) return;
          
          chatMessages.style.display = 'block';
          
          const div = document.createElement('div');
          const teamColor = message.team === 'ct' ? '#5B9BD5' : '#FFA500';
          div.style.cssText = 'margin-bottom: 5px;';
          div.innerHTML = `<span style="color: ${teamColor};">${message.player}:</span> <span style="color: white;">${message.message}</span>`;
          
          chatMessages.appendChild(div);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          // Auto hide after 10 seconds
          if (!this.chatOpen) {
            setTimeout(() => {
              if (!this.chatOpen) {
                chatMessages.style.display = 'none';
              }
            }, 10000);
          }
        }
      }
    JAVASCRIPT
  end
  
  def game_init_script
    <<~JAVASCRIPT
      // Initialize game when DOM is ready
      window.initCS2DGame = function(viewId, playerId) {
        console.log('Initializing CS2D with viewId:', viewId, 'playerId:', playerId);
        
        if (window.game) {
          window.game.running = false;
        }
        
        // Wait for Live.js to be properly initialized
        const element = document.getElementById('cs2d-container');
        if (!element || !element.live) {
          console.log('Waiting for Live.js initialization...');
          setTimeout(() => window.initCS2DGame(viewId, playerId), 100);
          return;
        }
        
        window.game = new CS2DGame(viewId, playerId);
        
        // Remove debug indicator
        const debugDiv = document.querySelector('div[style*="background: yellow"]');
        if (debugDiv) debugDiv.remove();
        
        console.log('CS2D initialized successfully with Live.js');
      };
      
      // Handle page visibility
      document.addEventListener('visibilitychange', () => {
        if (window.game) {
          if (document.hidden) {
            window.game.running = false;
          } else {
            window.game.running = true;
            window.game.lastTime = Date.now();
            window.game.gameLoop();
          }
        }
      });
    JAVASCRIPT
  end
end

Application = Lively::Application[CS2DView]