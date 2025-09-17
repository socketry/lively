#!/usr/bin/env lively
# frozen_string_literal: true

require "json"

# Base entity class with common physics properties
class Entity
	attr_accessor :x, :y, :width, :height, :vx, :vy, :color
	
	def initialize(x:, y:, width:, height:, color: "white")
		@x = x
		@y = y
		@width = width
		@height = height
		@vx = 0
		@vy = 0
		@color = color
	end
	
	def bounds
		{ x: @x, y: @y, width: @width, height: @height }
	end
	
	def collides_with?(other)
		@x < other.x + other.width &&
		@x + @width > other.x &&
		@y < other.y + other.height &&
		@y + @height > other.y
	end
end

# Player entity with movement and physics
class Player < Entity
	# Real-world physics constants (in meters and seconds)
	GRAVITY = 9.8  # m/s²
	JUMP_VELOCITY = -8.0  # m/s (negative = upward)
	MOVE_SPEED = 3.0  # m/s
	TERMINAL_VELOCITY = 8.0  # m/s
	FRICTION_COEFFICIENT = 0.85  # dimensionless
	
	# Pixel scale: how many pixels per meter
	PIXELS_PER_METER = 60
	
	attr_accessor :on_ground
	
	def initialize(x:, y:)
		super(x: x, y: y, width: 32, height: 32, color: "hsl(200, 80%, 50%)")
		@on_ground = false
		
		# Physics state in real-world units (meters and m/s)
		@physics_x = x / PIXELS_PER_METER.to_f
		@physics_y = y / PIXELS_PER_METER.to_f
		@physics_vx = 0.0
		@physics_vy = 0.0
	end
	
	def update(delta_time)
		# Apply gravity (in m/s²)
		@physics_vy += GRAVITY * delta_time
		@physics_vy = [TERMINAL_VELOCITY, @physics_vy].min
		
		# Store previous position for tunneling detection
		prev_physics_x = @physics_x
		prev_physics_y = @physics_y
		
		# Update position (in meters)
		@physics_x += @physics_vx * delta_time
		@physics_y += @physics_vy * delta_time
		
		# Prevent excessive movement per frame (anti-tunneling)
		max_movement_per_frame = 0.5  # 0.5 meters = 30 pixels max movement per frame
		
		dx = @physics_x - prev_physics_x
		dy = @physics_y - prev_physics_y
		distance = Math.sqrt(dx*dx + dy*dy)
		
		if distance > max_movement_per_frame
			# Scale back movement to prevent tunneling
			scale = max_movement_per_frame / distance
			@physics_x = prev_physics_x + dx * scale
			@physics_y = prev_physics_y + dy * scale
			# Also scale back velocities proportionally
			@physics_vx *= scale
			@physics_vy *= scale
		end
		
		# Apply friction when on ground
		if @on_ground
			@physics_vx *= (FRICTION_COEFFICIENT ** delta_time)
		end
		
		# Convert physics coordinates to pixel coordinates
		@x = (@physics_x * PIXELS_PER_METER).round
		@y = (@physics_y * PIXELS_PER_METER).round
		
		# Update velocity for serialization (convert to pixels for compatibility)
		@vx = @physics_vx * PIXELS_PER_METER
		@vy = @physics_vy * PIXELS_PER_METER
		
		# Reset ground state (will be set by collision detection)
		@on_ground = false
	end
	
	def move_left
		@physics_vx = -MOVE_SPEED
	end
	
	def move_right
		@physics_vx = MOVE_SPEED
	end
	
	def jump
		if @on_ground
			@physics_vy = JUMP_VELOCITY
			@on_ground = false
			return :jump_sound
		end
		nil
	end
	
	def stop_horizontal
		@physics_vx = 0.0
	end
	
	def reset_position!(x, y)
		@x = x
		@y = y
		@physics_x = x / PIXELS_PER_METER.to_f
		@physics_y = y / PIXELS_PER_METER.to_f
		@physics_vx = 0.0
		@physics_vy = 0.0
		@vx = 0
		@vy = 0
		@on_ground = false
	end
	
	# Collision methods need to work with physics coordinates
	def sync_physics_after_collision!
		@physics_x = @x / PIXELS_PER_METER.to_f
		@physics_y = @y / PIXELS_PER_METER.to_f
	end
	
	def set_physics_velocity(vx_pixels_per_sec, vy_pixels_per_sec)
		@physics_vx = vx_pixels_per_sec / PIXELS_PER_METER.to_f
		@physics_vy = vy_pixels_per_sec / PIXELS_PER_METER.to_f
	end
	
	def to_h
		{
			x: @x,
			y: @y,
			width: @width,
			height: @height,
			vx: @vx,
			vy: @vy,
			on_ground: @on_ground,
			color: @color
		}
	end
