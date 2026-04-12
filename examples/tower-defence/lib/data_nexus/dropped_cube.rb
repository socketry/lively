# frozen_string_literal: true

module DataNexus
	class DroppedCube
		attr_reader :id, :x, :y, :type, :count, :color

		ATTRACT_DRAG = 4.0  # velocity decay per second when attracted

		def initialize(type, count, x, y)
			@id = SecureRandom.hex(4)
			@type = type
			@count = count
			@x = x
			@y = y
			@vx = 0.0
			@vy = 0.0
			@color = CUBE_TYPES[type][:color]
			@age = 0.0
			@max_age = 30.0
		end

		# Apply an attraction impulse toward (tx, ty) scaled by strength.
		def attract(tx, ty, strength)
			@vx += (tx - @x) * strength
			@vy += (ty - @y) * strength
		end

		def tick(dt)
			# Integrate velocity
			@x += @vx * dt
			@y += @vy * dt

			# Exponential drag so cubes don't drift forever
			drag = Math.exp(-ATTRACT_DRAG * dt)
			@vx *= drag
			@vy *= drag

			@age += dt
			@age < @max_age
		end

		def to_h
			{id: @id, type: @type.to_s, x: @x.round(1), y: @y.round(1), count: @count, color: @color}
		end
	end
end
