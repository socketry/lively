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
			DIRECTIONS.map{|dq, dr| [q + dq, r + dr]}
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
	
	# Encode axial coords as a single Integer for direct array indexing.
	# Supports q/r in [-500, 500]; covers any realistic game coordinate.
	HEX_KEY_OFFSET = 500
	HEX_KEY_STRIDE = 1001
	GRID_SIZE = HEX_KEY_STRIDE * HEX_KEY_STRIDE  # 1_002_001
	def self.hex_key(q, r) = (q + HEX_KEY_OFFSET) * HEX_KEY_STRIDE + (r + HEX_KEY_OFFSET)
	
	# Tracks per-hex metadata: death counts.
	class HexGrid
		DEATH_WEIGHT = 2.0   # extra A* cost per death on a tile
		DEATH_DECAY  = 0.99999 # per-tick decay (~0.001% per tick)
		
		# Weighted heuristic: values > 1.0 make the search greedier toward the
		# goal, expanding fewer nodes at the cost of path optimality. Enemies
		# only need a way to the core, not the globally cheapest route.
		HEURISTIC_WEIGHT = 2.0
		
		def initialize
			# Flat array indexed by hex_key — O(1) direct lookup, no allocation.
			@cells = Array.new(GRID_SIZE, 0.0)
			# Sparse index of cells with non-zero counts, used for iteration in
			# tick and snapshot so we never walk the full 1M-entry array.
			@active_keys = {}
		end
		
		def record_death(x, y, count = 1)
			q, r = Hex.to_hex(x, y)
			key = DataNexus.hex_key(q, r)
			@cells[key] += count
			@active_keys[key] = true
		end
		
		def death_count_at(q, r)
			@cells[DataNexus.hex_key(q, r)]
		end
		
		def reduce_deaths(x, y, amount = 2.0)
			q, r = Hex.to_hex(x, y)
			key = DataNexus.hex_key(q, r)
			v = @cells[key]
			return unless v > 0.0
			v = [v - amount, 0.0].max
			@cells[key] = v
			if v < 0.01
				@cells[key] = 0.0
				@active_keys.delete(key)
			end
		end
		
		def tile_cost(q, r)
			dc = @cells[DataNexus.hex_key(q, r)]
			dc > 0.0 ? 1.0 + dc * DEATH_WEIGHT : 1.0
		end
		
		# Decay all active death counts; prune cells that have faded out.
		def tick(dt)
			factor = DEATH_DECAY ** (dt * 20)
			@active_keys.delete_if do |key, _|
				v = @cells[key] * factor
				if v < 0.01
					@cells[key] = 0.0
					true
				else
					@cells[key] = v
					false
				end
			end
		end
		
		# A* pathfinding from world position to target world position.
		# Returns [path, steps_expanded] where path is array of [world_x, world_y] waypoints.
		#
		# Uses a weighted heuristic (HEURISTIC_WEIGHT) so the search is biased
		# toward the goal and expands fewer nodes. Paths may not be globally
		# optimal but are perfectly adequate for enemy navigation.
		#
		# Parent pointers are stored as plain Integer keys; q/r are decoded from
		# the key during reconstruction, eliminating one [Array] allocation per
		# improved node in the inner loop.
		#
		# Tile cost is inlined from @cells (the flat array) to avoid a method
		# call and a second hash lookup on every neighbour.
		def find_path(from_x, from_y, to_x, to_y, max_steps: 150)
			start_q, start_r = Hex.to_hex(from_x, from_y)
			goal_q, goal_r = Hex.to_hex(to_x, to_y)
			
			return [[Hex.to_world(goal_q, goal_r)], 0] if start_q == goal_q && start_r == goal_r
			
			g_score = {}
			parent  = {}  # child_key => parent_key (Integer → Integer, no Array)
			closed  = {}
			
			start_key = DataNexus.hex_key(start_q, start_r)
			goal_key  = DataNexus.hex_key(goal_q, goal_r)
			g_score[start_key] = 0.0
			parent[start_key]  = nil
			
			heap = IO::Event::PriorityHeap.new
			h0 = Hex.distance(start_q, start_r, goal_q, goal_r)
			heap.push(HeapEntry.new(h0 * HEURISTIC_WEIGHT, start_q, start_r))
			
			steps = 0
			while !heap.empty? && steps < max_steps
				steps += 1
				
				_f, cq, cr = heap.pop.deconstruct
				current_key = DataNexus.hex_key(cq, cr)
				next if closed.key?(current_key)
				closed[current_key] = true
				
				if current_key == goal_key
					# Decode q, r from each integer key as we walk back to start.
					# This avoids storing [key, q, r] tuples in the parent map.
					path = []
					node_key = current_key
					loop do
						nq = node_key / HEX_KEY_STRIDE - HEX_KEY_OFFSET
						nr = node_key % HEX_KEY_STRIDE - HEX_KEY_OFFSET
						wx, wy = Hex.to_world(nq, nr)
						path.unshift([wx, wy])
						prev_key = parent[node_key]
						break if prev_key.nil?
						node_key = prev_key
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
					
					# Inline tile cost: direct array lookup, no method call, no allocation.
					dc = @cells[nkey]
					step_cost = dc > 0.0 ? 1.0 + dc * DEATH_WEIGHT : 1.0
					
					tentative_g = current_g + step_cost
					ng = g_score[nkey]
					next if ng && tentative_g >= ng
					
					g_score[nkey] = tentative_g
					parent[nkey]  = current_key
					h = Hex.distance(nq, nr, goal_q, goal_r)
					heap.push(HeapEntry.new(tentative_g + h * HEURISTIC_WEIGHT, nq, nr))
				end
			end
			
			[nil, steps]
		end
		
		# Snapshot of death counts for rendering/debugging.
		# Iterates @active_keys only — never walks the full cells array.
		def death_counts_snapshot(threshold: 0.5)
			@active_keys.filter_map do |key, _|
				v = @cells[key]
				next unless v >= threshold
				q = key / HEX_KEY_STRIDE - HEX_KEY_OFFSET
				r = key % HEX_KEY_STRIDE - HEX_KEY_OFFSET
				wx, wy = Hex.to_world(q, r)
				{q: q, r: r, x: wx.round(1), y: wy.round(1), deaths: v.round(1)}
			end
		end
	end
end
