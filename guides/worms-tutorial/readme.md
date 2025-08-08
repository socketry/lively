# Building a Worms Game with Lively

This tutorial will guide you through creating a Worms-style game using Lively, a Ruby framework for building real-time applications. We'll build the game step by step, starting with simple concepts and gradually adding complexity.

## What You'll Build

By the end of this tutorial, you'll have created:

- A grid-based game board that you can see in your browser
- A simple worm that moves automatically
- Manual control with keyboard input
- Fruit collection mechanics
- Real-time updates using WebSockets

## Prerequisites

- Basic knowledge of Ruby programming
- Understanding of classes and objects
- Familiarity with HTML/CSS basics
- Lively framework installed (follow the getting started guide if needed)

## Tutorial Approach

We'll build this game in stages:

1. **Static Board**: First, we'll create a simple grid that displays in the browser
2. **Dynamic Board**: Add the ability to change cells and see updates
3. **Simple Worm**: Create a worm that moves automatically
4. **User Control**: Add keyboard input to control the worm
5. **Game Mechanics**: Add fruit, collision detection, and game rules

## Step 1: Setting Up the Project Structure

First, create a new directory for your Worms game:

```bash
mkdir my_worms_game
cd my_worms_game
```

Create the main application file:

```bash
touch application.rb
```

Create the CSS directory and file:

```bash
mkdir -p public/_static
touch public/_static/index.css
```

## Step 2: Creating a Static Board (Your First View)

Let's start with the simplest possible thing: a grid that shows up in your browser. This will help you understand how Lively works.

Create your first file called `static_view.rb`:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

class SimpleBoard
	def initialize(width = 5, height = 5)
		@width = width
		@height = height
		@grid = Array.new(@height) { Array.new(@width) { nil } }
		
		# Put some test content in the grid
		@grid[1][1] = "🍎"
		@grid[2][3] = "🍌"
		@grid[3][2] = "🐍"
	end
	
	attr_reader :grid, :width, :height
end

class StaticView < Live::View
	def initialize(...)
		super
		@board = SimpleBoard.new
	end
	
	def render(builder)
		builder.tag("h1") { builder.text("My First Lively Game!") }
		
		builder.tag("table") do
			@board.grid.each do |row|
				builder.tag("tr") do
					row.each do |cell|
						builder.tag("td") do
							if cell
								builder.text(cell)
							else
								builder.text(" ")
							end
						end
					end
				end
			end
		end
	end
end

Application = Lively::Application[StaticView]
```

Now add some basic CSS to `public/_static/index.css`:

```css
body {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 20px;
	font-family: Arial, sans-serif;
}

table {
	border-collapse: collapse;
	margin: 20px;
}

td {
	width: 40px;
	height: 40px;
	border: 1px solid #ccc;
	text-align: center;
	vertical-align: middle;
	font-size: 20px;
}
```

**Test it now**: Run `lively static_view.rb` and open your browser. You should see a 5x5 grid with a few emoji scattered around!

**What's happening here:**
- `SimpleBoard` creates a 2D array representing our game grid
- `StaticView` renders this grid as an HTML table
- The CSS makes it look like a proper game board
- Everything is static - no movement or interaction yet

## Step 3: Making the Board Interactive

Now let's make the board update when we click on it. This introduces the key concept of real-time updates in Lively.

Create a new file called `interactive_view.rb`:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

class InteractiveBoard
	def initialize(width = 5, height = 5)
		@width = width
		@height = height
		@grid = Array.new(@height) { Array.new(@width) { nil } }
	end
	
	attr_reader :grid, :width, :height
	
	# Add something to the board
	def set_cell(y, x, content)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = content
		true
	end
	
	# Clear a cell
	def clear_cell(y, x)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = nil
		true
	end
	
	# Get what's in a cell
	def get_cell(y, x)
		return nil if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x]
	end
end

class InteractiveView < Live::View
	def initialize(...)
		super
		@board = InteractiveBoard.new
		@board.set_cell(2, 2, "🎯")  # Put a target in the center
	end
	
	def handle(event)
		Console.info(self, "Received event:", event)
		
		if event[:type] == "click"
			y = event[:detail][:y].to_i
			x = event[:detail][:x].to_i
			
			# Toggle cell content when clicked
			if @board.get_cell(y, x)
				@board.clear_cell(y, x)
			else
				@board.set_cell(y, x, "✨")
			end
			
			# This is the magic - tells Lively to re-render the page!
			self.update!
		end
	end
	
	def render(builder)
		builder.tag("h1") { builder.text("Interactive Board - Click the cells!") }
		
		builder.tag("table") do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						builder.tag("td", 
							onclick: "live.forwardEvent('#{@id}', event, {y: #{y}, x: #{x}});",
							style: "cursor: pointer; background-color: #{cell ? '#e0f0e0' : '#f0f0f0'}"
						) do
							builder.text(cell || "□")
						end
					end
				end
			end
		end
		
		builder.tag("p") { builder.text("Click any cell to add/remove stars. The center target shows our coordinate system.") }
	end
end

Application = Lively::Application[InteractiveView]
```

