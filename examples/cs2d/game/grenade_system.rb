# frozen_string_literal: true

# CS 1.6 Grenade System
# Handles HE grenades, flashbangs, and smoke grenades
class GrenadeSystem
	
	# CS 1.6 authentic grenade properties
	GRENADE_CONFIG = {
		he_grenade: {
			name: "HE Grenade",
			price: 300,
			max_carry: 1,
			fuse_time: 1.5,           # Time until detonation after throw
			damage: {
				max: 98,                # Max damage at center
				radius: 350,            # Damage radius in units
				armor_penetration: 0.5  # How much goes through armor
			},
			throw_velocity: 750,       # Initial throw speed
			bounce_damping: 0.45,      # Velocity reduction on bounce
			gravity: 800               # Gravity acceleration
		},
		
		flashbang: {
			name: "Flashbang",
			price: 200,
			max_carry: 2,
			fuse_time: 1.5,
			effect: {
				max_blind_time: 5.0,    # Max blind duration
				max_radius: 1500,        # Max effect radius
				full_blind_radius: 200,  # Full blind if looking at it within this radius
				through_walls: false     # Can't blind through walls
			},
			throw_velocity: 750,
			bounce_damping: 0.45,
			gravity: 800
		},
		
		smoke_grenade: {
			name: "Smoke Grenade",
			price: 300,
			max_carry: 1,
			fuse_time: 1.5,
			effect: {
				duration: 18.0,          # Smoke duration
				radius: 150,             # Smoke cloud radius
				expand_time: 0.5,        # Time to fully expand
				particles: 50            # Number of smoke particles
			},
			throw_velocity: 750,
			bounce_damping: 0.45,
			gravity: 800
		}
	}.freeze
	
	def initialize
		@active_grenades = []
		@smoke_clouds = []
		@grenade_id_counter = 0
	end
	
	def throw_grenade(type, thrower_id, position, angle, velocity_multiplier = 1.0)
		config = GRENADE_CONFIG[type]
		return nil unless config
		
		@grenade_id_counter += 1
		
		# Calculate initial velocity based on throw angle
		base_velocity = config[:throw_velocity] * velocity_multiplier
		velocity = {
			x: Math.cos(angle) * base_velocity,
			y: Math.sin(angle) * base_velocity,
			z: 200  # Slight upward arc
		}
		
		grenade = {
			id: @grenade_id_counter,
			type: type,
			thrower_id: thrower_id,
			position: position.dup,
			velocity: velocity,
			fuse_timer: config[:fuse_time],
			bounces: 0,
			detonated: false,
			created_at: Time.now.to_f
		}
		
		@active_grenades << grenade
		grenade[:id]
	end
	
	def update(delta_time)
		update_active_grenades(delta_time)
		update_smoke_clouds(delta_time)
		check_detonations
	end
	
	def get_he_damage(player_position, obstacles = [])
		total_damage = 0
		
		@active_grenades.each do |grenade|
			next unless grenade[:type] == :he_grenade
			next unless grenade[:detonated]
			
			damage = calculate_he_damage(grenade[:position], player_position, obstacles)
			total_damage += damage if damage > 0
		end
		
		total_damage
	end
	
	def get_flash_effect(player_position, player_angle, obstacles = [])
		max_effect = 0
		
		@active_grenades.each do |grenade|
			next unless grenade[:type] == :flashbang
			next unless grenade[:detonated]
			
			effect = calculate_flash_effect(
				grenade[:position], 
				player_position, 
				player_angle, 
				obstacles
			)
			max_effect = effect if effect > max_effect
		end
		
		max_effect
	end
	
	def is_in_smoke?(position)
		@smoke_clouds.any? do |smoke|
			distance = calculate_distance(position, smoke[:position])
			distance <= smoke[:current_radius]
		end
	end
	
	def get_visibility_through_smoke(from_pos, to_pos)
		# Check if line of sight passes through smoke
		@smoke_clouds.each do |smoke|
			if line_intersects_circle?(from_pos, to_pos, smoke[:position], smoke[:current_radius])
				return 0.1  # 10% visibility through smoke
			end
		end
		
		1.0  # Full visibility
	end
	
	def get_active_grenades_info
		@active_grenades.map do |grenade|
			{
				id: grenade[:id],
				type: grenade[:type],
				position: grenade[:position],
				fuse_timer: grenade[:fuse_timer],
				detonated: grenade[:detonated]
			}
		end
	end
	
	def get_smoke_clouds_info
		@smoke_clouds.map do |smoke|
			{
				id: smoke[:id],
				position: smoke[:position],
				radius: smoke[:current_radius],
				time_remaining: smoke[:duration]
			}
		end
	end
	
	private
	
	def update_active_grenades(delta_time)
		@active_grenades.each do |grenade|
			next if grenade[:detonated]
			
			config = GRENADE_CONFIG[grenade[:type]]
			
			# Update physics
			update_grenade_physics(grenade, config, delta_time)
			
			# Update fuse timer
			grenade[:fuse_timer] -= delta_time
			
			# Check for detonation
			if grenade[:fuse_timer] <= 0
				detonate_grenade(grenade)
			end
		end
		
		# Remove detonated grenades (except those just detonated for effect calculation)
		@active_grenades.reject! do |grenade|
			grenade[:detonated] && (Time.now.to_f - grenade[:detonation_time] > 0.1)
		end
	end
	
	def update_grenade_physics(grenade, config, delta_time)
		# Apply gravity
		grenade[:velocity][:z] -= config[:gravity] * delta_time if grenade[:velocity][:z]
		
		# Update position
		grenade[:position][:x] += grenade[:velocity][:x] * delta_time
		grenade[:position][:y] += grenade[:velocity][:y] * delta_time
		grenade[:position][:z] = (grenade[:position][:z] || 0) + (grenade[:velocity][:z] || 0) * delta_time
		
		# Check for ground collision
		if grenade[:position][:z] <= 0
			grenade[:position][:z] = 0
			
			# Bounce
			if grenade[:velocity][:z] && grenade[:velocity][:z] < -50
				grenade[:velocity][:z] = -grenade[:velocity][:z] * config[:bounce_damping]
				grenade[:velocity][:x] *= config[:bounce_damping]
				grenade[:velocity][:y] *= config[:bounce_damping]
				grenade[:bounces] += 1
			else
				# Stop bouncing
				grenade[:velocity][:z] = 0
				
				# Apply friction
				grenade[:velocity][:x] *= 0.8
				grenade[:velocity][:y] *= 0.8
			end
		end
		
		# Check for wall collisions (simplified)
		# This would need map boundary data in real implementation
	end
	
	def detonate_grenade(grenade)
		grenade[:detonated] = true
		grenade[:detonation_time] = Time.now.to_f
		
		case grenade[:type]
		when :smoke_grenade
			create_smoke_cloud(grenade[:position])
		end
	end
	
	def create_smoke_cloud(position)
		config = GRENADE_CONFIG[:smoke_grenade][:effect]
		
		smoke = {
			id: @grenade_id_counter,
			position: position.dup,
			current_radius: 0,
			target_radius: config[:radius],
			duration: config[:duration],
			expand_time: config[:expand_time],
			created_at: Time.now.to_f
		}
		
		@smoke_clouds << smoke
	end
	
	def update_smoke_clouds(delta_time)
		@smoke_clouds.each do |smoke|
			# Expand smoke
			if smoke[:current_radius] < smoke[:target_radius]
				expand_rate = smoke[:target_radius] / smoke[:expand_time]
				smoke[:current_radius] += expand_rate * delta_time
				smoke[:current_radius] = [smoke[:current_radius], smoke[:target_radius]].min
			end
			
			# Reduce duration
			smoke[:duration] -= delta_time
		end
		
		# Remove expired smoke
		@smoke_clouds.reject! { |smoke| smoke[:duration] <= 0 }
	end
	
	def check_detonations
		# This is called to trigger explosion effects
		# Actual damage/effects are calculated when requested
	end
	
	def calculate_he_damage(grenade_pos, player_pos, obstacles)
		config = GRENADE_CONFIG[:he_grenade][:damage]
		
		distance = calculate_distance(grenade_pos, player_pos)
		return 0 if distance > config[:radius]
		
		# Check line of sight (simplified - would need proper raycasting)
		return 0 if blocked_by_obstacle?(grenade_pos, player_pos, obstacles)
		
		# Calculate damage falloff
		damage_multiplier = 1.0 - (distance / config[:radius])
		damage = config[:max] * damage_multiplier
		
		damage.to_i
	end
	
	def calculate_flash_effect(grenade_pos, player_pos, player_angle, obstacles)
		config = GRENADE_CONFIG[:flashbang][:effect]
		
		distance = calculate_distance(grenade_pos, player_pos)
		return 0 if distance > config[:max_radius]
		
		# Check line of sight
		return 0 if blocked_by_obstacle?(grenade_pos, player_pos, obstacles)
		
		# Calculate angle to grenade
		angle_to_grenade = Math.atan2(
			grenade_pos[:y] - player_pos[:y],
			grenade_pos[:x] - player_pos[:x]
		)
		
		# Calculate difference between player view angle and angle to grenade
		angle_diff = (player_angle - angle_to_grenade).abs
		angle_diff = 2 * Math::PI - angle_diff if angle_diff > Math::PI
		
		# Full effect if looking at grenade, reduced if looking away
		angle_multiplier = if angle_diff < Math::PI / 4  # 45 degrees
			1.0
		elsif angle_diff < Math::PI / 2  # 90 degrees
			0.7
		elsif angle_diff < 3 * Math::PI / 4  # 135 degrees
			0.3
		else
			0.1  # Looking away
		end
		
		# Distance-based effect
		distance_multiplier = if distance <= config[:full_blind_radius]
			1.0
		else
			1.0 - ((distance - config[:full_blind_radius]) / 
					(config[:max_radius] - config[:full_blind_radius]))
		end
		
		# Calculate final blind duration
		blind_duration = config[:max_blind_time] * distance_multiplier * angle_multiplier
		blind_duration.round(1)
	end
	
	def calculate_distance(pos1, pos2)
		dx = pos1[:x] - pos2[:x]
		dy = pos1[:y] - pos2[:y]
		Math.sqrt(dx * dx + dy * dy)
	end
	
	def blocked_by_obstacle?(from_pos, to_pos, obstacles)
		# Simplified line-of-sight check
		# In real implementation, would do proper raycasting against map geometry
		obstacles.any? do |obstacle|
			# Check if line from from_pos to to_pos intersects obstacle
			# This is a placeholder - needs proper implementation
			false
		end
	end
	
	def line_intersects_circle?(line_start, line_end, circle_center, radius)
		# Vector from line start to end
		dx = line_end[:x] - line_start[:x]
		dy = line_end[:y] - line_start[:y]
		
		# Vector from line start to circle center
		fx = line_start[:x] - circle_center[:x]
		fy = line_start[:y] - circle_center[:y]
		
		# Quadratic formula coefficients
		a = dx * dx + dy * dy
		b = 2 * (fx * dx + fy * dy)
		c = (fx * fx + fy * fy) - radius * radius
		
		discriminant = b * b - 4 * a * c
		return false if discriminant < 0
		
		# Line intersects circle
		discriminant = Math.sqrt(discriminant)
		t1 = (-b - discriminant) / (2 * a)
		t2 = (-b + discriminant) / (2 * a)
		
		# Check if intersection is within line segment
		(t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)
	end
end