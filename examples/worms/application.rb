#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

require 'thread/local'

class GameState
	extend Thread::Local
	
	# Initialize a new game state with a board.
	def initialize
		@board = Board.new
		@game = nil
	end
	
	attr :board
	
	# Add a new player to the game.
	# @returns [Player] The newly created player.
	def add_player
		player = @board.add_player
		Console.info(self, "Player joined", player: player)
		
		self.run!
		
		return player
	end
	
	# Remove a player from the game.
	# @parameter player [Player] The player to remove.
	def remove_player(player)
		@board.remove_player(player)
		Console.info(self, "Player left", player: player)
		
		if @board.players.empty?
			self.close
		end
	end
	
	# Start or resume the game loop.
	# @parameter dt [Float] The time interval between steps in seconds.
	def run!(dt = 0.2)
		@game ||= Async do
			while true
				@board.step
				sleep(dt)
			end
		end
	end
	
	# Stops the game loop if it is running and sets the game instance to nil.
	private def close
		if game = @game
			@game = nil
			game.stop
		end
	end
end

class Player
	attr_reader :head, :count, :color
	attr_accessor :direction
	
	# Initialize a new player.
	# @parameter board [Board] The game board.
	# @parameter start_y [Integer] The initial y position.
	# @parameter start_x [Integer] The initial x position.
	# @parameter color [String] The player's color in HSL format.
	def initialize(board, start_y, start_x, color)
		@board = board
		@head = [start_y, start_x]
		@count = 1
		@direction = :up
		@color = color
		@on_updated = nil
	end
	
	# Set or get the update callback.
	# @parameter block [Proc] Optional block to set as the callback.
	# @returns [Proc] The current callback.
	def on_updated(&block)
		if block_given?
			@on_updated = block
		end
		
		return @on_updated
	end
	
	# Advance the player one step in their current direction.
	# Handles movement, collision detection, and fruit collection.
	def step
		case @direction
		when :up
			@head[0] -= 1
		when :down
			@head[0] += 1
		when :left
			@head[1] -= 1
		when :right
			@head[1] += 1
		end
		
		if @head[0] < 0 || @head[0] >= @board.height || @head[1] < 0 || @head[1] >= @board.width
			reset!
			return
		end
		
		case @board.grid[@head[0]][@head[1]]
		when String
			@count += 1
			@board.remove_fruit!(@head[0], @head[1])
			@board.add_fruit!
		when Integer, Hash
			reset!
			return
		end
		
		@board.grid[@head[0]][@head[1]] = {count: @count, color: @color}
		@on_updated&.call
	end
	
	# Reset the player to their initial state.
	def reset!
		# Convert segments into fruit before resetting
		@board.grid.each_with_index do |row, y|
			row.each_with_index do |cell, x|
				if cell.is_a?(Hash) && cell[:color] == @color
					@board.convert_to_fruit!(y, x)
				end
			end
		end
		
		@head = [@board.height/2, @board.width/2]
		@count = 1
		@direction = :up
	end
end