**Test it now**: Run `lively interactive_view.rb` and click on the grid cells. You should see stars appear and disappear!

**Key concepts you just learned:**
- `handle(event)` receives user interactions from the browser
- `self.update!` tells Lively to re-render the page with new data
- JavaScript `onclick` events can send data back to Ruby
- The board can be modified and the changes appear instantly

**Try this**: Click around the grid and watch the real-time updates. This is the foundation of all Lively applications!

## Step 4: Adding a Simple Moving Worm

Now let's add something that moves automatically. This introduces the concept of background tasks and animation.

Create a new file called `moving_worm.rb`:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

class Board
	def initialize(width = 8, height = 8)
		@width = width
		@height = height
		@grid = Array.new(@height) { Array.new(@width) { nil } }
	end
	
	attr_reader :grid, :width, :height
	
	def set_cell(y, x, content)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = content
		true
	end
	
	def clear_cell(y, x)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = nil
		true
	end
	
	def get_cell(y, x)
		return nil if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x]
	end
	
	def valid_position?(y, x)
		y >= 0 && y < @height && x >= 0 && x < @width
	end
end

class SimpleWorm
	def initialize(board, start_y, start_x)
		@board = board
		@y = start_y
		@x = start_x
		@direction = :right
		@board.set_cell(@y, @x, "🐍")
	end
	
	attr_reader :y, :x
	
	def move
		# Clear current position
		@board.clear_cell(@y, @x)
		
		# Calculate new position
		case @direction
		when :right
			@x += 1
		when :left
			@x -= 1
		when :up
			@y -= 1
		when :down
			@y += 1
		end
		
		# Bounce off walls by changing direction
		if !@board.valid_position?(@y, @x)
			# Go back to previous position
			case @direction
			when :right
				@x -= 1
				@direction = :down
			when :left
				@x += 1
				@direction = :up
			when :up
				@y += 1
				@direction = :right
			when :down
				@y -= 1
				@direction = :left
			end
		end
		
		# Place worm at new position
		@board.set_cell(@y, @x, "🐍")
	end
end

class MovingWormView < Live::View
	def initialize(...)
		super
		@board = Board.new
		@worm = SimpleWorm.new(@board, 4, 4)
		
		# Start the animation loop
		start_animation
	end
	
	def start_animation
		@animation = Async do
			loop do
				sleep(0.5)  # Move every half second
				@worm.move
				self.update!  # Refresh the display
			end
		end
	end
	
	def close
		@animation&.stop
		super
	end
	
	def render(builder)
		builder.tag("h1") { builder.text("Automatic Moving Worm") }
		
		builder.tag("table") do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						builder.tag("td") do
							builder.text(cell || "·")
						end
					end
				end
			end
		end
		
		builder.tag("p") { builder.text("Watch the snake bounce around automatically!") }
		builder.tag("p") { builder.text("Current position: (#{@worm.y}, #{@worm.x})") }
	end
end

