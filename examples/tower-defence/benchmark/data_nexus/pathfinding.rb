# frozen_string_literal: true

# Benchmarks for HexGrid A* pathfinding — the primary known bottleneck.
#
# Enemies recalculate their path every PATH_RECALC_INTERVAL seconds (5s).
# At 20Hz that means a burst of recalcs hits on the same tick for any group
# of enemies that spawned together. This file isolates that cost so we can
# measure it independently of the rest of the tick.

require "sus/fixtures/benchmark"
require_relative "../../lib/data_nexus"

DT = DataNexus::TICK_RATE

describe DataNexus::HexGrid do
	include Sus::Fixtures::Benchmark

	let(:grid) { DataNexus::HexGrid.new }

	# ── Single path ──────────────────────────────────────────────────────────

	# Typical drone spawning just outside the near ring.
	measure "single path — short (200px)" do |repeats|
		repeats.times { grid.find_path(200, 0, 0, 0) }
	end

	# Typical path at maximum spawn distance (late game).
	measure "single path — long (800px)" do |repeats|
		repeats.times { grid.find_path(800, 0, 0, 0) }
	end

	# Diagonal worst-case: corner of the spawn ring to core.
	measure "single path — diagonal 800px" do |repeats|
		x = 800.0 / Math.sqrt(2)
		repeats.times { grid.find_path(x, x, 0, 0) }
	end

	# ── Death heatmap impact ─────────────────────────────────────────────────
	#
	# The heatmap adds extra A* cost to busy hexes, causing the pathfinder to
	# detour. Measure how much a populated heatmap affects path-find time.

	with "populated death heatmap" do
		before do
			# Seed a ring of death counts between spawn and core, as would
			# build up naturally during mid/late game waves.
			(-12..12).each do |q|
				(-12..12).each do |r|
					x, y = DataNexus::Hex.to_world(q, r)
					dist = Math.sqrt(x * x + y * y)
					grid.record_death(x, y, 8) if dist > 80 && dist < 650
				end
			end
		end

		measure "single path — long (800px, hot heatmap)" do |repeats|
			repeats.times { grid.find_path(800, 0, 0, 0) }
		end

		measure "single path — diagonal 800px, hot heatmap" do |repeats|
			x = 800.0 / Math.sqrt(2)
			repeats.times { grid.find_path(x, x, 0, 0) }
		end
	end

	# ── Batch pathfinding ────────────────────────────────────────────────────
	#
	# Simulates an entire wave's enemies all needing a path recalc on the same
	# tick — the realistic worst case. Each call uses a slightly different start
	# position (as enemies spread out over time).

	[10, 50, 100, 200].each do |count|
		measure "batch — #{count} enemies recalculating paths" do |repeats|
			# Pre-compute start positions so the measurement is pure pathfinding.
			origins = count.times.map do |i|
				angle = i * Math::PI * 2 / count
				dist  = 700 + (i % 5) * 30.0
				[Math.cos(angle) * dist, Math.sin(angle) * dist]
			end

			repeats.times do
				origins.each do |(x, y)|
					grid.find_path(x, y, 0, 0)
				end
			end
		end
	end
end
