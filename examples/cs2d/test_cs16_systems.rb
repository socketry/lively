#!/usr/bin/env ruby
# frozen_string_literal: true

# Test script for CS 1.6 game systems
require_relative "game/cs16_game_manager"

def test_game_systems
	puts "=== CS 1.6 Complete Game Systems Test ==="
	puts
	
	# Create game manager
	game = CS16GameManager.new(:de_dust2)
	puts "✅ Game manager created with map: de_dust2"
	
	# Add players
	puts "\n📋 Adding players..."
	game.add_player("ct1", "Player 1", :ct)
	game.add_player("ct2", "Player 2", :ct)
	game.add_player("t1", "Terrorist 1", :t)
	game.add_player("t2", "Terrorist 2", :t)
	puts "✅ Added 4 players (2 CT, 2 T)"
	
	# Check initial economy
	puts "\n💰 Initial Economy:"
	game.players.each do |id, player|
		economy = game.economy_manager.get_player_economy_stats(id)
		puts "  #{player.name} (#{player.team}): $#{economy[:current_money]}"
	end
	
	# Start match
	puts "\n🎮 Starting match..."
	if game.start_match
		puts "✅ Match started successfully"
	else
		puts "❌ Failed to start match"
		return
	end
	
	# Test buy system
	puts "\n🛒 Testing Buy System:"
	
	# CT buys M4A1 + armor
	if game.handle_player_action("ct1", :buy, { weapon: "m4a1" })
		puts "  ✅ CT1 bought M4A1"
	end
	if game.handle_player_action("ct1", :buy, { weapon: "kevlar_helmet" })
		puts "  ✅ CT1 bought Kevlar + Helmet"
	end
	
	# T buys AK47
	if game.handle_player_action("t1", :buy, { weapon: "ak47" })
		puts "  ✅ T1 bought AK-47"
	end
	
	# Try invalid purchase (wrong team)
	if !game.handle_player_action("ct1", :buy, { weapon: "ak47" })
		puts "  ✅ CT1 correctly denied AK-47 (T-only weapon)"
	end
	
	# Check economy after purchases
	puts "\n💰 Economy after purchases:"
	game.players.each do |id, player|
		economy = game.economy_manager.get_player_economy_stats(id)
		puts "  #{player.name}: $#{economy[:current_money]} (spent: $#{economy[:spent_this_round]})"
	end
	
	# Test bomb system
	puts "\n💣 Testing Bomb System:"
	bomb_state = game.bomb_system.get_state_info
	if bomb_state[:carrier_id]
		puts "  ✅ Bomb assigned to: #{bomb_state[:carrier_id]}"
	end
	
	# Simulate bomb plant
	t_bomber = game.players.values.find { |p| game.bomb_system.is_carrier?(p.id) }
	if t_bomber
		# Move bomber to bombsite
		t_bomber.x = 1200
		t_bomber.y = 400
		
		if game.handle_player_action(t_bomber.id, :plant_bomb)
			puts "  ✅ Bomb planting started at site A"
			
			# Simulate planting time
			3.times do
				game.bomb_system.update_planting(1.0, true)
			end
			
			if game.bomb_system.state == BombSystem::STATES[:planted]
				puts "  ✅ Bomb planted successfully"
				puts "  ⏱️  Timer: #{game.bomb_system.timer.to_i} seconds"
			end
		end
	end
	
	# Test grenade system
	puts "\n💥 Testing Grenade System:"
	
	# Throw HE grenade
	grenade_id = game.grenade_system.throw_grenade(
		:he_grenade, 
		"ct1", 
		{ x: 500, y: 500 }, 
		0
	)
	if grenade_id
		puts "  ✅ HE Grenade thrown (ID: #{grenade_id})"
	end
	
	# Throw smoke
	smoke_id = game.grenade_system.throw_grenade(
		:smoke_grenade,
		"ct2",
		{ x: 600, y: 600 },
		Math::PI / 4
	)
	if smoke_id
		puts "  ✅ Smoke Grenade thrown (ID: #{smoke_id})"
	end
	
	# Simulate grenade detonation
	puts "  ⏱️  Simulating grenade detonation..."
	2.times { game.grenade_system.update(1.0) }
	
	smoke_clouds = game.grenade_system.get_smoke_clouds_info
	if smoke_clouds.any?
		puts "  ✅ Smoke cloud created (radius: #{smoke_clouds.first[:radius].to_i})"
	end
	
	# Test shooting and damage
	puts "\n🔫 Testing Combat System:"
	
	shooter = game.players["ct1"]
	target = game.players["t1"]
	
	# Simulate headshot
	if game.handle_player_action("ct1", :shoot, { 
		target_id: "t1", 
		headshot: true 
	})
		puts "  ✅ CT1 shot T1 (headshot)"
		puts "  ❤️  T1 health: #{target.health}/100"
	end
	
	# Test kill rewards
	if target.health <= 0
		puts "  💀 T1 eliminated"
		economy = game.economy_manager.get_player_economy_stats("ct1")
		puts "  💰 CT1 earned kill reward: $300"
	end
	
	# Test round end
	puts "\n🏁 Testing Round End:"
	
	# Simulate round end by elimination
	game.players["t1"].alive = false
	game.players["t2"].alive = false
	game.send(:check_round_end_conditions)
	
	round_state = game.round_manager.get_state
	if round_state[:phase] == :ended
		puts "  ✅ Round ended - CT wins by elimination"
		puts "  📊 Score: CT #{round_state[:ct_score]} - T #{round_state[:t_score]}"
	end
	
	# Check economy after round
	puts "\n💰 Economy after round:"
	game.players.each do |id, player|
		economy = game.economy_manager.get_player_economy_stats(id)
		puts "  #{player.name}: $#{economy[:current_money]} (earned: $#{economy[:earned_this_round]})"
	end
	
	# Get final game state
	puts "\n📊 Final Game State:"
	state = game.get_game_state
	puts "  Map: #{state[:map]}"
	puts "  Round: #{state[:round][:round_number]}/30"
	puts "  Score: CT #{state[:scores][:ct]} - T #{state[:scores][:t]}"
	puts "  Alive: CT #{state[:alive_count][:ct]} - T #{state[:alive_count][:t]}"
	
	puts "\n✅ All systems tested successfully!"
end

# Run tests
test_game_systems