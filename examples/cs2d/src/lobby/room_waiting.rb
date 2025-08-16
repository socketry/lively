#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"
require "lively/application"
require "live"

# Load Redis room manager
require_relative "game/async_redis_room_manager"

# Room Waiting Room - 房間等待室
# Players wait here before game starts, can manage bots and see other players
class RoomWaitingView < Live::View
	# Shared async Redis room manager
	@@room_manager = AsyncRedisRoomManager.new
	
	def initialize(...)
		super
		@player_id = nil
		@room_id = nil
		@room_data = nil
		@is_room_creator = false
		@update_task = nil
	end
	
	def bind(page)
		super
		
		# Get room_id and player_id from URL parameters
		request = page.request
		@room_id = request.params["room_id"]
		@player_id = request.params["player_id"]
		
		Console.info(self, "Room Waiting: Player #{@player_id} joining room #{@room_id}")
		
		unless @room_id && @player_id
			show_error("錯誤：缺少房間 ID 或玩家 ID")
			return
		end
		
		# Verify room exists and player is in it
		unless verify_room_access
			show_error("無法進入房間：房間不存在或您不在此房間中")
			return
		end
		
		# Initial render
		self.update!
		
		# Start real-time updates
		start_room_updates
	end
	
	def verify_room_access
		@room_data = @@room_manager.get_room_info(@room_id)
		return false unless @room_data
		
		# Check if player is in room
		players = @@room_manager.get_room_players(@room_id)
		player_in_room = players.any? { |p| p[:id] == @player_id }
		
		if player_in_room
			@is_room_creator = (@room_data[:creator_id] == @player_id)
			true
		else
			false
		end
	end
	
	def start_room_updates
		@update_task = Async do
			loop do
				sleep 2 # Update every 2 seconds
				break unless @page # Stop if page is closed
				
				update_room_status
			end
		rescue => e
			Console.error(self, "Room update error: #{e.message}")
		end
	end
	
	def update_room_status
		return unless @page
		
		Async do
			# Get latest room data
			@room_data = @@room_manager.get_room_info(@room_id)
			return unless @room_data
			
			# Check if game has started
			if @room_data[:state] == "playing"
				redirect_to_game
				return
			end
			
			# Update player list
			players = @@room_manager.get_room_players(@room_id)
			
			self.replace("#player-list") do |builder|
				render_player_list(builder, players)
			end
			
			# Update room info
			self.replace("#room-info") do |builder|
				render_room_info(builder)
			end
			
			# Update start game button
			can_start = can_start_game?(players)
			self.replace("#game-controls") do |builder|
				render_game_controls(builder, can_start)
			end
		end
	rescue => e
		Console.error(self, "Error updating room status: #{e.message}")
	end
	
	def can_start_game?(players)
		return false unless @is_room_creator
		
		# Need at least 2 participants (players + bots)
		total_participants = players.length
		total_participants >= 2
	end
	
	# Handle client events
	def handle(event)
		Console.info(self, "Handling event: #{event[:type]}")
		
		case event[:type]
		when "add_bot"
			handle_add_bot(event[:detail])
		when "remove_bot"
			handle_remove_bot(event[:detail])
		when "start_game"
			handle_start_game(event[:detail])
		when "leave_room"
			handle_leave_room(event[:detail])
		end
	rescue => e
		Console.error(self, "Error handling event: #{e.message}")
		show_alert("操作失敗: #{e.message}")
	end
	
	def handle_add_bot(detail)
		bot_name = detail[:bot_name]&.strip || "Bot#{rand(1000..9999)}"
		bot_difficulty = detail[:bot_difficulty] || "normal"
		
		if @@room_manager.add_bot_to_room(@room_id, bot_name, bot_difficulty)
			show_alert("成功添加 Bot: #{bot_name}")
			update_room_status
		else
			show_alert("添加 Bot 失敗：房間已滿")
		end
	rescue => e
		Console.error(self, "Error adding bot: #{e.message}")
		show_alert("添加 Bot 失敗: #{e.message}")
	end
	
	def handle_remove_bot(detail)
		bot_id = detail[:bot_id]
		
		if @@room_manager.remove_bot_from_room(@room_id, bot_id)
			show_alert("成功移除 Bot")
			update_room_status
		else
			show_alert("移除 Bot 失敗")
		end
	rescue => e
		Console.error(self, "Error removing bot: #{e.message}")
		show_alert("移除 Bot 失敗: #{e.message}")
	end
	
	def handle_start_game(detail)
		return unless @is_room_creator
		
		# Update room state to playing
		@@room_manager.update_room_state(@room_id, "playing")
		
		show_alert("遊戲開始！所有玩家將進入遊戲...")
		
		# Redirect to game after short delay
		Async do
			sleep 1
			redirect_to_game
		end
	rescue => e
		Console.error(self, "Error starting game: #{e.message}")
		show_alert("開始遊戲失敗: #{e.message}")
	end
	
	def handle_leave_room(detail)
		@@room_manager.leave_room(@player_id)
		
		# Redirect to lobby
		self.script(<<~JAVASCRIPT)
			alert('已離開房間');
			window.location.href = '/';
		JAVASCRIPT
	rescue => e
		Console.error(self, "Error leaving room: #{e.message}")
		show_alert("離開房間失敗: #{e.message}")
	end
	
	def redirect_to_game
		self.script(<<~JAVASCRIPT)
			window.location.href = '/game?room_id=#{@room_id}&player_id=#{@player_id}';
		JAVASCRIPT
	end
	
	def show_error(message)
		self.script(<<~JAVASCRIPT)
			alert('#{message.gsub("'", "\\'")}');
			window.location.href = '/';
		JAVASCRIPT
	end
	
	def show_alert(message)
		self.script(<<~JAVASCRIPT)
			alert('#{message.gsub("'", "\\'")}');
		JAVASCRIPT
	end
	
	# Render methods
	def render_room_info(builder)
		return unless @room_data
		
		builder.tag(:h3) { builder.text("房間資訊") }
		builder.tag(:div, style: "background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;") do
			builder.tag(:p, style: "margin: 5px 0;") do
				builder.tag(:strong) { builder.text("房間名稱: ") }
				builder.text(@room_data[:name])
			end
			builder.tag(:p, style: "margin: 5px 0;") do
				builder.tag(:strong) { builder.text("房間 ID: ") }
				builder.text(@room_id)
			end
			builder.tag(:p, style: "margin: 5px 0;") do
				builder.tag(:strong) { builder.text("地圖: ") }
				builder.text(@room_data[:map])
			end
			builder.tag(:p, style: "margin: 5px 0;") do
				builder.tag(:strong) { builder.text("最大玩家數: ") }
				builder.text(@room_data[:max_players])
			end
			builder.tag(:p, style: "margin: 5px 0;") do
				builder.tag(:strong) { builder.text("房間狀態: ") }
				state_text = @room_data[:state] == "waiting" ? "等待中" : "遊戲中"
				state_color = @room_data[:state] == "waiting" ? "#4CAF50" : "#ff6b00"
				builder.tag(:span, style: "color: #{state_color}; font-weight: bold;") do
					builder.text(state_text)
				end
			end
		end
	end
	
	def render_player_list(builder, players)
		builder.tag(:h3) { builder.text("房間成員 (#{players.length}/#{@room_data[:max_players]})") }
		
		if players.empty?
			builder.tag(:p, style: "color: #666; font-style: italic;") do
				builder.text("房間內暫無玩家")
			end
			return
		end
		
		players.each do |player|
			builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; background: white;") do
				builder.tag(:div) do
					player_name = player[:name] || player[:id]
					
					# Player icon and name
					if player[:is_bot]
						builder.tag(:span, style: "color: #ff6b00; margin-right: 8px;") { builder.text("🤖") }
						builder.tag(:strong, style: "color: #ff6b00;") { builder.text(player_name) }
						builder.tag(:span, style: "color: #666; margin-left: 8px;") { builder.text("(Bot - #{player[:difficulty] || 'Normal'})") }
					else
						builder.tag(:span, style: "color: #4CAF50; margin-right: 8px;") { builder.text("👤") }
						builder.tag(:strong) { builder.text(player_name) }
						
						# Show creator status
						if player[:id] == @room_data[:creator_id]
							builder.tag(:span, style: "color: #2196F3; margin-left: 8px; font-size: 12px; background: #e3f2fd; padding: 2px 6px; border-radius: 3px;") do
								builder.text("房主")
							end
						end
					end
					
					# Show current player indicator
					if player[:id] == @player_id
						builder.tag(:span, style: "color: #4CAF50; margin-left: 8px; font-size: 12px;") do
							builder.text("(您)")
						end
					end
				end
				
				# Remove bot button (only for room creator and bots)
				if @is_room_creator && player[:is_bot]
					builder.tag(:div) do
						builder.tag(:button, 
							onclick: forward_remove_bot(player[:id]),
							style: "padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;") do
							builder.text("移除")
						end
					end
				end
			end
		end
	end
	
	def render_game_controls(builder, can_start)
		builder.tag(:div, style: "display: flex; gap: 15px; margin-top: 20px;") do
			# Add Bot button (room creator only)
			if @is_room_creator
				builder.tag(:div, style: "flex: 1;") do
					builder.tag(:h4) { builder.text("添加 Bot") }
					builder.tag(:div, style: "display: flex; gap: 10px; align-items: end;") do
						builder.tag(:div, style: "flex: 1;") do
							builder.tag(:label, for: "bot_name", style: "display: block; margin-bottom: 5px; font-size: 14px;") do
								builder.text("Bot 名稱:")
							end
							builder.tag(:input, type: "text", id: "bot_name", placeholder: "留空自動生成",
								style: "width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;")
						end
						
						builder.tag(:div, style: "flex: 1;") do
							builder.tag(:label, for: "bot_difficulty", style: "display: block; margin-bottom: 5px; font-size: 14px;") do
								builder.text("Bot 難度:")
							end
							builder.tag(:select, id: "bot_difficulty",
								style: "width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;") do
								builder.tag(:option, value: "easy") { builder.text("簡單") }
								builder.tag(:option, value: "normal", selected: true) { builder.text("普通") }
								builder.tag(:option, value: "hard") { builder.text("困難") }
							end
						end
						
						builder.tag(:button, type: "button", onclick: forward_add_bot,
							style: "padding: 8px 16px; background: #ff6b00; color: white; border: none; border-radius: 4px; cursor: pointer;") do
							builder.text("添加 Bot")
						end
					end
				end
			end
			
			# Game control buttons
			builder.tag(:div, style: "flex: 1; text-align: right;") do
				builder.tag(:h4) { builder.text("遊戲控制") }
				
				if can_start
					builder.tag(:button, type: "button", onclick: forward_start_game,
						style: "padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;") do
						builder.text("🎮 開始遊戲")
					end
				else
					if @is_room_creator
						builder.tag(:span, style: "color: #666; margin-right: 10px; font-style: italic;") do
							builder.text("需要至少 2 名參與者")
						end
					else
						builder.tag(:span, style: "color: #666; margin-right: 10px; font-style: italic;") do
							builder.text("等待房主開始遊戲...")
						end
					end
				end
				
				builder.tag(:button, type: "button", onclick: forward_leave_room,
					style: "padding: 12px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;") do
					builder.text("離開房間")
				end
			end
		end
	end
	
	# JavaScript forwarding functions
	def forward_add_bot
		<<~JAVASCRIPT
			(function() {
				const detail = {
					bot_name: document.getElementById('bot_name').value,
					bot_difficulty: document.getElementById('bot_difficulty').value
				};
				window.live.forwardEvent('#{@id}', {type: 'add_bot'}, detail);
				document.getElementById('bot_name').value = ''; // Clear input
			})()
		JAVASCRIPT
	end
	
	def forward_remove_bot(bot_id)
		<<~JAVASCRIPT
			(function() {
				const detail = { bot_id: '#{bot_id}' };
				window.live.forwardEvent('#{@id}', {type: 'remove_bot'}, detail);
			})()
		JAVASCRIPT
	end
	
	def forward_start_game
		<<~JAVASCRIPT
			(function() {
				if (confirm('確定要開始遊戲嗎？所有玩家將進入遊戲界面。')) {
					window.live.forwardEvent('#{@id}', {type: 'start_game'}, {});
				}
			})()
		JAVASCRIPT
	end
	
	def forward_leave_room
		<<~JAVASCRIPT
			(function() {
				if (confirm('確定要離開房間嗎？')) {
					window.live.forwardEvent('#{@id}', {type: 'leave_room'}, {});
				}
			})()
		JAVASCRIPT
	end
	
	def render(builder)
		builder.tag(:div, id: "room-waiting-container", style: "max-width: 1000px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;") do
			# Header
			builder.tag(:div, style: "text-align: center; margin-bottom: 30px;") do
				builder.tag(:h1, style: "color: #333; margin-bottom: 10px;") do
					builder.text("🏠 房間等待室")
				end
				builder.tag(:p, style: "color: #666;") do
					builder.text("等待其他玩家加入，或添加 Bot 開始遊戲")
				end
			end
			
			# Room info section
			builder.tag(:div, id: "room-info", style: "margin-bottom: 30px;") do
				# Will be populated by update_room_status
			end
			
			# Player list section
			builder.tag(:div, id: "player-list", style: "margin-bottom: 30px;") do
				# Will be populated by update_room_status
			end
			
			# Game controls section
			builder.tag(:div, id: "game-controls") do
				# Will be populated by update_room_status
			end
		end
	end
	
	def close
		# Stop room updates
		@update_task&.stop
		super
	end
end

# Application is defined in application.rb
# Uncomment the line below only for standalone running (not recommended)
# Application = Lively::Application[RoomWaitingView]