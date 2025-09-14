# Building a Flappy Bird Game with Live Views

This tutorial will guide you through creating a complete Flappy Bird-style game using Live Views, a Ruby framework for building real-time interactive applications.

We'll build the game step by step, starting with simple concepts and gradually adding complexity until we have a fully featured game with physics, collision detection, and visual effects.

> **Complete Working Example**: For the complete working implementation with all assets, code, and resources, see the [`examples/flappy-bird`](../../examples/flappy-bird/) directory in this repository. This tutorial walks through the concepts step by step, while the example directory contains the final working game.

## What You'll Build

By the end of this tutorial, you'll have created:

- A physics-based game with gravity and momentum
- Interactive bird control with keyboard and touch input
- Procedurally generated obstacles (pipes) 
- Collision detection system
- Particle effects and visual feedback
- Sound effects and background music
- High score tracking and persistence
- Customizable bird skins
- Real-time updates using WebSockets

## Prerequisites

- Basic knowledge of Ruby programming
- Understanding of classes and objects
- Familiarity with HTML/CSS basics
- Live framework installed (follow the getting started guide if needed)
- Basic understanding of coordinate systems and physics

## Tutorial Approach

We'll build this game in stages:

1. **Static Game World**: Create the game canvas and basic rendering
2. **Physics Simulation**: Add gravity, movement, and time-based updates
3. **Interactive Bird**: Create a controllable bird with jumping mechanics
4. **Obstacle System**: Add pipes with collision detection
5. **Game Logic**: Implement scoring, game over, and restart functionality
6. **Visual Effects**: Add particles, animations, and polish
7. **Audio System**: Integrate sound effects and music
8. **Customization**: Add skin selection and high scores

## Step 1: Setting Up the Game Canvas

First, let's create the basic structure for our game. We'll start with a simple view that renders a game area.

Create a new file called `flappy_basic.rb`:

```ruby
require 'live'

class FlappyBasicView < Live::View
	WIDTH = 420
	HEIGHT = 640
	
	def initialize(...)
		super(...)
		
		@game_started = false
		@prompt = "Press space or tap to start :)"
	end
	
	def render(builder)
		builder.tag(:div, class: "flappy", tabIndex: 0) do
			builder.inline_tag(:div, class: "prompt") do
				builder.text(@prompt)
			end
		end
	end
end
```

Add basic CSS styling to see our game canvas:

```css
.flappy {
	background-image: url('/assets/flappy-background.png');
	background-size: auto 100%;
	image-rendering: pixelated;
	
	width: 420px;
	height: 640px;
	margin: auto;
	
	position: relative;
	overflow: hidden;
	
	transform: translate3d(0,0,0);
}

.flappy .prompt {
	z-index: 20;
	padding: 1rem;
	color: white;
	text-shadow: 
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px  1px 0 #000,
		1px  1px 0 #000;
	
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	
	text-align: center;
}
```

**Test it now**: You should see a game canvas with a background and prompt text.

## Step 2: Creating the Bounding Box System

Before we can create game objects, we need a way to handle positioning and collision detection. Let's create a `BoundingBox` class:

```ruby
class BoundingBox
	def initialize(x, y, width, height)
		@x = x
		@y = y
		@width = width
		@height = height
	end
	
	attr :x
	attr :y
	attr :width
	attr :height
	
	def right
		@x + @width
	end
	
	def top
		@y + @height
	end
	
	def center
		[@x + @width/2, @y + @height/2]
	end
	
	def intersect?(other)
		!(
			self.right < other.x ||
			self.x > other.right ||
			self.top < other.y ||
			self.y > other.top
		)
	end
	
	def to_s
		"#<#{self.class} (#{@x}, #{@y}, #{@width}, #{@height}>"
	end
end
```

**Key concepts:**
- `BoundingBox` represents rectangular areas in our game
- `intersect?` method detects when two rectangles overlap (collision detection)
- `center` gives us the middle point for positioning effects
- `right` and `top` calculate the boundaries of the rectangle

