# frozen_string_literal: true

module DataNexus
	class Tower
		attr_reader :pad_index, :type, :level, :x, :y
		attr_reader :upgrading, :upgrade_progress

		def initialize(pad_index, type, x, y)
			@pad_index = pad_index
			@type = type
			@level = 0
			@x = x
			@y = y
			@cooldown = 0.0
			@upgrading = false
			@upgrade_progress = 0.0

			apply_stats
		end

		def apply_stats
			defn = TOWER_DEFS[@type]
			base = {range: defn[:range], damage: defn[:damage], fire_rate: defn[:fire_rate]}
			(1..@level).each do |lvl|
				upg = defn[:upgrades][lvl]
				next unless upg
				base[:range] = upg[:range] if upg[:range]
				base[:damage] = upg[:damage] if upg[:damage]
				base[:fire_rate] = upg[:fire_rate] if upg[:fire_rate]
			end
			@range = base[:range]
			@damage = base[:damage]
			@fire_rate = base[:fire_rate]
			@damage_type = defn[:damage_type]
			@color = defn[:color]
		end

		# Total resources invested (build cost + all upgrade costs).
		def total_invested
			defn = TOWER_DEFS[@type]
			total = Hash.new(0)
			defn[:cost].each { |k, v| total[k] += v }
			(1..@level).each do |lvl|
				upg = defn[:upgrades][lvl]
				next unless upg
				upg[:cost].each { |k, v| total[k] += v }
			end
			total
		end

		# Resources returned on sell (80% of total invested).
		def sell_value
			total_invested.transform_values { |v| (v * 0.8).floor }
		end

		def upgrade_cost
			defn = TOWER_DEFS[@type]
			next_level = @level + 1
			upg = defn[:upgrades][next_level]
			upg ? upg[:cost] : nil
		end

		def can_upgrade?
			!upgrade_cost.nil? && !@upgrading
		end

		def begin_upgrade!
			return false if @upgrading || upgrade_cost.nil?
			@upgrading = true
			@upgrade_progress = 0.0
			true
		end

		def advance_upgrade!(dt, contributor_count = 1, time_multiplier: 1.0)
			return false unless @upgrading
			@upgrade_progress += dt * contributor_count
			if @upgrade_progress >= UPGRADE_TIME * time_multiplier
				@upgrading = false
				@upgrade_progress = 0.0
				@level += 1
				apply_stats
				true
			else
				false
			end
		end

		def set_level!(level)
			@level = level
			apply_stats
		end

		def cancel_upgrade!
			@upgrading = false
			@upgrade_progress = 0.0
		end

		def tick(dt, enemies, fire_rate_mult: 1.0, damage_mult: 1.0)
			@cooldown -= dt if @cooldown > 0
			return nil if @cooldown > 0

			target = enemies
				.select(&:alive?)
				.select { |e| e.distance_to(@x, @y) <= @range }
				.min_by { |e| e.distance_to(@x, @y) }

			return nil unless target

			@cooldown = 1.0 / (@fire_rate * fire_rate_mult)
			target.take_damage((@damage * damage_mult).round, @damage_type)

			{
				from_x: @x, from_y: @y,
				to_x: target.x, to_y: target.y,
				color: @color,
				killed: !target.alive?,
				target_id: target.id,
			}
		end

		def to_h
			h = {
				pad: @pad_index, type: @type.to_s, level: @level,
				x: @x, y: @y, range: @range, damage: @damage,
				fire_rate: @fire_rate, color: @color,
				damage_type: @damage_type.to_s,
				can_upgrade: can_upgrade?,
				upgrade_cost: upgrade_cost&.transform_keys(&:to_s),
				sell_value: sell_value.transform_keys(&:to_s),
			}
			if @upgrading
				h[:upgrading] = true
				h[:upgrade_progress] = @upgrade_progress.round(2)
				h[:upgrade_time] = UPGRADE_TIME
			end
			h
		end
	end
end
