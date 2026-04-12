# frozen_string_literal: true

require "io/event/priority_heap"

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

	# Entry for the A* priority heap. PriorityHeap requires elements to implement `<`.
	HeapEntry = Struct.new(:f, :q, :r) do
		def <(other) = f < other.f
		def >(other) = f > other.f
	end

	# Encode axial coords as a single Integer for fast hash keying (no Array allocation).
	# Supports q/r in [-500, 500].
	HEX_KEY_OFFSET = 500
	HEX_KEY_STRIDE = 1001
	def self.hex_key(q, r) = (q + HEX_KEY_OFFSET) * HEX_KEY_STRIDE + (r + HEX_KEY_OFFSET)

	# Tracks per-hex metadata: death counts, firewalls.
	class HexGrid
		attr_reader :death_counts

		DEATH_WEIGHT = 2.0 # extra A* cost per death on a tile
		DEATH_DECAY = 0.99999 # per-tick multiplier (~0.001% per second)

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
		# Returns [path, steps_expanded] where path is array of [world_x, world_y] waypoints.
		def find_path(from_x, from_y, to_x, to_y, max_steps: 200)
			start_q, start_r = Hex.to_hex(from_x, from_y)
			goal_q, goal_r = Hex.to_hex(to_x, to_y)

			return [[Hex.to_world(goal_q, goal_r)], 0] if start_q == goal_q && start_r == goal_r

			g_score = {}
			parent  = {}
			closed  = {}

			start_key = DataNexus.hex_key(start_q, start_r)
			goal_key  = DataNexus.hex_key(goal_q, goal_r)
			g_score[start_key] = 0.0
			parent[start_key]  = nil  # [parent_key, nq, nr] or nil for start

			heap = IO::Event::PriorityHeap.new
			heap.push(HeapEntry.new(Hex.distance(start_q, start_r, goal_q, goal_r).to_f, start_q, start_r))

			steps = 0
			while !heap.empty? && steps < max_steps
				steps += 1

				_f, cq, cr = heap.pop.deconstruct
				current_key = DataNexus.hex_key(cq, cr)
				next if closed.key?(current_key)
				closed[current_key] = true

				if current_key == goal_key
					# Reconstruct path from integer-keyed parent map.
					path = []
					node_key = current_key
					nq, nr = cq, cr
					loop do
						wx, wy = Hex.to_world(nq, nr)
						path.unshift([wx, wy])
						prev = parent[node_key]
						break if prev.nil?
						node_key, nq, nr = prev
					end
					path.shift if path.size > 1
					return [path, steps]
				end

				current_g = g_score[current_key]
				Hex::DIRECTIONS.each do |dq, dr|
					nq = cq + dq
					nr = cr + dr
					nkey = DataNexus.hex_key(nq, nr)
					next if closed.key?(nkey)

					tentative_g = current_g + tile_cost(nq, nr)
					ng = g_score[nkey]
					next if ng && tentative_g >= ng

					g_score[nkey] = tentative_g
					parent[nkey]  = [current_key, nq, nr]
					h = Hex.distance(nq, nr, goal_q, goal_r).to_f
					heap.push(HeapEntry.new(tentative_g + h, nq, nr))
				end
			end

			[nil, steps]
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
