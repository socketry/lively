#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

class Color < Struct.new(:h, :s, :l)
	def to_s
		# h 0...360
		# s 0...100%
		# l 0...100%
		"hsl(#{h}, #{s}%, #{l}%)"
	end
	
	def self.mix(*colors)
		result = Color.new(rand(60.0), 0.0, 0.0)
		
		colors.each do |color|
			result.h += color.h
			result.s += color.s
			result.l += color.l
		end
		
		result.h = (result.h / colors.size).round
		result.s = (result.s / colors.size).round
		result.l = (result.l / colors.size).round
		
		return result
	end
	
	def self.generate
		self.new(rand(360.0), 80, 80)
	end
end

class Grid
	def initialize(width, height)
		@width = width
		@height = height
		@values = Array.new(width * height)
	end
	
	attr :width
	attr :height
	
	def size
		@values.size
	end

	def live_count
		@values.count{|value| value}
	end
	
	def get(x, y)
		@values[@width * (y % @height) + (x % @width)]
	end
	
	def set(x, y, value = Color.generate)
		@values[@width * (y % @height) + (x % @width)] = value
	end
	
	def toggle(x, y)
		if get(x, y)
			set(x, y, nil)
		else
			set(x, y)
		end
	end
	
	def neighbours(x, y)
		[
			get(x-1, y-1),
			get(x-1, y),
			get(x-1, y+1),
			
			get(x, y-1),
			get(x, y+1),
			
			get(x+1, y-1),
			get(x+1, y),
			get(x+1, y+1),
		].compact
	end
	
	# Any live cell with two or three live neighbours survives.
	# Any dead cell with three live neighbours becomes a live cell.
	# All other live cells die in the next generation. Similarly, all other dead cells stay dead.
	def alive?(x, y)
		current = self.get(x, y)
		neighbours = self.neighbours(x, y)
		count = neighbours.size
		
		if current && (count == 2 || count == 3)
			Color.mix(current, *neighbours)
		elsif !current && count == 3
			Color.mix(*neighbours)
		else
			nil
		end
	end
	
	def map
		updated = self.class.new(@width, @height)
		
		@height.times do |y|
			@width.times do |x|
				updated.set(x, y, yield(x, y))
			end
		end
		
		return updated
	end
	
	def step
		self.map do |x, y|
			alive?(x, y)
		end
	end
	
	def rows
		@height.times do |y|
			yield y, @values[@width * y ... @width * (y+1)]
		end
	end
end

class GameOfLifeView < Live::View
	def initialize(...)
		super
		
		@data[:width] ||= 33
		@data[:height] ||= 33
		
		self.reset
		
		@update = nil
	end
	
	def bind(page)
		super(page)
	end
	
	def close
		Console.warn(self, "Stopping...")
		
		self.stop
		
		super
	end
	
	def start
		@update ||= Async do |task|
			while true
				task.sleep(1.0/5.0)
				
				@grid = @grid.step
				self.update!
			end
		end
	end
	
	def stop
		if @update
			@update.stop
			@update = nil
		end
	end
	
	def step
		unless @update
			@grid = @grid.step
			self.update!
		end
	end
	
	def reset
		@grid = Grid.new(@data[:width].to_i, @data[:height].to_i)
	end
	
	def randomize
		@grid = @grid.map do |x, y|
			if rand > 0.8
				Color.generate
			end
		end
	end
	
	def heart(number_of_points: 128, scale: 0.95)
		dt = (2.0 * Math::PI) / number_of_points
		t = 0.0
		
		while t <= (2.0 * Math::PI)
			t += dt
			
			x = 16*Math.sin(t)**3
			y = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t)
			
			x = (x * scale).round
			y = (-1.0 * y * scale).round
			
			@grid.set(@grid.width/2 + x, @grid.height/2 + y)
		end
	end
	
	def handle(event)
		case event.dig(:detail, :action)
		when "start"
			self.start
		when "stop"
			self.stop
			self.update!
		when "step"
			self.step
		when "reset"
			self.reset
			self.update!
		when "set"
			self.stop
			x = event.dig(:detail, :x).to_i
			y = event.dig(:detail, :y).to_i
			@grid.toggle(x, y)
			self.update!
		when "randomize"
			self.randomize
			self.update!
		when "heart"
			self.heart
			self.update!
		end
	end
	
	def forward_coordinate
		"live.forwardEvent(#{JSON.dump(@id)}, event, {action: 'set', x: event.target.cellIndex, y: event.target.parentNode.rowIndex})"
	end
	
	def render(builder)
		builder.tag("div", class: "game-of-life") do
			builder.tag("div", class: "game-header") do
				builder.tag("p", class: "eyebrow") do
					builder.text("Cellular automaton")
				end

				builder.tag("h1") do
					builder.text("Conway's Game of Life")
				end

				builder.tag("p", class: "introduction") do
					builder.text("Create a pattern, then watch a few simple rules bring it to life.")
				end
			end

			builder.tag("div", class: "game-panel") do
				builder.tag("div", class: "game-meta", aria: {label: "Simulation status"}) do
					status = @update ? "Running" : "Paused"
					status_class = @update ? "status status-running" : "status"

					builder.tag("span", class: status_class) do
						builder.inline("span", class: "status-dot", aria: {hidden: "true"})
						builder.text(status)
					end

					builder.tag("span", class: "population") do
						builder.text("#{@grid.live_count} live cells · #{@grid.width} × #{@grid.height}")
					end
				end

				builder.tag("div", class: "toolbar", aria: {label: "Simulation controls"}) do
					builder.tag("div", class: "control-group") do
						builder.tag("button", type: "button", class: "button button-primary", onclick: forward_event(action: "start")) do
							builder.text("▶ Start")
						end

						builder.tag("button", type: "button", class: "button", onclick: forward_event(action: "stop")) do
							builder.text("Pause")
						end

						builder.tag("button", type: "button", class: "button", onclick: forward_event(action: "step")) do
							builder.text("Step")
						end
					end

					builder.tag("div", class: "control-group") do
						builder.tag("button", type: "button", class: "button", onclick: forward_event(action: "randomize")) do
							builder.text("Randomize")
						end

						builder.tag("button", type: "button", class: "button", onclick: forward_event(action: "heart")) do
							builder.text("Draw heart")
						end

						builder.tag("button", type: "button", class: "button button-quiet", onclick: forward_event(action: "reset")) do
							builder.text("Clear")
						end
					end
				end

				builder.tag("div", class: "board-frame") do
					builder.tag("table", class: "life-grid", aria: {label: "Game of Life grid"}, onclick: forward_coordinate) do
						@grid.rows do |y, row|
							builder.tag("tr") do
								row.count.times do |x|
									style = []

									if color = @grid.get(x, y)
										style << "background-color: #{color}"
									end

									builder.inline("td", style: style.join(";"))
								end
							end
						end
					end
				end

				builder.tag("p", class: "hint") do
					builder.text("Tip: click any cell to toggle it. Editing automatically pauses the simulation.")
				end
			end
		end
	end
end

Application = Lively::Application[GameOfLifeView]
