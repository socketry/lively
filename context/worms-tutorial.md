# Building a Worms Game with Lively

This tutorial will guide you through creating a Worms-style game using Lively, a Ruby framework for building real-time applications.

We'll build the game step by step, starting with simple concepts and gradually adding complexity.

> **Complete Working Example**: For the complete working implementation with all assets, code, and resources, see the `examples/worms` directory in this repository. This tutorial walks through the concepts step by step, while the example directory contains the final working game.

## What You'll Build

By the end of this tutorial, you'll have created:

- A grid-based game board that you can see in your browser.
- A simple worm that moves automatically.
- Manual control with keyboard input.
- Fruit collection mechanics.
- Real-time updates using WebSockets.

## Prerequisites

- Basic knowledge of Ruby programming.
- Understanding of classes and objects.
- Familiarity with HTML/CSS basics.
- Lively framework installed (follow the getting started guide if needed).

## Tutorial Approach

We'll build this game in stages:

1. **Static Board**: First, we'll create a simple grid that displays in the browser.
2. **Dynamic Board**: Add the ability to change cells and see updates.
3. **Simple Worm**: Create a worm that moves automatically.
4. **User Control**: Add keyboard input to control the worm.
5. **Game Mechanics**: Add fruit, collision detection, and game rules.

## Step 1: Setting Up the Project Structure

First, create a new directory for your Worms game:

```bash
$ mkdir my_worms_game
$ cd my_worms_game
```

Create the main application file:

```bash
$ touch application.rb
```

Create the CSS directory and file:

```bash
$ mkdir -p public/_static
$ touch public/_static/index.css
```

## Step 2: Creating a Static Board (Your First View)

Let's start with the simplest possible thing: a grid that shows up in your browser. This will help you understand how Lively works.

Create your first file called `static_view.rb`:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

# Reference-style static board: fruit as string, worm as colored segment (hash).
class StaticBoard
	def initialize(width = 5, height = 5)
		@width = width
		@height = height
		
		# Use an Array of Arrays to store a grid:
		@grid = Array.new(@height) {Array.new(@width)}
		
		# Place a fruit:
		@grid[1][1] = "🍎"
		# Place a worm segment (hash with color):
		@grid[2][3] = {color: "hsl(120, 80%, 50%)", count: 3}
		# Place another fruit:
		@grid[3][2] = "🍌"
	end
	
	attr_reader :grid, :width, :height
end

class StaticView < Live::View
	def initialize(...)
		super
		
		@board = StaticBoard.new
	end
	
	# Render the HTML grid:
	def render(builder)
		builder.tag("h1") {builder.text("My First Lively Game!")}
		builder.tag("table") do
			@board.grid.each do |row|
				builder.tag("tr") do
					row.each do |cell|
						if cell.is_a?(Hash)
							builder.tag("td", style: "background-color: #{cell[:color]};")
						elsif cell.is_a?(String)
							builder.tag("td") {builder.text(cell)}
						else
							builder.tag("td")
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

# Reference-style interactive board: toggles between fruit and colored segment
class InteractiveBoard
	def initialize(width = 5, height = 5)
		@width = width
		@height = height
		@grid = Array.new(@height) {Array.new(@width)}
		# Put a fruit in the center:
		@grid[2][2] = "🍎"
	end
	
	attr_reader :grid, :width, :height
	
	# Set a worm segment at the specified coordinates.
	def set_segment(y, x)
		@grid[y][x] = {color: "hsl(120, 80%, 50%)", count: 1}
	end
	
	# Set a fruit at the specified coordinates.
	def set_fruit(y, x)
		@grid[y][x] = "🍎"
	end
	
	# Clear a cell at the specified coordinates.
	def clear_cell(y, x)
		@grid[y][x] = nil
	end
	
	# Get the cell at the specified coordinates.
	def get_cell(y, x)
		@grid[y][x]
	end
end