end

# Static platform entity
class Platform < Entity
	def initialize(x:, y:, width:, height:, color: "hsl(120, 60%, 40%)")
		super(x: x, y: y, width: width, height: height, color: color)
	end
	
	def update(delta_time)
		# Platforms are static, no update needed
	end
	
	def to_h
		{
			x: @x,
			y: @y,
			width: @width,
			height: @height,
			color: @color
		}
	end
end

# Collectible entity (coins, gems)
class Collectible < Entity
	attr_reader :type, :value, :collected
	
	def initialize(x:, y:, type:, value:, color:)
		super(x: x, y: y, width: 20, height: 20, color: color)
		@type = type
		@value = value
		@collected = false
	end
	
	def update(delta_time)
		# Could add floating animation, sparkle effects, etc.
	end
	
	def collect!
		@collected = true
	end
	
	def to_h
		{
			x: @x,
			y: @y,
			width: @width,
			height: @height,
			type: @type,
			value: @value,
			color: @color
		}
	end
end

# Cat enemy entity with patrol behavior
class CatEnemy < Entity
	# Real-world physics constants (same as Player for consistency)
	GRAVITY = 9.8  # m/s²
	TERMINAL_VELOCITY = 8.0  # m/s
	JUMP_VELOCITY = -4.0  # m/s (slightly less than player)
	PIXELS_PER_METER = 60  # Same scale as Player
	
	attr_accessor :on_ground, :patrol_start, :patrol_end, :direction, :jump_cooldown, :stuck_timer
	
	def initialize(x:, y:, color:, speed:, patrol_start:, patrol_end:)
		super(x: x, y: y, width: 28, height: 28, color: color)
		@patrol_start = patrol_start
		@patrol_end = patrol_end
		@direction = [:left, :right].sample  # Random starting direction
		@speed_mps = speed / PIXELS_PER_METER.to_f  # Convert pixels/s to m/s
		@on_ground = false
		@jump_cooldown = 0.0
		@stuck_timer = 0.0
		@last_x = x
		
		# Physics state in real-world units
		@physics_x = x / PIXELS_PER_METER.to_f
		@physics_y = y / PIXELS_PER_METER.to_f
		@physics_vx = @direction == :left ? -@speed_mps : @speed_mps
		@physics_vy = 0.0
	end
	
	def update(delta_time, platforms = [])
		# Apply gravity (in m/s²)
		@physics_vy += GRAVITY * delta_time
		@physics_vy = [TERMINAL_VELOCITY, @physics_vy].min
		
		# Decrement jump cooldown
		@jump_cooldown = [@jump_cooldown - delta_time, 0].max
		
		# Check if cat is stuck (not moving much)
		if (@x - @last_x).abs < 5
			@stuck_timer += delta_time
		else
			@stuck_timer = 0
			@last_x = @x
		end
		
		# If stuck for too long, try to jump or change direction
		if @stuck_timer > 2.0 && @on_ground && @jump_cooldown == 0
			try_jump_or_turn(platforms)
			@stuck_timer = 0
		end
		
		# AI: Try to jump when encountering walls or wanting to climb
		if @on_ground && @jump_cooldown == 0
			should_jump = should_attempt_jump(platforms)
			if should_jump
				jump!
			end
		end
		
		# Update position (in meters)
		@physics_x += @physics_vx * delta_time
		@physics_y += @physics_vy * delta_time
		
		# Convert to pixels for boundary checking
		pixel_x = @physics_x * PIXELS_PER_METER
		
		# Patrol behavior - turn around at map boundaries
		if @direction == :left && pixel_x <= @patrol_start
			@direction = :right
			@physics_vx = @speed_mps
		elsif @direction == :right && pixel_x >= @patrol_end
			@direction = :left
			@physics_vx = -@speed_mps
		end
		
		# Convert physics coordinates to pixel coordinates
		@x = (@physics_x * PIXELS_PER_METER).round
		@y = (@physics_y * PIXELS_PER_METER).round
		
		# Update velocity for serialization (convert to pixels for compatibility)
		@vx = @physics_vx * PIXELS_PER_METER
		@vy = @physics_vy * PIXELS_PER_METER
		
		# Reset ground state
		@on_ground = false
	end
	
	def jump!
		if @on_ground && @jump_cooldown == 0
			@physics_vy = JUMP_VELOCITY
			@on_ground = false
			@jump_cooldown = 1.0  # 1 second cooldown
		end
	end
	
	def should_attempt_jump(platforms)
		return false unless @on_ground
		
		# Look ahead in movement direction to see if there's a platform to climb
		look_ahead_distance = 40  # pixels
		look_ahead_x = @direction == :left ? @x - look_ahead_distance : @x + look_ahead_distance
		
		# Check if there's a platform at or above current level that cat could jump to
		platforms.each do |platform|
			# Platform is in front of cat
			if (@direction == :left && platform.x + platform.width >= look_ahead_x && platform.x <= @x) ||
			   (@direction == :right && platform.x <= look_ahead_x && platform.x + platform.width >= @x)
				
				# Platform is above current position (climbable)
				if platform.y < @y && platform.y > @y - 100
					return true
				end
			end
		end
		
		# Random jump chance for exploration (5% chance per frame when on ground)
		return rand < 0.05 if @stuck_timer < 1.0
		
		false
	end
	
	def try_jump_or_turn(platforms)
		if should_attempt_jump(platforms)
			jump!
		else
			# Change direction
			reverse_direction!
		end
	end
	
	def reverse_direction!
		@direction = (@direction == :left) ? :right : :left
		@physics_vx = -@physics_vx
		@stuck_timer = 0  # Reset stuck timer when changing direction
	end
	
	# Collision methods need to work with physics coordinates
	def sync_physics_after_collision!
		@physics_x = @x / PIXELS_PER_METER.to_f
		@physics_y = @y / PIXELS_PER_METER.to_f
	end
	
	def set_physics_velocity(vx_pixels_per_sec, vy_pixels_per_sec)
		@physics_vx = vx_pixels_per_sec / PIXELS_PER_METER.to_f
		@physics_vy = vy_pixels_per_sec / PIXELS_PER_METER.to_f
	end
	
	def to_h
		{
			x: @x,
			y: @y,
			width: @width,
			height: @height,
			vx: @vx,
			vy: @vy,
			on_ground: @on_ground,
			color: @color,
			patrol_start: @patrol_start,
			patrol_end: @patrol_end,
			direction: @direction
		}
	end