## Step 3: Building the Bird with Physics

Now let's create our main character - the bird - with realistic physics simulation:

```ruby
class Bird < BoundingBox
	GRAVITY = -9.8 * 50.0  # Scaled gravity for game feel
	
	def initialize(x = 30, y = HEIGHT / 2, width: 34, height: 24, skin: nil)
		super(x, y, width, height)
		@skin = skin || 'bird'
		@velocity = 0.0
		@jumping = false
		@dying = false
	end
	
	attr :skin
	
	def dying?
		@dying != false
	end
	
	def alive?
		@dying == false
	end
	
	def step(dt)
		# Apply gravity to velocity
		@velocity += GRAVITY * dt
		# Apply velocity to position
		@y += @velocity * dt
		
		# Ground collision
		if @y > HEIGHT
			@y = HEIGHT
			@velocity = 0.0
		end
		
		# Handle jump effect duration
		if @jumping
			@jumping -= dt
			if @jumping < 0
				@jumping = false
			end
		end
		
		# Handle death animation
		if @dying
			@dying += dt
		end
	end
	
	def jump(extreme = false)
		return if @dying
		
		@velocity = 300.0  # Upward velocity
		
		if extreme
			@jumping = 0.5  # Visual effect duration
		end
	end
	
	def die
		@dying = 0.0
	end
	
	def render(builder)
		# Calculate rotation based on velocity
		if @dying
			rotation = 360.0 * (@dying * 2.0)  # Spin when dying
		else
			rotation = (@velocity / 20.0).clamp(-40.0, 40.0)  # Tilt based on velocity
		end
		
		rotate = "rotate(#{-rotation}deg)"
		
		builder.inline_tag(:div, 
			class: "bird #{@skin}", 
			style: "left: #{@x}px; bottom: #{@y}px; width: #{@width}px; height: #{@height}px; transform: #{rotate};"
		)
		
		# Render jump particles
		if @jumping
			center = self.center
			
			10.times do |i|
				angle = (360 / 10) * i
				id = "bird-#{self.__id__}-particle-#{i}"
				
				builder.inline_tag(:div, 
					id: id, 
					class: 'particle jump', 
					style: "left: #{center[0]}px; bottom: #{center[1]}px; --rotation-angle: #{angle}deg;"
				)
			end
		end
	end
end
```

Add CSS for the bird:

```css
.flappy .bird {
	z-index: 1;
	background-image: url('/assets/flappy-bird.webp');
	position: absolute;
	background-size: contain;
	
	transform: translate3d(0,0,0);
	transition: all 0.033s linear 0s;
}

@keyframes particle-jump {
	0% {
		transform: rotate(var(--rotation-angle)) translate(0, 0);
		opacity: 1;
	}
	100% {
		transform: rotate(var(--rotation-angle)) translate(100px, 100px);
		opacity: 0;
	}
}

.particle.jump {
	--rotation-angle: 0deg;
	position: absolute;
	width: 5px;
	height: 5px;
	background: #ffee00;
	border-radius: 50%;
	opacity: 0;
	
	transform: rotate(var(--rotation-angle));
	animation: particle-jump 0.5s;
}
```

**Key physics concepts:**
- **Gravity**: Constant downward acceleration
- **Velocity**: How fast the bird is moving (changes due to gravity)
- **Position**: Where the bird is (changes due to velocity)
- **Delta time (dt)**: Time between frames for smooth animation

## Step 4: Adding Pipes (Obstacles)

Let's create the pipes that the bird must navigate through:

