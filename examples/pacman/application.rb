#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025, by Samuel Williams.

require "thread/local"

class GameState
	extend Thread::Local
	
	def initialize
		@board = Board.new
		@game = nil
	end
	
	attr :board
	
	def add_player
		player = @board.add_player
		Console.info(self, "Player joined", player: player)
		
		self.run!
		
		return player
	end
	
	def remove_player(player)
		@board.remove_player(player)
		Console.info(self, "Player left", player: player)
		
		if @board.players.empty?
			self.close
		end
	end
	
	def run!(dt = 1/5.0)
		@game ||= Async do
			Console.info(self, "Starting game loop")
			while true
				@board.step
				# Update all views after each step
				@board.players.each {|player| player.on_updated&.call}
				sleep(dt)
			end
		rescue => error
			Console.error(self, "Game loop error", error: error)
		end
	end
	
	private def close
		if game = @game
			@game = nil
			game.stop
		end
	end
end

class Player
	attr_reader :position, :direction, :score
	attr_accessor :direction
	
	def initialize(board, start_y, start_x)
		@board = board
		@position = [start_y, start_x]
		@direction = :right
		@score = 0
		@on_updated = nil
	end
	
	def on_updated(&block)
		if block_given?
			@on_updated = block
		end
		
		return @on_updated
	end
	
	def step
		y, x = @position
		
		# Calculate new position
		new_y, new_x = y, x
		case @direction
		when :up
			new_y -= 1
		when :down
			new_y += 1
		when :left
			new_x -= 1
		when :right
			new_x += 1
		end
		
		# Check boundaries
		if new_y < 0 || new_y >= @board.height || new_x < 0 || new_x >= @board.width
			return
		end
		
		# Check for wall collision
		if @board.wall?(new_y, new_x)
			return
		end
		
		# Move to new position
		@position = [new_y, new_x]
		
		# Check for dot collection
		if @board.dot?(new_y, new_x)
			@score += 10
			@board.remove_dot!(new_y, new_x)
		elsif @board.cherry?(new_y, new_x)
			@score += 50
			@board.remove_cherry!(new_y, new_x)
			# Frighten all ghosts when cherry is eaten
			@board.frighten_ghosts!
		end
	end
	
	def add_score(points)
		@score += points
	end
	
	def reset!
		@position = [@board.height/2, @board.width/2]
		@direction = :right
		@score = 0
	end
end

