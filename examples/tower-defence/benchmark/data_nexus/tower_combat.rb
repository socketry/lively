# frozen_string_literal: true

# Benchmarks for tower targeting and combat.
#
# Each tick every tower scans all enemies to find the nearest in range.
# That's O(towers × enemies) distance checks, every single tick. This
# benchmark isolates that work to see how it scales as both counts grow.

require "sus/fixtures/benchmark"
require_relative "../../lib/data_nexus"

DT = DataNexus::TICK_RATE

# Spawn N enemies distributed in a ring around the core, close enough that
# most towers will have targets in range.
def make_enemies(count, dist: 180)
	count.times.map do |i|
		angle = i * Math::PI * 2 / count
		e = DataNexus::Enemy.new(:drone, Math.cos(angle) * dist, Math.sin(angle) * dist)
		e.target_x = 0
		e.target_y = 0
		e
	end
end

# Build a full set of towers — pad count matches the game definition arrays.
def make_towers
	towers = {}
	(DataNexus::INNER_PADS + DataNexus::OUTER_PADS + DataNexus::FAR_PADS).each_with_index do |pad, i|
		towers[i] = DataNexus::Tower.new(i, :pulse, pad[:x], pad[:y])
	end
	towers
end

describe DataNexus::Tower do
	include Sus::Fixtures::Benchmark

	# ── Enemy count scaling (fixed tower count) ──────────────────────────────

	[10, 50, 100, 200].each do |enemy_count|
		with "#{enemy_count} enemies, full tower set" do
			let(:towers) { make_towers }
			let(:enemies) { make_enemies(enemy_count) }

			measure "tick_tower_combat" do |repeats|
				repeats.times do
					towers.each_value do |tower|
						tower.tick(DT, enemies,
							fire_rate_mult: 1.0,
							damage_mult:    1.0)
					end
				end
			end
		end
	end

	# ── Tower count scaling (fixed enemy count) ──────────────────────────────

	let(:enemies_100) { make_enemies(100) }

	with "inner pads only (#{DataNexus::INNER_PADS.size} towers)" do
		let(:towers) do
			DataNexus::INNER_PADS.each_with_index.to_h do |pad, i|
				[i, DataNexus::Tower.new(i, :pulse, pad[:x], pad[:y])]
			end
		end

		measure "tick_tower_combat" do |repeats|
			repeats.times do
				towers.each_value { |t| t.tick(DT, enemies_100, fire_rate_mult: 1.0, damage_mult: 1.0) }
			end
		end
	end

	with "inner + outer pads (#{(DataNexus::INNER_PADS + DataNexus::OUTER_PADS).size} towers)" do
		let(:towers) do
			(DataNexus::INNER_PADS + DataNexus::OUTER_PADS).each_with_index.to_h do |pad, i|
				[i, DataNexus::Tower.new(i, :pulse, pad[:x], pad[:y])]
			end
		end

		measure "tick_tower_combat" do |repeats|
			repeats.times do
				towers.each_value { |t| t.tick(DT, enemies_100, fire_rate_mult: 1.0, damage_mult: 1.0) }
			end
		end
	end

	with "all pads (#{(DataNexus::INNER_PADS + DataNexus::OUTER_PADS + DataNexus::FAR_PADS).size} towers)" do
		let(:towers) { make_towers }

		measure "tick_tower_combat" do |repeats|
			repeats.times do
				towers.each_value { |t| t.tick(DT, enemies_100, fire_rate_mult: 1.0, damage_mult: 1.0) }
			end
		end
	end
end
