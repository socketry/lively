#!/usr/bin/env ruby
# frozen_string_literal: true

require "minitest/autorun"
require "minitest/spec"
require "json"
require "fiber"
require_relative "game/multiplayer_game_room"
require_relative "game/weapon_config"
require_relative "game/player"
require_relative "game/bullet"

# Mock view class for testing
class MockView
	attr_reader :messages_sent
		
	def initialize
		@messages_sent = []
	end
		
	def send_message(message)
		@messages_sent << message
	end
end

describe "CS2D Server-Side Tests" do
	describe "WeaponConfig" do
		it "should have balanced damage values" do
			# AK-47 should do more damage than M4A1
			ak_damage = WeaponConfig.calculate_damage("ak47", 100)
			m4_damage = WeaponConfig.calculate_damage("m4a1", 100)
						
			expect(ak_damage).must_be :>, m4_damage
						
			# AWP should be lethal with body shot
			awp_damage = WeaponConfig.calculate_damage("awp", 100)
			expect(awp_damage).must_be :>, 100
						
			# Pistols should not be overpowered
			glock_damage = WeaponConfig.calculate_damage("glock", 100)
			expect(glock_damage).must_be :<, 35
		end
				
		it "should apply distance falloff correctly" do
			# Damage should decrease with distance
			close_damage = WeaponConfig.calculate_damage("ak47", 100)
			far_damage = WeaponConfig.calculate_damage("ak47", 600)
						
			expect(close_damage).must_be :>, far_damage
		end
				
		it "should apply armor reduction correctly" do
			# Damage should be reduced with armor
			no_armor = WeaponConfig.calculate_damage("ak47", 100, 0)
			with_armor = WeaponConfig.calculate_damage("ak47", 100, 100)
						
			expect(no_armor).must_be :>, with_armor
		end
				
		it "should apply headshot multiplier correctly" do
			# Headshots should do more damage
			body_shot = WeaponConfig.calculate_damage("ak47", 100, 0, false)
			headshot = WeaponConfig.calculate_damage("ak47", 100, 0, true)
						
			expect(headshot).must_be :>, body_shot
		end
				
		it "should have reasonable movement speeds" do
			# Sniper rifles should be slowest
			sniper_speed = WeaponConfig.get_movement_speed("sniper")
			rifle_speed = WeaponConfig.get_movement_speed("rifle")
			pistol_speed = WeaponConfig.get_movement_speed("pistol")
						
			expect(pistol_speed).must_be :>, rifle_speed
			expect(rifle_speed).must_be :>, sniper_speed
		end
	end
		
	describe "MultiplayerGameRoom" do
		before do
			@room = MultiplayerGameRoom.new("test-room")
			@view1 = MockView.new
			@view2 = MockView.new
		end
				
		after do
			@room&.stop_game_loop
		end
				
		it "should create room with default settings" do
			expect(@room.room_id).must_equal "test-room"
			expect(@room.players).must_be_empty
			expect(@room.bullets).must_be_empty
		end
				
		it "should add players correctly" do
			result = @room.add_player("player1", @view1)
			expect(result).must_equal true
			expect(@room.players).must_include "player1"
		end
				
		it "should enforce max player limit" do
			# Add 10 players (max limit)
			10.times do |i|
				view = MockView.new
				result = @room.add_player("player#{i}", view)
				expect(result).must_equal true
			end
						
			# 11th player should be rejected
			view11 = MockView.new
			result = @room.add_player("player11", view11)
			expect(result).must_equal false
		end
				
		it "should auto-balance teams" do
			# Add 4 players
			views = Array.new(4) { MockView.new }
			4.times do |i|
				@room.add_player("player#{i}", views[i])
			end
						
			# Count players per team
			ct_count = @room.players.values.count { |p| p.team == "ct" }
			t_count = @room.players.values.count { |p| p.team == "t" }
						
			# Teams should be balanced (2v2)
			expect(ct_count).must_equal 2
			expect(t_count).must_equal 2
		end
				
		it "should process movement correctly" do
			@room.add_player("player1", @view1)
			player = @room.players["player1"]
			initial_x = player.x
			initial_y = player.y
						
			# Process movement input
			result = @room.process_movement("player1", { dx: 5, dy: 0 })
						
			expect(result[:success]).must_equal true
			expect(player.x).must_be :>, initial_x
			expect(player.y).must_equal initial_y
		end
				
		it "should handle shooting correctly" do
			@room.add_player("player1", @view1)
			player = @room.players["player1"]
						
			# Process shooting
			result = @room.process_shoot("player1", 0, Time.now.to_f * 1000)
						
			expect(result[:success]).must_equal true
			expect(@room.bullets.size).must_equal 1
						
			bullet = @room.bullets.first
			expect(bullet.x).must_equal player.x
			expect(bullet.y).must_equal player.y
		end
				
		it "should enforce shooting cooldown" do
			@room.add_player("player1", @view1)
						
			# First shot should succeed
			result1 = @room.process_shoot("player1", 0, Time.now.to_f * 1000)
			expect(result1[:success]).must_equal true
						
			# Immediate second shot should fail (cooldown)
			result2 = @room.process_shoot("player1", 0, Time.now.to_f * 1000)
			expect(result2[:success]).must_equal false
		end
				
		it "should update bullets correctly" do
			@room.add_player("player1", @view1)
						
			# Add a bullet manually for testing
			bullet = Bullet.new(100, 100, 5, 0, "player1", "ak47")
			@room.bullets << bullet
						
			initial_x = bullet.x
						
			# Update bullets (this should move them)
			@room.send(:update_bullets)
						
			expect(bullet.x).must_be :>, initial_x
		end
				
		it "should remove expired bullets" do
			bullet = Bullet.new(100, 100, 5, 0, "player1", "ak47")
			bullet.instance_variable_set(:@life, 0) # Expired bullet
			@room.bullets << bullet
						
			@room.send(:update_bullets)
						
			expect(@room.bullets).must_be_empty
		end
				
		it "should handle bullet-player collisions" do
			@room.add_player("player1", @view1)
			@room.add_player("player2", @view2)
						
			player1 = @room.players["player1"]
			player2 = @room.players["player2"]
						
			# Set player positions for collision
			player1.x = 100
			player1.y = 100
			player2.x = 120
			player2.y = 100
						
			# Create bullet traveling from player1 towards player2
			bullet = Bullet.new(110, 100, 5, 0, "player1", "ak47")
			@room.bullets << bullet
						
			initial_health = player2.health
						
			# Update bullets to trigger collision detection
			@room.send(:update_bullets)
						
			expect(player2.health).must_be :<, initial_health
		end
	end
		
	describe "Economy System" do
		before do
			@room = MultiplayerGameRoom.new("test-room")
			@view = MockView.new
		end
				
		after do
			@room&.stop_game_loop
		end
				
		it "should start players with correct money" do
			@room.add_player("player1", @view)
			player = @room.players["player1"]
						
			expect(player.money).must_equal WeaponConfig::ECONOMY[:starting_money]
		end
				
		it "should deduct money for purchases" do
			@room.add_player("player1", @view)
			player = @room.players["player1"]
			initial_money = player.money
						
			result = @room.buy_weapon("player1", "ak47")
			expect(result[:success]).must_equal true
						
			ak_cost = WeaponConfig.get_weapon("ak47")[:cost]
			expect(player.money).must_equal(initial_money - ak_cost)
		end
				
		it "should prevent purchases without enough money" do
			@room.add_player("player1", @view)
			player = @room.players["player1"]
			player.money = 100 # Not enough for AK-47
						
			result = @room.buy_weapon("player1", "ak47")
			expect(result[:success]).must_equal false
		end
				
		it "should award money for kills" do
			@room.add_player("player1", @view)
			@room.add_player("player2", @view)
						
			player1 = @room.players["player1"]
			initial_money = player1.money
						
			# Simulate kill
			@room.send(:handle_player_kill, "player1", "player2", "ak47")
						
			kill_reward = WeaponConfig.get_kill_reward("ak47")
			expect(player1.money).must_equal(initial_money + kill_reward)
		end
	end
		
	describe "Performance Stress Test" do
		it "should handle 10 simultaneous players" do
			room = MultiplayerGameRoom.new("stress-test")
			views = Array.new(10) { MockView.new }
						
			# Add 10 players
			players_added = 0
			10.times do |i|
				if room.add_player("stress_player_#{i}", views[i])
					players_added += 1
				end
			end
						
			expect(players_added).must_equal 10
			expect(room.players.size).must_equal 10
						
			# Simulate activity for all players
			start_time = Time.now
						
			# Move all players simultaneously
			room.players.keys.each do |player_id|
				room.process_movement(player_id, { dx: rand(-5..5), dy: rand(-5..5) })
			end
						
			# Shoot with half the players
			room.players.keys.first(5).each do |player_id|
				room.process_shoot(player_id, rand * Math::PI * 2, Time.now.to_f * 1000)
			end
						
			end_time = Time.now
			processing_time = end_time - start_time
						
			# Should process 10 players in less than 16ms (60 FPS target)
			expect(processing_time).must_be :<, 0.016
						
			room.stop_game_loop
		end
				
		it "should maintain performance with many bullets" do
			room = MultiplayerGameRoom.new("bullet-stress-test")
			view = MockView.new
			room.add_player("player1", view)
						
			# Create many bullets
			50.times do |i|
				bullet = Bullet.new(i * 10, 100, 5, 0, "player1", "ak47")
				room.bullets << bullet
			end
						
			start_time = Time.now
						
			# Update bullets
			room.send(:update_bullets)
						
			end_time = Time.now
			processing_time = end_time - start_time
						
			# Should update 50 bullets quickly
			expect(processing_time).must_be :<, 0.001 # 1ms
						
			room.stop_game_loop
		end
	end
		
	describe "Network Robustness" do
		before do
			@room = MultiplayerGameRoom.new("network-test")
			@view = MockView.new
		end
				
		after do
			@room&.stop_game_loop
		end
				
		it "should handle invalid player IDs gracefully" do
			# Try to process movement for non-existent player
			result = @room.process_movement("non_existent_player", { dx: 5, dy: 0 })
						
			expect(result[:success]).must_equal false
		end
				
		it "should handle malformed input gracefully" do
			@room.add_player("player1", @view)
						
			# Try malformed movement input
			result = @room.process_movement("player1", { invalid: "data" })
						
			expect(result[:success]).must_equal false
		end
				
		it "should handle excessive input rates" do
			@room.add_player("player1", @view)
						
			# Send 100 movement commands rapidly
			success_count = 0
			100.times do
				result = @room.process_movement("player1", { dx: 1, dy: 0 })
				success_count += 1 if result[:success]
			end
						
			# Should handle all inputs without crashing
			expect(success_count).must_be :>, 0
		end
	end
end

# Run the tests if this file is executed directly
if __FILE__ == $0
	puts "Running CS2D Server-Side Tests..."
	puts "Testing weapon balance, game mechanics, and performance..."
	puts "=" * 50
end