Application = Lively::Application[MovingWormView]
```

**Test it now**: Run `lively moving_worm.rb` and watch the worm move around the board automatically!

## Step 5: Adding Keyboard Control

Now let's make the worm respond to your keyboard input. This is where it becomes a real game!

Create a new file called `controllable_worm.rb`:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

class Board
	def initialize(width = 10, height = 10)
		@width = width
		@height = height
		@grid = Array.new(@height) { Array.new(@width) { nil } }
	end
	
	attr_reader :grid, :width, :height
	
	def set_cell(y, x, content)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = content
		true
	end
	
	def clear_cell(y, x)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = nil
		true
	end
	
	def get_cell(y, x)
		return nil if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x]
	end
	
	def valid_position?(y, x)
		y >= 0 && y < @height && x >= 0 && x < @width
	end
end

class ControllableWorm
	def initialize(board, start_y, start_x)
		@board = board
		@y = start_y
		@x = start_x
		@direction = :right
		@board.set_cell(@y, @x, "🐍")
	end
	
	attr_reader :y, :x, :direction
	attr_writer :direction
	
	def move
		# Clear current position
		@board.clear_cell(@y, @x)
		
		# Calculate new position based on direction
		new_y, new_x = @y, @x
		
		case @direction
		when :right
			new_x += 1
		when :left
			new_x -= 1
		when :up
			new_y -= 1
		when :down
			new_y += 1
		end
		
		# Check if new position is valid
		if @board.valid_position?(new_y, new_x)
			@y, @x = new_y, new_x
		end
		
		# Place worm at current position
		@board.set_cell(@y, @x, "🐍")
	end
end

class ControllableView < Live::View
	def initialize(...)
		super
		@board = Board.new
		@worm = ControllableWorm.new(@board, 5, 5)
		
		# Start the movement loop
		start_movement
	end
	
	def start_movement
		@movement = Async do
			loop do
				sleep(0.3)  # Move every 0.3 seconds
				@worm.move
				self.update!
			end
		end
	end
	
	def close
		@movement&.stop
		super
	end
	
	# Handle keyboard input
	def handle(event)
		Console.info(self, "Event:", event)
		
		if event[:type] == "keypress"
			key = event[:detail][:key]
			
			case key
			when "w"
				@worm.direction = :up
			when "s"
				@worm.direction = :down
			when "a"
				@worm.direction = :left
			when "d"
				@worm.direction = :right
			end
		end
	end
	
	def render(builder)
		builder.tag("h1") { builder.text("Controllable Worm - Use WASD!") }
		
		# The table needs to be focusable to receive keyboard events
		builder.tag("table", 
			tabindex: 0, 
			autofocus: true,
			onkeypress: "live.forwardEvent('#{@id}', event, {key: event.key});"
		) do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						builder.tag("td") do
							builder.text(cell || "·")
						end
					end
				end
			end
		end
		
		builder.tag("div") do
			builder.tag("p") { builder.text("Controls: W (up), A (left), S (down), D (right)") }
			builder.tag("p") { builder.text("Current direction: #{@worm.direction}") }
			builder.tag("p") { builder.text("Position: (#{@worm.y}, #{@worm.x})") }
			builder.tag("p") { builder.text("Click on the game board first, then use WASD keys!") }
		end
	end
end

Application = Lively::Application[ControllableView]
```

**Test it now**: 
1. Run `lively controllable_worm.rb`
2. Click on the game board to focus it
3. Use W, A, S, D keys to control the worm!

**What you just learned:**
- How to capture keyboard events with `onkeypress`
- Using `tabindex` and `autofocus` to make elements keyboard-focusable
- Separating input handling from movement logic
- Real-time control of game objects

**Try this**: 
- Change direction while the worm is moving
- Try to "trap" the worm in a corner
- Experiment with different movement speeds

## Step 6: The Complete Game

Let's put it all together to create the full Worms game! This includes trails, fruit collection, growing mechanics, and collision detection.

Create a new file called `complete_game.rb`:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

