# frozen_string_literal: true

module DataNexus
	class Enemy
		attr_reader :id, :x, :y, :hp, :max_hp, :type, :drops, :size, :color
		attr_accessor :target_x, :target_y
		
		PATH_RECALC_INTERVAL = 5.0 # seconds between path recalculations
		
		def initialize(type, x, y, wave_multiplier = 1.0)
			@id = SecureRandom.hex(4)
			@type = type
			defn = ENEMY_DEFS[type]
			@max_hp = (defn[:hp] * wave_multiplier).round
			@hp = @max_hp
			@speed = defn[:speed]
			@drops = defn[:reward].dup
			@color = defn[:color]
			@size = defn[:size]
			@shield = defn[:shield]
			@damage_resist = defn[:damage_resist]
			@x = x.to_f
			@y = y.to_f
			@target_x = 0.0
			@target_y = 0.0
			
			# Pathfinding state
			@path = nil # array of [wx, wy] waypoints
			@path_index = 0
			# Stagger initial recalc so a wave of enemies doesn't all A* on the same tick
			@path_timer = Random.rand * PATH_RECALC_INTERVAL
		end
		
		def alive?
			@hp > 0
		end
		
		def take_damage(amount, damage_type)
			resist = @damage_resist[damage_type] || 0.0
			actual = (amount * (1.0 - resist)).round
			@hp -= actual
			@hp = 0 if @hp < 0
			actual
		end
		
		# Compute or refresh the A* path toward the target.
		# Returns the number of A* steps expanded.
		def update_path(hex_grid)
			@path, steps = hex_grid.find_path(@x, @y, @target_x, @target_y)
			@path_index = 0
			@path_timer = 0.0
			steps
		end
		
		def architect?
			@type == :architect
		end
		
		def advance_path_timer(dt)
			@path_timer += dt
		end
		
		# Returns true if this enemy needs a path recalculation this tick.
		def path_due?
			@path.nil? || @path_timer >= PATH_RECALC_INTERVAL
		end
		
		def tick(dt, hex_grid: nil)
			return unless alive?
			
			if hex_grid
				advance_path_timer(dt)
				update_path(hex_grid) if path_due?
				hex_grid.reduce_deaths(@x, @y) if architect?
			end
			
			tick_move(dt)
		end
		
		# Movement only — called directly by the profiling path in GameWorld.
		def tick_move(dt)
			return unless alive?
			if @path && @path_index < @path.length
				wx, wy = @path[@path_index]
				dx = wx - @x
				dy = wy - @y
				dist = Math.sqrt(dx * dx + dy * dy)
				
				if dist < 5
					# Reached waypoint, advance to next
					@path_index += 1
					return
				end
				
				move = @speed * dt
				if move >= dist
					@x = wx
					@y = wy
					@path_index += 1
				else
					@x += (dx / dist) * move
					@y += (dy / dist) * move
				end
			else
				# No path or reached end of path — move directly toward target
				dx = @target_x - @x
				dy = @target_y - @y
				dist = Math.sqrt(dx * dx + dy * dy)
				return if dist < 5
				
				move = @speed * dt
				if move >= dist
					@x = @target_x
					@y = @target_y
				else
					@x += (dx / dist) * move
					@y += (dy / dist) * move
				end
			end
		end
		
		def distance_to(ox, oy)
			Math.sqrt((@x - ox) ** 2 + (@y - oy) ** 2)
		end
		
		def to_h
			{
				id: @id, type: @type.to_s, x: @x.round(1), y: @y.round(1),
				hp: @hp, max_hp: @max_hp, color: @color, size: @size,
			}
		end
	end
end
