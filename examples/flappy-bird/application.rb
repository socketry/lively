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

class Bird < BoundingBox
	def initialize(x = 30, y = HEIGHT / 2, width: 34, height: 24, skin: nil)
		super(x, y, width, height)
		@skin = skin || "bird"
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
		@velocity += GRAVITY * dt
		@y += @velocity * dt
		
		if @y > HEIGHT
			@y = HEIGHT
			@velocity = 0.0
		end
		
		if @jumping
			@jumping -= dt
			if @jumping < 0
				@jumping = false
			end
		end
		
		if @dying
			@dying += dt
		end
	end
	
	def jump(extreme = false)
		return if @dying
		
		@velocity = 300.0
		
		if extreme
			@jumping = 0.5
		end
	end
	
	def die
		@dying = 0.0
	end
	
	def render(builder, remote: false)
		if @dying
			rotation = 360.0 * (@dying * 2.0)
		else
			rotation = (@velocity / 20.0).clamp(-40.0, 40.0)
		end
		
		rotate = "rotate(#{-rotation}deg)"
		
		class_name = remote ? "bird #{@skin} remote" : "bird #{@skin}"
		
		builder.inline_tag(:div, 
			class: class_name, 
			style: "left: #{@x}px; bottom: #{@y}px; width: #{@width}px; height: #{@height}px; transform: #{rotate};"
		)
		
		# Render jump particles for local player only
		if @jumping && !remote
			center = self.center
			
			10.times do |i|
				angle = (360 / 10) * i
				id = "bird-#{self.__id__}-particle-#{i}"
				
				builder.inline_tag(:div, 
					id: id, 
					class: "particle jump", 
					style: "left: #{center[0]}px; bottom: #{center[1]}px; --rotation-angle: #{angle}deg;"
				)
			end
		end
	end
end

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
		@x -= 100 * dt
		
		if @collected
			@collected -= dt
			
			if @collected < 0
				@collected = false
				yield if block_given?
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
			class: "gemstone", 
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
					class: "particle bonus", 
					style: "left: #{center[0]}px; bottom: #{center[1]}px; --rotation-angle: #{angle}deg;"
				)
			end
		end
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
		@x -= 100 * dt
		
		if self.right < 0
			reset!
			yield if block_given?
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
		
		builder.inline_tag(:div, class: "pipe", style: "left: #{@x}px; bottom: #{self.bottom}px; width: #{@width}px; height: #{@height}px; #{display}")
		builder.inline_tag(:div, class: "pipe", style: "left: #{@x}px; bottom: #{self.top}px; width: #{@width}px; height: #{@height}px; #{display}")
	end
end

class SkinSelectionView < Live::View
	SKINS = ["bird", "gull", "kiwi", "owl"]
	
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
						src: "/_static/flappy-#{skin}.webp", 
						alt: skin
					)
				end
			end
		end
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
		
		@skin_selection = SkinSelectionView.mount(self, "skin-selection")
		
		# Defaults:
		@score = 0
		@count = 0
		@scroll = 0
		@prompt = "Choose your bird and wait for game start!"
		
		@random = nil
		@dead = nil
	end
	
	attr :bird
	
	def bind(page)
		super
		
		page.attach(@skin_selection)
		@multiplayer_state.add_player(self)
	end
	
	def close
		if @game
			@game.stop
			@game = nil
		end
		
		page.detach(@skin_selection)
		@multiplayer_state.remove_player(self)
		
		super
	end
	
	def jump
		if (extreme = rand > 0.8)
			play_sound(@bird.skin)
		end
		
		@bird&.jump(extreme)
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
				
				fetch('/_static/music.mp3')
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
	
	def game_over!
		Console.info(self, "Player has died.")
		@dead.resolve(true)
		
		Highscore.create!(ENV.fetch("PLAYER", "Anonymous"), @score)
		
		@prompt = "Game Over! Score: #{@score}. Waiting for next round..."
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
		@scroll += dt
		
		@bird.step(dt)
		@pipes.each do |pipe|
			pipe.step(dt) do
				# Pipe was reset - spawn bonus every 5 pipes
				if @bonus.nil? and @count > 0 and (@count % 5).zero?
					@bonus = Gemstone.new(*pipe.center)
				end
			end
			
			if @bird.alive?
				if pipe.right < @bird.x && !pipe.scored
					@score += 1
					@count += 1
					
					pipe.scored = true
					
					if @count == 3
						play_music
					end
				end
				
				if pipe.intersect?(@bird)
					Console.info(self, "Player has died.")
					@bird.die
					play_sound("death")
					stop_music
					return game_over!
				end
			end
		end
		
		@bonus&.step(dt) do
			@bonus = nil
		end
		
		if @bonus
			if !@bonus.collected? and @bonus.intersect?(@bird)
				play_sound("clink")
				@score = @score * 2
				@bonus.collect!
			elsif @bonus.right < 0
				@bonus = nil
			end
		end
		
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
					builder.text("Score: #{@score}")
				end
			else
				builder.inline_tag(:div, class: "prompt") do
					builder.inline_tag(:div, class: "logo")
					
					builder << @skin_selection.to_html
					
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
