# frozen_string_literal: true

# End-to-end world tick benchmarks.
#
# Measures a complete GameWorld#tick(dt) at three game-state snapshots that
# represent different points in a typical session:
#
#   Early game  — wave ~5,  ~30 enemies, few towers
#   Mid game    — wave ~15, ~100 enemies, many towers, some cubes
#   Late game   — wave ~25, ~200 enemies, full towers, many cubes
#
# Each scenario is measured in two modes:
#
#   Normal tick        — enemy path timers not expired; A* is skipped.
#                        Reflects a steady-state tick: movement + combat + sync.
#                        A fresh world is built per sample; 10 ticks per sample
#                        amortises build cost while keeping enemies far from core.
#
#   Pathfinding burst  — every enemy needs a path recalc on this tick.
#                        Worst-case after a large wave spawns simultaneously.
#                        A fresh world is built per iteration (no path warm-up,
#                        so build cost is cheap object allocation only) and a
#                        single tick with full A* is measured.
#
# The 50ms tick budget (20Hz) is the reference ceiling for both modes.

require "sus/fixtures/benchmark"
require_relative "../../lib/data_nexus"

DT = DataNexus::TICK_RATE

# ── Helpers ────────────────────────────────────────────────────────────────

def build_scenario(enemy_count:, tower_count:, player_count: 2, cube_count: 0, warmup_paths: true)
	world = DataNexus::GameWorld.new
	
	player_count.times{|i| world.add_player("player#{i.to_s.rjust(4, '0')}")}
	
	# Populate towers across pads (world starts with 4 inner pulse towers).
	all_pads = DataNexus::INNER_PADS + DataNexus::OUTER_PADS + DataNexus::FAR_PADS
	types = %i[pulse thermal crypto disrupt]
	(4...tower_count).each do |i|
		pad = all_pads[i]
		break unless pad
		world.instance_variable_get(:@towers)[i] =
			DataNexus::Tower.new(i, types[i % types.size], pad[:x], pad[:y])
	end
	
	# Place a quarter of enemies close to the core (within inner tower range at
	# ~150px) so tower combat has realistic targets. The rest spawn at typical
	# wave distances. All have very high HP so they survive many ticks.
	near_count = enemy_count / 4
	far_count  = enemy_count - near_count
	
	near_count.times do |i|
		angle = i * Math::PI * 2.0 / [near_count, 1].max
		e = DataNexus::Enemy.new(:drone, Math.cos(angle) * 170, Math.sin(angle) * 170)
		e.target_x = 0; e.target_y = 0
		e.instance_variable_set(:@hp, 999_999)
		e.instance_variable_set(:@max_hp, 999_999)
		world.enemies << e
	end
	
	far_count.times do |i|
		angle = i * Math::PI * 2.0 / [far_count, 1].max
		dist  = 600.0 + (i % 8) * 25.0
		e = DataNexus::Enemy.new(
			%i[drone crawler phantom sentinel][i % 4],
			Math.cos(angle) * dist, Math.sin(angle) * dist
		)
		e.target_x = 0; e.target_y = 0
		e.instance_variable_set(:@hp, 999_999)
		e.instance_variable_set(:@max_hp, 999_999)
		world.enemies << e
	end
	
	# Drop resource cubes to exercise cube attraction + pickup checks.
	random = Random.new(99)
	cube_count.times do
		angle = random.rand * Math::PI * 2
		dist  = random.rand(80..500).to_f
		world.dropped_cubes << DataNexus::DroppedCube.new(
			:core, 1,
			Math.cos(angle) * dist, Math.sin(angle) * dist
		)
	end
	
	# Keep core alive so near-enemies don't trigger game over.
	world.instance_variable_set(:@core_hp, 999_999_999)
	
	# Pre-warm A* path caches for normal-tick scenarios so the measured ticks
	# don't include cold pathfinding startup. Skipped for pathfinding-burst
	# scenarios where we want paths to be stale.
	world.enemies.each{|e| e.update_path(world.hex_grid)} if warmup_paths
	
	world
end

# ── Scenarios ─────────────────────────────────────────────────────────────

SCENARIOS = {
	"early game (30 enemies, 4 towers)"   => { enemy_count: 30,  tower_count: 4,  cube_count: 20  },
	"mid game (100 enemies, 16 towers)"   => { enemy_count: 100, tower_count: 16, cube_count: 80  },
	"late game (200 enemies, 32 towers)"  => { enemy_count: 200, tower_count: 32, cube_count: 200 },
}.freeze

describe DataNexus::GameWorld do
	include Sus::Fixtures::Benchmark
	
	SCENARIOS.each do |label, opts|
		with label do
			# Normal tick: paths warm, A* not triggered.
			# Measures: movement + tower combat + cube attraction/pickup + sync.
			# Fresh world per sample; 10 ticks amortises build cost.
			# 10 × 0.05s = 0.5s game time, so enemies barely move toward core.
			measure "tick — normal (paths warm)" do |repeats|
				world = build_scenario(**opts, warmup_paths: true)
				repeats.exactly(10).times{world.tick(DT)}
			end
			
			# Pathfinding burst: every enemy runs A* this tick.
			# Fresh world per iteration with no path warm-up (build ≈ μs, A* ≈ ms).
			# Rebuild avoids state accumulation from repeated ticks of the same world.
			measure "tick — pathfinding burst (all #{opts[:enemy_count]} paths expired)" do |repeats|
				repeats.times do
					world = build_scenario(**opts, warmup_paths: false)
					world.tick(DT)
				end
			end
		end
	end
end
