# frozen_string_literal: true

class Player
  attr_accessor :id, :name, :team, :x, :y, :health, :armor, :money
  attr_accessor :kills, :deaths, :last_update
  attr_reader :weapons, :current_weapon_index
  
  def initialize(id:, name:, team:, x: 0, y: 0)
    @id = id
    @name = name
    @team = team
    @x = x
    @y = y
    @health = 100
    @armor = 0
    @money = 800
    @kills = 0
    @deaths = 0
    @weapons = [default_weapon]
    @current_weapon_index = 0
    @last_shot_time = Time.now
    @ammo = { magazine: 30, reserve: 90 }
    @is_reloading = false
    @reload_start_time = nil
    @last_update = Time.now
  end
  
  def current_weapon
    @weapons[@current_weapon_index] || default_weapon
  end
  
  def default_weapon
    @team == :ct ? usp_weapon : glock_weapon
  end
  
  def glock_weapon
    {
      name: "Glock-18",
      damage: 28,
      rate: 0.15,
      magazine: 20,
      magazine_size: 20,
      reserve: 120,
      bullet_speed: 20,
      penetration: 1,
      reload_time: 2.2
    }
  end
  
  def usp_weapon
    {
      name: "USP-S",
      damage: 35,
      rate: 0.17,
      magazine: 12,
      magazine_size: 12,
      reserve: 72,
      bullet_speed: 20,
      penetration: 1,
      reload_time: 2.2
    }
  end
  
  def add_weapon(weapon_type)
    weapon_data = GameRoom::WEAPONS[weapon_type].dup
    weapon_data[:magazine] = weapon_data[:magazine]
    weapon_data[:magazine_size] = weapon_data[:magazine]
    weapon_data[:reserve] = weapon_data[:magazine] * 3
    weapon_data[:reload_time] = calculate_reload_time(weapon_type)
    
    # 替換主武器或副武器
    if primary_weapon?(weapon_type)
      @weapons[1] = weapon_data
      @current_weapon_index = 1
    else
      @weapons[0] = weapon_data
      @current_weapon_index = 0
    end
    
    @ammo = {
      magazine: weapon_data[:magazine],
      reserve: weapon_data[:reserve]
    }
  end
  
  def primary_weapon?(weapon_type)
    [:ak47, :m4a1, :awp, :mp5, :p90].include?(weapon_type)
  end
  
  def calculate_reload_time(weapon_type)
    case weapon_type
    when :awp then 3.7
    when :ak47, :m4a1 then 2.5
    when :mp5, :p90 then 2.3
    when :deagle then 2.2
    else 2.0
    end
  end
  
  def can_shoot?
    return false if dead?
    return false if @is_reloading
    return false if @ammo[:magazine] <= 0
    
    time_since_last_shot = Time.now - @last_shot_time
    time_since_last_shot >= current_weapon[:rate]
  end
  
  def shoot!
    return unless can_shoot?
    
    @ammo[:magazine] -= 1
    @last_shot_time = Time.now
    
    # 自動換彈
    reload! if @ammo[:magazine] <= 0 && @ammo[:reserve] > 0
  end
  
  def reload!
    return if @is_reloading
    return if @ammo[:magazine] >= current_weapon[:magazine_size]
    return if @ammo[:reserve] <= 0
    
    @is_reloading = true
    @reload_start_time = Time.now
    
    # 這裡應該要設定計時器，暫時簡化處理
    Thread.new do
      sleep(current_weapon[:reload_time])
      finish_reload
    end
  end
  
  def finish_reload
    return unless @is_reloading
    
    needed = current_weapon[:magazine_size] - @ammo[:magazine]
    available = [@ammo[:reserve], needed].min
    
    @ammo[:magazine] += available
    @ammo[:reserve] -= available
    @is_reloading = false
    @reload_start_time = nil
  end
  
  def take_damage(damage)
    # 護甲減傷
    if @armor > 0
      armor_absorbed = [damage * 0.5, @armor].min
      @armor -= armor_absorbed
      actual_damage = damage - armor_absorbed * 0.5
    else
      actual_damage = damage
    end
    
    @health = [@health - actual_damage, 0].max
    
    if dead?
      @deaths += 1
    end
  end
  
  def dead?
    @health <= 0
  end
  
  def reset_for_new_round
    @health = 100
    @armor = 0
    @weapons = [default_weapon]
    @current_weapon_index = 0
    @ammo = { magazine: 30, reserve: 90 }
    @is_reloading = false
    @reload_start_time = nil
    
    # 重生位置
    spawn_points = @team == :ct ? ct_spawn_points : t_spawn_points
    spawn = spawn_points.sample
    @x = spawn[:x]
    @y = spawn[:y]
  end
  
  def switch_weapon(index)
    return if @is_reloading
    return unless @weapons[index]
    
    @current_weapon_index = index
  end
  
  def buy_armor
    return false if @money < 650
    return false if @armor >= 100
    
    @money -= 650
    @armor = 100
    true
  end
  
  def buy_helmet
    return false if @money < 1000
    return false if @armor >= 100
    
    @money -= 1000
    @armor = 100
    true
  end
  
  def ammo_info
    {
      magazine: @ammo[:magazine],
      reserve: @ammo[:reserve],
      magazine_size: current_weapon[:magazine_size] || current_weapon[:magazine]
    }
  end
  
  def can_reload?
    !@is_reloading && @ammo[:magazine] < current_weapon[:magazine_size] && @ammo[:reserve] > 0
  end
  
  def has_defuse_kit
    # For now, CT players have 50% chance of having defuse kit
    @team == :ct && rand < 0.5
  end
  
  private
  
  def ct_spawn_points
    [
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 100, y: 150 },
      { x: 150, y: 150 },
      { x: 125, y: 125 }
    ]
  end
  
  def t_spawn_points
    [
      { x: 1100, y: 600 },
      { x: 1150, y: 600 },
      { x: 1100, y: 650 },
      { x: 1150, y: 650 },
      { x: 1125, y: 625 }
    ]
  end
end