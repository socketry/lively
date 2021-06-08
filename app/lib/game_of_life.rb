# frozen_string_literal: true

# Copyright, 2021, by Samuel G. D. Williams. <http://www.codeotaku.com>
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

require 'live/view'

class GameOfLife < Live::View
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
	
	def initialize(id, **data)
		data[:width] ||= 33
		data[:height] ||= 33
		
		super
		
		self.reset
		
		@update = nil
	end
	
	def bind(page)
		super(page)
	end
	
	def close
		self.stop
		
		super
	end
	
	def start
		@update ||= Async do |task|
			while true
				task.sleep(1.0/30.0)
				
				@grid = @grid.step
				self.replace!
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
			self.replace!
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
	
	def love(number_of_points: 128, scale: 0.95)
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
		case event.dig(:details, :action)
		when 'start'
			self.start
		when 'stop'
			self.stop
		when 'step'
			self.step
		when 'reset'
			self.reset
			self.replace!
		when 'set'
			x = event.dig(:details, :x).to_i
			y = event.dig(:details, :y).to_i
			@grid.toggle(x, y)
			self.replace!
		when 'randomize'
			self.randomize
			self.replace!
		when 'love'
			self.love
			self.replace!
		end
	end
	
	def forward_coordinate
		"live.forward(#{JSON.dump(@id)}, event, {action: 'set', x: event.target.cellIndex, y: event.target.parentNode.rowIndex})"
	end
	
	def render(builder)
		builder.tag('p') do
			builder.inline('button', onclick: forward(action: 'start')) do
				builder.text("Start")
			end
			
			builder.inline('button', onclick: forward(action: 'stop')) do
				builder.text("Stop")
			end
			
			builder.inline('button', onclick: forward(action: 'step')) do
				builder.text("Step")
			end
			
			builder.inline('button', onclick: forward(action: 'reset')) do
				builder.text("Reset")
			end
			
			builder.inline('button', onclick: forward(action: 'randomize')) do
				builder.text("Randomize")
			end
			
			builder.inline('button', onclick: forward(action: 'love')) do
				builder.text("Love")
			end
		end
		
		builder.tag('table', onclick: forward_coordinate) do
			@grid.rows do |y, row|
				builder.tag('tr') do
					row.count.times do |x|
						style = []
						
						if color = @grid.get(x, y)
							style << "background-color: #{color}"
						end
						
						builder.inline('td', style: style.join(';'))
					end
				end
			end
		end
	end
end