```ruby
class Pipe
	def initialize(x, y, offset = 100, random: 0, width: 44, height: 700)
		@x = x
		@y = y
		@offset = offset  # Gap size between upper and lower pipes
		@width = width
		@height = height
		@difficulty = 0.0
		@scored = false
		@random = random
	end
	
	attr :x
	attr :y
	attr :offset
	attr_accessor :scored
	
	def scaled_random
		@random.rand(-0.8..0.8) * [@difficulty, 1.0].min
	end
	
	def reset!
		@x = WIDTH + (@random.rand * 10)
		@y = HEIGHT/2 + (HEIGHT/2 * scaled_random)
		
		# Gradually increase difficulty by making gap smaller
		if @offset > 50
			@offset -= 1
		end
		
		@difficulty += 0.1
		@scored = false
	end
	
	def step(dt)
		@x -= 100 * dt  # Move left at constant speed
		
		if self.right < 0
			reset!
			yield if block_given?  # Notify when pipe resets
		end
	end
	
	def right
		@x + @width
	end
	
	def top
		@y + @offset
	end
	
	def bottom
		(@y - @offset) - @height
	end
	
	def center
		[@x + @width/2, @y]
	end
	
	def lower_bounding_box
		BoundingBox.new(@x, self.bottom, @width, @height)
	end
	
	def upper_bounding_box
		BoundingBox.new(@x, self.top, @width, @height)
	end
	
	def intersect?(other)
		lower_bounding_box.intersect?(other) || upper_bounding_box.intersect?(other)
	end
	
	def render(builder)
		display = "display: none;" if @x > WIDTH
		
		# Render lower pipe
		builder.inline_tag(:div, 
			class: 'pipe', 
			style: "left: #{@x}px; bottom: #{self.bottom}px; width: #{@width}px; height: #{@height}px; #{display}"
		)
		# Render upper pipe
		builder.inline_tag(:div, 
			class: 'pipe', 
			style: "left: #{@x}px; bottom: #{self.top}px; width: #{@width}px; height: #{@height}px; #{display}"
		)
	end
end
```

Add CSS for pipes:

```css
.flappy .pipe {
	z-index: 5;
	background-image: url('/assets/flappy-pipe.png');
	position: absolute;
	background-size: contain;
	
	transform: translate3d(0,0,0);
	transition: all 0.033s linear 0s;
}
```

**Key pipe concepts:**
- **Procedural generation**: Pipes are positioned randomly within bounds
- **Scrolling**: Pipes move left at constant speed
- **Recycling**: When pipes move off-screen, they reset to the right
- **Difficulty scaling**: Gap gets smaller and positions more varied over time

## Step 5: Creating the Bonus System

Let's add collectible gemstones that double your score:

```ruby
class Gemstone < BoundingBox
	COLLECTED_AGE = 1.0
	
	def initialize(x, y, width: 148/2, height: 116/2)
		super(x - width/2, y - height/2, width, height)
		@collected = false
	end
	
	def collected?
		@collected != false
	end
	
	def step(dt)
		@x -= 100 * dt  # Move with same speed as pipes
		
		if @collected
			@collected -= dt
			
			if @collected < 0
				@collected = false
				yield if block_given?  # Notify when collection animation ends
			end
		end
	end
	
	def collect!
		@collected = COLLECTED_AGE
	end
	
	def render(builder)
		if @collected
			opacity = @collected / COLLECTED_AGE
		else
			opacity = 1.0
		end
		
		builder.inline_tag(:div, 
			class: 'gemstone', 
			style: "left: #{@x}px; bottom: #{@y}px; width: #{@width}px; height: #{@height}px; opacity: #{opacity};"
		)
		
		# Add particle effects when collected
		if @collected
			center = self.center
			
			10.times do |i|
				angle = (360 / 10) * i
				id = "gemstone-#{self.__id__}-particle-#{i}"
				
				builder.inline_tag(:div, 
					id: id, 
					class: 'particle bonus', 
					style: "left: #{center[0]}px; bottom: #{center[1]}px; --rotation-angle: #{angle}deg;"
				)
			end
		end
	end
end
```

Add CSS for gemstones:

```css
.flappy .gemstone {
	z-index: 0;
	background-image: url('/assets/gemstone.gif');
	position: absolute;
	background-size: contain;
	
	transform: translate3d(0,0,0);
	transition: all 0.033s linear 0s;
}

@keyframes particle-bonus {
	0% {
		transform: rotate(var(--rotation-angle)) translate(0, 0);
		opacity: 1;
	}
	25% {
		transform: rotate(var(--rotation-angle)) translate(25px, -25px);
		opacity: 0.75;
	}
	50% {
		transform: rotate(var(--rotation-angle)) translate(50px, 50px);
		opacity: 0.5;
	}
	75% {
		transform: rotate(var(--rotation-angle)) translate(75px, -75px);
		opacity: 0.25;
	}
	100% {
		transform: rotate(var(--rotation-angle)) translate(100px, 100px);
		opacity: 0;
	}
}

.particle.bonus {
	--rotation-angle: 0deg;
	position: absolute;
	width: 10px;
	height: 10px;
	background: #ff0000;
	border-radius: 50%;
	opacity: 0;
	
	transform: rotate(var(--rotation-angle));	
	animation: particle-bonus 1.0s;
}
```

## Step 6: Building the Skin Selection System

Let's add a way for players to choose different bird skins:

```ruby
class SkinSelectionView < Live::View
	SKINS = ['bird', 'gull', 'kiwi', 'owl']
	
	def handle(event)
		skin = event.dig(:detail, :skin) or return
		@data[:skin] = skin
		self.update!
	end
	
	def skin
		@data[:skin] || SKINS.first
	end
	
	def render(builder)
		builder.inline_tag(:ul, class: "skins") do
			SKINS.each do |skin|
				selected = (skin == self.skin ? "selected" : "")
				builder.inline_tag(:li, 
					class: selected, 
					onClick: forward_event(skin: skin)
				) do
					builder.inline_tag(:img, 
						src: "/assets/flappy-#{skin}.webp", 
						alt: skin
					)
				end
			end
		end
	end
end
```

Add CSS for skin selection:

```css
.flappy ul.skins {
	display: block;
	text-align: center;
	padding: 0;
	margin: 0;
}

.flappy .skins li {
	display: inline-block;
	padding: 0.5rem;
	margin: 0.5rem;
}

.flappy .skins img {
	width: 34px;
	vertical-align: middle;
}

.flappy .skins li.selected {
	background-color: rgba(255, 255, 255, 0.5);
	border-radius: 0.5rem;
}

.flappy .bird.gull {
	background-image: url('/assets/flappy-gull.webp');
}

.flappy .bird.kiwi {
	background-image: url('/assets/flappy-kiwi.webp');
}

.flappy .bird.owl {
	background-image: url('/assets/flappy-owl.webp');
}
```

## Step 7: Implementing the Main Game Logic

Now let's put it all together in the main `FlappyView` class:

```ruby
class FlappyView < Live::View
	WIDTH = 420
	HEIGHT = 640
	
	def initialize(...)
		super(...)
		
		@game = nil
		@bird = nil
		@pipes = nil
		@bonus = nil
		
		@skin_selection = SkinSelectionView.mount(self, 'skin-selection')
		
		# Game state
		@score = 0
		@count = 0
		@scroll = 0
		@prompt = "Press space or tap to start :)"
		
		@random = nil
	end
	
	attr :bird
	
	def bind(page)
		super
		page.attach(@skin_selection)
	end
	
	def close
		if @game
			@game.stop
			@game = nil
		end
		
		page.detach(@skin_selection)
		super
	end
	
	def jump
		if (extreme = rand > 0.8)
			play_sound(@bird.skin)
		end
		
		@bird&.jump(extreme)
	end
	
	def handle(event)
		detail = event[:detail]
		
		case event[:type]
		when "keypress", "touchstart"
			if @game.nil?
				self.start_game!
			elsif detail[:key] == " " || detail[:touch]
				self.jump
			end
		end
	end
	
	def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {key: event.key})"
	end
	
	def reset!
		@bird = Bird.new(skin: @skin_selection.skin)
		@pipes = [
			Pipe.new(WIDTH + WIDTH * 1/2, HEIGHT/2, random: @random),
			Pipe.new(WIDTH + WIDTH * 2/2, HEIGHT/2, random: @random)
		]
		@bonus = nil
		@score = 0
		@count = 0
		@scroll = 0
	end
end
```