class InteractiveView < Live::View
	def initialize(...)
		super
		@board = InteractiveBoard.new
	end
	
	# Handle input from the user.
	def handle(event)
		Console.info(self, "Received event:", event)
		
		# Handle click events:
		if event[:type] == "click"
			# Get the x, y coordinates of the cell that was clicked:
			y = event[:detail][:y].to_i
			x = event[:detail][:x].to_i
			
			# Get the current value of the cell:
			cell = @board.get_cell(y, x)
			
			# Toggle: empty → fruit → segment → empty
			if cell.nil?
				@board.set_fruit(y, x)
			elsif cell.is_a?(String)
				@board.set_segment(y, x)
			else
				@board.clear_cell(y, x)
			end
			self.update!
		end
	end
	
	# Render the HTML grid, including event forwarding.
	def render(builder)
		builder.tag("h1") {builder.text("Interactive Board - Click the cells!")}
		builder.tag("table") do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						if cell.is_a?(Hash)
							# lively.forwardEvent sends the event from the browser to the server, invoking the handle method above. Note that we include the x and y coordinates as extra details.
							builder.tag("td", onclick: "live.forwardEvent('#{@id}', event, {y: #{y}, x: #{x}});", style: "cursor: pointer; background-color: #{cell[:color]};")
						elsif cell.is_a?(String)
							builder.tag("td", onclick: "live.forwardEvent('#{@id}', event, {y: #{y}, x: #{x}});", style: "cursor: pointer;") {builder.text(cell)}
						else
							builder.tag("td", onclick: "live.forwardEvent('#{@id}', event, {y: #{y}, x: #{x}});", style: "cursor: pointer;")
						end
					end
				end
			end
		end
		builder.tag("p") {builder.text("Click any cell to cycle: empty → fruit → worm segment → empty.")}
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

# Reference-style: worm as colored segment (hash), leaves a trail, bounces off walls.
class Board
	def initialize(width = 8, height = 8)
		@width = width
		@height = height
		@grid = Array.new(@height) {Array.new(@width)}
	end
	
	attr_reader :grid, :width, :height
	
	def set_segment(y, x, color, count)
		@grid[y][x] = {color: color, count: count}
	end
	
	def clear_segment(y, x)
		if @grid[y][x].is_a?(Hash)
			@grid[y][x] = nil
		end
	end
	
	# For all values in the grid that are integers, decrement them by 1. If they become 0, clear the segment.
	def decrement_segments
		@grid.each do |row|
			row.map! do |cell|
				if cell.is_a?(Hash)
					cell[:count] -= 1
					cell[:count] > 0 ? cell : nil
				else
					cell
				end
			end
		end
	end
end

class SimpleWorm
	def initialize(board, start_y, start_x, color = "hsl(120, 80%, 50%)")
		@board = board
		@y = start_y
		@x = start_x
		@direction = :right
		@color = color
		@length = 3
		@board.set_segment(@y, @x, @color, @length)
	end
	
	attr_reader :y, :x, :direction
	
	def move
		# Calculate new position based on the movement direction:
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
		
		# Bounce off walls by changing direction:
		if new_y < 0 || new_y >= @board.height || new_x < 0 || new_x >= @board.width
			case @direction
			when :right
				@direction = :down
			when :left
				@direction = :up
			when :up
				@direction = :right
			when :down
				@direction = :left
			end
			
			# Don't move this tick
			return
		end

		# Otherwise, update the worm's position:
		@y, @x = new_y, new_x
		@board.set_segment(@y, @x, @color, @length)
	end
end

class MovingWormView < Live::View
	def initialize(...)
		super
		@board = Board.new
		@worm = SimpleWorm.new(@board, 4, 4)
		
		# We will store the task responsible for updating the worm's position ont he server:
		@animation = nil
	end
	
	# When the browser connects to the server, this method is invoked, and we set up the animation loop.
	def bind(page)
		super
		
		@animation ||= Async do
			# The animation loop repeats 2 times per second, updating the board, then moving the worm.
			loop do
				sleep(0.5)
				@board.decrement_segments
				@worm.move
				
				# Regenerate the HTML and send it to the browser:
				self.update!
			end
		end
	end
	
	# When the browser disconnects from the server, this method is invoked, and we stop the animation loop.
	def close
		if animation = @animation
			@animation = nil
			animation.stop
		end
		
		super
	end
	
	# Render the HTML grid, including event forwarding.
	def render(builder)
		builder.tag("h1") {builder.text("Automatic Moving Worm")}
		builder.tag("table") do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						if cell.is_a?(Hash)
							builder.tag("td", style: "background-color: #{cell[:color]};")
						else
							builder.tag("td")
						end
					end
				end
			end
		end
		builder.tag("p") {builder.text("Watch the colored worm bounce around and leave a trail!")}
		builder.tag("p") {builder.text("Current position: (#{@worm.y}, #{@worm.x})")}
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

