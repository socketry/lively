# frozen_string_literal: true

class MVPBombSystem
  attr_reader :planted, :bomb_site, :bomb_timer, :planting_progress, :defusing_progress
  
  PLANT_TIME = 3.0
  DEFUSE_TIME = 10.0
  DEFUSE_TIME_WITH_KIT = 5.0
  BOMB_TIMER = 45.0
  EXPLOSION_RADIUS = 500
  
  def initialize(game_room)
    @game_room = game_room
    @planted = false
    @bomb_site = nil
    @bomb_position = { x: 0, y: 0 }
    @bomb_timer = 0
    
    @planting = false
    @planting_player = nil
    @planting_progress = 0
    
    @defusing = false
    @defusing_player = nil
    @defusing_progress = 0
  end
  
  def planted?
    @planted
  end
  
  def update(delta_time)
    # 更新安裝進度
    if @planting && @planting_player
      player = @game_room.players[@planting_player]
      if player && player.alive
        @planting_progress += delta_time
        if @planting_progress >= PLANT_TIME
          plant_bomb
        end
      else
        stop_planting
      end
    end
    
    # 更新拆彈進度
    if @defusing && @defusing_player
      player = @game_room.players[@defusing_player]
      if player && player.alive
        defuse_time = player.has_defuse_kit? ? DEFUSE_TIME_WITH_KIT : DEFUSE_TIME
        @defusing_progress += delta_time
        
        if @defusing_progress >= defuse_time
          defuse_bomb
        end
      else
        stop_defusing
      end
    end
    
    # 更新炸彈倒數
    if @planted
      @bomb_timer -= delta_time
      if @bomb_timer <= 0
        explode
      end
    end
  end
  
  def start_planting(player_id, site)
    return if @planted
    return unless site
    
    player = @game_room.players[player_id]
    return unless player && player.team == :t && player.alive
    
    @planting = true
    @planting_player = player_id
    @planting_progress = 0
    @bomb_site = site
  end
  
  def stop_planting
    @planting = false
    @planting_player = nil
    @planting_progress = 0
  end
  
  def start_defusing(player_id)
    return unless @planted
    
    player = @game_room.players[player_id]
    return unless player && player.team == :ct && player.alive
    
    # 檢查是否在炸彈附近
    distance = Math.sqrt(
      (player.x - @bomb_position[:x])**2 + 
      (player.y - @bomb_position[:y])**2
    )
    
    return if distance > 50
    
    @defusing = true
    @defusing_player = player_id
    @defusing_progress = 0
  end
  
  def stop_defusing
    @defusing = false
    @defusing_player = nil
    @defusing_progress = 0
  end
  
  def stop_action(player_id)
    stop_planting if @planting_player == player_id
    stop_defusing if @defusing_player == player_id
  end
  
  def can_defuse?(x, y)
    return false unless @planted
    
    distance = Math.sqrt(
      (x - @bomb_position[:x])**2 + 
      (y - @bomb_position[:y])**2
    )
    
    distance <= 50
  end
  
  def reset
    @planted = false
    @bomb_site = nil
    @bomb_position = { x: 0, y: 0 }
    @bomb_timer = 0
    
    stop_planting
    stop_defusing
  end
  
  def get_state
    {
      planted: @planted,
      bomb_site: @bomb_site,
      bomb_timer: @bomb_timer.to_i,
      bomb_position: @planted ? @bomb_position : nil,
      planting: @planting,
      planting_progress: @planting_progress / PLANT_TIME,
      defusing: @defusing,
      defusing_progress: @defusing ? calculate_defuse_progress : 0
    }
  end
  
  def explosion_damage(players)
    return unless @planted
    
    players.each_value do |player|
      next unless player.alive
      
      distance = Math.sqrt(
        (player.x - @bomb_position[:x])**2 + 
        (player.y - @bomb_position[:y])**2
      )
      
      if distance < EXPLOSION_RADIUS
        # 傷害根據距離遞減
        damage = (1.0 - distance / EXPLOSION_RADIUS) * 200
        player.take_damage(damage.to_i)
      end
    end
  end
  
  private
  
  def plant_bomb
    player = @game_room.players[@planting_player]
    return unless player
    
    @planted = true
    @bomb_position = { x: player.x, y: player.y }
    @bomb_timer = BOMB_TIMER
    
    stop_planting
    
    # T隊全體獲得炸彈安裝獎勵
    @game_room.players.each_value do |p|
      if p.team == :t
        p.money += 800
      end
    end
  end
  
  def defuse_bomb
    @game_room.on_bomb_defused(@defusing_player)
    reset
  end
  
  def explode
    @game_room.on_bomb_exploded
  end
  
  def calculate_defuse_progress
    player = @game_room.players[@defusing_player]
    return 0 unless player
    
    defuse_time = player.has_defuse_kit? ? DEFUSE_TIME_WITH_KIT : DEFUSE_TIME
    @defusing_progress / defuse_time
  end
end