#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

require_relative "highscore"
require "async/variable"

WIDTH = 420
HEIGHT = 640
GRAVITY = -9.8 * 50.0

class BoundingBox
	def initialize(x, y, width, height)
		@x = x
		@y = y
		@width = width
		@height = height
	end
	
	attr_accessor :x, :y, :width, :height
	
	def right
		@x + @width
	end
	
	def top
		@y + @height
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

class Bird < BoundingBox
	def initialize(x = 30, y = HEIGHT / 2, width: 34, height: 24)
		super(x, y, width, height)
		@velocity = 0.0
	end
	
	def step(dt)
		@velocity += GRAVITY * dt
		@y += @velocity * dt
		
		if @y > HEIGHT
			@y = HEIGHT
			@velocity = 0.0
		end
	end
	
	def jump
		@velocity = 300.0
	end
	
	def render(builder, remote: false)
		rotation = (@velocity / 20.0).clamp(-40.0, 40.0)
		rotate = "rotate(#{-rotation}deg)";
		
		class_name = remote ? "bird remote" : "bird"
		
		builder.inline_tag(:div, class: class_name, style: "left: #{@x}px; bottom: #{@y}px; width: #{@width}px; height: #{@height}px; transform: #{rotate};")
	end
end

class Gemstone < BoundingBox
	def initialize(x, y, width: 148, height: 116)
		super(x, y - height / 2, width, height)
	end
	
	def step(dt)
		@x -= 100 * dt
	end
	
	def render(builder)
		builder.inline_tag(:div, class: "gemstone", style: "left: #{@x}px; bottom: #{@y}px; width: #{@width}px; height: #{@height}px;")
	end
end

class Pipe
	def initialize(x, y, offset = 100, random: 0, width: 44, height: 700)
		@x = x
		@y = y
		@offset = offset
		
		@width = width
		@height = height
		@difficulty = 0.0
		@scored = false
		
		@random = random
	end
	
	attr_accessor :x, :y, :offset
	
	# Whether the bird has passed through the pipe.
	attr_accessor :scored
	
	def scaled_random
		@random.rand(-1.0..1.0) * [@difficulty, 1.0].min
	end
	
	def reset!
		@x = WIDTH + (@random.rand * 10)
		@y = HEIGHT/2 + (HEIGHT/2 * scaled_random)
		
		if @offset > 50
			@offset -= (@difficulty * 10)
		end
		
		@difficulty += 0.1
		@scored = false
	end
	
	def step(dt)
		@x -= 100 * dt
		
		if self.right < 0
			reset!
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
		
		builder.inline_tag(:div, class: "pipe", style: "left: #{@x}px; bottom: #{self.bottom}px; width: #{@width}px; height: #{@height}px; #{display}")
		builder.inline_tag(:div, class: "pipe", style: "left: #{@x}px; bottom: #{self.top}px; width: #{@width}px; height: #{@height}px; #{display}")
	end
end

