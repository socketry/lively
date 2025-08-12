# frozen_string_literal: true

require "async/redis"
require "json"
require "securerandom"
require_relative "multiplayer_game_room"

# Async Redis-based room manager for seamless integration with Lively framework
class AsyncRedisRoomManager
	ROOM_TTL = 3600 # 1 hour TTL for rooms
	PLAYER_TTL = 300 # 5 minute TTL for player presence
	
	def initialize
		# Local cache for room instances (per process)
		@room_instances = {}
	end
	
	# Get Redis client within async context
	def with_redis(&block)
		# Ensure we're in an Async context
		Async do
			# Use default connection (localhost:6379)
			client = Async::Redis::Client.new
			
			begin
				yield client
			ensure
				client.close if client
			end
		end.wait
	end
	
	# Find or create a room for a player
	def find_or_create_room(player_id)
		result = with_redis do |redis|
			# Check if player is already in a room
			existing_room_id = redis.get("player:#{player_id}:room")
			
			if existing_room_id && redis.exists?("room:#{existing_room_id}:data")
				# Refresh player TTL using SETEX with current value
				redis.setex("player:#{player_id}:room", PLAYER_TTL, existing_room_id)
				next existing_room_id
			end
			
			# Try to find an available room
			room_id = find_available_room(redis)
			
			if room_id
				assign_player_to_room(redis, player_id, room_id)
				next room_id
			end
			
			# Create a new room
			create_room(player_id)
		end
		result
	end
	
	# Create a new room with Redis persistence
	def create_room(creator_id, settings = {})
		room_id = "room_#{SecureRandom.hex(8)}"
		
		with_redis do |redis|
			# Store room data
			room_data = {
				room_id: room_id,
				creator_id: creator_id,
				created_at: Time.now.to_i,
				max_players: settings[:max_players] || 10,
				name: settings[:name] || "#{creator_id}'s Room",
				map: settings[:map] || "de_dust2",
				game_mode: settings[:game_mode] || "competitive",
				state: "waiting",
				players: [creator_id]
			}
			
			# Use pipeline for atomic operations
			redis.pipeline do |pipe|
				# Use SETEX for setting with expiration
				pipe.setex("room:#{room_id}:data", ROOM_TTL, room_data.to_json)
				pipe.sadd("active_rooms", room_id)
				pipe.setex("player:#{creator_id}:room", PLAYER_TTL, room_id)
				pipe.hset("room:#{room_id}:players", creator_id, Time.now.to_i)
			end
			
			# Create local room instance
			ensure_room_instance(room_id, settings)
			
			Console.info(self, "Created room: #{room_id} for player: #{creator_id}")
			room_id
		end
	end
	
	# Join a specific room
	def join_room(player_id, room_id)
		result = with_redis do |redis|
			unless redis.exists?("room:#{room_id}:data")
				next false
			end
			
			# Check room capacity
			room_data = JSON.parse(redis.get("room:#{room_id}:data"))
			current_players = redis.hlen("room:#{room_id}:players")
			
			if current_players >= room_data["max_players"]
				next false
			end
			
			# Leave current room if any
			leave_room(player_id)
			
			# Join new room
			redis.pipeline do |pipe|
				pipe.setex("player:#{player_id}:room", PLAYER_TTL, room_id)
				pipe.hset("room:#{room_id}:players", player_id, Time.now.to_i)
				
				# Update room data
				room_data["players"] << player_id
				pipe.setex("room:#{room_id}:data", ROOM_TTL, room_data.to_json)
			end
			
			# Ensure room instance exists
			ensure_room_instance(room_id, room_data)
			
			Console.info(self, "Player #{player_id} joined room #{room_id}")
			true
		end
		result
	end
	
	# Leave current room
	def leave_room(player_id)
		with_redis do |redis|
			room_id = redis.get("player:#{player_id}:room")
			next unless room_id
			
			redis.pipeline do |pipe|
				pipe.del("player:#{player_id}:room")
				pipe.hdel("room:#{room_id}:players", player_id)
				
				# Update room data
				room_data_json = redis.get("room:#{room_id}:data")
				if room_data_json
					room_data = JSON.parse(room_data_json)
					room_data["players"].delete(player_id)
					pipe.setex("room:#{room_id}:data", ROOM_TTL, room_data.to_json)
				end
			end
			
			# Check if room should be cleaned up
			cleanup_empty_room(room_id)
			
			Console.info(self, "Player #{player_id} left room #{room_id}")
		end
	end
	
	# Get room instance (creates local instance if needed)
	def get_room(room_id)
		result = with_redis do |redis|
			room_data_json = redis.get("room:#{room_id}:data")
			next nil unless room_data_json
			
			room_data = JSON.parse(room_data_json)
			ensure_room_instance(room_id, room_data)
		end
		result
	end
	
	# Get player's current room
	def get_player_room(player_id)
		result = with_redis do |redis|
			room_id = redis.get("player:#{player_id}:room")
			next nil unless room_id
			
			get_room(room_id)
		end
		result
	end
	
	# Get list of all active rooms
	def get_room_list
		with_redis do |redis|
			room_ids = redis.smembers("active_rooms")
			
			rooms = []
			expired_rooms = []
			
			room_ids.each do |room_id|
				room_data_json = redis.get("room:#{room_id}:data")
				
				# Track expired rooms for cleanup
				if room_data_json.nil?
					expired_rooms << room_id
					next
				end
				
				room_data = JSON.parse(room_data_json)
				player_count = redis.hlen("room:#{room_id}:players")
				
				rooms << {
					room_id: room_id,
					room_name: room_data["name"],
					player_count: player_count,
					max_players: room_data["max_players"],
					map: room_data["map"],
					game_mode: room_data["game_mode"],
					creator_id: room_data["creator_id"],
					state: room_data["state"]
				}
			end
			
			# Clean up expired rooms from active_rooms set
			unless expired_rooms.empty?
				redis.srem("active_rooms", expired_rooms)
				Console.info(self, "Cleaned up #{expired_rooms.length} expired rooms: #{expired_rooms.join(', ')}")
			end
			
			rooms
		end
	end
	
	# Update room state
	def update_room_state(room_id, state)
		with_redis do |redis|
			room_data_json = redis.get("room:#{room_id}:data")
			next unless room_data_json
			
			room_data = JSON.parse(room_data_json)
			room_data["state"] = state
			redis.setex("room:#{room_id}:data", ROOM_TTL, room_data.to_json)
		end
	end
	
	# Subscribe to room messages (for pub/sub pattern)
	def subscribe_to_room(room_id, &block)
		Async do
			with_redis do |redis|
				redis.subscribe("room:#{room_id}:messages") do |context|
					context.each do |type, channel, message|
						if type == :message
							block.call(JSON.parse(message))
						end
					end
				end
			end
		end
	end
	
	# Broadcast message to all players in a room
	def broadcast_to_room(room_id, message)
		Async do
			with_redis do |redis|
				redis.publish("room:#{room_id}:messages", message.to_json)
			end
		end
	end
	
	# Get stats (optionally with provided rooms to avoid duplicate calls)
	def get_stats(rooms = nil)
		with_redis do |redis|
			# Get actual room list if not provided (which also cleans up expired rooms)
			rooms ||= get_room_list
			
			# Count actual players (filter out expired player keys)
			player_keys = redis.keys("player:*:room")
			active_players = 0
			player_keys.each do |key|
				active_players += 1 if redis.exists?(key)
			end
			
			{
				total_rooms: rooms.length,  # Use actual room count
				total_players: active_players,
				rooms: rooms
			}
		end
	end
	
	private
	
	def find_available_room(redis)
		room_ids = redis.smembers("active_rooms")
		
		room_ids.each do |room_id|
			room_data_json = redis.get("room:#{room_id}:data")
			next unless room_data_json
			
			room_data = JSON.parse(room_data_json)
			player_count = redis.hlen("room:#{room_id}:players")
			
			# Room has space and is in waiting state
			if player_count < room_data["max_players"] && room_data["state"] == "waiting"
				return room_id
			end
		end
		
		nil
	end
	
	def assign_player_to_room(redis, player_id, room_id)
		redis.pipeline do |pipe|
			pipe.setex("player:#{player_id}:room", PLAYER_TTL, room_id)
			pipe.hset("room:#{room_id}:players", player_id, Time.now.to_i)
			
			# Update room data
			room_data_json = redis.get("room:#{room_id}:data")
			if room_data_json
				room_data = JSON.parse(room_data_json)
				room_data["players"] << player_id
				pipe.setex("room:#{room_id}:data", ROOM_TTL, room_data.to_json)
			end
		end
	end
	
	def ensure_room_instance(room_id, settings)
		unless @room_instances[room_id]
			@room_instances[room_id] = MultiplayerGameRoom.new(room_id, settings)
			Console.info(self, "Created local room instance: #{room_id}")
		end
		@room_instances[room_id]
	end
	
	def cleanup_empty_room(room_id)
		with_redis do |redis|
			player_count = redis.hlen("room:#{room_id}:players")
			
			if player_count == 0
				redis.pipeline do |pipe|
					pipe.del("room:#{room_id}:data")
					pipe.del("room:#{room_id}:players")
					pipe.srem("active_rooms", room_id)
				end
				
				if @room_instances[room_id]
					@room_instances[room_id].cleanup
					@room_instances.delete(room_id)
				end
				
				Console.info(self, "Cleaned up empty room: #{room_id}")
			end
		end
	end
end
