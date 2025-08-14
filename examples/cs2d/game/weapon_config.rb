# frozen_string_literal: true

# Balanced weapon configuration for CS2D
# Values optimized for 60 FPS gameplay with 10 players
class WeaponConfig
	# Weapon definitions with balanced stats
	WEAPONS = {
			# Pistols
			"glock" => {
					name: "Glock-18",
					type: "pistol",
					cost: 200,
					damage: { base: 25, headshot_multiplier: 2.5, armor_reduction: 0.75 },  # CS 1.6 authentic damage
					firerate: 400, # ms between shots (higher = slower)
					accuracy: { standing: 0.85, moving: 0.65, crouching: 0.95 },
					recoil: { pattern: [0.2, 0.3, 0.4, 0.5], recovery: 0.8 },
					ammo: { magazine: 20, reserve: 120, reload_time: 2200 },
					range: { effective: 300, max: 500 },
					movement_speed_multiplier: 1.0,  # CS 1.6: pistols = 250 units/sec
					penetration_power: 1,
					kill_reward: 600
			},
			
			"usp" => {
					name: "USP-S",
					type: "pistol",
					cost: 200,
					damage: { base: 34, headshot_multiplier: 2.5, armor_reduction: 0.75 },
					firerate: 350,
					accuracy: { standing: 0.90, moving: 0.70, crouching: 0.98 },
					recoil: { pattern: [0.15, 0.25, 0.35, 0.45], recovery: 0.9 },
					ammo: { magazine: 12, reserve: 100, reload_time: 2500 },
					range: { effective: 350, max: 550 },
					movement_speed_multiplier: 1.0,  # CS 1.6: pistols = 250 units/sec
					penetration_power: 1,
					kill_reward: 600
			},
			
			"deagle" => {
					name: "Desert Eagle",
					type: "pistol",
					cost: 650,  # CS 1.6 authentic price
					damage: { base: 54, headshot_multiplier: 2.5, armor_reduction: 0.85 },  # CS 1.6 authentic damage
					firerate: 267,
					accuracy: { standing: 0.75, moving: 0.40, crouching: 0.85 },
					recoil: { pattern: [0.8, 1.2, 1.5, 1.8], recovery: 0.6 },
					ammo: { magazine: 7, reserve: 35, reload_time: 2200 },
					range: { effective: 400, max: 600 },
					movement_speed_multiplier: 1.0,  # CS 1.6: Desert Eagle = 250 units/sec (pistol)
					penetration_power: 2,
					kill_reward: 300
			},
			
			# SMGs
			"mp5" => {
					name: "MP5-SD",
					type: "smg",
					cost: 1500,
					damage: { base: 26, headshot_multiplier: 2.0, armor_reduction: 0.6 },
					firerate: 80,
					accuracy: { standing: 0.70, moving: 0.85, crouching: 0.80 },
					recoil: { pattern: [0.2, 0.25, 0.3, 0.35, 0.4], recovery: 0.85 },
					ammo: { magazine: 30, reserve: 120, reload_time: 2600 },
					range: { effective: 200, max: 400 },
					movement_speed_multiplier: 1.0,  # CS 1.6: SMGs = 250 units/sec
					penetration_power: 1,
					kill_reward: 600
			},
			
			# Rifles
			"ak47" => {
					name: "AK-47",
					type: "rifle",
					cost: 2500,  # CS 1.6 authentic price
					damage: { base: 36, headshot_multiplier: 2.5, armor_reduction: 0.9 },
					firerate: 100,
					accuracy: { standing: 0.75, moving: 0.45, crouching: 0.85 },
					recoil: { pattern: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], recovery: 0.7 },
					ammo: { magazine: 30, reserve: 90, reload_time: 2500 },
					range: { effective: 500, max: 800 },
					movement_speed_multiplier: 0.86,  # CS 1.6: rifles = 215 units/sec
					penetration_power: 2.5,
					kill_reward: 300
			},
			
			"m4a1" => {
					name: "M4A1-S",
					type: "rifle",
					cost: 3100,
					damage: { base: 33, headshot_multiplier: 2.5, armor_reduction: 0.9 },
					firerate: 90,
					accuracy: { standing: 0.80, moving: 0.50, crouching: 0.90 },
					recoil: { pattern: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], recovery: 0.75 },
					ammo: { magazine: 25, reserve: 75, reload_time: 3100 },
					range: { effective: 550, max: 850 },
					movement_speed_multiplier: 0.86,  # CS 1.6: rifles = 215 units/sec
					penetration_power: 2.5,
					kill_reward: 300
			},
			
			# Sniper Rifles
			"awp" => {
					name: "AWP",
					type: "sniper",
					cost: 4750,
					damage: { base: 115, headshot_multiplier: 1.0, armor_reduction: 0.95 },
					firerate: 1470,
					accuracy: { standing: 0.99, moving: 0.20, crouching: 0.99 },
					recoil: { pattern: [1.5], recovery: 0.5 },
					ammo: { magazine: 10, reserve: 30, reload_time: 3700 },
					range: { effective: 1000, max: 1200 },
					movement_speed_multiplier: 0.60,  # CS 1.6: AWP = 150 units/sec
					penetration_power: 3,
					kill_reward: 100
			},
			
			# Equipment
			"armor" => {
					name: "Kevlar Vest",
					type: "equipment",
					cost: 650,
					armor_value: 100,
					damage_reduction: 0.5
			},
			
			"armor_helmet" => {
					name: "Kevlar + Helmet",
					type: "equipment",
					cost: 1000,
					armor_value: 100,
					damage_reduction: 0.5,
					headshot_protection: true
			},
			
			"defuse_kit" => {
					name: "Defuse Kit",
					type: "equipment",
					cost: 200,  # CS 1.6 authentic price
					defuse_time_reduction: 5000 # 5 seconds faster
			},
			
			# Grenades
			"he_grenade" => {
					name: "HE Grenade",
					type: "grenade",
					cost: 300,
					damage: { base: 99, max_range: 100, min_range: 300 },
					throw_velocity: 15
			},
			
			"smoke_grenade" => {
					name: "Smoke Grenade",
					type: "grenade",
					cost: 300,
					duration: 18000, # 18 seconds
					radius: 150
			},
			
			"flashbang" => {
					name: "Flashbang",
					type: "grenade",
					cost: 200,
					duration: 5000, # 5 seconds max blind
					max_range: 200
			}
	}.freeze
		
	# Economy configuration
	ECONOMY = {
			starting_money: 800,
			max_money: 16000,
			round_loss_bonus: [1400, 1900, 2400, 2900, 3400],
			round_win_bonus: {
					elimination: 3250,
					time_expire: 3250,
					bomb_explosion: 3500,
					bomb_defused: 3500
			},
			consecutive_loss_bonus_cap: 3400
	}.freeze
		
	# Movement speed configuration (CS 1.6 authentic values)
	MOVEMENT_SPEEDS = {
			base_speed: 250.0,  # CS 1.6 authentic base speed (units/second)
			crouch_multiplier: 0.34,  # CS 1.6 authentic crouch speed
			walk_multiplier: 0.52,    # CS 1.6 authentic walk speed
			weapon_speed_multipliers: {
					"knife" => 1.0,      # 250 units/sec
					"pistol" => 1.0,     # 250 units/sec
					"smg" => 1.0,        # 250 units/sec
					"rifle" => 0.86,     # 215 units/sec (CS 1.6 authentic)
					"sniper" => 0.60,    # 150 units/sec (CS 1.6 authentic)
					"grenade" => 1.0     # 250 units/sec
			}
	}.freeze
		
	def self.get_weapon(weapon_name)
		WEAPONS[weapon_name&.downcase] || WEAPONS["glock"]
	end
		
	def self.calculate_damage(weapon, distance, armor = 0, headshot = false)
		weapon_stats = get_weapon(weapon)
		base_damage = weapon_stats[:damage][:base]
			
		# Distance falloff
		effective_range = weapon_stats[:range][:effective]
		max_range = weapon_stats[:range][:max]
			
		damage_multiplier = if distance <= effective_range
			1.0
		elsif distance >= max_range
			0.5
		else
			1.0 - (0.5 * (distance - effective_range) / (max_range - effective_range))
		end
			
		damage = base_damage * damage_multiplier
			
		# Armor reduction
		if armor > 0
			armor_multiplier = weapon_stats[:damage][:armor_reduction]
			damage = damage * armor_multiplier
		end
			
		# Headshot multiplier
		if headshot
			headshot_multiplier = weapon_stats[:damage][:headshot_multiplier]
			damage = damage * headshot_multiplier
		end
			
		damage.round
	end
		
	def self.get_movement_speed(weapon_type, base_speed = MOVEMENT_SPEEDS[:base_speed])
		multiplier = MOVEMENT_SPEEDS[:weapon_speed_multipliers][weapon_type] || 1.0
		base_speed * multiplier
	end
		
	def self.get_kill_reward(weapon_name)
		weapon_stats = get_weapon(weapon_name)
		weapon_stats[:kill_reward] || 300
	end
	
	# CS 1.6 Team Weapon Restrictions
	def self.can_buy_weapon?(weapon_name, team)
		weapon_name = weapon_name&.downcase
		
		# Team-specific weapons (CS 1.6 authentic restrictions)
		ct_only_weapons = %w[m4a1 m4a4 famas tmp mp5 fiveseven]
		t_only_weapons = %w[ak47 galil mac10]
		
		case team&.to_s&.downcase
		when "ct", "counter-terrorist"
			return false if t_only_weapons.include?(weapon_name)
		when "t", "terrorist"  
			return false if ct_only_weapons.include?(weapon_name)
		else
			return false  # Invalid team
		end
		
		# Check if weapon exists
		WEAPONS.key?(weapon_name)
	end
	
	def self.get_team_weapons(team)
		case team&.to_s&.downcase
		when "ct", "counter-terrorist"
			WEAPONS.reject { |name, _| %w[ak47 galil mac10].include?(name) }
		when "t", "terrorist"
			WEAPONS.reject { |name, _| %w[m4a1 m4a4 famas tmp mp5 fiveseven].include?(name) }
		else
			{}
		end
	end
end