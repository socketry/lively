# frozen_string_literal: true

require "json"

# Tile-based Map System for CS2D
# Provides efficient collision detection and map rendering
class TileMapSystem
	TILE_SIZE = 32  # 32x32 pixels per tile
	
	# Tile type definitions with properties
	TILE_TYPES = {
		# Basic tiles
		empty: { 
			walkable: true, 
			collision: false, 
			sprite: "empty",
			color: "#000000"
		},
		floor: { 
			walkable: true, 
			collision: false, 
			sprite: "floor",
			color: "#3a3a3a"
		},
		wall: { 
			walkable: false, 
			collision: true, 
			sprite: "wall",
			color: "#808080",
			penetrable: false
		},
		wall_breakable: { 
			walkable: false, 
			collision: true, 
			sprite: "wall_breakable",
			color: "#966432",
			penetrable: true,
			health: 100
		},
		
		# Tactical elements
		box: { 
			walkable: false, 
			collision: true, 
			sprite: "box",
			color: "#654321",
			penetrable: true,
			height: 0.5  # Half-height for headshot angles
		},
		barrel: { 
			walkable: false, 
			collision: true, 
			sprite: "barrel",
			color: "#4a4a4a",
			penetrable: true,
			explosive: true
		},
		
		# Environmental
		water: { 
			walkable: true, 
			collision: false, 
			sprite: "water",
			color: "#0066cc",
			movement_speed: 0.5  # Slow movement
		},
		ladder: { 
			walkable: true, 
			collision: false, 
			sprite: "ladder",
			color: "#8b4513",
			climbable: true
		},
		glass: { 
			walkable: false, 
			collision: true, 
			sprite: "glass",
			color: "#87ceeb",
			penetrable: true,
			transparent: true,
			breakable: true
		},
		
		# Special zones
		bombsite_a: { 
			walkable: true, 
			collision: false, 
			sprite: "bombsite_a",
			color: "#ffaa00",
			special: :bomb_plant_a,
			zone: true
		},
		bombsite_b: { 
			walkable: true, 
			collision: false, 
			sprite: "bombsite_b",
			color: "#ff00aa",
			special: :bomb_plant_b,
			zone: true
		},
		ct_spawn: { 
			walkable: true, 
			collision: false, 
			sprite: "ct_spawn",
			color: "#0088ff",
			special: :spawn_ct,
			protected: true  # No damage for 5 seconds
		},
		t_spawn: { 
			walkable: true, 
			collision: false, 
			sprite: "t_spawn",
			color: "#ff8800",
			special: :spawn_t,
			protected: true
		},
		buy_zone_ct: { 
			walkable: true, 
			collision: false, 
			sprite: "buy_zone_ct",
			color: "#0044aa",
			special: :buy_ct,
			zone: true
		},
		buy_zone_t: { 
			walkable: true, 
			collision: false, 
			sprite: "buy_zone_t",
			color: "#aa4400",
			special: :buy_t,
			zone: true
		},
		
		# Interactive elements
		door: { 
			walkable: false, 
			collision: true, 
			sprite: "door",
			color: "#8b6914",
			interactive: true,
			openable: true
		},
		door_rotating: { 
			walkable: false, 
			collision: true, 
			sprite: "door_rotating",
			color: "#6b4914",
			interactive: true,
			rotation: true
		},
		vent: { 
			walkable: true, 
			collision: false, 
			sprite: "vent",
			color: "#4a4a4a",
			special: :vent,
			noise_level: 2.0  # Louder footsteps
		}
	}.freeze
	
	attr_reader :width, :height, :tiles, :metadata, :spawn_points, :zones
	
	def initialize(width = 40, height = 30)
		@width = width
		@height = height
		@tiles = Array.new(height) { Array.new(width, :floor) }
		@metadata = {
			name: "Unnamed Map",
			author: "Unknown",
			version: "1.0",
			game_mode: "defuse",
			created_at: Time.now.to_i,
			recommended_players: "5v5"
		}
		@spawn_points = { ct: [], t: [] }
		@zones = { bombsites: [], buy_zones: [] }
		@collision_cache = nil
	end
	
	def set_tile(x, y, type)
		return false unless valid_position?(x, y)
		return false unless TILE_TYPES.key?(type)
		
		@tiles[y][x] = type
		@collision_cache = nil  # Invalidate cache
		
		# Update special zones
		update_special_zones(x, y, type)
		
		true
	end
	
	def get_tile(x, y)
		return :empty unless valid_position?(x, y)
		@tiles[y][x]
	end
	
	def get_tile_at_position(world_x, world_y)
		tile_x = (world_x / TILE_SIZE).to_i
		tile_y = (world_y / TILE_SIZE).to_i
		get_tile(tile_x, tile_y)
	end
	
	def walkable?(x, y)
		tile = get_tile(x, y)
		TILE_TYPES[tile][:walkable]
	end
	
	def has_collision?(x, y)
		tile = get_tile(x, y)
		TILE_TYPES[tile][:collision]
	end
	
	# Check collision for a rectangular entity
	def check_rect_collision(x, y, width, height)
		# Convert world coordinates to tile coordinates
		left_tile = (x / TILE_SIZE).to_i
		right_tile = ((x + width) / TILE_SIZE).to_i
		top_tile = (y / TILE_SIZE).to_i
		bottom_tile = ((y + height) / TILE_SIZE).to_i
		
		# Check all tiles the rectangle overlaps
		(top_tile..bottom_tile).each do |ty|
			(left_tile..right_tile).each do |tx|
				return true if has_collision?(tx, ty)
			end
		end
		
		false
	end
	
	# Get collision grid for physics engine
	def get_collision_grid
		@collision_cache ||= @tiles.map do |row|
			row.map { |tile| TILE_TYPES[tile][:collision] ? 1 : 0 }
		end
	end
	
	# Get penetration grid for bullet physics
	def get_penetration_grid
		@tiles.map do |row|
			row.map do |tile|
				props = TILE_TYPES[tile]
				if props[:collision]
					props[:penetrable] ? 0.5 : 1.0  # 0.5 = penetrable, 1.0 = solid
				else
					0.0  # No collision
				end
			end
		end
	end
	
	# Pathfinding support (A* algorithm)
	def find_path(start_x, start_y, end_x, end_y)
		# Convert world to tile coordinates
		start_tile = { x: (start_x / TILE_SIZE).to_i, y: (start_y / TILE_SIZE).to_i }
		end_tile = { x: (end_x / TILE_SIZE).to_i, y: (end_y / TILE_SIZE).to_i }
		
		# Simple A* implementation
		open_set = [start_tile]
		came_from = {}
		g_score = { start_tile => 0 }
		f_score = { start_tile => heuristic(start_tile, end_tile) }
		
		while !open_set.empty?
			current = open_set.min_by { |tile| f_score[tile] || Float::INFINITY }
			
			if current == end_tile
				return reconstruct_path(came_from, current)
			end
			
			open_set.delete(current)
			
			neighbors(current).each do |neighbor|
				next unless walkable?(neighbor[:x], neighbor[:y])
				
				tentative_g = g_score[current] + 1
				
				if tentative_g < (g_score[neighbor] || Float::INFINITY)
					came_from[neighbor] = current
					g_score[neighbor] = tentative_g
					f_score[neighbor] = tentative_g + heuristic(neighbor, end_tile)
					open_set << neighbor unless open_set.include?(neighbor)
				end
			end
		end
		
		[]  # No path found
	end
	
	# Line of sight check for visibility
	def has_line_of_sight?(x1, y1, x2, y2)
		# Bresenham's line algorithm
		dx = (x2 - x1).abs
		dy = (y2 - y1).abs
		sx = x1 < x2 ? 1 : -1
		sy = y1 < y2 ? 1 : -1
		err = dx - dy
		
		current_x = x1
		current_y = y1
		
		while current_x != x2 || current_y != y2
			tile_x = (current_x / TILE_SIZE).to_i
			tile_y = (current_y / TILE_SIZE).to_i
			
			tile = get_tile(tile_x, tile_y)
			props = TILE_TYPES[tile]
			
			# Check if tile blocks vision
			return false if props[:collision] && !props[:transparent]
			
			e2 = 2 * err
			if e2 > -dy
				err -= dy
				current_x += sx
			end
			if e2 < dx
				err += dx
				current_y += sy
			end
		end
		
		true
	end
	
	# Export map to JSON
	def export_to_json
		{
			metadata: @metadata,
			dimensions: { width: @width, height: @height },
			tile_size: TILE_SIZE,
			tiles: @tiles,
			spawn_points: find_spawn_points,
			zones: find_zones,
			checksum: calculate_checksum
		}.to_json
	end
	
	# Import map from JSON
	def import_from_json(json_data)
		data = JSON.parse(json_data, symbolize_names: true)
		
		@metadata = data[:metadata]
		@width = data[:dimensions][:width]
		@height = data[:dimensions][:height]
		@tiles = data[:tiles].map { |row| row.map(&:to_sym) }
		
		# Rebuild special zones
		rebuild_special_zones
		
		# Invalidate cache
		@collision_cache = nil
		
		true
	rescue JSON::ParserError => e
		puts "Failed to parse map JSON: #{e.message}"
		false
	end
	
	# Generate minimap data
	def generate_minimap(scale = 4)
		minimap = []
		
		@tiles.each do |row|
			minimap_row = []
			row.each do |tile|
				props = TILE_TYPES[tile]
				color = if props[:collision]
					"#ffffff"  # White for walls
				elsif props[:special]
					props[:color]  # Special color for zones
				else
					"#000000"  # Black for walkable
				end
				minimap_row << color
			end
			minimap << minimap_row
		end
		
		{
			data: minimap,
			width: @width,
			height: @height,
			scale: scale
		}
	end
	
	# Validate map for gameplay
	def validate
		errors = []
		
		# Check spawn points
		ct_spawns = find_spawn_points[:ct]
		t_spawns = find_spawn_points[:t]
		
		errors << "No CT spawn points" if ct_spawns.empty?
		errors << "No T spawn points" if t_spawns.empty?
		errors << "Not enough CT spawns (need 5+)" if ct_spawns.size < 5
		errors << "Not enough T spawns (need 5+)" if t_spawns.size < 5
		
		# Check bomb sites for defuse maps
		if @metadata[:game_mode] == "defuse"
			bombsites = find_bombsites
			errors << "No bombsite A" unless bombsites[:a]
			errors << "No bombsite B" unless bombsites[:b]
		end
		
		# Check buy zones
		buy_zones = find_buy_zones
		errors << "No CT buy zone" if buy_zones[:ct].empty?
		errors << "No T buy zone" if buy_zones[:t].empty?
		
		# Check connectivity (spawns can reach bombsites)
		if ct_spawns.any? && bombsites[:a]
			path = find_path(ct_spawns.first[:x], ct_spawns.first[:y],
							bombsites[:a][:x], bombsites[:a][:y])
			errors << "CT spawn cannot reach bombsite A" if path.empty?
		end
		
		{ valid: errors.empty?, errors: errors }
	end
	
	private
	
	def valid_position?(x, y)
		x >= 0 && x < @width && y >= 0 && y < @height
	end
	
	def update_special_zones(x, y, type)
		props = TILE_TYPES[type]
		return unless props[:special]
		
		case props[:special]
		when :spawn_ct, :spawn_t
			team = props[:special] == :spawn_ct ? :ct : :t
			@spawn_points[team] << { x: x * TILE_SIZE, y: y * TILE_SIZE }
		when :bomb_plant_a, :bomb_plant_b
			site = props[:special] == :bomb_plant_a ? :a : :b
			@zones[:bombsites] << { site: site, x: x, y: y }
		when :buy_ct, :buy_t
			team = props[:special] == :buy_ct ? :ct : :t
			@zones[:buy_zones] << { team: team, x: x, y: y }
		end
	end
	
	def rebuild_special_zones
		@spawn_points = { ct: [], t: [] }
		@zones = { bombsites: [], buy_zones: [] }
		
		@tiles.each_with_index do |row, y|
			row.each_with_index do |tile, x|
				update_special_zones(x, y, tile)
			end
		end
	end
	
	def find_spawn_points
		spawns = { ct: [], t: [] }
		
		@tiles.each_with_index do |row, y|
			row.each_with_index do |tile, x|
				case TILE_TYPES[tile][:special]
				when :spawn_ct
					spawns[:ct] << { x: x * TILE_SIZE, y: y * TILE_SIZE }
				when :spawn_t
					spawns[:t] << { x: x * TILE_SIZE, y: y * TILE_SIZE }
				end
			end
		end
		
		spawns
	end
	
	def find_zones
		zones = { bombsites: { a: [], b: [] }, buy_zones: { ct: [], t: [] } }
		
		@tiles.each_with_index do |row, y|
			row.each_with_index do |tile, x|
				props = TILE_TYPES[tile]
				case props[:special]
				when :bomb_plant_a
					zones[:bombsites][:a] << { x: x, y: y }
				when :bomb_plant_b
					zones[:bombsites][:b] << { x: x, y: y }
				when :buy_ct
					zones[:buy_zones][:ct] << { x: x, y: y }
				when :buy_t
					zones[:buy_zones][:t] << { x: x, y: y }
				end
			end
		end
		
		zones
	end
	
	def find_bombsites
		sites = { a: nil, b: nil }
		
		@tiles.each_with_index do |row, y|
			row.each_with_index do |tile, x|
				case TILE_TYPES[tile][:special]
				when :bomb_plant_a
					sites[:a] = { x: x * TILE_SIZE, y: y * TILE_SIZE }
				when :bomb_plant_b
					sites[:b] = { x: x * TILE_SIZE, y: y * TILE_SIZE }
				end
			end
		end
		
		sites
	end
	
	def find_buy_zones
		zones = { ct: [], t: [] }
		
		@tiles.each_with_index do |row, y|
			row.each_with_index do |tile, x|
				case TILE_TYPES[tile][:special]
				when :buy_ct
					zones[:ct] << { x: x, y: y }
				when :buy_t
					zones[:t] << { x: x, y: y }
				end
			end
		end
		
		zones
	end
	
	def heuristic(tile1, tile2)
		# Manhattan distance
		(tile1[:x] - tile2[:x]).abs + (tile1[:y] - tile2[:y]).abs
	end
	
	def neighbors(tile)
		[
			{ x: tile[:x] - 1, y: tile[:y] },     # Left
			{ x: tile[:x] + 1, y: tile[:y] },     # Right
			{ x: tile[:x], y: tile[:y] - 1 },     # Up
			{ x: tile[:x], y: tile[:y] + 1 },     # Down
			# Diagonals (optional for smoother paths)
			{ x: tile[:x] - 1, y: tile[:y] - 1 }, # Top-left
			{ x: tile[:x] + 1, y: tile[:y] - 1 }, # Top-right
			{ x: tile[:x] - 1, y: tile[:y] + 1 }, # Bottom-left
			{ x: tile[:x] + 1, y: tile[:y] + 1 }  # Bottom-right
		].select { |t| valid_position?(t[:x], t[:y]) }
	end
	
	def reconstruct_path(came_from, current)
		path = [current]
		while came_from.key?(current)
			current = came_from[current]
			path.unshift(current)
		end
		path.map { |tile| { x: tile[:x] * TILE_SIZE + TILE_SIZE/2, 
							y: tile[:y] * TILE_SIZE + TILE_SIZE/2 } }
	end
	
	def calculate_checksum
		require "digest"
		Digest::MD5.hexdigest(@tiles.flatten.join)
	end
end