#!/usr/bin/env ruby
# frozen_string_literal: true

require "webrick"
require "json"
require_relative "../../game/async_redis_room_manager"
require_relative "../../game/map_templates"

# API Bridge Server - connects static HTML pages to Redis backend
class APIBridgeServer < WEBrick::HTTPServlet::AbstractServlet
	def initialize(server, room_manager)
		super(server)
		@room_manager = room_manager
	end
	
	def do_GET(request, response)
		response["Access-Control-Allow-Origin"] = "*"
		response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
		response["Access-Control-Allow-Headers"] = "Content-Type"
		response["Content-Type"] = "application/json"
		
		path = request.path_info
		query = request.query
		
		case path
		when "/room"
			# Get room info
			room_id = query["room_id"]
			if room_id
				room_info = @room_manager.get_room_info(room_id)
				players = @room_manager.get_room_players(room_id)
				
				if room_info
					response_data = {
						success: true,
						room: room_info,
						players: players
					}
				else
					response_data = { success: false, error: "Room not found" }
				end
			else
				response_data = { success: false, error: "Missing room_id" }
			end
			
			response.body = response_data.to_json
			
		when %r{^/rooms/([^/]+)$}
			# Get specific room by ID (fix for 404 error)
			room_id = request.path_info.split('/').last
			room_info = @room_manager.get_room_info(room_id)
			players = @room_manager.get_room_players(room_id)
			
			if room_info
				response_data = {
					success: true,
					room: room_info,
					players: players
				}
			else
				response_data = { success: false, error: "Room not found" }
			end
			
			response.body = response_data.to_json
			
		when "/rooms"
			# Get all rooms
			rooms = @room_manager.get_room_list
			response.body = { success: true, rooms: rooms }.to_json
			
		when "/maps"
			# Get list of available maps
			maps = MapTemplates.available_templates.map do |template|
				{
					name: template[:name],
					mode: template[:mode],
					players: template[:players]
				}
			end
			response.body = { success: true, maps: maps }.to_json
			
		when %r{^/map/([^/]+)$}
			# Get specific map data
			map_name = request.path_info.split('/').last
			map = MapTemplates.get_template(map_name)
			
			if map
				response.body = { 
					success: true, 
					map_data: map.export_to_json 
				}.to_json
			else
				response.status = 404
				response.body = { success: false, error: "Map not found" }.to_json
			end
			
		else
			response.status = 404
			response.body = { error: "Not found" }.to_json
		end
	end
	
	def do_POST(request, response)
		response["Access-Control-Allow-Origin"] = "*"
		response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
		response["Access-Control-Allow-Headers"] = "Content-Type"
		response["Content-Type"] = "application/json"
		
		path = request.path_info
		
		begin
			body = JSON.parse(request.body) rescue {}
			
			case path
			when "/room/add_bot"
				# Add bot to room
				room_id = body["room_id"]
				bot_name = body["bot_name"] || "Bot_#{rand(1000..9999)}"
				difficulty = body["difficulty"] || "normal"
				
				if room_id
					success = @room_manager.add_bot_to_room(room_id, bot_name, difficulty)
					if success
						players = @room_manager.get_room_players(room_id)
						response_data = { success: true, players: players }
					else
						response_data = { success: false, error: "Failed to add bot" }
					end
				else
					response_data = { success: false, error: "Missing room_id" }
				end
				
				response.body = response_data.to_json
				
			when "/api/room/remove_bot"
				# Remove bot from room
				room_id = body["room_id"]
				bot_id = body["bot_id"]
				
				if room_id && bot_id
					success = @room_manager.remove_bot_from_room(room_id, bot_id)
					if success
						players = @room_manager.get_room_players(room_id)
						response_data = { success: true, players: players }
					else
						response_data = { success: false, error: "Failed to remove bot" }
					end
				else
					response_data = { success: false, error: "Missing parameters" }
				end
				
				response.body = response_data.to_json
				
			when "/api/room/start_game"
				# Start game
				room_id = body["room_id"]
				player_id = body["player_id"]
				
				if room_id && player_id
					result = @room_manager.start_game(player_id, room_id)
					response_data = result
				else
					response_data = { success: false, error: "Missing parameters" }
				end
				
				response.body = response_data.to_json
				
			else
				response.status = 404
				response.body = { error: "Not found" }.to_json
			end
		rescue => e
			response.status = 500
			response.body = { error: e.message }.to_json
		end
	end
	
	def do_OPTIONS(request, response)
		response["Access-Control-Allow-Origin"] = "*"
		response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
		response["Access-Control-Allow-Headers"] = "Content-Type"
		response.status = 200
		response.body = ""
	end
end

# Start the API bridge server
if __FILE__ == $0
	port = ARGV[0]&.to_i || 9294
	
	puts "Starting API Bridge Server on port #{port}..."
	
	# Initialize room manager
	room_manager = AsyncRedisRoomManager.new
	
	server = WEBrick::HTTPServer.new(Port: port)
	server.mount "/api", APIBridgeServer, room_manager
	
	trap("INT") { server.shutdown }
	
	puts "API Bridge Server running at http://localhost:#{port}"
	server.start
end