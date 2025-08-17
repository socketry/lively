#!/usr/bin/env ruby
# frozen_string_literal: true

# Enhanced Bot AI System for CS2D
# Implements sophisticated AI behaviors with different difficulty levels

require 'json'
require_relative 'player'
require_relative 'weapon_config'

module CS2D
  class EnhancedBotAI
    # Bot difficulty configurations
    DIFFICULTY_CONFIG = {
      easy: {
        reaction_time: 0.8,      # Seconds before reacting
        accuracy: 0.3,            # 30% accuracy
        movement_skill: 0.3,      # Movement sophistication
        strategy_level: 1,        # Basic strategies only
        aim_speed: 0.5,           # Slow aim adjustment
        decision_interval: 1.0,   # Decision making frequency
        awareness_radius: 200,    # Limited vision range
        team_coordination: 0.2    # Low team play
      },
      normal: {
        reaction_time: 0.5,
        accuracy: 0.5,
        movement_skill: 0.5,
        strategy_level: 2,
        aim_speed: 0.7,
        decision_interval: 0.7,
        awareness_radius: 300,
        team_coordination: 0.5
      },
      hard: {
        reaction_time: 0.3,
        accuracy: 0.7,
        movement_skill: 0.7,
        strategy_level: 3,
        aim_speed: 0.85,
        decision_interval: 0.5,
        awareness_radius: 400,
        team_coordination: 0.7
      },
      expert: {
        reaction_time: 0.1,
        accuracy: 0.9,
        movement_skill: 0.9,
        strategy_level: 4,
        aim_speed: 0.95,
        decision_interval: 0.3,
        awareness_radius: 500,
        team_coordination: 0.9
      }
    }.freeze

    # Bot behavior states
    module BehaviorState
      IDLE = :idle
      MOVING = :moving
      ATTACKING = :attacking
      DEFENDING = :defending
      PLANTING = :planting
      DEFUSING = :defusing
      FOLLOWING = :following
      CAMPING = :camping
      RETREATING = :retreating
      SEARCHING = :searching
    end

    # Bot personalities for variety
    PERSONALITIES = [
      { name: "Aggressive", aggression: 0.8, caution: 0.2, teamwork: 0.5 },
      { name: "Defensive", aggression: 0.3, caution: 0.8, teamwork: 0.6 },
      { name: "Tactical", aggression: 0.5, caution: 0.5, teamwork: 0.8 },
      { name: "Lone Wolf", aggression: 0.7, caution: 0.4, teamwork: 0.2 },
      { name: "Support", aggression: 0.4, caution: 0.6, teamwork: 0.9 }
    ].freeze

    attr_reader :bot, :difficulty, :config, :state, :personality
    attr_accessor :target, :destination, :last_decision_time

    def initialize(bot_player, difficulty = :normal)
      @bot = bot_player
      @difficulty = difficulty
      @config = DIFFICULTY_CONFIG[difficulty]
      @state = BehaviorState::IDLE
      @personality = PERSONALITIES.sample
      
      # AI state tracking
      @target = nil
      @destination = nil
      @path = []
      @last_decision_time = 0
      @last_shot_time = 0
      @memory = BotMemory.new
      @current_strategy = nil
      
      # Performance tracking
      @shots_fired = 0
      @shots_hit = 0
      @enemies_spotted = []
      @last_enemy_position = nil
    end

    # Main AI update loop
    def update(game_state, delta_time)
      return unless should_make_decision?(delta_time)
      
      # Gather sensory information
      visible_enemies = scan_for_enemies(game_state)
      audible_sounds = detect_sounds(game_state)
      team_status = analyze_team_status(game_state)
      
      # Update memory
      @memory.update(visible_enemies, audible_sounds)
      
      # Decide action based on state and inputs
      decide_action(game_state, visible_enemies, team_status)
      
      # Execute current behavior
      execute_behavior(game_state, delta_time)
      
      @last_decision_time = Time.now.to_f
    end

    private

    def should_make_decision?(delta_time)
      Time.now.to_f - @last_decision_time >= @config[:decision_interval]
    end

    def scan_for_enemies(game_state)
      enemies = []
      awareness_radius = @config[:awareness_radius]
      
      game_state.players.each do |player|
        next if player.team == @bot.team || player.dead?
        
        distance = calculate_distance(@bot.position, player.position)
        next if distance > awareness_radius
        
        # Check line of sight
        if has_line_of_sight?(game_state, @bot.position, player.position)
          enemies << {
            player: player,
            distance: distance,
            angle: calculate_angle(@bot.position, player.position),
            threat_level: calculate_threat_level(player, distance)
          }
        end
      end
      
      enemies.sort_by { |e| e[:threat_level] }.reverse
    end

    def detect_sounds(game_state)
      sounds = []
      
      # Detect gunfire, footsteps, bomb plants, etc.
      game_state.recent_events.each do |event|
        case event[:type]
        when :gunfire
          distance = calculate_distance(@bot.position, event[:position])
          if distance <= @config[:awareness_radius] * 1.5
            sounds << { type: :gunfire, position: event[:position], distance: distance }
          end
        when :footsteps
          distance = calculate_distance(@bot.position, event[:position])
          if distance <= @config[:awareness_radius] * 0.5
            sounds << { type: :footsteps, position: event[:position], distance: distance }
          end
        when :bomb_plant, :bomb_defuse
          sounds << { type: event[:type], position: event[:position] }
        end
      end
      
      sounds
    end

    def analyze_team_status(game_state)
      teammates = game_state.players.select { |p| p.team == @bot.team && !p.dead? && p != @bot }
      
      {
        alive_count: teammates.size,
        average_health: teammates.empty? ? 0 : teammates.sum(&:health) / teammates.size.to_f,
        closest_teammate: teammates.min_by { |t| calculate_distance(@bot.position, t.position) },
        team_objective: determine_team_objective(game_state)
      }
    end

    def decide_action(game_state, visible_enemies, team_status)
      # Priority-based decision making
      if @bot.health < 30 && @config[:strategy_level] >= 2
        @state = BehaviorState::RETREATING
        find_cover(game_state)
      elsif visible_enemies.any?
        handle_enemy_encounter(visible_enemies.first, game_state)
      elsif should_pursue_objective?(game_state, team_status)
        pursue_objective(game_state, team_status)
      elsif @memory.has_recent_enemy_sighting?
        @state = BehaviorState::SEARCHING
        search_for_enemies(game_state)
      else
        patrol_or_follow(game_state, team_status)
      end
    end

    def handle_enemy_encounter(enemy_info, game_state)
      threat_level = enemy_info[:threat_level]
      
      # Reaction time simulation
      if Time.now.to_f - @memory.first_enemy_sighting_time < @config[:reaction_time]
        return # Still reacting
      end
      
      @target = enemy_info[:player]
      
      # Decide fight or flight based on personality and situation
      if should_engage?(enemy_info, game_state)
        @state = BehaviorState::ATTACKING
        engage_enemy(enemy_info, game_state)
      else
        @state = BehaviorState::RETREATING
        tactical_retreat(game_state)
      end
    end

    def should_engage?(enemy_info, game_state)
      # Consider health, weapon, distance, and personality
      health_factor = @bot.health / 100.0
      weapon_factor = calculate_weapon_effectiveness(enemy_info[:distance])
      personality_factor = @personality[:aggression]
      
      engagement_score = (health_factor + weapon_factor + personality_factor) / 3.0
      engagement_score > 0.5
    end

    def engage_enemy(enemy_info, game_state)
      # Aim adjustment based on difficulty
      aim_offset = calculate_aim_offset(enemy_info[:distance])
      
      # Movement while shooting (strafing)
      if @config[:movement_skill] > 0.5
        strafe_direction = (Time.now.to_i % 2 == 0) ? :left : :right
        perform_strafe(strafe_direction)
      end
      
      # Shooting decision
      if should_shoot?(enemy_info)
        fire_weapon(enemy_info[:player].position + aim_offset)
        @shots_fired += 1
      end
      
      # Advanced tactics for higher difficulties
      if @config[:strategy_level] >= 3
        use_grenades_tactically(enemy_info, game_state) if has_grenades?
        take_cover_while_reloading(game_state) if needs_reload?
      end
    end

    def calculate_aim_offset(distance)
      # Less accurate at longer distances and lower difficulties
      max_offset = (1.0 - @config[:accuracy]) * 50
      distance_factor = [distance / 500.0, 1.0].min
      
      offset_x = (rand - 0.5) * max_offset * distance_factor
      offset_y = (rand - 0.5) * max_offset * distance_factor
      
      { x: offset_x, y: offset_y }
    end

    def pursue_objective(game_state, team_status)
      objective = team_status[:team_objective]
      
      case objective[:type]
      when :plant_bomb
        @state = BehaviorState::MOVING
        @destination = find_bomb_site(game_state)
        move_tactically_to(@destination, game_state)
      when :defuse_bomb
        @state = BehaviorState::MOVING
        @destination = game_state.bomb_position
        move_tactically_to(@destination, game_state)
      when :defend_site
        @state = BehaviorState::DEFENDING
        defend_position(objective[:position], game_state)
      when :rescue_hostages
        @state = BehaviorState::MOVING
        @destination = find_nearest_hostage(game_state)
        move_tactically_to(@destination, game_state)
      end
    end

    def move_tactically_to(destination, game_state)
      return unless destination
      
      # Path finding with tactical considerations
      @path = find_path(@bot.position, destination, game_state)
      
      if @path && @path.any?
        next_position = @path.first
        
        # Check corners and dangerous areas
        if @config[:strategy_level] >= 2
          check_corners(next_position, game_state)
          use_smoke_for_cover(next_position, game_state) if under_fire?
        end
        
        # Move with appropriate speed
        movement_speed = calculate_movement_speed(game_state)
        move_towards(next_position, movement_speed)
        
        # Remove reached waypoints
        @path.shift if reached_position?(next_position)
      end
    end

    def patrol_or_follow(game_state, team_status)
      if @config[:team_coordination] > 0.5 && team_status[:closest_teammate]
        # Follow teammate
        @state = BehaviorState::FOLLOWING
        follow_teammate(team_status[:closest_teammate], game_state)
      else
        # Patrol map
        @state = BehaviorState::MOVING
        patrol_map(game_state)
      end
    end

    def use_grenades_tactically(enemy_info, game_state)
      return unless has_grenades?
      
      distance = enemy_info[:distance]
      
      if distance > 200 && distance < 500 && has_item?(:grenade)
        # Use HE grenade for medium distance
        throw_grenade(:he, calculate_grenade_trajectory(enemy_info[:player].position))
      elsif distance < 150 && has_item?(:flashbang) && rand < 0.3
        # Use flashbang for close encounters
        throw_grenade(:flashbang, enemy_info[:player].position)
      elsif under_heavy_fire? && has_item?(:smoke)
        # Use smoke for cover
        throw_grenade(:smoke, @bot.position)
      end
    end

    # Bot Memory System
    class BotMemory
      attr_reader :enemy_sightings, :sound_sources, :dangerous_areas
      
      def initialize
        @enemy_sightings = []
        @sound_sources = []
        @dangerous_areas = []
        @first_enemy_sighting_time = nil
      end
      
      def update(enemies, sounds)
        # Update enemy sightings
        enemies.each do |enemy|
          @enemy_sightings << {
            position: enemy[:player].position,
            timestamp: Time.now.to_f,
            player_id: enemy[:player].id
          }
        end
        
        @first_enemy_sighting_time ||= Time.now.to_f if enemies.any?
        
        # Update sound sources
        sounds.each do |sound|
          @sound_sources << {
            type: sound[:type],
            position: sound[:position],
            timestamp: Time.now.to_f
          }
        end
        
        # Clean old memories
        cleanup_old_memories
      end
      
      def has_recent_enemy_sighting?
        @enemy_sightings.any? { |s| Time.now.to_f - s[:timestamp] < 5.0 }
      end
      
      def last_known_enemy_position
        recent = @enemy_sightings.select { |s| Time.now.to_f - s[:timestamp] < 10.0 }
        recent.max_by { |s| s[:timestamp] }&.dig(:position)
      end
      
      def first_enemy_sighting_time
        @first_enemy_sighting_time || Time.now.to_f
      end
      
      private
      
      def cleanup_old_memories
        current_time = Time.now.to_f
        @enemy_sightings.reject! { |s| current_time - s[:timestamp] > 30.0 }
        @sound_sources.reject! { |s| current_time - s[:timestamp] > 10.0 }
        @dangerous_areas.reject! { |a| current_time - a[:timestamp] > 60.0 }
        
        @first_enemy_sighting_time = nil if @enemy_sightings.empty?
      end
    end

    # Helper methods
    def calculate_distance(pos1, pos2)
      Math.sqrt((pos1[:x] - pos2[:x])**2 + (pos1[:y] - pos2[:y])**2)
    end

    def calculate_angle(from_pos, to_pos)
      Math.atan2(to_pos[:y] - from_pos[:y], to_pos[:x] - from_pos[:x])
    end

    def has_line_of_sight?(game_state, from_pos, to_pos)
      # Ray casting to check for obstacles
      # Simplified version - would need actual map collision detection
      !game_state.map.has_wall_between?(from_pos, to_pos)
    end

    def calculate_threat_level(player, distance)
      health_threat = player.health / 100.0
      weapon_threat = player.current_weapon ? 0.8 : 0.2
      distance_threat = 1.0 - (distance / @config[:awareness_radius])
      
      (health_threat + weapon_threat + distance_threat) / 3.0
    end

    def calculate_weapon_effectiveness(distance)
      return 0 unless @bot.current_weapon
      
      weapon = @bot.current_weapon
      optimal_range = weapon[:optimal_range] || 200
      
      if distance <= optimal_range
        1.0
      else
        [1.0 - ((distance - optimal_range) / optimal_range), 0.1].max
      end
    end

    def should_shoot?(enemy_info)
      return false unless @bot.current_weapon
      return false if @bot.current_weapon[:ammo] == 0
      
      # Check fire rate
      current_time = Time.now.to_f
      fire_rate = @bot.current_weapon[:fire_rate] || 0.1
      return false if current_time - @last_shot_time < fire_rate
      
      # Check accuracy threshold
      aim_quality = calculate_aim_quality(enemy_info)
      if aim_quality > (1.0 - @config[:accuracy])
        @last_shot_time = current_time
        true
      else
        false
      end
    end

    def calculate_aim_quality(enemy_info)
      # Simulate gradual aim improvement
      time_aiming = Time.now.to_f - @memory.first_enemy_sighting_time
      aim_improvement = [time_aiming * @config[:aim_speed], 1.0].min
      
      base_accuracy = @config[:accuracy]
      distance_penalty = enemy_info[:distance] / 1000.0
      
      [base_accuracy * aim_improvement - distance_penalty, 0.1].max
    end

    def fire_weapon(target_position)
      # Simulate weapon firing
      @bot.fire_at(target_position)
    end

    def perform_strafe(direction)
      strafe_speed = @config[:movement_skill] * 100
      
      case direction
      when :left
        @bot.move_relative(-strafe_speed, 0)
      when :right
        @bot.move_relative(strafe_speed, 0)
      end
    end

    def find_path(from, to, game_state)
      # A* pathfinding would go here
      # Simplified version returns direct path
      [to]
    end

    def move_towards(position, speed)
      @bot.move_towards(position, speed)
    end

    def reached_position?(position, threshold = 10)
      calculate_distance(@bot.position, position) < threshold
    end

    def defend_position(position, game_state)
      # Find good defensive spot near position
      defensive_spot = find_defensive_position(position, game_state)
      
      if reached_position?(defensive_spot)
        @state = BehaviorState::CAMPING
        # Look around for enemies
        scan_area(game_state)
      else
        move_towards(defensive_spot, @config[:movement_skill] * 80)
      end
    end

    def find_defensive_position(position, game_state)
      # Find cover near the position
      # Simplified - would need actual map analysis
      position
    end

    def scan_area(game_state)
      # Rotate view to scan for enemies
      @bot.rotate_view(Time.now.to_f * 0.5)
    end

    def determine_team_objective(game_state)
      # Determine what the team should be doing
      if game_state.mode == :bomb_defusal
        if @bot.team == :terrorist
          if game_state.bomb_planted?
            { type: :defend_site, position: game_state.bomb_position }
          else
            { type: :plant_bomb }
          end
        else # CT
          if game_state.bomb_planted?
            { type: :defuse_bomb }
          else
            { type: :defend_site, position: game_state.bomb_sites.sample }
          end
        end
      elsif game_state.mode == :hostage_rescue
        if @bot.team == :ct
          { type: :rescue_hostages }
        else
          { type: :defend_hostages }
        end
      else
        { type: :eliminate_enemies }
      end
    end
  end
end