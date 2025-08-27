# frozen_string_literal: true

require_relative "cs16_game_manager"
require_relative "async_redis_room_manager"

# Bridge between CS16GameManager and the web frontend
# Handles WebSocket communication and state synchronization
class CS16GameBridge
	attr_reader :game_manager, :room_id, :players
	
	def initialize(room_id, map_name = :de_dust2)
		@room_id = room_id
		@game_manager = CS16GameManager.new(map_name)
		@players = {}
		@views = {} # Store view instances for each player
		@last_state_hash = nil
	end
	
	def add_player(player_id, name, team = nil)
		# Auto-assign team if not specified
		if team.nil?
			ct_count = @players.values.count { |p| p[:team] == :ct }
			t_count = @players.values.count { |p| p[:team] == :t }
			team = ct_count <= t_count ? :ct : :t
		end
		
		# Add to game manager
		success = @game_manager.add_player(player_id, name, team)
		return false unless success
		
		# Store player info
		@players[player_id] = {
			name: name,
			team: team,
			connected: true
		}
		
		true
	end
	
	def remove_player(player_id)
		@game_manager.remove_player(player_id)
		@players.delete(player_id)
		@views.delete(player_id)
	end
	
	def register_view(player_id, view)
		@views[player_id] = view
	end
	
	def handle_player_action(player_id, action, params = {})
		case action
		when "buy"
			handle_buy(player_id, params)
		when "move"
			handle_move(player_id, params)
		when "shoot"
			handle_shoot(player_id, params)
		when "plant_bomb"
			handle_plant_bomb(player_id)
		when "defuse_bomb"
			handle_defuse_bomb(player_id)
		when "throw_grenade"
			handle_throw_grenade(player_id, params)
		when "reload"
			handle_reload(player_id)
		when "chat"
			handle_chat(player_id, params)
		else
			false
		end
	end
	
	def start_game
		return false unless can_start?
		
		@game_manager.start_match
		broadcast_state
		true
	end
	
	def update(delta_time = 0.05)
		@game_manager.update(delta_time)
		
		# Broadcast state if changed
		current_state = @game_manager.get_game_state
		state_hash = current_state.hash
		
		if state_hash != @last_state_hash
			broadcast_state
			@last_state_hash = state_hash
		end
	end
	
	def get_state
		state = @game_manager.get_game_state
		
		# Add additional info for frontend
		state[:room_id] = @room_id
		state[:connected_players] = @players.keys
		
		state
	end
	
	private
	
	def can_start?
		# Need at least 1 player per team
		ct_count = @players.values.count { |p| p[:team] == :ct }
		t_count = @players.values.count { |p| p[:team] == :t }
		
		ct_count > 0 && t_count > 0
	end
	
	def handle_buy(player_id, params)
		if params["quick_buy"]
			# Handle quick buy preset
			case params["quick_buy"]
			when "eco"
				@game_manager.handle_player_action(player_id, :buy, { weapon: "p228" })
				@game_manager.handle_player_action(player_id, :buy, { weapon: "kevlar" })
			when "force"
				@game_manager.handle_player_action(player_id, :buy, { weapon: "kevlar_helmet" })
				team = @game_manager.players[player_id].team
				weapon = team == :t ? "galil" : "famas"
				@game_manager.handle_player_action(player_id, :buy, { weapon: weapon })
			when "full"
				@game_manager.handle_player_action(player_id, :buy, { weapon: "kevlar_helmet" })
				team = @game_manager.players[player_id].team
				weapon = team == :t ? "ak47" : "m4a1"
				@game_manager.handle_player_action(player_id, :buy, { weapon: weapon })
				@game_manager.handle_player_action(player_id, :buy, { weapon: "hegrenade" })
				@game_manager.handle_player_action(player_id, :buy, { weapon: "flashbang" })
			when "awp"
				@game_manager.handle_player_action(player_id, :buy, { weapon: "kevlar_helmet" })
				@game_manager.handle_player_action(player_id, :buy, { weapon: "awp" })
				@game_manager.handle_player_action(player_id, :buy, { weapon: "deagle" })
			end
		elsif params["weapon"]
			@game_manager.handle_player_action(player_id, :buy, { weapon: params["weapon"] })
		elsif params["item"]
			@game_manager.handle_player_action(player_id, :buy, { weapon: params["item"] })
		end
		
		broadcast_state
	end
	
	def handle_move(player_id, params)
		@game_manager.handle_player_action(player_id, :move, {
			x: params["x"],
			y: params["y"],
			angle: params["angle"]
		})
	end
	
	def handle_shoot(player_id, params)
		# Find target based on hit detection
		target_id = params["target_id"]
		if target_id
			@game_manager.handle_player_action(player_id, :shoot, {
				target_id: target_id,
				headshot: params["headshot"] || false
			})
		end
		
		broadcast_state
	end
	
	def handle_plant_bomb(player_id)
		success = @game_manager.handle_player_action(player_id, :plant_bomb)
		broadcast_state if success
		success
	end
	
	def handle_defuse_bomb(player_id)
		success = @game_manager.handle_player_action(player_id, :defuse_bomb)
		broadcast_state if success
		success
	end
	
	def handle_throw_grenade(player_id, params)
		@game_manager.handle_player_action(player_id, :throw_grenade, {
			type: params["type"].to_sym,
			angle: params["angle"],
			power: params["power"]
		})
		
		broadcast_state
	end
	
	def handle_reload(player_id)
		# Reload is handled client-side for now
		# Would sync with server in production
		true
	end
	
	def handle_chat(player_id, params)
		message = params["message"]
		return false if message.nil? || message.empty?
		
		# Broadcast chat to all players
		broadcast_message({
			type: "chat",
			player_id: player_id,
			player_name: @players[player_id][:name],
			message: message,
			timestamp: Time.now.to_f
		})
		
		true
	end
	
	def broadcast_state
		state = get_state
		
		@views.each do |player_id, view|
			next unless view
			
			begin
				view.send_game_state(state)
			rescue => e
				Console.error(self, "Failed to send state to player #{player_id}: #{e.message}")
			end
		end
	end
	
	def broadcast_message(message)
		@views.each do |player_id, view|
			next unless view
			
			begin
				view.send_message(message)
			rescue => e
				Console.error(self, "Failed to send message to player #{player_id}: #{e.message}")
			end
		end
	end
end