# frozen_string_literal: true

require_relative "player"
require_relative "bullet"
require_relative "game_state"

class GameRoom
  attr_reader :players, :bullets, :game_state, :round_time, :scores
  
  def initialize
    @players = {}
    @bullets = []
    @game_state = GameState.new
    @round_time = 120 # 秒
    @scores = { ct: 0, t: 0 }
    @round_start_time = Time.now
    @map = load_map("de_dust2")
  end
  
  def add_player(player_id)
    @players[player_id] = Player.new(
      id: player_id,
      name: "Player#{player_id[0..4]}",
      team: @players.size.even? ? :ct : :t,
      x: rand(100..700),
      y: rand(100..500)
    )
  end
  
  def remove_player(player_id)
    @players.delete(player_id)
  end
  
  def update_player_position(player_id, dx, dy)
    return unless player = @players[player_id]
    return if player.dead?
    
    # 計算新位置
    new_x = player.x + dx
    new_y = player.y + dy
    
    # 檢查碰撞
    unless check_collision(new_x, new_y)
      player.x = new_x.clamp(20, 1260)
      player.y = new_y.clamp(20, 700)
    end
    
    player.last_update = Time.now
  end
  
  def player_shoot(player_id, angle)
    return unless player = @players[player_id]
    return if player.dead?
    return unless player.can_shoot?
    
    weapon = player.current_weapon
    
    # 創建子彈
    @bullets << Bullet.new(
      owner_id: player_id,
      x: player.x,
      y: player.y,
      angle: angle,
      damage: weapon[:damage],
      speed: weapon[:bullet_speed],
      penetration: weapon[:penetration]
    )
    
    player.shoot!
  end
  
  def player_reload(player_id)
    return unless player = @players[player_id]
    return if player.dead?
    
    player.reload!
  end
  
  def change_team(player_id, team)
    return unless player = @players[player_id]
    return unless [:ct, :t].include?(team.to_sym)
    
    player.team = team.to_sym
    player.reset_for_new_round
  end
  
  def buy_weapon(player_id, weapon_name)
    return unless player = @players[player_id]
    return if player.dead?
    return unless @game_state.buy_time?
    
    weapon_price = WEAPONS[weapon_name.to_sym][:price]
    
    if player.money >= weapon_price
      player.money -= weapon_price
      player.add_weapon(weapon_name.to_sym)
      true
    else
      false
    end
  end
  
  def broadcast_chat(player_id, message)
    return unless player = @players[player_id]
    
    {
      type: "chat",
      player_name: player.name,
      team: player.team,
      message: message[0..100] # 限制訊息長度
    }
  end
  
  def update_bullets
    @bullets.each do |bullet|
      bullet.update
      
      # 檢查子彈是否擊中玩家
      @players.each do |id, player|
        next if id == bullet.owner_id
        next if player.dead?
        
        if bullet.hits?(player.x, player.y, 15)
          player.take_damage(bullet.damage)
          
          # 擊殺獎勵
          if player.dead?
            killer = @players[bullet.owner_id]
            killer.money += 300 if killer
            killer.kills += 1 if killer
          end
          
          bullet.hit = true
        end
      end
    end
    
    # 移除已擊中或超出範圍的子彈
    @bullets.reject! { |b| b.hit || b.out_of_bounds? }
  end
  
  def update_round
    current_time = Time.now
    elapsed = current_time - @round_start_time
    @round_time = [120 - elapsed.to_i, 0].max
    
    # 檢查回合結束條件
    if @round_time <= 0 || team_eliminated?(:ct) || team_eliminated?(:t)
      end_round
    end
  end
  
  def team_eliminated?(team)
    @players.values.select { |p| p.team == team && !p.dead? }.empty?
  end
  
  def end_round
    # 計算獲勝隊伍
    if team_eliminated?(:t)
      @scores[:ct] += 1
      award_team_money(:ct, 3250)
      award_team_money(:t, 1400)
    elsif team_eliminated?(:ct)
      @scores[:t] += 1
      award_team_money(:t, 3250)
      award_team_money(:ct, 1400)
    else
      # 時間結束，CT 獲勝
      @scores[:ct] += 1
      award_team_money(:ct, 3250)
      award_team_money(:t, 1400)
    end
    
    start_new_round
  end
  
  def start_new_round
    @round_start_time = Time.now
    @bullets.clear
    
    @players.each do |_, player|
      player.reset_for_new_round
    end
    
    @game_state.start_buy_phase
  end
  
  def award_team_money(team, amount)
    @players.values.select { |p| p.team == team }.each do |player|
      player.money = [player.money + amount, 16000].min
    end
  end
  
  def players_data
    @players.transform_values do |player|
      {
        id: player.id,
        name: player.name,
        team: player.team,
        x: player.x,
        y: player.y,
        health: player.health,
        armor: player.armor,
        money: player.money,
        dead: player.dead?,
        weapon: player.current_weapon[:name]
      }
    end
  end
  
  def bullets_data
    @bullets.map do |bullet|
      {
        x: bullet.x,
        y: bullet.y,
        angle: bullet.angle
      }
    end
  end
  
  private
  
  def check_collision(x, y)
    # 簡單的邊界檢查，之後可以加入地圖牆壁碰撞
    false
  end
  
  def load_map(map_name)
    # 載入地圖資料
    {}
  end
  
  WEAPONS = {
    glock: { name: "Glock-18", price: 400, damage: 28, rate: 0.15, magazine: 20, bullet_speed: 20, penetration: 1 },
    usp: { name: "USP-S", price: 500, damage: 35, rate: 0.17, magazine: 12, bullet_speed: 20, penetration: 1 },
    deagle: { name: "Desert Eagle", price: 700, damage: 48, rate: 0.225, magazine: 7, bullet_speed: 25, penetration: 2 },
    ak47: { name: "AK-47", price: 2700, damage: 36, rate: 0.1, magazine: 30, bullet_speed: 22, penetration: 2 },
    m4a1: { name: "M4A1", price: 3100, damage: 33, rate: 0.09, magazine: 30, bullet_speed: 23, penetration: 2 },
    awp: { name: "AWP", price: 4750, damage: 115, rate: 1.45, magazine: 10, bullet_speed: 30, penetration: 3 },
    mp5: { name: "MP5", price: 1500, damage: 26, rate: 0.075, magazine: 30, bullet_speed: 20, penetration: 1 },
    p90: { name: "P90", price: 2350, damage: 26, rate: 0.07, magazine: 50, bullet_speed: 21, penetration: 1 }
  }.freeze
end