# Reference-style: worm as colored segment (hash), keyboard control, colored trail.
class Board
	def initialize(width = 10, height = 10)
		@width = width
		@height = height
		@grid = Array.new(@height) {Array.new(@width)}
	end
	
	attr_reader :grid, :width, :height
	
	def set_segment(y, x, color, count)
		@grid[y][x] = {color: color, count: count}
	end
	
	def clear_segment(y, x)
		if @grid[y][x].is_a?(Hash)
			@grid[y][x] = nil
		end
	end
	
	def decrement_segments
		@grid.each do |row|
			row.map! do |cell|
				if cell.is_a?(Hash)
					cell[:count] -= 1
					cell[:count] > 0 ? cell : nil
				else
					cell
				end
			end
		end
	end
end

class ControllableWorm
	attr_reader :y, :x, :direction
	attr_writer :direction
	
	def initialize(board, start_y, start_x, color = "hsl(120, 80%, 50%)")
		@board = board
		@y = start_y
		@x = start_x
		@direction = :right
		@color = color
		@length = 3
		@board.set_segment(@y, @x, @color, @length)
	end
	
	def move
		# Calculate new position:
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
		
		# Stay in bounds:
		if new_y < 0 || new_y >= @board.height || new_x < 0 || new_x >= @board.width
			return
		end
		
		@y, @x = new_y, new_x
		@board.set_segment(@y, @x, @color, @length)
	end
end

class ControllableView < Live::View
	def initialize(...)
		super
		@board = Board.new
		@worm = ControllableWorm.new(@board, 5, 5)
		@movement = nil
	end

	def bind(page)
		super
		
		@movement ||= Async do
			loop do
				sleep(0.3)
				@board.decrement_segments
				@worm.move
				self.update!
			end
		end
	end

	def close
		if movement = @movement
			@movement = nil
			movement.stop
		end
		
		super
	end

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
		builder.tag("h1") {builder.text("Controllable Worm - Use WASD!")}
		builder.tag("table", tabindex: 0, autofocus: true, onkeypress: "live.forwardEvent('#{@id}', event, {key: event.key});") do
			@board.grid.each_with_index do |row, y|
				builder.tag("tr") do
					row.each_with_index do |cell, x|
						if cell.is_a?(Hash)
							builder.tag("td", style: "background-color: #{cell[:color]};")
						else
							builder.tag("td")
						end
					end
				end
			end
		end
		
		# Log extra information about the game:
		builder.tag("div") do
			builder.tag("p") {builder.text("Controls: W (up), A (left), S (down), D (right)")}
			builder.tag("p") {builder.text("Current direction: #{@worm.direction}")}
			builder.tag("p") {builder.text("Position: (#{@worm.y}, #{@worm.x})")}
			builder.tag("p") {builder.text("Click on the game board first, then use WASD keys!")}
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

# Reference-style board and rendering
class Board
	FRUITS = ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒"]
	
	def initialize(width = 15, height = 15)
		@width = width
		@height = height
		@grid = Array.new(@height) {Array.new(@width)}
		@fruit_count = 0
		reset!
	end
	
	attr_reader :grid, :width, :height
	
	def add_fruit!
		10.times do
			y = rand(@height)
			x = rand(@width)
			if @grid[y][x].nil?
				@grid[y][x] = FRUITS.sample
				@fruit_count += 1
				return [y, x]
			end
		end
		nil
	end
	
	def remove_fruit!(y, x)
		if @grid[y][x].is_a?(String)
			@grid[y][x] = nil
			@fruit_count -= 1
		end
	end
	
	def reset!
		@grid.each {|row| row.fill(nil)}
		@fruit_count = 0
		add_fruit!
	end
	
	def set_segment(y, x, color, count)
		@grid[y][x] = {color: color, count: count}
	end
	
	def clear_segment(y, x)
		if @grid[y][x].is_a?(Hash)
			@grid[y][x] = nil
		end
	end
	
	def decrement_segments
		@grid.each do |row|
			row.map! do |cell|
				if cell.is_a?(Hash)
					cell[:count] -= 1
					cell[:count] > 0 ? cell : nil
				else
					cell
				end
			end
		end
	end