class FlappyBirdView < Live::View
	def initialize(*arguments, multiplayer_state: nil, **options)
		super(*arguments, **options)
		
		@multiplayer_state = multiplayer_state
		
		@game = nil
		@bird = nil
		@pipes = nil
		@bonus = nil
		
		# Defaults:
		@score = 0
		@prompt = "Press Space to Start"
		
		@random = nil
		@dead = nil
	end
	
	attr :bird
	
	def bind(page)
		super
		
		@multiplayer_state.add_player(self)
	end
	
	def close
		if @game
			@game.stop
			@game = nil
		end
		
		@multiplayer_state.remove_player(self)
		
		super
	end
	
	def jump
		play_sound("quack") if rand > 0.5
				
		@bird&.jump
	end
	
	def handle(event)
		case event[:type]
		when "touchstart"
			self.jump
		when "keypress"
			if event.dig(:detail, :key) == " "
				self.jump
			end
		end
	end
	
	def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {key: event.key})"
	end
	
	def reset!
		@dead = Async::Variable.new
		@random = Random.new(1)
		
		@bird = Bird.new
		@pipes = [
			Pipe.new(WIDTH + WIDTH * 1/2, HEIGHT/2, random: @random),
			Pipe.new(WIDTH + WIDTH * 2/2, HEIGHT/2, random: @random)
		]
		@bonus = nil
		@score = 0
	end
	
	def play_sound(name)
		self.script(<<~JAVASCRIPT)
			if (!this.sounds) {
				this.sounds = {};
			}
			
			if (!this.sounds[#{JSON.dump(name)}]) {
				this.sounds[#{JSON.dump(name)}] = new Audio('/_static/#{name}.mp3');
			}
			
			this.sounds[#{JSON.dump(name)}].play();
		JAVASCRIPT
	end
	
	def play_music
		self.script(<<~JAVASCRIPT)
			if (!this.music) {
				this.music = new Audio('/_static/music.mp3');
				this.music.loop = true;
				this.music.play();
			}
		JAVASCRIPT
	end
	
	def stop_music
		self.script(<<~JAVASCRIPT)
			if (this.music) {
				this.music.pause();
				this.music = null;
			}
		JAVASCRIPT
	end
	
	def game_over!
		Console.info(self, "Player has died.")
		@dead.resolve(true)
		
		play_sound("death")
		stop_music
		
		Highscore.create!(ENV.fetch("PLAYER", "Anonymous"), @score)
		
		@prompt = "Game Over! Score: #{@score}."
		@game = nil
		
		self.update!
		
		raise Async::Stop
	end
	
	def preparing(message)
		@prompt = message
		self.update!
	end
	
	def start_game!
		if @game
			@game.stop
			@game = nil
		end
		
		self.reset!
		self.update!
		self.script("this.querySelector('.flappy').focus()")
		@game = self.run!
	end
	
	def wait_until_dead
		@dead.wait
	end
	
	def step(dt)
		@bird.step(dt)
		@pipes.each do |pipe|
			pipe.step(dt)
			
			if pipe.right < @bird.x && !pipe.scored
				@score += 1
				pipe.scored = true
				
				if @score == 3
					play_music
				end
			end
			
			if pipe.intersect?(@bird)
				return game_over!
			end
		end
		
		@bonus&.step(dt)
		
		if @bonus&.intersect?(@bird)
			play_sound("clink")
			@score = @score * 2
			@bonus = nil
		elsif @bonus and @bonus.right < 0
			@bonus = nil
		end
		
		if @score > 0 and (@score % 5).zero?
			@bonus = Gemstone.new(WIDTH, HEIGHT/2)
		end
		
		if @bird.top < 0
			return game_over!
		end
	end
	
	def run!(dt = 1.0/10.0)
		Async do
			start_time = Async::Clock.now
			
			while true
				self.step(dt)
				
				self.update!
				
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
	
	def render(builder)
		builder.tag(:div, class: "flappy", tabIndex: 0, onKeyPress: forward_keypress, onTouchStart: forward_keypress) do
			if @game
				builder.inline_tag(:div, class: "score") do
					builder.text(@score)
				end
			else
				builder.inline_tag(:div, class: "prompt") do
					builder.text(@prompt)
					
					builder.inline_tag(:ol, class: "highscores") do
						Highscore.top10.each do |highscore|
							builder.inline_tag(:li) do
								builder.text("#{highscore[0]}: #{highscore[1]}")
							end
						end
					end
				end
			end
			
			@bird&.render(builder)
			
			@pipes&.each do |pipe|
				pipe.render(builder)
			end
			
			@bonus&.render(builder)
			
			@multiplayer_state&.players&.each do |player|
				if player != self
					player.bird&.render(builder, remote: true)
				end
			end
		end
	end
end

class Resolver < Live::Resolver
	def initialize(**state)
		super()
		
		@state = state
	end
	
	def call(id, data)
		if klass = @allowed[data[:class]]
			return klass.new(id, **data, **@state)
		end
	end
end

class MultiplayerState
	MINIMUM_PLAYERS = 1
	GAME_START_TIMEOUT = 5
	
	def initialize
		@joined = Set.new
		@players = nil
		
		@player_joined = Async::Condition.new
		
		@game = self.run!
	end
	
	attr :players
	
	def run!
		Async do
			while true
				Console.info(self, "Waiting for players...")
				while @joined.size < MINIMUM_PLAYERS
					@player_joined.wait
				end
				
				Console.info(self, "Starting game...")
				GAME_START_TIMEOUT.downto(0).each do |i|
					@joined.each do |player|
						player.preparing("Starting game in #{i}...")
					end
					sleep 1
				end
				
				@players = @joined.to_a
				Console.info(self, "Game started with #{@players.size} players")
				
				@players.each do |player|
					player.start_game!
				end
				
				@players.each do |player|
					player.wait_until_dead
				end
				
				Console.info(self, "Game over")
				@players = nil
			end
		end
	end
	
	def add_player(player)
		# Console.info(self, "Adding player: #{player}")
		@joined << player
		player.preparing("Waiting for other players...")
		@player_joined.signal
	end
	
	def remove_player(player)
		# Console.info(self, "Removing player: #{player}")
		@joined.delete(player)
	end
end

class Application < Lively::Application
	def self.resolver
		Resolver.new(multiplayer_state: MultiplayerState.new).tap do |resolver|
			resolver.allow(FlappyBirdView)
		end
	end
	
	def body(...)
		FlappyBirdView.new(...)
	end
end