class Ghost
	attr_reader :position, :direction, :color
	
	def initialize(board, start_y, start_x, color)
		@board = board
		@position = [start_y, start_x]
		@start_position = [start_y, start_x]
		@direction = [:up, :down, :left, :right].sample
		@color = color
		@frightened = false
		@frightened_time = 0
		@returning_home = false
		@eaten = false
		@eaten_time = 0
	end
	
	def frighten(duration = 30)
		@frightened = true
		@frightened_time = duration
		@returning_home = false
		@eaten = false
	end
	
	def frightened?
		@frightened && !@eaten
	end
	
	def eaten?
		@eaten
	end
	
	def get_eaten!
		@eaten = true
		@eaten_time = 20  # Stay as eyes for 20 steps (~4 seconds)
		@frightened = false
		@returning_home = true
	end
	
	def step
		# If eaten, decrease timer and head straight home
		if @eaten
			@eaten_time -= 1
			if @eaten_time <= 0
				@eaten = false
				@returning_home = false # Back to normal behavior once home
			end
			move_towards_home
			return
		end
		
		# If frightened, decrease timer
		if @frightened
			@frightened_time -= 1
			if @frightened_time <= 0
				@frightened = false
				@returning_home = true # Start returning to ghost home
			end
		end
		
		# If returning home, head to central ghost area
		if @returning_home && !in_ghost_home?
			move_towards_home
		else
			@returning_home = false if in_ghost_home?
			move_normally
		end
	end
	
	private def move_towards_home
		center_y, center_x = @board.height/2, @board.width/2
		y, x = @position
		
		# Simple pathfinding toward center
		possible_moves = []
		
		# Prioritize moves that get closer to center
		if y > center_y && valid_move?(y - 1, x)
			possible_moves << [:up, y - 1, x]
		elsif y < center_y && valid_move?(y + 1, x)
			possible_moves << [:down, y + 1, x]
		end
		
		if x > center_x && valid_move?(y, x - 1)
			possible_moves << [:left, y, x - 1]
		elsif x < center_x && valid_move?(y, x + 1)
			possible_moves << [:right, y, x + 1]
		end
		
		# If no direct path, try any valid move
		if possible_moves.empty?
			[:up, :down, :left, :right].each do |dir|
				new_y, new_x = calculate_move(y, x, dir)
				possible_moves << [dir, new_y, new_x] if valid_move?(new_y, new_x)
			end
		end
		
		if possible_moves.any?
			chosen_move = possible_moves.sample
			@direction = chosen_move[0]
			@position = [chosen_move[1], chosen_move[2]]
		end
	end
	
	private def move_normally
		y, x = @position
		
		# If frightened, move more randomly (flee behavior)
		if @frightened
			# More frequent direction changes when frightened
			if rand < 0.4
				directions = [:up, :down, :left, :right]
				valid_directions = directions.select do |dir|
					ny, nx = calculate_move(y, x, dir)
					valid_move?(ny, nx)
				end
				@direction = valid_directions.sample if valid_directions.any?
			end
		else
			# Normal behavior - occasional direction changes
			if rand < 0.2
				directions = [:up, :down, :left, :right]
				valid_directions = directions.select do |dir|
					ny, nx = calculate_move(y, x, dir)
					valid_move?(ny, nx)
				end
				@direction = valid_directions.sample if valid_directions.any?
			end
		end
		
		# Try to move in current direction
		new_y, new_x = calculate_move(y, x, @direction)
		
		if valid_move?(new_y, new_x)
			@position = [new_y, new_x]
		else
			# Pick a random valid direction
			directions = [:up, :down, :left, :right]
			valid_directions = directions.select do |dir|
				ny, nx = calculate_move(y, x, dir)
				valid_move?(ny, nx)
			end
			
			if valid_directions.any?
				@direction = valid_directions.sample
				new_y, new_x = calculate_move(y, x, @direction)
				@position = [new_y, new_x]
			end
		end
	end
	
	private def in_ghost_home?
		center_y, center_x = @board.height/2, @board.width/2
		y, x = @position
		(y - center_y).abs <= 1 && (x - center_x).abs <= 1
	end
	
	private def calculate_move(y, x, direction)
		case direction
		when :up
			[y - 1, x]
		when :down
			[y + 1, x]
		when :left
			[y, x - 1]
		when :right
			[y, x + 1]
		end
	end
	
	private def valid_move?(y, x)
		return false if y < 0 || y >= @board.height || x < 0 || x >= @board.width
		return false if @board.wall?(y, x)
		true
	end
end

