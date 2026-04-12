# frozen_string_literal: true

module DataNexus
	# Pointy-top hex grid using axial coordinates (q, r).
	# Hex center to vertex distance = HEX_SIZE.
	#
	#   Width  = sqrt(3) * HEX_SIZE  ≈ 69px
	#   Height = 2 * HEX_SIZE        = 80px
	#
	# The data core sits at hex (0, 0) which maps to world origin (0, 0).
	module Hex
		HEX_SIZE = 40.0
		SQRT3 = Math.sqrt(3)

		# 6 axial neighbor offsets (pointy-top)
		DIRECTIONS = [
			[+1,  0], [+1, -1], [ 0, -1],
			[-1,  0], [-1, +1], [ 0, +1],
		].freeze

		# ── Coordinate conversion ────────────────────────────────────────

		def self.to_world(q, r)
			x = HEX_SIZE * (SQRT3 * q + SQRT3 / 2.0 * r)
			y = HEX_SIZE * (1.5 * r)
			[x, y]
		end

		def self.to_hex(x, y)
			q = (SQRT3 / 3.0 * x - 1.0 / 3.0 * y) / HEX_SIZE
			r = (2.0 / 3.0 * y) / HEX_SIZE
			hex_round(q, r)
		end

		# Round fractional axial coords to nearest hex.
		def self.hex_round(q, r)
			s = -q - r
			rq = q.round
			rr = r.round
			rs = s.round

			q_diff = (rq - q).abs
			r_diff = (rr - r).abs
			s_diff = (rs - s).abs

			if q_diff > r_diff && q_diff > s_diff
				rq = -rr - rs
			elsif r_diff > s_diff
				rr = -rq - rs
			end

			[rq, rr]
		end

		# Hex distance between two axial coordinates.
		def self.distance(q1, r1, q2, r2)
			((q1 - q2).abs + (q1 + r1 - q2 - r2).abs + (r1 - r2).abs) / 2
		end

		def self.neighbors(q, r)
			DIRECTIONS.map { |dq, dr| [q + dq, r + dr] }
		end

		# Corner vertices for rendering (pointy-top).
		def self.corners(cx, cy)
			(0...6).map do |i|
				angle = Math::PI / 180.0 * (60.0 * i - 30.0)
				[cx + HEX_SIZE * Math.cos(angle), cy + HEX_SIZE * Math.sin(angle)]
			end
		end
	end

	# Tracks per-hex metadata: death counts, firewalls.
	class HexGrid
		attr_reader :death_counts

		DEATH_WEIGHT = 2.0 # extra A* cost per death on a tile
		DEATH_DECAY = 0.995 # per-tick multiplier (slow decay)

		def initialize
			@death_counts = {} # [q, r] => float
		end

		def record_death(x, y, count = 1)
			q, r = Hex.to_hex(x, y)
			key = [q, r]
			@death_counts[key] = (@death_counts[key] || 0.0) + count
		end

		def death_count_at(q, r)
			@death_counts[[q, r]] || 0.0
		end

		def reduce_deaths(x, y, amount = 2.0)
			q, r = Hex.to_hex(x, y)
			key = [q, r]
			if @death_counts[key]
				@death_counts[key] = [@death_counts[key] - amount, 0.0].max
				@death_counts.delete(key) if @death_counts[key] < 0.01
			end
		end

		def tile_cost(q, r)
			1.0 + death_count_at(q, r) * DEATH_WEIGHT
		end

		# Decay death counts slowly each tick.
		def tick(dt)
			@death_counts.each do |key, count|
				@death_counts[key] = count * (DEATH_DECAY ** (dt * 20))
			end
			@death_counts.delete_if { |_, v| v < 0.01 }
		end

		# A* pathfinding from world position to target world position.
		# Returns array of [world_x, world_y] waypoints, or nil if no path.
		def find_path(from_x, from_y, to_x, to_y, max_steps: 200)
			start_q, start_r = Hex.to_hex(from_x, from_y)
			goal_q, goal_r = Hex.to_hex(to_x, to_y)

			return [Hex.to_world(goal_q, goal_r)] if start_q == goal_q && start_r == goal_r

			open_set = {} # [q,r] => {g:, f:, parent:}
			closed_set = {}

			start_key = [start_q, start_r]
			h = Hex.distance(start_q, start_r, goal_q, goal_r).to_f
			open_set[start_key] = {g: 0.0, f: h, parent: nil}

			steps = 0
			while !open_set.empty? && steps < max_steps
				steps += 1

				# Pick node with lowest f
				current_key, current = open_set.min_by { |_, v| v[:f] }
				cq, cr = current_key

				if cq == goal_q && cr == goal_r
					# Reconstruct path
					path = []
					node = current_key
					while node
						wx, wy = Hex.to_world(node[0], node[1])
						path.unshift([wx, wy])
						node = closed_set[node]&.[](:parent) || open_set[node]&.[](:parent)
					end
					# Skip the first waypoint (current position)
					path.shift if path.size > 1
					return path
				end

				open_set.delete(current_key)
				closed_set[current_key] = current

				Hex.neighbors(cq, cr).each do |nq, nr|
					nkey = [nq, nr]
					next if closed_set.key?(nkey)

					tentative_g = current[:g] + tile_cost(nq, nr)
					existing = open_set[nkey]

					if existing.nil? || tentative_g < existing[:g]
						h = Hex.distance(nq, nr, goal_q, goal_r).to_f
						open_set[nkey] = {g: tentative_g, f: tentative_g + h, parent: current_key}
					end
				end
			end

			# Fallback: no path found, go direct
			nil
		end

		# Snapshot of death counts for client rendering.
		# Only include tiles with significant death counts to keep payload small.
		def death_counts_snapshot(threshold: 0.5)
			@death_counts.select { |_, v| v >= threshold }.map do |key, count|
				wx, wy = Hex.to_world(key[0], key[1])
				{q: key[0], r: key[1], x: wx.round(1), y: wy.round(1), deaths: count.round(1)}
			end
		end
	end
end
