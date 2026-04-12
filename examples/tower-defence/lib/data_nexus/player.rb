# frozen_string_literal: true

module DataNexus
	class Player
		ROTATION_SPEED = 240.0 # degrees / second
		THRUST = 600.0 # px / second²
		BRAKE = 800.0 # px / second² (retrograde)
		DRAG = 3.0 # friction coefficient — velocity decays by this factor per second
		MAX_SPEED = 300.0 # px / second (hard cap)

		PICKUP_RANGE = 20.0
		ATTRACT_RANGE = 150.0  # 3× pickup range — cubes are pulled in from here
		DEPOSIT_RANGE = 80.0
		UPGRADE_RANGE = 30.0
		MAX_CARRY = 30

		COLORS = %w[#00ffcc #ff00ff #00ccff #ffdd00 #ff6600 #88ff44 #ff4488 #44ffcc].freeze

		attr_reader :id, :x, :y, :vx, :vy, :color, :name, :inventory, :score, :level, :angle

		def initialize(id, x = 0.0, y = 0.0)
			@id = id
			@x = x.to_f
			@y = y.to_f
			@vx = 0.0
			@vy = 0.0
			@angle = 0.0 # degrees, 0 = up, clockwise
			@keys = {}
			@color = COLORS[id.bytes.sum % COLORS.size]
			@name = "Runner #{id[-4..].upcase}"
			@inventory = Hash.new(0)
			@score = 0
			@level = 1
		end

		def handle_key(key, down)
			@keys[key] = down
		end

		def max_carry
			MAX_CARRY + (@level - 1) * 2
		end

		def level_up!
			@level += 1
		end

		def carrying_total
			@inventory.values.sum
		end

		def add_cube(type, count = 1)
			space = max_carry - carrying_total
			actual = [count, space].min
			@inventory[type] += actual if actual > 0
			actual
		end

		def remove_cubes(type, count)
			actual = [@inventory[type], count].min
			@inventory[type] -= actual
			@inventory.delete(type) if @inventory[type] <= 0
			actual
		end

		def speed
			Math.sqrt(@vx ** 2 + @vy ** 2)
		end

		def tick(dt, speed_multiplier: 1.0)
			# Rotation
			@angle -= ROTATION_SPEED * dt if @keys["ArrowLeft"] || @keys["a"]
			@angle += ROTATION_SPEED * dt if @keys["ArrowRight"] || @keys["d"]

			# Thrust (forward in facing direction)
			if @keys["ArrowUp"] || @keys["w"]
				rad = @angle * Math::PI / 180.0
				thrust = THRUST * speed_multiplier
				@vx += Math.sin(rad) * thrust * dt
				@vy -= Math.cos(rad) * thrust * dt
			end

			# Brake (retrograde deceleration)
			if @keys["ArrowDown"] || @keys["s"]
				spd = speed
				if spd > 0
					brake = [BRAKE * dt, spd].min
					@vx -= (@vx / spd) * brake
					@vy -= (@vy / spd) * brake
				end
			end

			# Drag — always applies, bleeds off velocity over time
			drag_factor = Math.exp(-DRAG * dt)
			@vx *= drag_factor
			@vy *= drag_factor

			# Speed cap
			spd = speed
			max = MAX_SPEED * speed_multiplier
			if spd > max
				scale = max / spd
				@vx *= scale
				@vy *= scale
			end

			# Integrate position
			@x += @vx * dt
			@y += @vy * dt

			# Zero out tiny velocities (for stationary detection)
			if speed < 0.5
				@vx = 0.0
				@vy = 0.0
			end
		end

		def reset!
			@inventory.clear
			@score = 0
			@level = 1
		end

		def to_h
			{
				x: @x.round(1), y: @y.round(1),
				vx: @vx.round(1), vy: @vy.round(1),
				angle: @angle.round(1),
				speed: speed.round(1),
				color: @color, name: @name,
				score: @score, level: @level,
				inventory: @inventory.transform_keys(&:to_s),
				carrying: carrying_total,
				max_carry: max_carry,
			}
		end
	end
end