class Board
	def initialize(width = 19, height = 15)
		@width = width
		@height = height
		@players = []
		@ghosts = []
		@dots_collected = 0
		
		reset!
	end
	
	attr :grid, :width, :height, :players, :ghosts, :dots_collected
	
	def add_player
		player = Player.new(self, find_start_position[0], find_start_position[1])
		@players << player
		Console.info(self, "Player added", position: player.position, grid_at_position: @grid[player.position[0]][player.position[1]])
		return player
	end
	
	def remove_player(player)
		@players.delete(player)
	end
	
	def wall?(y, x)
		@grid[y][x] == :wall
	end
	
	def dot?(y, x)
		@grid[y][x] == :dot
	end
	
	def cherry?(y, x)
		@grid[y][x] == :cherry
	end
	
	def ghost_home?(y, x)
		@grid[y][x] == :ghost_home
	end
	
	def ghost_at?(y, x)
		@ghosts.any? {|ghost| ghost.position == [y, x]}
	end
	
	def remove_dot!(y, x)
		if @grid[y][x] == :dot
			@grid[y][x] = nil
			@dots_collected += 1
		end
	end
	
	def remove_cherry!(y, x)
		if @grid[y][x] == :cherry
			@grid[y][x] = nil
		end
	end
	
	def frighten_ghosts!
		@ghosts.each {|ghost| ghost.frighten}
	end
	
	def reset!
		create_maze
		create_ghosts
		@players.each(&:reset!) if @players
		@dots_collected = 0
	end
	
	def step
		@players.each(&:step)
		@ghosts.each(&:step)
		check_collisions
	end
	
	def check_collisions
		@players.each do |player|
			@ghosts.each do |ghost|
				if player.position == ghost.position
					if ghost.frightened?
						# Player eats the ghost - add score and send ghost home
						player.add_score(200)
						ghost.get_eaten!
					else
						# Ghost catches player - could implement game over logic here
						# For now, just log it
						Console.info(self, "Ghost caught player!", player: player.position, ghost: ghost.position)
					end
				end
			end
		end
	end
	
	private def create_maze
		@grid = Array.new(@height) {Array.new(@width)}
		
		# Start with all paths (no walls except borders)
		(0...@height).each do |y|
			(0...@width).each do |x|
				if y == 0 || y == @height-1 || x == 0 || x == @width-1
					@grid[y][x] = :wall
				else
					@grid[y][x] = nil # Empty space that will become dots
				end
			end
		end
		
		# Create a more traditional Pacman maze with central ghost home
		create_pacman_maze
		
		# Fill most empty spaces with dots (leaving ghost home clear)
		dot_count = 0
		(1...@height-1).each do |y|
			(1...@width-1).each do |x|
				if @grid[y][x].nil? && !in_ghost_home?(y, x)
					@grid[y][x] = :dot
					dot_count += 1
				end
			end
		end
		
		# Add cherries in corners and strategic locations
		cherry_positions = []
		cherry_spots = [
			[2, 2], [2, @width-3], [@height-3, 2], [@height-3, @width-3], # Corners
			[@height/2, 3], [@height/2, @width-4] # Side power spots
		]
		
		cherry_spots.each do |y, x|
			if @grid[y] && @grid[y][x] == :dot
				@grid[y][x] = :cherry
				cherry_positions << [y, x]
			end
		end
		
		# Clear starting area for player
		start_y, start_x = find_start_position
		clear_area(start_y, start_x, 1)
		
		Console.info(self, "Pacman maze created", dots: dot_count, cherries: cherry_positions.length)
	end
	
	private def create_pacman_maze
		center_y, center_x = @height/2, @width/2
		
		# Create central ghost home (3x3 area)
		(-1..1).each do |dy|
			(-1..1).each do |dx|
				y, x = center_y + dy, center_x + dx
				@grid[y][x] = :ghost_home if y > 0 && y < @height-1 && x > 0 && x < @width-1
			end
		end
		
		# Create strategic wall patterns for a more interesting maze
		wall_patterns = [
			# Top left quadrant
			[3, 3], [3, 4], [4, 3],
			[3, 6], [4, 6], [5, 6],
			
			# Top right quadrant  
			[3, @width-4], [3, @width-5], [4, @width-4],
			[3, @width-7], [4, @width-7], [5, @width-7],
			
			# Bottom left quadrant
			[@height-4, 3], [@height-4, 4], [@height-5, 3],
			[@height-4, 6], [@height-5, 6], [@height-6, 6],
			
			# Bottom right quadrant
			[@height-4, @width-4], [@height-4, @width-5], [@height-5, @width-4],
			[@height-4, @width-7], [@height-5, @width-7], [@height-6, @width-7],
			
			# Central barriers (but not blocking ghost home)
			[center_y-3, center_x], [center_y+3, center_x],
			[center_y, center_x-4], [center_y, center_x+4],
			
			# Side tunnels
			[center_y, 2], [center_y, @width-3]
		]
		
		# Place walls strategically
		wall_patterns.each do |y, x|
			if y > 0 && y < @height-1 && x > 0 && x < @width-1 && !in_ghost_home?(y, x)
				@grid[y][x] = :wall
			end
		end
	end
	
	private def in_ghost_home?(y, x)
		center_y, center_x = @height/2, @width/2
		(y - center_y).abs <= 1 && (x - center_x).abs <= 1
	end
	
	private def create_ghosts
		@ghosts.clear
		
		# Create 4 ghosts with different colors in the central ghost home
		ghost_colors = ["👻", "🟥", "🟪", "🟨"]  # White, Red, Purple, Yellow
		center_y, center_x = @height/2, @width/2
		
		# Position ghosts in the 3x3 ghost home area
		ghost_positions = [
			[center_y-1, center_x-1],  # Top-left of ghost home
			[center_y-1, center_x+1],  # Top-right of ghost home
			[center_y+1, center_x-1],  # Bottom-left of ghost home
			[center_y+1, center_x+1]   # Bottom-right of ghost home
		]
		
		ghost_colors.zip(ghost_positions).each do |color, (y, x)|
			@ghosts << Ghost.new(self, y, x, color)
		end
		
		Console.info(self, "Created ghosts in central home", count: @ghosts.length, center: [center_y, center_x])
	end
	
	private def find_valid_position_near(target_y, target_x)
		# Try the target position first
		return [target_y, target_x] if !wall?(target_y, target_x)
		
		# Search in expanding circles
		(1..3).each do |radius|
			(-radius..radius).each do |dy|
				(-radius..radius).each do |dx|
					y, x = target_y + dy, target_x + dx
					next if y < 1 || y >= @height-1 || x < 1 || x >= @width-1
					return [y, x] if !wall?(y, x)
				end
			end
		end
		
		# Fallback
		[1, 1]
	end
	
	private def find_start_position
		# Find a safe starting position (not a wall)
		center_y, center_x = @height/2, @width/2
		
		# Try center first
		return [center_y, center_x] if @grid[center_y] && @grid[center_y][center_x] != :wall
		
		# Search around center
		(1..3).each do |radius|
			(-radius..radius).each do |dy|
				(-radius..radius).each do |dx|
					y, x = center_y + dy, center_x + dx
					next if y < 1 || y >= @height-1 || x < 1 || x >= @width-1
					next if @grid[y].nil? || @grid[y][x] == :wall
					return [y, x]
				end
			end
		end
		
		# Fallback - find any non-wall position
		(1...@height-1).each do |y|
			(1...@width-1).each do |x|
				return [y, x] if @grid[y] && @grid[y][x] != :wall
			end
		end
		
		# Last resort
		[1, 1]
	end
	
	private def clear_area(center_y, center_x, radius)
		(-radius..radius).each do |dy|
			(-radius..radius).each do |dx|
				y, x = center_y + dy, center_x + dx
				next if y < 0 || y >= @height || x < 0 || x >= @width
				@grid[y][x] = nil unless wall?(y, x)
			end
		end
	end
