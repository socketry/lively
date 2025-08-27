# frozen_string_literal: true

# CS 1.6 Bomb System
# Handles C4 bomb planting, defusing, and explosion mechanics
class BombSystem
	attr_reader :state, :planted_at_site, :planter_id, :timer, :defuser_id, :defuse_progress
	
	# CS 1.6 authentic timing values (in seconds)
	BOMB_TIMER = 45.0           # Time until explosion after planting
	PLANT_TIME = 3.0             # Time required to plant bomb
	DEFUSE_TIME = 10.0           # Time to defuse without kit
	DEFUSE_TIME_WITH_KIT = 5.0  # Time to defuse with kit
	EXPLOSION_RADIUS = 500       # Damage radius in units
	EXPLOSION_DAMAGE = 500       # Max damage at center
	BEEP_INTERVALS = [1.0, 0.8, 0.6, 0.4, 0.2, 0.1]  # Beeping acceleration
	
	# Bomb states
	STATES = {
		not_planted: 0,
		planting: 1,
		planted: 2,
		defusing: 3,
		defused: 4,
		exploded: 5
	}.freeze
	
	def initialize
		reset
	end
	
	def reset
		@state = STATES[:not_planted]
		@carrier_id = nil
		@planted_at_site = nil
		@planter_id = nil
		@defuser_id = nil
		@timer = 0
		@plant_progress = 0
		@defuse_progress = 0
		@last_beep_time = 0
		@beep_interval_index = 0
		@bomb_position = nil
	end
	
	def assign_carrier(player_id)
		return false if @state != STATES[:not_planted]
		@carrier_id = player_id
		true
	end
	
	def drop_bomb(position)
		return false unless @carrier_id
		return false if @state != STATES[:not_planted]
		
		@carrier_id = nil
		@bomb_position = position
		true
	end
	
	def pickup_bomb(player_id)
		return false if @state != STATES[:not_planted]
		return false unless @bomb_position  # Bomb must be dropped
		
		@carrier_id = player_id
		@bomb_position = nil
		true
	end
	
	def start_planting(player_id, site_name, position)
		return false unless can_plant?(player_id, site_name)
		
		@state = STATES[:planting]
		@planter_id = player_id
		@planted_at_site = site_name
		@bomb_position = position
		@plant_progress = 0
		
		true
	end
	
	def cancel_planting
		return false unless @state == STATES[:planting]
		
		@state = STATES[:not_planted]
		@plant_progress = 0
		@planter_id = nil
		@planted_at_site = nil
		
		true
	end
	
	def update_planting(delta_time, player_still_planting)
		return false unless @state == STATES[:planting]
		
		unless player_still_planting
			cancel_planting
			return false
		end
		
		@plant_progress += delta_time
		
		if @plant_progress >= PLANT_TIME
			complete_planting
			return true
		end
		
		false
	end
	
	def complete_planting
		@state = STATES[:planted]
		@timer = BOMB_TIMER
		@carrier_id = nil
		@plant_progress = 0
		@last_beep_time = 0
		@beep_interval_index = 0
		
		true
	end
	
	def start_defusing(player_id, has_kit = false)
		return false unless can_defuse?(player_id)
		
		@state = STATES[:defusing]
		@defuser_id = player_id
		@defuse_progress = 0
		@defuse_time_required = has_kit ? DEFUSE_TIME_WITH_KIT : DEFUSE_TIME
		
		true
	end
	
	def cancel_defusing
		return false unless @state == STATES[:defusing]
		
		@state = STATES[:planted]
		@defuse_progress = 0
		@defuser_id = nil
		
		true
	end
	
	def update_defusing(delta_time, player_still_defusing)
		return false unless @state == STATES[:defusing]
		
		unless player_still_defusing
			cancel_defusing
			return false
		end
		
		@defuse_progress += delta_time
		
		if @defuse_progress >= @defuse_time_required
			complete_defusing
			return true
		end
		
		false
	end
	
	def complete_defusing
		@state = STATES[:defused]
		@timer = 0
		@defuse_progress = 0
		
		true
	end
	
	def update(delta_time)
		return if @state != STATES[:planted]
		
		@timer -= delta_time
		
		if @timer <= 0
			explode
			return :exploded
		end
		
		# Check for beep
		beep_result = check_beep(delta_time)
		return beep_result if beep_result
		
		nil
	end
	
	def explode
		@state = STATES[:exploded]
		@timer = 0
		true
	end
	
	def calculate_explosion_damage(player_position)
		return 0 unless @state == STATES[:exploded]
		return 0 unless @bomb_position
		
		distance = calculate_distance(@bomb_position, player_position)
		
		return 0 if distance > EXPLOSION_RADIUS
		
		# Linear falloff
		damage_multiplier = 1.0 - (distance / EXPLOSION_RADIUS)
		(EXPLOSION_DAMAGE * damage_multiplier).to_i
	end
	
	def can_plant?(player_id, site_name)
		return false unless @carrier_id == player_id
		return false unless @state == STATES[:not_planted]
		return false unless [:a, :b].include?(site_name)
		
		true
	end
	
	def can_defuse?(player_id)
		return false unless @state == STATES[:planted]
		return false if player_id.nil?
		
		true
	end
	
	def is_carrier?(player_id)
		@carrier_id == player_id && @state == STATES[:not_planted]
	end
	
	def get_plant_progress_percentage
		return 0 unless @state == STATES[:planting]
		(@plant_progress / PLANT_TIME * 100).to_i
	end
	
	def get_defuse_progress_percentage
		return 0 unless @state == STATES[:defusing]
		(@defuse_progress / @defuse_time_required * 100).to_i
	end
	
	def get_timer_percentage
		return 0 unless @state == STATES[:planted]
		(@timer / BOMB_TIMER * 100).to_i
	end
	
	def get_beep_interval
		return nil unless @state == STATES[:planted]
		
		# Accelerate beeping as timer decreases
		time_percentage = @timer / BOMB_TIMER
		
		if time_percentage > 0.8
			BEEP_INTERVALS[0]
		elsif time_percentage > 0.6
			BEEP_INTERVALS[1]
		elsif time_percentage > 0.4
			BEEP_INTERVALS[2]
		elsif time_percentage > 0.2
			BEEP_INTERVALS[3]
		elsif time_percentage > 0.1
			BEEP_INTERVALS[4]
		else
			BEEP_INTERVALS[5]
		end
	end
	
	def get_state_info
		{
			state: STATES.key(@state),
			carrier_id: @carrier_id,
			planted_at_site: @planted_at_site,
			planter_id: @planter_id,
			defuser_id: @defuser_id,
			timer: @timer.to_i,
			timer_percentage: get_timer_percentage,
			plant_progress: get_plant_progress_percentage,
			defuse_progress: get_defuse_progress_percentage,
			bomb_position: @bomb_position,
			beep_interval: get_beep_interval
		}
	end
	
	private
	
	def check_beep(delta_time)
		current_interval = get_beep_interval
		return nil unless current_interval
		
		@last_beep_time += delta_time
		
		if @last_beep_time >= current_interval
			@last_beep_time = 0
			return :beep
		end
		
		nil
	end
	
	def calculate_distance(pos1, pos2)
		return 0 unless pos1 && pos2
		
		dx = pos1[:x] - pos2[:x]
		dy = pos1[:y] - pos2[:y]
		Math.sqrt(dx * dx + dy * dy)
	end