end

class Player
	attr_reader :head, :count, :color, :direction, :score
	attr_writer :direction
	
	def initialize(board, start_y, start_x, color)
		@board = board
		@head = [start_y, start_x]
		@count = 3
		@direction = :right
		@color = color
		@score = 0
		@board.set_segment(@head[0], @head[1], @color, @count)
	end
	
	def move
		# Calculate new head position:
		y, x = @head
		case @direction
		when :up
			y -= 1
		when :down
			y += 1
		when :left
			x -= 1
		when :right
			x += 1
		end
		
		# Check for wall collision:
		if y < 0 || y >= @board.height || x < 0 || x >= @board.width
			reset!
			return :wall
		end
		
		cell = @board.grid[y][x]
		case cell
		when String # Fruit
			@score += 10
			@count += 2
			@board.remove_fruit!(y, x)
			@board.add_fruit!
		when Hash # Self collision
			reset!
			return :self
		end
		
		@head = [y, x]
		@board.set_segment(y, x, @color, @count)
		nil
	end
	
	def reset!
		# Remove all segments of this color
		@board.grid.each_with_index do |row, y|
			row.each_with_index do |cell, x|
				if cell.is_a?(Hash) && cell[:color] == @color
					@board.clear_segment(y, x)
				end
			end
		end
		@head = [@board.height/2, @board.width/2]
		@count = 3
		@direction = :right
		@score = 0
		@board.set_segment(@head[0], @head[1], @color, @count)
	end
end

class WormsGameView < Live::View
	def initialize(...)
		super
		@board = Board.new
		@player = Player.new(@board, @board.height/2, @board.width/2, "hsl(120, 80%, 50%)")
	end
	
	def bind(page)
		super
		
		@game ||= Async do
			loop do
				sleep(0.18)
				@board.decrement_segments
				@player.move
				self.update!
			end
		end
	end
	
	def close
		@game&.stop
		super
	end
	
	def handle(event)
		if event[:type] == "keypress"
			key = event[:detail][:key]
			case key
			when "w"
				@player.direction = :up unless @player.direction == :down
			when "s"
				@player.direction = :down unless @player.direction == :up
			when "a"
				@player.direction = :left unless @player.direction == :right
			when "d"
				@player.direction = :right unless @player.direction == :left
			end
		end
	end
	
	def render(builder)
		builder.tag("h1") {builder.text("Worms Game (Reference-style)")}
		builder.tag("div") do
			builder.tag("p") {builder.text("Score: #{@player.score}")}
			builder.tag("p") {builder.text("Length: #{@player.count}")}
			builder.tag("p") {builder.text("Direction: #{@player.direction}")}
		end
		builder.tag("table", tabindex: 0, autofocus: true, onkeypress: "live.forwardEvent('#{@id}', event, {key: event.key});") do
			@board.grid.each do |row|
				builder.tag("tr") do
					row.each do |cell|
						if cell.is_a?(Hash)
							builder.tag("td", style: "background-color: #{cell[:color]};")
						elsif cell.is_a?(String)
							builder.tag("td") {builder.text(cell)}
						else
							builder.tag("td")
						end
					end
				end
			end
		end
		builder.tag("div") do
			builder.text("Controls: W/A/S/D to move. Eat fruit to grow. Don't hit yourself or the wall!")
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

## Next Steps and Customization Ideas

Now that you understand how Lively works, try these enhancements:

1. **Adjust Game Speed**: Change the sleep time in the game loop.
2. **Bigger Board**: Modify the width and height parameters.
3. **Different Fruits**: Add new emoji to the `FRUITS` array.
4. **Power-ups**: Create special fruits with different effects.
5. **High Scores**: Store and display the best scores.
6. **Sound Effects**: Add audio feedback for actions.
7. **Multiplayer**: Create separate game instances for different players.
8. **Touch Controls**: Add swipe gestures for mobile devices.

## Key Lively Concepts

This tutorial demonstrated the core concepts you need for any Lively application:

- **Views**: Ruby classes that generate HTML content.
- **Event Handling**: Processing user interactions from the browser.
- **Real-time Updates**: Using `self.update!` to refresh content.
- **Background Tasks**: Using `Async` for continuous processes.
- **Resource Management**: Cleaning up with the `close` method.