class GameBoard
	def initialize(width = 10, height = 10)
		@width = width
		@height = height
		@grid = Array.new(@height) { Array.new(@width) { nil } }
		spawn_fruit
	end
	
	attr_reader :grid, :width, :height
	
	def set_cell(y, x, content)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = content
		true
	end
	
	def clear_cell(y, x)
		return false if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x] = nil
		true
	end
	
	def get_cell(y, x)
		return nil if y < 0 || y >= @height || x < 0 || x >= @width
		@grid[y][x]
	end
	
	def valid_position?(y, x)
		y >= 0 && y < @height && x >= 0 && x < @width
	end
	
	def fruit_position
		@fruit_position
	end
	
	def spawn_fruit
		loop do
			y = rand(@height)
			x = rand(@width)
			if get_cell(y, x).nil?
				set_cell(y, x, "🍎")
				@fruit_position = [y, x]
				break
			end
		end
	end
	
	def remove_fruit
		if @fruit_position
			clear_cell(@fruit_position[0], @fruit_position[1])
			@fruit_position = nil
		end
	end
	
	def count_free_cells
		count = 0
		@grid.each do |row|
			row.each do |cell|
				count += 1 if cell.nil?
			end
		end
		count
	end
end

class TrailingWorm
	def initialize(board, start_y, start_x)
		@board = board
		@segments = [[start_y, start_x]]
		@direction = :right
		@score = 0
		@board.set_cell(start_y, start_x, "🐍")
	end
	
	attr_reader :segments, :direction, :score
	attr_writer :direction
	
	def head_position
		@segments.first
	end
	
	def move
		head_y, head_x = head_position
		
		# Calculate new head position
		new_y, new_x = head_y, head_x
		
		case @direction
		when :right
			new_x += 1
		when :left
			new_x -= 1
		when :up
			new_y -= 1
		when :down
			new_y += 1
		end
		
		# Check for wall collision
		return :wall_collision unless @board.valid_position?(new_y, new_x)
		
		# Check for self collision
		if @segments.include?([new_y, new_x])
			return :self_collision
		end
		
		# Check for fruit
		ate_fruit = false
		if @board.fruit_position && @board.fruit_position == [new_y, new_x]
			ate_fruit = true
			@score += 10
			@board.remove_fruit
		end
		
		# Add new head
		@segments.unshift([new_y, new_x])
		@board.set_cell(new_y, new_x, "🐍")
		
		# Remove tail if we didn't eat fruit
		unless ate_fruit
			tail_y, tail_x = @segments.pop
			@board.clear_cell(tail_y, tail_x)
		end
		
		# Spawn new fruit if needed
		if ate_fruit && @board.count_free_cells > 0
			@board.spawn_fruit
		end
		
		:success
	end
	
	def length
		@segments.length
	end
end

class WormsGameView < Live::View
	def initialize(...)
		super
		@board = GameBoard.new
		@worm = TrailingWorm.new(@board, 5, 5)
		@game_over = false
		@game_over_reason = nil
		
		start_movement
	end
	
	def start_movement
		@movement = Async do
			loop do
				sleep(0.2)  # Slightly faster movement
				
				unless @game_over
					result = @worm.move
					
					if result == :wall_collision
						@game_over = true
						@game_over_reason = "Hit the wall!"
					elsif result == :self_collision
						@game_over = true
						@game_over_reason = "Ate yourself!"
					end
				end
				
				self.update!
			end
		end
	end
	
	def close
		@movement&.stop
		super
	end
	
	def handle(event)
		Console.info(self, "Event:", event)
		
		if event[:type] == "keypress" && !@game_over
			key = event[:detail][:key]
			
			case key
			when "w"
				@worm.direction = :up unless @worm.direction == :down
			when "s"
				@worm.direction = :down unless @worm.direction == :up
			when "a"
				@worm.direction = :left unless @worm.direction == :right
			when "d"
				@worm.direction = :right unless @worm.direction == :left
			end
		elsif event[:type] == "keypress" && @game_over && event[:detail][:key] == " "
			# Restart game on spacebar
			restart_game
		end
	end
	
	def restart_game
		@board = GameBoard.new
		@worm = TrailingWorm.new(@board, 5, 5)
		@game_over = false
		@game_over_reason = nil
	end
	
	def render(builder)
		builder.tag("h1") { builder.text("Worms Game") }
		
		builder.tag("div", class: "info") do
			builder.tag("p") { builder.text("Score: #{@worm.score}") }
			builder.tag("p") { builder.text("Length: #{@worm.length}") }
			builder.tag("p") { builder.text("Direction: #{@worm.direction}") }
		end
		
		if @game_over
			builder.tag("div", class: "game-over") do
				builder.tag("h2") { builder.text("Game Over!") }
				builder.tag("p") { builder.text(@game_over_reason) }
				builder.tag("p") { builder.text("Final Score: #{@worm.score}") }
				builder.tag("p") { builder.text("Press SPACE to restart") }
			end
		end
		
		builder.tag("table", 
			tabindex: 0, 
			autofocus: true,
			onkeypress: "live.forwardEvent('#{@id}', event, {key: event.key});"
		) do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						css_class = ""
						if @worm.head_position == [y, x]
							css_class = "head"
						elsif @worm.segments.include?([y, x])
							css_class = "body"
						elsif cell == "🍎"
							css_class = "fruit"
						end
						
						builder.tag("td", class: css_class) do
							builder.text(cell || "·")
						end
					end
				end
			end
		end
		
		builder.tag("div", class: "controls") do
			builder.tag("p") { builder.text("Controls: W (up), A (left), S (down), D (right)") }
			builder.tag("p") { builder.text("Eat fruit to grow and score points!") }
			if @game_over
				builder.tag("p") { builder.text("Press SPACE to restart") }
			end
		end
	end
