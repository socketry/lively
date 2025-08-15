# frozen_string_literal: true

require_relative "tile_map_system"

# Pre-built map templates for classic CS maps
class MapTemplates
	
	# Generate a simplified de_dust2 map (40x30 tiles)
	def self.generate_dust2
		map = TileMapSystem.new(40, 30)
		map.metadata[:name] = "de_dust2_simple"
		map.metadata[:author] = "CS2D"
		map.metadata[:game_mode] = "defuse"
		
		# Fill with floor
		(0...30).each do |y|
			(0...40).each do |x|
				map.set_tile(x, y, :floor)
			end
		end
		
		# Outer walls
		(0...40).each do |x|
			map.set_tile(x, 0, :wall)
			map.set_tile(x, 29, :wall)
		end
		(0...30).each do |y|
			map.set_tile(0, y, :wall)
			map.set_tile(39, y, :wall)
		end
		
		# T Spawn area (bottom left)
		(24..28).each do |y|
			(2..7).each do |x|
				map.set_tile(x, y, :t_spawn) if y == 26 && x.between?(3, 6)
				map.set_tile(x, y, :buy_zone_t) if y.between?(25, 27) && x.between?(2, 7)
			end
		end
		
		# CT Spawn area (top right)
		(2..6).each do |y|
			(32..37).each do |x|
				map.set_tile(x, y, :ct_spawn) if y == 4 && x.between?(33, 36)
				map.set_tile(x, y, :buy_zone_ct) if y.between?(3, 5) && x.between?(32, 37)
			end
		end
		
		# Bombsite A (top middle-right)
		(6..11).each do |y|
			(26..32).each do |x|
				map.set_tile(x, y, :bombsite_a)
			end
		end
		# A site boxes
		map.set_tile(27, 7, :box)
		map.set_tile(31, 9, :box)
		map.set_tile(28, 10, :box)
		
		# Bombsite B (bottom middle-left)
		(19..24).each do |y|
			(10..16).each do |x|
				map.set_tile(x, y, :bombsite_b)
			end
		end
		# B site boxes
		map.set_tile(11, 20, :box)
		map.set_tile(15, 22, :box)
		map.set_tile(13, 23, :barrel)
		
		# Long A path
		(6..8).each do |y|
			(8..25).each do |x|
				next if map.get_tile(x, y) == :bombsite_a
				# Add walls for long A corridor
				map.set_tile(x, 5, :wall) if x.between?(8, 25)
				map.set_tile(x, 9, :wall) if x.between?(8, 18)
			end
		end
		
		# Long A doors
		map.set_tile(19, 7, :door)
		
		# Mid area
		(12..18).each do |y|
			(18..22).each do |x|
				# Mid doors
				if x == 20 && y.between?(14, 16)
					map.set_tile(x, y, :door_rotating)
				end
			end
		end
		
		# Catwalk to A
		(10..12).each do |y|
			(20..26).each do |x|
				# Make elevated path
				map.set_tile(x, 10, :wall) if x.between?(20, 22)
				map.set_tile(x, 12, :wall) if x.between?(20, 22)
			end
		end
		
		# B tunnels
		(22..26).each do |y|
			(8..12).each do |x|
				# Tunnel walls
				map.set_tile(7, y, :wall) if y.between?(22, 26)
				map.set_tile(13, y, :wall) if y.between?(22, 26)
			end
		end
		# B tunnel entrance from T spawn
		map.set_tile(8, 25, :floor)
		
		# Short A path
		(10..14).each do |y|
			(24..28).each do |x|
				# Short walls
				map.set_tile(23, y, :wall) if y.between?(10, 14)
				map.set_tile(29, y, :wall) if y.between?(10, 14)
			end
		end
		
		# Additional cover and details
		# Mid boxes
		map.set_tile(19, 15, :box)
		map.set_tile(21, 15, :box)
		
		# Long A corner box
		map.set_tile(10, 7, :box)
		
		# CT mid position
		map.set_tile(22, 12, :box)
		
		# Lower B box
		map.set_tile(9, 21, :wall_breakable)
		
		# Upper B window
		(17..18).each do |y|
			(14..15).each do |x|
				map.set_tile(x, y, :glass)
			end
		end
		
		# Vents (alternative path)
		map.set_tile(25, 14, :vent)
		map.set_tile(26, 14, :vent)
		
		map
	end
	
	# Generate a simplified de_inferno map
	def self.generate_inferno
		map = TileMapSystem.new(40, 30)
		map.metadata[:name] = "de_inferno_simple"
		map.metadata[:author] = "CS2D"
		map.metadata[:game_mode] = "defuse"
		
		# Fill with floor
		(0...30).each do |y|
			(0...40).each do |x|
				map.set_tile(x, y, :floor)
			end
		end
		
		# Outer walls
		(0...40).each do |x|
			map.set_tile(x, 0, :wall)
			map.set_tile(x, 29, :wall)
		end
		(0...30).each do |y|
			map.set_tile(0, y, :wall)
			map.set_tile(39, y, :wall)
		end
		
		# T Spawn (bottom)
		(24..27).each do |y|
			(18..22).each do |x|
				map.set_tile(x, y, :t_spawn) if y == 25 && x.between?(19, 21)
				map.set_tile(x, y, :buy_zone_t) if y.between?(24, 26)
			end
		end
		
		# CT Spawn (top)
		(2..5).each do |y|
			(18..22).each do |x|
				map.set_tile(x, y, :ct_spawn) if y == 3 && x.between?(19, 21)
				map.set_tile(x, y, :buy_zone_ct) if y.between?(2, 4)
			end
		end
		
		# Bombsite A (top left)
		(6..11).each do |y|
			(5..11).each do |x|
				map.set_tile(x, y, :bombsite_a)
			end
		end
		
		# Bombsite B (right side)
		(12..17).each do |y|
			(28..34).each do |x|
				map.set_tile(x, y, :bombsite_b)
			end
		end
		
		# Banana (curved path to B)
		# Create curved corridor
		(18..24).each do |y|
			(24..28).each do |x|
				# Banana walls
				if y == 18
					map.set_tile(x, y, :wall) if x < 24 || x > 27
				elsif y == 19
					map.set_tile(x, y, :wall) if x < 23 || x > 28
				end
			end
		end
		# Banana car
		map.set_tile(25, 20, :box)
		map.set_tile(26, 20, :box)
		
		# Mid area
		(10..18).each do |y|
			(14..20).each do |x|
				# Mid walls
				map.set_tile(13, y, :wall) if y.between?(10, 18) && y != 14
				map.set_tile(21, y, :wall) if y.between?(10, 18) && y != 14
			end
		end
		
		# Apartments (alternative A path)
		(6..10).each do |y|
			(12..18).each do |x|
				# Apartment walls
				map.set_tile(x, 5, :wall) if x.between?(12, 18)
				map.set_tile(x, 11, :wall) if x.between?(12, 18)
				map.set_tile(12, y, :wall) if y.between?(6, 10)
				# Apartment window
				map.set_tile(13, 8, :glass)
			end
		end
		# Apartment stairs
		map.set_tile(17, 8, :ladder)
		
		# Arch (CT side B approach)
		(14..18).each do |y|
			(22..26).each do |x|
				# Arch structure
				if y == 14 || y == 18
					map.set_tile(x, y, :wall) if x.between?(22, 26)
				end
			end
		end
		
		# Library (CT side A approach)
		(6..9).each do |y|
			(19..24).each do |x|
				# Library walls
				map.set_tile(19, y, :wall) if y.between?(6, 9)
				map.set_tile(24, y, :wall) if y.between?(6, 9)
			end
		end
		
		# Pit (A site)
		map.set_tile(7, 10, :wall)
		map.set_tile(8, 10, :wall)
		map.set_tile(7, 11, :wall)
		
		# Fountain (B site)
		map.set_tile(31, 14, :water)
		map.set_tile(31, 15, :water)
		map.set_tile(30, 14, :barrel)
		
		# Additional cover
		# A site boxes
		map.set_tile(6, 8, :box)
		map.set_tile(10, 7, :box)
		
		# B site boxes
		map.set_tile(29, 13, :box)
		map.set_tile(33, 16, :box)
		
		# Sandbags at banana
		map.set_tile(24, 21, :box)
		map.set_tile(27, 21, :box)
		
		map
	end
	
	# Generate a simple aim map for practice
	def self.generate_aim_map
		map = TileMapSystem.new(30, 20)
		map.metadata[:name] = "aim_map"
		map.metadata[:author] = "CS2D"
		map.metadata[:game_mode] = "deathmatch"
		map.metadata[:recommended_players] = "1v1"
		
		# Fill with floor
		(0...20).each do |y|
			(0...30).each do |x|
				map.set_tile(x, y, :floor)
			end
		end
		
		# Outer walls
		(0...30).each do |x|
			map.set_tile(x, 0, :wall)
			map.set_tile(x, 19, :wall)
		end
		(0...20).each do |y|
			map.set_tile(0, y, :wall)
			map.set_tile(29, y, :wall)
		end
		
		# CT spawn area (left)
		(8..11).each do |y|
			(2..5).each do |x|
				map.set_tile(x, y, :ct_spawn) if x == 3 && y == 10
				map.set_tile(x, y, :buy_zone_ct)
			end
		end
		
		# T spawn area (right)
		(8..11).each do |y|
			(24..27).each do |x|
				map.set_tile(x, y, :t_spawn) if x == 26 && y == 10
				map.set_tile(x, y, :buy_zone_t)
			end
		end
		
		# Central cover
		# Low boxes
		map.set_tile(10, 9, :box)
		map.set_tile(10, 10, :box)
		map.set_tile(19, 9, :box)
		map.set_tile(19, 10, :box)
		
		# Mid wall
		(8..11).each do |y|
			map.set_tile(14, y, :wall)
			map.set_tile(15, y, :wall)
		end
		
		# Side boxes for angle practice
		map.set_tile(7, 5, :box)
		map.set_tile(7, 14, :box)
		map.set_tile(22, 5, :box)
		map.set_tile(22, 14, :box)
		
		map
	end
	
	# Generate fy_iceworld style map
	def self.generate_iceworld
		map = TileMapSystem.new(25, 25)
		map.metadata[:name] = "fy_iceworld"
		map.metadata[:author] = "CS2D"
		map.metadata[:game_mode] = "deathmatch"
		map.metadata[:recommended_players] = "8-16"
		
		# Fill with floor
		(0...25).each do |y|
			(0...25).each do |x|
				map.set_tile(x, y, :floor)
			end
		end
		
		# Outer walls
		(0...25).each do |x|
			map.set_tile(x, 0, :wall)
			map.set_tile(x, 24, :wall)
		end
		(0...25).each do |y|
			map.set_tile(0, y, :wall)
			map.set_tile(24, y, :wall)
		end
		
		# CT spawns (corners)
		map.set_tile(2, 2, :ct_spawn)
		map.set_tile(22, 2, :ct_spawn)
		map.set_tile(2, 22, :ct_spawn)
		map.set_tile(22, 22, :ct_spawn)
		
		# T spawns (middle sides)
		map.set_tile(12, 2, :t_spawn)
		map.set_tile(2, 12, :t_spawn)
		map.set_tile(22, 12, :t_spawn)
		map.set_tile(12, 22, :t_spawn)
		
		# Buy zones around spawns
		(1..3).each do |offset|
			# CT buy zones
			map.set_tile(2 + offset, 2, :buy_zone_ct)
			map.set_tile(22 - offset, 2, :buy_zone_ct)
			map.set_tile(2 + offset, 22, :buy_zone_ct)
			map.set_tile(22 - offset, 22, :buy_zone_ct)
			
			# T buy zones
			map.set_tile(12, 2 + offset, :buy_zone_t)
			map.set_tile(2 + offset, 12, :buy_zone_t)
			map.set_tile(22 - offset, 12, :buy_zone_t)
			map.set_tile(12, 22 - offset, :buy_zone_t)
		end
		
		# Central structure (4 pillars)
		(10..14).each do |y|
			(10..14).each do |x|
				# Create pillars
				if (x == 10 || x == 14) && (y == 10 || y == 14)
					map.set_tile(x, y, :wall)
				end
			end
		end
		
		# Random boxes for cover
		map.set_tile(5, 5, :box)
		map.set_tile(19, 5, :box)
		map.set_tile(5, 19, :box)
		map.set_tile(19, 19, :box)
		
		# Center box
		map.set_tile(12, 12, :box)
		
		# Side cover
		map.set_tile(7, 12, :barrel)
		map.set_tile(17, 12, :barrel)
		map.set_tile(12, 7, :barrel)
		map.set_tile(12, 17, :barrel)
		
		map
	end
	
	# List all available templates
	def self.available_templates
		[
			{ name: "de_dust2_simple", method: :generate_dust2, mode: "defuse", players: "5v5" },
			{ name: "de_inferno_simple", method: :generate_inferno, mode: "defuse", players: "5v5" },
			{ name: "aim_map", method: :generate_aim_map, mode: "deathmatch", players: "1v1" },
			{ name: "fy_iceworld", method: :generate_iceworld, mode: "deathmatch", players: "8-16" }
		]
	end
	
	# Get a specific template by name
	def self.get_template(name)
		template = available_templates.find { |t| t[:name] == name }
		return nil unless template
		
		send(template[:method])
	end
end