end

class PacmanView < Live::View
	def initialize(...)
		super
		@game_state = GameState.instance
		@player = nil
	end
	
	def bind(page)
		super
		
		@player = @game_state.add_player
		@player.on_updated {self.update!}
		
		# Force an initial update to show the game board
		self.update!
	end
	
	def close
		if @player
			@game_state.remove_player(@player)
			@player = nil
		end
		
		super
	end
	
	def handle(event)
		Console.info(self, event)
		
		case event[:type]
		when "keypress"
			handle_keypress(event[:detail])
		when "touchend"
			handle_swipe(event[:detail])
		end
	end
	
	private def handle_keypress(detail)
		case detail[:key]
		when "w"
			@player.direction = :up
		when "s"
			@player.direction = :down
		when "a"
			@player.direction = :left
		when "d"
			@player.direction = :right
		end
	end
	
	private def handle_swipe(detail)
		@player.direction = detail[:direction].to_sym
	end
	
	private def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {key: event.key});"
	end
	
	private def forward_touchstart
		"event.preventDefault(); this.touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};"
	end
	
	private def forward_touchend
		<<~JS
			if (this.touchStart) {
				const dx = event.changedTouches[0].clientX - this.touchStart.x;
				const dy = event.changedTouches[0].clientY - this.touchStart.y;
				
				let direction;
				if (Math.abs(dx) > Math.abs(dy)) {
					direction = dx > 0 ? 'right' : 'left';
				} else {
					direction = dy > 0 ? 'down' : 'up';
				}
				
				live.forwardEvent(#{JSON.dump(@id)}, event, {direction});
				this.touchStart = null;
			}
		JS
	end
	
	def render(builder)
		unless @player
			builder.tag("div", style: "font-size: 18px; text-align: center; margin: 20px;") do
				builder.text("🟡 Pacman Game - Loading...")
			end
			return
		end
		
		builder.tag("div", style: "position: relative; display: inline-block;") do
			# Game board container
			builder.tag("div", 
				class: "game-board",
				tabIndex: 0, 
				autofocus: true, 
				onKeyPress: forward_keypress,
				onTouchStart: forward_touchstart,
				onTouchEnd: forward_touchend,
				style: "width: #{@game_state.board.width * 3}rem; height: #{@game_state.board.height * 3}rem;"
			) do
				# Render static board elements (walls, dots, cherries, ghost home)
				@game_state.board.grid.each_with_index do |row, y|
					row.each_with_index do |cell, x|
						# Always render a cell container, even for empty spaces
						css_classes = ["game-cell"]
						content = ""
						
						case cell
						when :wall
							css_classes << "wall"
							content = ""
						when :dot
							css_classes << "dot"
							content = "·"
						when :cherry
							css_classes << "cherry"
							content = "🍒"
						when :ghost_home
							css_classes << "ghost-home"
							content = ""
						when nil
							# Empty space - still render container for morphdom stability
							content = ""
						end
						
						# Give each cell a stable ID for morphdom
						cell_id = "cell-#{y}-#{x}"
						
						builder.tag("div", 
							id: cell_id,
							class: css_classes.join(" "),
							style: "left: #{x * 3}rem; top: #{y * 3}rem;"
						) do
							builder.text(content) if content != ""
						end
					end
				end
				
				# Render Pacman with stable ID
				pacman_y, pacman_x = @player.position
				builder.tag("div",
					id: "pacman",
					class: "game-cell pacman",
					style: "left: #{pacman_x * 3}rem; top: #{pacman_y * 3}rem;"
				) do
					case @player.direction
					when :right
						builder.text("🟡")
					when :left
						builder.text("🟡")
					when :up
						builder.text("🟡")
					when :down
						builder.text("🟡")
					end
				end
				
				# Render Ghosts with stable IDs
				@game_state.board.ghosts.each_with_index do |ghost, ghost_index|
					ghost_y, ghost_x = ghost.position
					css_class = if ghost.eaten?
						"game-cell eaten-ghost"
					elsif ghost.frightened?
						"game-cell frightened-ghost"
					else
						"game-cell ghost"
					end
					
					builder.tag("div",
						id: "ghost-#{ghost_index}",
						class: css_class,
						style: "left: #{ghost_x * 3}rem; top: #{ghost_y * 3}rem;"
					) do
						if ghost.eaten?
							builder.text("👀")  # Eyes when eaten
						elsif ghost.frightened?
							builder.text("🔵")
						else
							builder.text(ghost.color)
						end
					end
				end
			end
			
			# Floating UI elements positioned over the table
			builder.tag("div", style: "position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 5px; font-size: 14px; font-weight: bold;") do
				builder.text("Score: #{@player.score}")
			end
			
			builder.tag("div", style: "position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 5px; font-size: 14px;") do
				builder.text("Dots: #{@game_state.board.dots_collected}")
			end
			
			builder.tag("div", style: "position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 5px; font-size: 12px;") do
				builder.text("WASD to move")
			end
			
			builder.tag("div", style: "position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 5px; font-size: 12px;") do
				builder.text("🍒 = Cherry (+50) | 👻 = Ghost (+200)")
			end
		end
	end
end

Application = Lively::Application[PacmanView]
