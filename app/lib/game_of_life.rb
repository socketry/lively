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
		
		def set(x, y, value = true)
			@values[@width * (y % @height) + (x % @width)] = value
		end
		
		def count(x, y)
			[
				get(x-1, y-1),
				get(x-1, y),
				get(x-1, y+1),
				
				get(x, y-1),
				get(x, y+1),
				
				get(x+1, y-1),
				get(x+1, y),
				get(x+1, y+1),
			].count{|value| value}
		end
		
		# Any live cell with two or three live neighbours survives.
		# Any dead cell with three live neighbours becomes a live cell.
		# All other live cells die in the next generation. Similarly, all other dead cells stay dead.
		def alive?(x, y)
			current = self.get(x, y)
			count = self.count(x, y)
			
			if current && (count == 2 || count == 3)
				true
			elsif !current && count == 3
				true
			else
				false
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
		data[:width] ||= 32
		data[:height] ||= 32
		
		super
		
		@grid = Grid.new(data[:width].to_i, data[:height].to_i)
		
		@grid.set(1, 0)
		@grid.set(2, 1)
		@grid.set(0, 2)
		@grid.set(1, 2)
		@grid.set(2, 2)
		
		# 12.times do |i|
		# 	@grid.set(@grid.width/2, @grid.height/2 + i)
		# 	@grid.set(@grid.width/2 + i, @grid.height/2)
		# 	@grid.set(@grid.width/2 + i, @grid.height/2 + i)
		# end
		
		@update = nil
	end
	
	def bind(page)
		super(page)
		
		@update = Async do |task|
			while true
				task.sleep(1.0/60.0)
				@grid = @grid.step
				
				self.replace!
			end
		end
	end
	
	def close
		@update.stop
		
		super
	end
	
	def render(builder)
		builder.tag('table') do
			@grid.rows do |y, row|
				builder.tag('tr') do
					row.count.times do |x|
						style = []
						
						if @grid.get(x, y)
							style << "background-color: green"
						end
						
						builder.inline('td', style: style.join(';'))
					end
				end
			end
		end
	end
end
