#!/usr/bin/env ruby
# frozen_string_literal: true

require "webrick"
require "json"
require_relative "../../lib/server_config"
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

# Health check servlet
class HealthCheckServlet < WEBrick::HTTPServlet::AbstractServlet
	def initialize(server, start_time)
		super(server)
		@start_time = start_time
	end
	
	def do_GET(request, response)
		response["Access-Control-Allow-Origin"] = "*"
		response["Content-Type"] = "application/json"
		
		uptime_seconds = Time.now.to_i - @start_time
		
		health_data = {
			status: 'healthy',
			service: 'CS2D API Bridge Server',
			version: '1.0.0',
			port: ServerConfig.api_port,
			hostname: ServerConfig.hostname,
			uptime_seconds: uptime_seconds,
			uptime_human: format_uptime(uptime_seconds),
			endpoints: [
				'/api/room',
				'/api/rooms',
				'/api/maps',
				'/api/map/:name',
				'/api/room/add_bot',
				'/api/room/remove_bot',
				'/api/room/start_game'
			],
			server_config: {
				api_url: ServerConfig.api_url,
				lively_url: ServerConfig.lively_url,
				static_url: ServerConfig.static_url
			},
			timestamp: Time.now.iso8601
		}
		
		response.body = health_data.to_json
	end
	
	private
	
	def format_uptime(seconds)
		days = seconds / (24 * 3600)
		hours = (seconds % (24 * 3600)) / 3600
		minutes = (seconds % 3600) / 60
		secs = seconds % 60
		
		if days > 0
			"#{days}d #{hours}h #{minutes}m #{secs}s"
		elsif hours > 0
			"#{hours}h #{minutes}m #{secs}s"
		elsif minutes > 0
			"#{minutes}m #{secs}s"
		else
			"#{secs}s"
		end
	end
end

# Start the API bridge server
if __FILE__ == $0
	port = ARGV[0]&.to_i || ServerConfig.api_port
	start_time = Time.now.to_i
	
	puts "CS2D API Bridge Server Configuration:"
	puts "===================================="
	puts "Port: #{port}"
	puts "API URL: #{ServerConfig.api_url}"
	puts "Lively URL: #{ServerConfig.lively_url}"
	puts "Static URL: #{ServerConfig.static_url}"
	puts "Health endpoint: #{ServerConfig.api_health_url}"
	puts
	
	puts "Starting API Bridge Server on port #{port}..."
	
	# Initialize room manager
	room_manager = AsyncRedisRoomManager.new
	
	server = WEBrick::HTTPServer.new(Port: port)
	server.mount "/api", APIBridgeServer, room_manager
	server.mount "/health", HealthCheckServlet, start_time
	
	trap("INT") { server.shutdown }
	
	puts "API Bridge Server running at #{ServerConfig.api_url}"
	puts "Health check available at: #{ServerConfig.api_health_url}"
	server.start
end