end

# Portal entity with entrance/exit pair
class Portal
	attr_reader :entrance, :exit
	
	def initialize(entrance_x:, entrance_y:, exit_x:, exit_y:)
		@entrance = Entity.new(x: entrance_x, y: entrance_y, width: 20, height: 30, color: "purple")
		@exit = Entity.new(x: exit_x, y: exit_y, width: 20, height: 30, color: "blue")
	end
	
	def update(delta_time)
		# Could add portal animation effects
	end
	
	def teleport_to_exit(entity)
		entity.x = @exit.x
		entity.y = @exit.y - entity.height + 5
		entity.vx = 0
		entity.vy = 0
	end
	
	def teleport_to_entrance(entity)
		entity.x = @entrance.x
		entity.y = @entrance.y - entity.height + 5
		entity.vx = 0
		entity.vy = 0
	end
	
	def to_h
		{
			entrance: @entrance.bounds.merge(color: @entrance.color),
			exit: @exit.bounds.merge(color: @exit.color)
		}
	end
end

# Game physics and state management
class PlatformerGame
	def initialize
		@width = 800
		@height = 600
		@score = 0
		@level = 1
		@lives = 3
		@game_over = false
		@collision_cooldown = 0
		@position_reset_this_frame = false
		
		# Initialize entities
		@player = Player.new(x: 50, y: @height - 150)
		@platforms = []
		@collectibles = []
		@cat_enemies = []
		@portals = []
		
		# Create game elements
		create_platforms!
		create_collectibles!
		create_portals!
		create_cat_enemies!
	end
	
	attr_reader :width, :height, :score, :lives, :game_over, :level, :player
	attr_accessor :platforms, :collectibles, :cat_enemies, :portals
	
	def reset_player!
		@player = Player.new(x: 50, y: @height - 150)
	end
	
	def create_platforms!
		# Use level as seed for consistent but varied layouts
		old_seed = Random.srand(@level * 12345)  # Multiply by large number for better distribution
		
		@platforms = [
			# Ground platform (always the same)
			Platform.new(x: 0, y: @height - 50, width: @width, height: 50, color: "hsl(30, 70%, 40%)")
		]
		
		# Generate 5-8 floating platforms randomly
		num_platforms = 5 + rand(4)  # 5 to 8 platforms
		
		num_platforms.times do |i|
			# Create platforms with varying sizes and positions
			width = 80 + rand(100)  # Width between 80-180 pixels
			height = 15 + rand(10)  # Height between 15-25 pixels
			
			# Position platforms across the screen with some spacing
			x = (i * (@width / num_platforms.to_f)) + rand(100) - 50
			x = [[x, 0].max, @width - width].min  # Keep within bounds
			
			# Random height between ground and top, with more variety
			min_y = 100  # Don't go too high
			max_y = @height - 150  # Stay above ground area
			y = min_y + rand(max_y - min_y)
			
			# Random platform colors for variety
			hue = rand(360)
			saturation = 50 + rand(30)  # 50-80%
			lightness = 35 + rand(15)   # 35-50%
			color = "hsl(#{hue}, #{saturation}%, #{lightness}%)"
			
			@platforms << Platform.new(x: x, y: y, width: width, height: height, color: color)
		end
		
		# Restore previous random seed
		Random.srand(old_seed)
	end
	
	def create_collectibles!
		# Use level as seed for consistent collectible placement
		old_seed = Random.srand(@level * 54321)
		
		@collectibles = []
		
		# Get floating platforms (exclude ground platform)
		floating_platforms = @platforms[1..-1]
		
		# Place 3-5 coins on or near platforms
		num_coins = 3 + rand(3)  # 3 to 5 coins
		selected_platforms = floating_platforms.sample(num_coins)
		
		selected_platforms.each do |platform|
			# Place coin above the platform
			coin_x = platform.x + rand(platform.width - 20)  # Random position on platform
			coin_y = platform.y - 30  # 30 pixels above platform
			
			@collectibles << Collectible.new(
				x: coin_x, 
				y: coin_y, 
				type: :coin, 
				value: 10, 
				color: "gold"
			)
		end
		
		# Place 1-2 gems in harder to reach places
		num_gems = 1 + rand(2)  # 1 to 2 gems
		
		num_gems.times do
			# Find higher platforms for gems
			high_platforms = floating_platforms.select { |p| p.y < @height - 200 }
			
			if high_platforms.any?
				platform = high_platforms.sample
				gem_x = platform.x + rand(platform.width - 20)
				gem_y = platform.y - 30
				
				@collectibles << Collectible.new(
					x: gem_x,
					y: gem_y,
					type: :gem,
					value: 50,
					color: "purple"
				)
			else
				# If no high platforms, place gem randomly in upper area
				gem_x = 50 + rand(@width - 100)
				gem_y = 100 + rand(150)
				
				@collectibles << Collectible.new(
					x: gem_x,
					y: gem_y,
					type: :gem,
					value: 50,
					color: "purple"
				)
			end
		end
		
		# Restore previous random seed
		Random.srand(old_seed)
	end
	
	def create_portals!
		@portals = []
		
		# Only add portals starting from level 2
		return if @level < 2
		
		# Get platforms (excluding the ground platform)
		floating_platforms = @platforms[1..-1] # Skip first platform (ground)
		return if floating_platforms.length < 2
		
		# Select two different platforms for portal placement
		entrance_platform = floating_platforms.sample
		exit_platform = floating_platforms.reject { |p| p == entrance_platform }.sample
		
		return unless entrance_platform && exit_platform
		
		# Position portals on top of the selected platforms
		portal_width = 20
		portal_height = 30
		
		entrance_x = entrance_platform.x + (entrance_platform.width / 2) - (portal_width / 2)
		entrance_y = entrance_platform.y - portal_height
		exit_x = exit_platform.x + (exit_platform.width / 2) - (portal_width / 2)
		exit_y = exit_platform.y - portal_height
		
		@portals << Portal.new(
			entrance_x: entrance_x,
			entrance_y: entrance_y,
			exit_x: exit_x,
			exit_y: exit_y
		)
	end
	
	def create_cat_enemies!
		# Use level as seed for consistent cat placement
		old_seed = Random.srand(@level * 98765)
		
		@cat_enemies = []
		
		# Start with 1 cat on level 1, add 1 more each level (max 5)
		num_cats = [@level, 5].min
		colors = ["orange", "gray", "black", "brown", "white"]
		
		# Get some platforms for cat placement (including ground)
		available_platforms = @platforms.sample(num_cats + 2)  # Get more platforms than cats
		
		num_cats.times do |i|
			if available_platforms[i]
				# Place cat on a platform
				platform = available_platforms[i]
				spawn_x = platform.x + rand([platform.width - 30, 30].max)  # Random position on platform
				spawn_y = platform.y - 30  # Just above platform
			else
				# Fallback: place on ground area
				spawn_x = 100 + (i * 150) + rand(50)
				spawn_y = @height - 80
			end
			
			@cat_enemies << CatEnemy.new(
				x: spawn_x,
				y: spawn_y,
				color: colors[i % colors.length],
				speed: 45 + (i * 10),  # Increase speed with each cat
				patrol_start: 0,        # Full map width
				patrol_end: @width
			)
		end
		
		# Restore previous random seed
		Random.srand(old_seed)
	end
	
	def move_player(direction)
		return if @game_over
		
		case direction
		when :left
			@player.move_left
		when :right
			@player.move_right
		when :jump
			return @player.jump
		end
		nil
	end
	
	def stop_player_horizontal
		@player.stop_horizontal
	end
	
	def update!(delta_time)
		return if @game_over
		
		sound_events = []
		@position_reset_this_frame = false
		
		# Decrement collision cooldown (convert to time-based)
		@collision_cooldown = [@collision_cooldown - delta_time, 0].max
		
		# Update all entities with delta time
		@player.update(delta_time)
		@platforms.each { |platform| platform.update(delta_time) }
		@collectibles.each { |collectible| collectible.update(delta_time) }
		@cat_enemies.each { |cat| cat.update(delta_time, @platforms) }
		@portals.each { |portal| portal.update(delta_time) }
		
		# Collision detection (after all updates)
		check_platform_collisions!
		
		collectibles_before = @collectibles.length
		check_collectible_collisions!
		if @collectibles.length < collectibles_before
			sound_events << :collect
		end
		
		collision_result = check_cat_enemy_collisions!
		if collision_result == :cat_collision
			sound_events << :cat_collision
		end
		
		portal_result = check_portal_collisions!
		if portal_result == :portal_teleport
			sound_events << :portal_teleport
		end
		
		boundary_result = check_boundaries!
		if boundary_result == :death_sound
			sound_events << :death
		end
		
		# Check win condition
		if @collectibles.empty?
			advance_level!
			sound_events << :levelup
		end
		
		sound_events
	end
	
	private
	
	def check_platform_collisions!
		@platforms.each do |platform|
			if @player.collides_with?(platform)
				# Calculate overlap amounts to determine collision type
				overlap_x = [(@player.x + @player.width) - platform.x, (platform.x + platform.width) - @player.x].min
				overlap_y = [(@player.y + @player.height) - platform.y, (platform.y + platform.height) - @player.y].min
				
				# Resolve collision based on smallest overlap (most likely collision direction)
				if overlap_x < overlap_y
					# Horizontal collision (side collision)
					if @player.x < platform.x
						# Player hitting platform from left
						@player.x = platform.x - @player.width
					else
						# Player hitting platform from right
						@player.x = platform.x + platform.width
					end
					# Sync physics coordinates and stop horizontal movement
					@player.sync_physics_after_collision!
					@player.set_physics_velocity(0, @player.vy)
				else
					# Vertical collision (top/bottom collision)
					if @player.y < platform.y
						# Landing on top of platform
						@player.y = platform.y - @player.height
						@player.vy = 0
						@player.on_ground = true
					else
						# Hitting platform from below
						@player.y = platform.y + platform.height
						@player.vy = 0
					end
					# Sync physics coordinates after collision
					@player.sync_physics_after_collision!
				end
				
				# Only handle one collision per frame to prevent multiple corrections
				break
			end
		end
		
		# Check cat-platform collisions
		@cat_enemies.each do |cat|
			@platforms.each do |platform|
				if cat.collides_with?(platform)
					# Landing on top of platform
					if cat.vy > 0 && cat.y < platform.y
						cat.y = platform.y - cat.height
						cat.vy = 0
						cat.on_ground = true
						# Sync physics coordinates after collision
						cat.sync_physics_after_collision!
					# Hitting platform from below
					elsif cat.vy < 0 && cat.y > platform.y
						cat.y = platform.y + platform.height
						cat.vy = 0
						# Sync physics coordinates after collision
						cat.sync_physics_after_collision!
					# Side collisions - cats turn around when hitting walls
					elsif cat.vx > 0 # Moving right
						cat.x = platform.x - cat.width
						cat.reverse_direction!
						# Sync physics coordinates after collision
						cat.sync_physics_after_collision!
					elsif cat.vx < 0 # Moving left
						cat.x = platform.x + platform.width
						cat.reverse_direction!
						# Sync physics coordinates after collision
						cat.sync_physics_after_collision!
					end
				end
			end
		end
	end
	
	def check_collectible_collisions!
		@collectibles.reject! do |collectible|
			if @player.collides_with?(collectible)
				@score += collectible.value
				collectible.collect!
				true # Remove the collectible
			else
				false
			end
		end
	end
	
	def check_cat_enemy_collisions!
		return nil if @collision_cooldown > 0
		
		@cat_enemies.each do |cat|
			if @player.collides_with?(cat)
				lose_life!
				@collision_cooldown = 1.0 # 1 second cooldown
				return :cat_collision # Signal for cat collision sound
			end
		end
		nil
	end
	
	def check_portal_collisions!
		@portals.each do |portal|
			# Check collision with entrance
			if @player.collides_with?(portal.entrance)
				portal.teleport_to_exit(@player)
				@portal_used = true
				return :portal_teleport
			end
			
			# Check collision with exit (portals work both ways)
			if @player.collides_with?(portal.exit)
				portal.teleport_to_entrance(@player)
				@portal_used = true
				return :portal_teleport
			end
		end
		nil
	end
	
	def lose_life!
		@lives -= 1
		if @lives <= 0
			@game_over = true
			return :death_sound
		else
			# Reset player position but keep progress
			reset_player_position!
		end
		nil
	end
	
	def reset_player_position!
		return if @position_reset_this_frame
		
		@player.reset_position!(50, @height - 150)
		@position_reset_this_frame = true
	end
	
	def check_boundaries!
		# Left boundary
		@player.x = 0 if @player.x < 0
		
		# Right boundary
		@player.x = @width - @player.width if @player.x > @width - @player.width
		
		# Death by falling - only if not already in collision cooldown
		if @player.y > @height && @collision_cooldown == 0
			@lives -= 1
			@collision_cooldown = 1.0 # 1 second cooldown
			if @lives <= 0
				@game_over = true
				return :death_sound
			else
				reset_player_position!
			end
		end
		nil
	end
	
	def advance_level!
		@level += 1
		@score += 100 # Level completion bonus
		create_platforms! # Create new random platform layout for this level
		create_collectibles! # Respawn collectibles for next level
		create_portals! # Create new portal placement for this level
		create_cat_enemies! # Recreate cats with new count for this level
	end
	
	public
	
	def restart!
		@score = 0
		@lives = 3
		@game_over = false
		@level = 1
		@collision_cooldown = 0
		@position_reset_this_frame = false
		
		reset_player!
		create_platforms!
		create_collectibles!
		create_portals!
		create_cat_enemies!
	end
	
	def to_h
		{
			player: @player.to_h,
			platforms: @platforms.map(&:to_h),
			collectibles: @collectibles.map(&:to_h),
			cat_enemies: @cat_enemies.map(&:to_h),
			portals: @portals.map(&:to_h),
			score: @score,
			lives: @lives,
			level: @level,
			game_over: @game_over,
			width: @width,
			height: @height
		}
	end
