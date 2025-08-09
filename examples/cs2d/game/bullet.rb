# frozen_string_literal: true

class Bullet
  attr_accessor :x, :y, :hit
  attr_reader :id, :owner_id, :angle, :damage, :speed, :penetration
  
  def initialize(id: nil, owner_id:, x:, y:, angle:, damage:, speed:, penetration:)
    @id = id || "#{Time.now.to_i}_#{owner_id}_#{rand(1000)}"
    @owner_id = owner_id
    @x = x
    @y = y
    @angle = angle
    @damage = damage
    @speed = speed
    @penetration = penetration
    @hit = false
    @distance_traveled = 0
    @max_distance = 1000
  end
  
  def update
    # 更新子彈位置
    @x += Math.cos(@angle) * @speed
    @y += Math.sin(@angle) * @speed
    @distance_traveled += @speed
  end
  
  def hits?(target_x, target_y, radius)
    distance = Math.sqrt((target_x - @x) ** 2 + (target_y - @y) ** 2)
    distance <= radius
  end
  
  def out_of_bounds?
    @x < 0 || @x > 1280 || @y < 0 || @y > 720 || @distance_traveled > @max_distance
  end
end