end

# Bomb site definitions for maps
class BombSites
	SITE_DEFINITIONS = {
		de_dust2: {
			a: {
				name: "Bombsite A",
				center: { x: 1200, y: 400 },
				radius: 150,
				plant_zones: [
					{ x: 1150, y: 350, width: 100, height: 100 }
				]
			},
			b: {
				name: "Bombsite B",
				center: { x: 400, y: 800 },
				radius: 150,
				plant_zones: [
					{ x: 350, y: 750, width: 100, height: 100 }
				]
			}
		},
		de_inferno: {
			a: {
				name: "Bombsite A",
				center: { x: 800, y: 300 },
				radius: 120,
				plant_zones: [
					{ x: 750, y: 250, width: 100, height: 100 }
				]
			},
			b: {
				name: "Bombsite B",
				center: { x: 300, y: 700 },
				radius: 120,
				plant_zones: [
					{ x: 250, y: 650, width: 100, height: 100 }
				]
			}
		}
	}.freeze
	
	def self.get_sites(map_name)
		SITE_DEFINITIONS[map_name] || SITE_DEFINITIONS[:de_dust2]
	end
	
	def self.is_in_bombsite?(position, map_name, site_name)
		sites = get_sites(map_name)
		site = sites[site_name]
		return false unless site
		
		# Check if position is within any plant zone
		site[:plant_zones].any? do |zone|
			position[:x] >= zone[:x] &&
			position[:x] <= zone[:x] + zone[:width] &&
			position[:y] >= zone[:y] &&
			position[:y] <= zone[:y] + zone[:height]
		end
	end
	
	def self.get_nearest_bombsite(position, map_name)
		sites = get_sites(map_name)
		nearest_site = nil
		nearest_distance = Float::INFINITY
		
		sites.each do |site_name, site_data|
			dx = position[:x] - site_data[:center][:x]
			dy = position[:y] - site_data[:center][:y]
			distance = Math.sqrt(dx * dx + dy * dy)
			
			if distance < nearest_distance
				nearest_distance = distance
				nearest_site = site_name
			end
		end
		
		nearest_site
	end
end