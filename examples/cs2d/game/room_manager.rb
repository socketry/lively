# frozen_string_literal: true

require_relative "multiplayer_game_room"

class RoomManager
	def initialize
		@rooms = {}
		@player_to_room = {}
		@room_counter = 0
	end
		
	def find_or_create_room(player_id)
		# Check if player is already in a room
		existing_room_id = @player_to_room[player_id]
		return existing_room_id if existing_room_id && @rooms[existing_room_id]
				
		# Try to find a room with space
		available_room = find_available_room
				
		if available_room
			@player_to_room[player_id] = available_room.room_id
			return available_room.room_id
		else
			# Create a new room
			return create_room(player_id)
		end
	end
		
	def create_room(creator_id, settings = {})
		@room_counter += 1
		room_id = "room_#{@room_counter}"
				
		room = MultiplayerGameRoom.new(room_id, settings)
		@rooms[room_id] = room
		@player_to_room[creator_id] = room_id
				
		puts "[RoomManager #{self.object_id}] Created new room: #{room_id}"
		puts "[RoomManager #{self.object_id}] Total rooms now: #{@rooms.size}"
		puts "[RoomManager #{self.object_id}] Room list: #{@rooms.keys.join(', ')}"
		room_id
	end
		
	def join_room(player_id, room_id)
		room = @rooms[room_id]
		return false unless room
				
		# Remove from current room if any
		leave_room(player_id)
				
		@player_to_room[player_id] = room_id
		true
	end
		
	def leave_room(player_id)
		room_id = @player_to_room[player_id]
		return unless room_id
				
		room = @rooms[room_id]
		if room
			room.remove_player(player_id)
		end
				
		@player_to_room.delete(player_id)
	end
		
	def get_room(room_id)
		@rooms[room_id]
	end
		
	def get_player_room(player_id)
		room_id = @player_to_room[player_id]
		return nil unless room_id
				
		@rooms[room_id]
	end
		
	def cleanup_empty_room(room_id)
		room = @rooms[room_id]
		return unless room
				
		if room.empty?
			room.cleanup
			@rooms.delete(room_id)
						
			# Clean up player mappings
			@player_to_room.delete_if { |_, rid| rid == room_id }
						
			puts "Cleaned up empty room: #{room_id}"
		end
	end
		
	def get_room_list
		puts "[RoomManager #{self.object_id}] Getting room list, total rooms: #{@rooms.size}"
		@rooms.map do |room_id, room|
			{
								room_id: room_id,
								room_name: room.room_settings[:name] || room_id,
								player_count: room.players.size + room.bots.size,
								max_players: room.room_settings[:max_players] || MultiplayerGameRoom::MAX_PLAYERS,
								map: room.room_settings[:map],
								game_mode: room.room_settings[:game_mode],
								creator_id: room.room_settings[:creator_id]
						}
		end
	end
		
	def get_stats
		{
						total_rooms: @rooms.size,
						total_players: @player_to_room.size,
						rooms: get_room_list
				}
	end
		
	def force_cleanup_player(player_id)
		# Force remove player from all systems
		leave_room(player_id)
	end
		
		private
		
	def find_available_room
		@rooms.values.find do |room|
			room.players.size < MultiplayerGameRoom::MAX_PLAYERS
		end
	end
end