## Step 8: Adding Sound Effects

Let's integrate audio feedback for a more immersive experience:

```ruby
def play_sound(name)
	self.script(<<~JAVASCRIPT)
		if (!this.sounds) {
			this.sounds = {};
		}
		
		if (!this.sounds[#{JSON.dump(name)}]) {
			this.sounds[#{JSON.dump(name)}] = new Audio('/assets/#{name}.mp3');
		}
		
		this.sounds[#{JSON.dump(name)}].play();
	JAVASCRIPT
end

def play_music
	self.script(<<~JAVASCRIPT)
		this.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
		
		if (!this.source) {
			let playAudioBuffer = (audioBuffer) => {
				this.source = this.audioContext.createBufferSource();
				this.source.buffer = audioBuffer;
				this.source.connect(this.audioContext.destination);
				this.source.loop = true;
				this.source.loopStart = 32.0 * 60.0 / 80.0;
				this.source.loopEnd = 96.0 * 60.0 / 80.0;
				this.source.start(0, 0);
			};
			
			fetch('/assets/music.mp3')
				.then(response => response.arrayBuffer())
				.then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
				.then(playAudioBuffer);
		}
	JAVASCRIPT
end

def stop_music
	self.script(<<~JAVASCRIPT)
		if (this.source) {
			this.source.stop();
			this.source.disconnect();
			this.source = null;
		}
	JAVASCRIPT
end
```

**Audio concepts:**
- **Sound Effects**: Short audio clips for actions (jump, collect, death)
- **Background Music**: Looped music that starts after the player scores a few points
- **Web Audio API**: JavaScript API for precise audio control and timing

## Step 9: Game Loop and Physics Simulation

The heart of our game is the main game loop that updates all objects:

```ruby
def step(dt)
	@scroll += dt
	
	# Update bird physics
	@bird.step(dt)
	
	# Update pipes and handle scoring
	@pipes.each do |pipe|
		pipe.step(dt) do
			# Pipe was reset - spawn bonus every 5 pipes
			if @bonus.nil? and @count > 0 and (@count % 5).zero?
				@bonus = Gemstone.new(*pipe.center)
			end
		end
		
		# Check for scoring
		if @bird.alive?
			if pipe.right < @bird.x && !pipe.scored
				@score += 1
				@count += 1
				pipe.scored = true
				
				# Start music after 3 points
				if @count == 3
					play_music
				end
			end
		
			# Check for collision
			if pipe.intersect?(@bird)
				Console.info(self, "Player has died.")
				@bird.die
				play_sound("death")
				stop_music
			end
		end
	end
	
	# Update bonus gemstone
	@bonus&.step(dt) do
		@bonus = nil
	end
	
	if @bonus
		if !@bonus.collected? and @bonus.intersect?(@bird)
			play_sound("clink")
			@score = @score * 2  # Double the score!
			@bonus.collect!
		elsif @bonus.right < 0
			@bonus = nil
		end
	end
	
	# Check for death by falling off screen
	if @bird.top < -20
		if @bird.alive?
			@bird.die
			play_sound("death")
		end
		
		stop_music
		return game_over!
	end
end

def run!(dt = 1.0/30.0)
	Async do
		start_time = Async::Clock.now
		
		while true
			self.step(dt)
			self.update!
			
			# Maintain consistent frame rate
			duration = Async::Clock.now - start_time
			if duration < dt
				sleep(dt - duration)
			else
				Console.info(self, "Running behind by #{duration - dt} seconds")
			end
			start_time = Async::Clock.now
		end
	end
end
```

**Game loop concepts:**
- **Fixed timestep**: Game updates 30 times per second for consistent physics
- **Frame rate independence**: Physics calculations use delta time
- **State management**: Track score, collisions, and game progression
- **Async execution**: Game loop runs independently of user interface

