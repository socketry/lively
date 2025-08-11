#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"
require "json"
require "lively/application"
require "live"

# Load Async Redis room manager
require_relative "game/async_redis_room_manager"

# Proper Live framework implementation with async-redis
class AsyncRedisLobbyView < Live::View
	# Shared async Redis room manager
	@@room_manager = AsyncRedisRoomManager.new
	
	def initialize(...)
		super
		@player_id = SecureRandom.uuid
		@room_id = nil
		@custom_player_id = nil
		@room_update_task = nil
	end
	
	def bind(page)
		super
		
		# Initial render
		self.update!
		
		# Start async tasks for updates
		Async do
			# Initial stats and room list update
			update_stats
			update_room_list
			
			# Start periodic updates
			start_room_list_updates
		end
	end
	
	def start_room_list_updates
		@room_update_task = Async do
			loop do
				sleep 3 # Update every 3 seconds
				break unless @page # Stop if page is closed
				
				update_stats
				update_room_list
			end
		rescue => e
			Console.error(self, "Room list update error: #{e.message}")
		end
	end
	
	def update_room_list
		return unless @page
		
		Async do
			rooms = @@room_manager.get_room_list
			
			# Update the room list HTML directly
			self.replace("#room-list") do |builder|
				render_room_list(builder, rooms)
			end
		end
	rescue => e
		Console.error(self, "Error updating room list: #{e.message}")
	end
	
	def update_stats
		return unless @page
		
		Async do
			stats = @@room_manager.get_stats
			
			# Update the stats bar HTML
			self.replace("#stats-bar") do |builder|
				builder.tag(:span) { builder.text("線上房間: #{stats[:total_rooms]} | ") }
				builder.tag(:span) { builder.text("線上玩家: #{stats[:total_players]}") }
			end
		end
	rescue => e
		Console.error(self, "Error updating stats: #{e.message}")
	end
	
	# Handle events from the client using Live framework pattern
	def handle(event)
		Console.info(self, "Handling event: #{event[:type]}")
		
		case event[:type]
		when "create_room"
			handle_create_room(event[:detail])
		when "join_room"
			handle_join_room(event[:detail])
		when "quick_join"
			handle_quick_join(event[:detail])
		when "refresh_rooms"
			update_room_list
		end
	rescue => e
		Console.error(self, "Error handling event: #{e.message}")
		show_alert("錯誤: #{e.message}")
	end
	
	def handle_create_room(detail)
		@custom_player_id = detail[:player_id]&.strip
		room_name = detail[:room_name]&.strip
		max_players = detail[:max_players]&.to_i || 10
		map = detail[:map] || "de_dust2"
		
		# Validate
		if room_name.nil? || room_name.empty?
			show_alert("請輸入房間名稱")
			return
		end
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		settings = {
			name: room_name,
			max_players: [2, [max_players, 10].min].max, # Clamp between 2-10
			map: map,
			game_mode: "competitive",
			creator_id: @player_id,
			created_at: Time.now.to_i
		}
		
		@room_id = @@room_manager.create_room(@player_id, settings)
		
		show_alert("房間創建成功！房間 ID: #{@room_id}")
		update_room_list
		
	rescue => e
		Console.error(self, "Error creating room: #{e.message}")
		show_alert("創建房間失敗: #{e.message}")
	end
	
	def handle_join_room(detail)
		@custom_player_id = detail[:player_id]&.strip
		@room_id = detail[:room_id]
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		if @@room_manager.join_room(@player_id, @room_id)
			show_alert("成功加入房間: #{@room_id}")
			update_room_list
		else
			show_alert("無法加入房間：房間已滿或不存在")
		end
		
	rescue => e
		Console.error(self, "Error joining room: #{e.message}")
		show_alert("加入房間失敗: #{e.message}")
	end
	
	def handle_quick_join(detail)
		@custom_player_id = detail[:player_id]&.strip
		
		# Use custom player ID if provided
		@player_id = @custom_player_id unless @custom_player_id.nil? || @custom_player_id.empty?
		
		# Find or create a room
		@room_id = @@room_manager.find_or_create_room(@player_id)
		
		if @room_id
			show_alert("快速加入成功！房間 ID: #{@room_id}")
			update_room_list
		else
			show_alert("無法快速加入：伺服器錯誤")
		end
		
	rescue => e
		Console.error(self, "Error in quick join: #{e.message}")
		show_alert("快速加入失敗: #{e.message}")
	end
	
	def show_alert(message)
		self.script(<<~JAVASCRIPT)
			alert('#{message.gsub("'", "\\'")}');
		JAVASCRIPT
	end
	
	# JavaScript event forwarding functions
	def forward_create_room
		<<~JAVASCRIPT
			(function() {
				const detail = {
					player_id: document.getElementById('player_id').value,
					room_name: document.getElementById('room_name').value,
					max_players: document.getElementById('max_players').value,
					map: document.getElementById('map').value
				};
				window.live.forwardEvent('#{@id}', {type: 'create_room'}, detail);
			})()
		JAVASCRIPT
	end
	
	def forward_join_room(room_id)
		<<~JAVASCRIPT
			(function() {
				const detail = {
					player_id: document.getElementById('join_player_#{room_id}')?.value || '',
					room_id: '#{room_id}'
				};
				window.live.forwardEvent('#{@id}', {type: 'join_room'}, detail);
			})()
		JAVASCRIPT
	end
	
	def forward_quick_join
		<<~JAVASCRIPT
			(function() {
				const detail = {
					player_id: document.getElementById('quick_player_id').value
				};
				window.live.forwardEvent('#{@id}', {type: 'quick_join'}, detail);
			})()
		JAVASCRIPT
	end
	
	def render_room_list(builder, rooms)
		if rooms.empty?
			builder.tag(:p, style: "color: #666;") do
				builder.text("暫無可用房間，請創建新房間或稍後再試。")
			end
		else
			rooms.each do |room|
				builder.tag(:div, style: "border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: white; margin-bottom: 15px;") do
					builder.tag(:h4, style: "margin: 0 0 10px 0;") do
						builder.text(room[:room_name])
					end
					
					builder.tag(:p, style: "margin: 5px 0; color: #666;") do
						builder.text("房間 ID: #{room[:room_id]}")
						builder.tag(:br)
						builder.text("玩家: #{room[:player_count]}/#{room[:max_players]}")
						builder.tag(:br)
						builder.text("地圖: #{room[:map]}")
						builder.tag(:br)
						builder.text("狀態: #{room[:state] || 'waiting'}")
					end
					
					builder.tag(:div, style: "margin-top: 10px;") do
						builder.tag(:input, 
							type: "text", 
							id: "join_player_#{room[:room_id]}", 
							placeholder: "玩家 ID (選填)",
							style: "padding: 5px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;")
						
						if room[:player_count] >= room[:max_players]
							builder.tag(:button, 
								disabled: true,
								style: "padding: 8px 20px; background: #ccc; color: white; border: none; border-radius: 5px; cursor: not-allowed;") do
								builder.text("房間已滿")
							end
						else
							builder.tag(:button, 
								onclick: forward_join_room(room[:room_id]),
								style: "padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;") do
								builder.text("加入房間")
							end
						end
					end
				end
			end
		end
	end
	
	def render(builder)
		builder.tag(:div, id: "lobby-container", style: "max-width: 1200px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;") do
			# Header
			builder.tag(:h1, style: "text-align: center; color: #333; margin-bottom: 30px;") do
				builder.text("🎮 CS2D 多人遊戲大廳 (Async Redis)")
			end
			
			# Stats bar (will be populated asynchronously)
			builder.tag(:div, id: "stats-bar", style: "background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px;") do
				builder.tag(:span) { builder.text("載入中...") }
			end
			
			# Tab navigation
			builder.tag(:div, id: "tab-nav", style: "display: flex; gap: 10px; margin-bottom: 20px;") do
				builder.tag(:button, onclick: "showTab('create')", class: "tab-button active",
					style: "padding: 10px 20px; border: none; background: #4CAF50; color: white; cursor: pointer; border-radius: 5px;") do
					builder.text("創建房間")
				end
				builder.tag(:button, onclick: "showTab('join')", class: "tab-button",
					style: "padding: 10px 20px; border: none; background: #ddd; color: #333; cursor: pointer; border-radius: 5px;") do
					builder.text("加入房間")
				end
			end
			
			# Create room tab
			builder.tag(:div, id: "create-tab", class: "tab-content", style: "display: block;") do
				builder.tag(:h2) { builder.text("創建新房間") }
				
				builder.tag(:div, id: "create-form", style: "max-width: 500px;") do
					# Player ID
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "player_id", style: "display: block; margin-bottom: 5px;") do
							builder.text("玩家 ID (選填):")
						end
						builder.tag(:input, type: "text", id: "player_id",
							placeholder: "留空自動生成", style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;")
					end
					
					# Room name
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "room_name", style: "display: block; margin-bottom: 5px;") do
							builder.text("房間名稱:")
						end
						builder.tag(:input, type: "text", id: "room_name",
							placeholder: "輸入房間名稱",
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;")
					end
					
					# Max players
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "max_players", style: "display: block; margin-bottom: 5px;") do
							builder.text("最大玩家數:")
						end
						builder.tag(:select, id: "max_players",
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;") do
							(2..10).each do |n|
								builder.tag(:option, value: n) { builder.text("#{n} 人") }
							end
						end
					end
					
					# Map selection
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "map", style: "display: block; margin-bottom: 5px;") do
							builder.text("地圖:")
						end
						builder.tag(:select, id: "map",
							style: "width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;") do
							["de_dust2", "de_inferno", "de_mirage", "de_nuke", "cs_office"].each do |map|
								builder.tag(:option, value: map) { builder.text(map) }
							end
						end
					end
					
					builder.tag(:button, type: "button", onclick: forward_create_room,
						style: "padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;") do
						builder.text("創建房間")
					end
				end
			end
			
			# Join room tab
			builder.tag(:div, id: "join-tab", class: "tab-content", style: "display: none;") do
				builder.tag(:h2) { builder.text("加入房間") }
				
				# Quick join button
				builder.tag(:div, style: "margin-bottom: 30px;") do
					builder.tag(:div, style: "margin-bottom: 15px;") do
						builder.tag(:label, for: "quick_player_id", style: "display: block; margin-bottom: 5px;") do
							builder.text("玩家 ID (選填):")
						end
						builder.tag(:input, type: "text", id: "quick_player_id",
							placeholder: "留空自動生成", style: "width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;")
					end
					
					builder.tag(:button, type: "button", onclick: forward_quick_join,
						style: "padding: 12px 40px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 18px;") do
						builder.text("🎯 快速加入")
					end
				end
				
				# Room list
				builder.tag(:h3) { builder.text("可用房間列表") }
				builder.tag(:div, id: "room-list", style: "display: grid; gap: 15px;") do
					# Will be populated by update_room_list
				end
			end
		end
		
		# JavaScript for tab switching
		builder.tag(:script, type: "text/javascript") do
			builder.raw(<<~JAVASCRIPT)
				function showTab(tabName) {
					// Hide all tabs
					document.querySelectorAll('.tab-content').forEach(tab => {
						tab.style.display = 'none';
					});
					
					// Deactivate all buttons
					document.querySelectorAll('.tab-button').forEach(btn => {
						btn.style.background = '#ddd';
						btn.style.color = '#333';
					});
					
					// Show selected tab
					document.getElementById(tabName + '-tab').style.display = 'block';
					
					// Activate selected button
					event.target.style.background = '#4CAF50';
					event.target.style.color = 'white';
				}
				
				// Request initial room list update
				setTimeout(() => {
					if (window.live && window.live.forwardEvent) {
						window.live.forwardEvent('#{@id}', {type: 'refresh_rooms'}, {});
					}
				}, 500);
			JAVASCRIPT
		end
	end
	
	def close
		# Stop room updates
		@room_update_task&.stop
		
		super
	end
end

# Create application
Application = Lively::Application[AsyncRedisLobbyView]