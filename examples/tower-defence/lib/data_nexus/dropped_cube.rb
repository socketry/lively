# frozen_string_literal: true

module DataNexus
	class DroppedCube
		attr_reader :id, :x, :y, :type, :count, :color

		def initialize(type, count, x, y)
			@id = SecureRandom.hex(4)
			@type = type
			@count = count
			@x = x
			@y = y
			@color = CUBE_TYPES[type][:color]
			@age = 0.0
			@max_age = 30.0
		end

		def tick(dt)
			@age += dt
			@age < @max_age
		end

		def to_h
			{id: @id, type: @type.to_s, x: @x.round(1), y: @y.round(1), count: @count, color: @color}
		end
	end
end