## Step 10: High Score System and Game Over

Let's add persistence and competitive elements:

```ruby
def game_over!
	# Save high score to database
	Highscore.create!(name: ENV.fetch("PLAYER", "Anonymous"), score: @score)
	
	@prompt = "Game Over! Score: #{@score}. Press space or tap to restart."
	@game = nil
	
	self.update!
	
	raise Async::Stop
end

def self.birdseed(time = Time.now)
	time.year * 1000 + time.yday
end

def start_game!(seed = self.class.birdseed)
	Console.info(self, "Starting game with seed: #{seed}")
	
	if @game
		@game.stop
		@game = nil
	end
	
	@random = Random.new(seed)  # Deterministic randomness for reproducible games
	
	self.reset!
	self.update!
	self.script("this.querySelector('.flappy').focus()")
	@game = self.run!
end
```

## Step 11: Complete Rendering System

Finally, let's implement the complete rendering system:

```ruby
def render(builder)
	builder.tag(:div, 
		class: "flappy", 
		tabIndex: 0, 
		onKeyPress: forward_keypress, 
		onTouchStart: forward_keypress
	) do
		if @game
			# Game is running - show score
			builder.inline_tag(:div, class: "score") do
				builder.text("Score: #{@score}")
			end
		else
			# Game menu - show logo, skin selection, and high scores
			builder.inline_tag(:div, class: "prompt") do
				builder.inline_tag(:div, class: "logo")
				
				builder << @skin_selection.to_html
				
				builder.text(@prompt)
				
				builder.inline_tag(:ol, class: "highscores") do
					Highscore.top10.each do |highscore|
						builder.inline_tag(:li) do
							builder.text("#{highscore.name}: #{highscore.score}")
						end
					end
				end
			end
		end
		
		# Render game objects
		@bird&.render(builder)
		
		@pipes&.each do |pipe|
			pipe.render(builder)
		end
		
		@bonus&.render(builder)
	end
end
```

## Complete Implementation

Here's how all the pieces fit together in a complete game file:

```ruby
#!/usr/bin/env lively
# frozen_string_literal: true

require 'live'

# [All the classes we've built: BoundingBox, Bird, Pipe, Gemstone, SkinSelectionView, FlappyView]
# Put them all together in a single file for easy execution

Application = Lively::Application[FlappyView]
```

## Key Live Framework Concepts

This tutorial demonstrated the advanced concepts needed for real-time games:

- **Physics Simulation**: Time-based movement and collision detection
- **Component Architecture**: Separating concerns into logical classes
- **Real-time Updates**: Smooth 30fps game loop with WebSocket communication
- **Event Handling**: Keyboard and touch input processing
- **Asset Management**: Images, sounds, and animations
- **State Management**: Game progression, scoring, and persistence
- **Performance Optimization**: Efficient rendering and memory management

## Next Steps and Enhancements

Now that you understand how Live works for games, try these enhancements:

1. **Power-ups**: Add temporary invincibility or slow-motion effects
2. **Multiple Levels**: Different backgrounds and obstacle patterns
3. **Multiplayer**: Real-time competitions between players
4. **Mobile Optimization**: Touch gestures and responsive design
5. **Analytics**: Track player behavior and difficulty balancing
6. **Achievements**: Unlock systems and progression rewards
7. **Custom Physics**: Experiment with different gravity or momentum
8. **Procedural Content**: Dynamic obstacle generation algorithms

## Performance Considerations

When building real-time games with Live:

- **Minimize DOM Updates**: Only update what has changed
- **Efficient Collision Detection**: Use spatial partitioning for many objects
- **Asset Preloading**: Load images and sounds before game starts
- **Memory Management**: Clean up particle effects and off-screen objects
- **Network Optimization**: Batch updates when possible

**Congratulations!** You've built a complete physics-based game that demonstrates the full power of Live for real-time interactive applications.