end

# Lively view for the platformer game
class PlatformerView < Live::View
	def initialize(...)
		super
		@game = PlatformerGame.new
		@keys_pressed = Set.new
		@game_loop = nil
	end
	
	def tag_name
		# This must correspond to the tag defined in application.js
		"platformer-game"
	end
	
	def bind(page)
		super
		start_game_loop!
	end
	
	def close
		stop_game_loop!
		super
	end
	
	def start_game_loop!
		@game_loop ||= Async do
			target_frame_time = 1.0 / 20 # 50ms per frame for 20 FPS
			clock = Async::Clock.start
			
			loop do
				# Handle continuous key input
				handle_continuous_input!
				
				# Update game state and get sound events
				sound_events = @game.update!(target_frame_time)
				
				# Play sounds for events that occurred
				if sound_events && sound_events.any?
					sound_events.each do |sound_event|
						case sound_event
						when :collect
							script("this.audio.playSound('collect')")
						when :cat_collision
							script("this.audio.playSound('cat_collision')")
						when :portal_teleport
							script("this.audio.playSound('portal_teleport')")
						when :death
							script("this.audio.playSound('death')")
						when :levelup
							script("this.audio.playSound('levelup')")
						end
					end
				end
				
				# Send updates to client
				self.update!
				
				remaining_time = target_frame_time - clock.total
				if remaining_time > 0
					sleep(remaining_time)
				end
				
				clock.reset!
			end
		rescue => error
			Console.error(self, error)
		end
	end
	
	def stop_game_loop!
		if game_loop = @game_loop
			@game_loop = nil
			game_loop.stop
		end
	end
	
	def handle_continuous_input!
		@keys_pressed.each do |key|
			case key
			when "a", "ArrowLeft"
				@game.move_player(:left)
			when "d", "ArrowRight"
				@game.move_player(:right)
			end
		end
		
		# Stop horizontal movement if no left/right keys are pressed
		unless @keys_pressed.any? {|key| ["a", "d", "ArrowLeft", "ArrowRight"].include?(key)}
			@game.stop_player_horizontal
		end
	end
	
	def handle(event)
		case event[:type]
		when "keydown"
			key = event[:detail][:key]
			@keys_pressed.add(key)
			
			# Handle jump separately (single press action)
			if key == "w" || key == " " || key == "ArrowUp"
				sound_effect = @game.move_player(:jump)
				if sound_effect == :jump_sound
					play_sound("jump")
				end
			end
			
		when "keyup"
			key = event[:detail][:key]
			@keys_pressed.delete(key)
			
		when "restart"
			@game.restart!
			
		when "collect_item"
			play_sound("collect")
		end
	end
	
	def play_sound(sound_name)
		# Use script() to call JavaScript methods on the custom element
		script("this.playSound('#{sound_name}')")
	end
	
	def render(builder)
		game_state = @game.to_h
		
		builder.tag("div", id: "game-container") do
			# Game header
			builder.tag("div", class: "game-header") do
				builder.tag("h1") {builder.text("Platformer Game")}
				builder.tag("div", class: "game-info") do
					builder.tag("span") {builder.text("Score: #{@game.score}")}
					builder.tag("span") {builder.text("Level: #{@game.level}")}
					builder.tag("span") {builder.text("Lives: #{@game.lives}")}
					if @game.game_over
						builder.tag("span", class: "game-over") {builder.text("GAME OVER")}
					end
				end
			end
			
			# Game canvas area
			builder.tag("div", 
				id: "game-canvas",
				class: "game-canvas",
				tabindex: "0",
				style: "width: #{@game.width}px; height: #{@game.height}px;",
				onkeydown: "live.forwardEvent('#{@id}', event, {key: event.key});",
				onkeyup: "live.forwardEvent('#{@id}', event, {key: event.key});",
				data: { game_state: game_state.to_json }
			) do
				# Platform elements
				@game.platforms.each do |platform|
					platform_data = platform.to_h
					builder.inline_tag("div",
						class: "platform",
						id: "platform-#{platform.object_id}",
						style: "transform: translate(#{platform_data[:x]}px, #{platform_data[:y]}px); width: #{platform_data[:width]}px; height: #{platform_data[:height]}px; background-color: #{platform_data[:color]};"
					)
				end
				
				# Collectible elements
				@game.collectibles.each do |collectible|
					collectible_data = collectible.to_h
					builder.inline_tag("div",
						class: "collectible #{collectible_data[:type]}",
						id: "collectible-#{collectible.object_id}",
						style: "transform: translate(#{collectible_data[:x]}px, #{collectible_data[:y]}px); width: #{collectible_data[:width]}px; height: #{collectible_data[:height]}px; background-color: #{collectible_data[:color]};"
					)
				end
				
				# Cat enemy elements
				@game.cat_enemies.each do |cat|
					cat_data = cat.to_h
					builder.inline_tag("div",
						class: "cat-enemy",
						id: "cat-#{cat.object_id}",
						style: "transform: translate(#{cat_data[:x]}px, #{cat_data[:y]}px); width: #{cat_data[:width]}px; height: #{cat_data[:height]}px; background-color: #{cat_data[:color]};"
					)
				end
				
				# Portal elements
				@game.portals.each do |portal|
					portal_data = portal.to_h
					# Render entrance portal
					builder.inline_tag("div",
						class: "portal entrance",
						id: "portal-entrance-#{portal.object_id}",
						style: "transform: translate(#{portal_data[:entrance][:x]}px, #{portal_data[:entrance][:y]}px); width: #{portal_data[:entrance][:width]}px; height: #{portal_data[:entrance][:height]}px;"
					)
					
					# Render exit portal
					builder.inline_tag("div",
						class: "portal exit",
						id: "portal-exit-#{portal.object_id}",
						style: "transform: translate(#{portal_data[:exit][:x]}px, #{portal_data[:exit][:y]}px); width: #{portal_data[:exit][:width]}px; height: #{portal_data[:exit][:height]}px;"
					)
				end
				
				# Player element
				player_data = @game.player.to_h
				builder.inline_tag("div",
					id: "player-#{@game.player.object_id}",
					class: "player",
					style: "transform: translate(#{player_data[:x]}px, #{player_data[:y]}px); width: #{player_data[:width]}px; height: #{player_data[:height]}px; background-color: #{player_data[:color]};"
				)
			end
			
			# Game controls
			builder.tag("div", class: "game-controls") do
				builder.tag("p") {builder.text("Controls: A/D or Arrow Keys to move, W/Space/Up Arrow to jump")}
				if @game.game_over
					builder.tag("button", onclick: "live.forwardEvent('#{@id}', {type: 'restart'});") do
						builder.text("Restart Game")
					end
				end
			end
		end
	end
end

Application = Lively::Application[PlatformerView]