end

Application = Lively::Application[WormsGameView]
```

**Test it now**: Run `lively complete_game.rb` and enjoy the full game!

**What you've accomplished:**
You now have a fully functional Worms game that demonstrates all the key Lively concepts:
- Real-time web interfaces with growing trails
- Complete collision detection and game mechanics
- Score tracking and game over/restart functionality
- Polished user interface with CSS styling

**Congratulations!** You've built a complete game from the ground up, learning each concept step by step.

## What You've Learned

Through this step-by-step tutorial, you've learned:

### Step 2: Basic Lively Views
- How to create simple HTML with Ruby
- How Lively renders content to the browser
- Basic CSS styling for game grids

### Step 3: Real-time Interactivity  
- Event handling with `handle(event)`
- Using `self.update!` to refresh the display
- Sending data from JavaScript back to Ruby

### Step 4: Background Tasks
- Using `Async` for background processing
- Creating animation loops with `sleep()`
- Resource cleanup with the `close` method

### Step 5: User Input
- Keyboard event handling
- Making elements focusable with `tabindex`
- Separating input from game logic

### Step 6: Complete Game Mechanics
- Trail effects and aging
- Collision detection
- Score tracking and game resets
- Polished user interface

## Next Steps and Customization Ideas

Now that you understand how Lively works, try these enhancements:

1. **Adjust Game Speed**: Change the sleep time in the game loop
2. **Bigger Board**: Modify the width and height parameters
3. **Different Fruits**: Add new emoji to the `FRUITS` array
4. **Power-ups**: Create special fruits with different effects
5. **High Scores**: Store and display the best scores
6. **Sound Effects**: Add audio feedback for actions
7. **Multiplayer**: Create separate game instances for different players
8. **Touch Controls**: Add swipe gestures for mobile devices

## Key Lively Concepts

This tutorial demonstrated the core concepts you need for any Lively application:

- **Views**: Ruby classes that generate HTML content
- **Event Handling**: Processing user interactions from the browser
- **Real-time Updates**: Using `self.update!` to refresh content
- **Background Tasks**: Using `Async` for continuous processes
- **Resource Management**: Cleaning up with the `close` method

## Troubleshooting

**Game doesn't start**: Make sure Lively is installed and you're in the correct directory.

**No keyboard input**: Click on the game board to focus it, then try the keys.

**CSS not loading**: Ensure the CSS file is in `public/_static/index.css`.

**Performance issues**: Reduce the game board size or increase the sleep interval.

## Conclusion

You've successfully built a complete Worms game using Lively! More importantly, you've learned the fundamental patterns for building real-time web applications in Ruby.

The step-by-step approach helped you understand:
- How simple static content becomes interactive
- How user input drives application state
- How background tasks create smooth animations
- How all the pieces work together in a complete application

These same patterns apply to any Lively application you might build - from games to dashboards to collaborative tools. Happy coding!