class Board
	FRUITS = ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒"]
	COLOR_OFFSET = 23
	
	# Initialize a new game board.
	# @parameter width [Integer] The width of the board.
	# @parameter height [Integer] The height of the board.
	def initialize(width = 20, height = 20)
		@width = width
		@height = height
		@players = []
		@fruit_count = 0
		
		reset!
	end
	
	attr :grid, :width, :height, :players
	
	# Add a new player to the board.
	# @returns [Player] The newly created player.
	def add_player
		hue = (@players.size * COLOR_OFFSET) % 360
		color = "hsl(#{hue}, 100%, 50%)"
		player = Player.new(self, @height/2, @width/2, color)
		@players << player
		
		# Add a fruit when a new player joins
		add_fruit!
		
		return player
	end
	
	# Remove a player from the board.
	# @parameter player [Player] The player to remove.
	def remove_player(player)
		@players.delete(player)
	end
	
	# Add a fruit to a random empty cell.
	# @returns [Array(Integer, Integer) | Nil] The coordinates of the added fruit, or nil if no space was found.
	def add_fruit!
		Console.info(self, "Adding fruit", fruit_count: @fruit_count, players: @players.size)
		# Only add fruit if we have fewer than one per player
		if @fruit_count < @players.size
			5.times do
				y = rand(@height)
				x = rand(@width)
				
				if @grid[y][x].nil?
					@grid[y][x] = FRUITS.sample
					@fruit_count += 1
					return y, x
				end
			end
		end

		validate_fruit_count!
		
		return nil
	end
	
	# Remove a fruit from the specified coordinates.
	# @parameter y [Integer] The y coordinate.
	# @parameter x [Integer] The x coordinate.
	def remove_fruit!(y, x)
		if @grid[y][x].is_a?(String)
			@grid[y][x] = nil
			@fruit_count -= 1
		end

		validate_fruit_count!
	end
	
	# Validate that the fruit count matches the actual number of fruits on the board.
	# @raises [RuntimeError] If the fruit count is incorrect.
	def validate_fruit_count!
		actual_count = @grid.flatten.count { |cell| cell.is_a?(String) }
		if actual_count != @fruit_count
			raise "Fruit count mismatch: expected #{@fruit_count}, got #{actual_count}"
		end
	end
	
	# Convert a cell to fruit.
	# @parameter y [Integer] The y coordinate.
	# @parameter x [Integer] The x coordinate.
	def convert_to_fruit!(y, x)
		unless @grid[y][x].is_a?(String)
			@grid[y][x] = FRUITS.sample
			@fruit_count += 1
		end

		validate_fruit_count!
	end
	
	# Reset the board to its initial state.
	def reset!
		@grid = Array.new(@height) {Array.new(@width)}
		@players.each(&:reset!)
		@fruit_count = 0
		add_fruit!
	end
	
	# Decrement the count of all player segments.
	def decrement
		@grid.each do |row|
			row.map! do |cell|
				if cell.is_a?(Hash)
					cell[:count] -= 1
					cell[:count] == 0 ? nil : cell
				else
					cell
				end
			end
		end
	end
	
	# Advance the game state by one step.
	def step
		decrement
		@players.each(&:step)
	end
end

class WormsView < Live::View
	# Initialize a new view.
	def initialize(...)
		super
		
		@game_state = GameState.instance
		@player = nil
	end
	
	# Bind the view to a page and set up the player.
	# @parameter page [Object] The page to bind to.
	def bind(page)
		super
		
		@player = @game_state.add_player
		@player.on_updated { self.update! }
	end
	
	# Clean up resources when the view is closed.
	def close
		if @player
			@game_state.remove_player(@player)
			@player = nil
		end
		
		super
	end
	
	# Handle input events.
	# @parameter event [Hash] The event to handle.
	def handle(event)
		Console.info(self, event)
		
		case event[:type]
		when "keypress"
			handle_keypress(event[:detail])
		when "touchend"
			handle_swipe(event[:detail])
		end
	end
	
	# Handle keyboard input.
	# @parameter detail [Hash] The key press details.
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
	
	# Handle swipe input.
	# @parameter detail [Hash] The swipe details.
	private def handle_swipe(detail)
		@player.direction = detail[:direction].to_sym
	end
	
	# Generate the JavaScript code to handle key press events.
	# @returns [String] The JavaScript code to handle key press events.
	private def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {key: event.key});"
	end
	
	# Generate the JavaScript code to handle touch start events.
	# @returns [String] The JavaScript code to handle touch start events.
	private def forward_touchstart
		"event.preventDefault(); this.touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};"
	end
	
	# Generate the JavaScript code to handle touch end events.
	# @returns [String] The JavaScript code to handle touch end events.
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
	
	# Render the game board.
	# @parameter builder [Object] The builder to use for rendering.
	def render(builder)
		builder.tag("table", 
			tabIndex: 0, 
			autofocus: true, 
			onKeyPress: forward_keypress,
			onTouchStart: forward_touchstart,
			onTouchEnd: forward_touchend
		) do
			@game_state.board.grid.each do |row|
				builder.tag("tr") do
					row.each do |cell|
						if cell.is_a?(Hash)
							style = "background-color: #{cell[:color]}"
							builder.tag("td", style: style)
						elsif cell.is_a?(String)
							builder.tag("td") do
								builder.text(cell)
							end
						else
							builder.tag("td")
						end
					end
				end
			end
		end
	end
end

Application = Lively::Application[WormsView]
