# frozen_string_literal: true

# Benchmarks for delta-channel state synchronisation.
#
# sync_channels() runs every tick and diffs all entity state into the DeltaLog
# channels so only changes get sent to clients. With many enemies it builds a
# large hash and compares it value-by-value. This benchmark measures that cost
# at varying entity counts.

require "sus/fixtures/benchmark"
require_relative "../../lib/data_nexus"

DT = DataNexus::TICK_RATE

# Build a GameWorld pre-populated with N enemies (no waves, just direct injection).
# Enemies are given absurd HP so they don't die during the benchmark.
def build_world(enemy_count:, player_count: 1, cube_count: 0)
	world = DataNexus::GameWorld.new

	player_count.times do |i|
		world.add_player("player_#{i}")
	end

	random = Random.new(42)
	enemy_count.times do |i|
		angle = i * Math::PI * 2.0 / enemy_count
		dist  = 600.0 + (i % 10) * 20.0
		e = DataNexus::Enemy.new(:drone, Math.cos(angle) * dist, Math.sin(angle) * dist)
		e.target_x = 0
		e.target_y = 0
		e.instance_variable_set(:@hp, 999_999) # keep alive throughout benchmark
		world.enemies << e
	end

	cube_count.times do |i|
		angle = random.rand * Math::PI * 2
		dist  = random.rand(100..500).to_f
		world.dropped_cubes << DataNexus::DroppedCube.new(
			:core, 1,
			Math.cos(angle) * dist,
			Math.sin(angle) * dist
		)
	end

	world
end

describe DataNexus::GameWorld do
	include Sus::Fixtures::Benchmark

	# ── Enemy count scaling ──────────────────────────────────────────────────

	[10, 50, 100, 200].each do |enemy_count|
		with "#{enemy_count} enemies, 1 player, no cubes" do
			let(:world) { build_world(enemy_count: enemy_count) }

			measure "sync_channels" do |repeats|
				repeats.times { world.send(:sync_channels) }
			end
		end
	end

	# ── Player count scaling ─────────────────────────────────────────────────

	[1, 4, 8].each do |player_count|
		with "100 enemies, #{player_count} players" do
			let(:world) { build_world(enemy_count: 100, player_count: player_count) }

			measure "sync_channels" do |repeats|
				repeats.times { world.send(:sync_channels) }
			end
		end
	end

	# ── Cube count scaling ───────────────────────────────────────────────────
	#
	# Cubes accumulate quickly after large waves. After a boss wave there could
	# be hundreds of uncollected drops on the field.

	[0, 50, 200, 500].each do |cube_count|
		with "100 enemies, 1 player, #{cube_count} cubes" do
			let(:world) { build_world(enemy_count: 100, cube_count: cube_count) }

			measure "sync_channels" do |repeats|
				repeats.times { world.send(:sync_channels) }
			end
		end
	end
end
