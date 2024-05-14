#!/usr/bin/env lively

class Board
	FRUITS = ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒"]
	
	def initialize(width = 20, height = 20)
		@width = width
		@height = height
		
		reset!
	end
	
	attr :grid
	
	attr_accessor :direction
	
	def add_fruit!
		5.times do
			y = rand(@height)
			x = rand(@width)
			
			if @grid[y][x].nil?
				@grid[y][x] = FRUITS.sample
				return y, x
			end
		end
	end
	
	def reset!(count = 5)
		@grid = Array.new(@height) {Array.new(@width)}
		@head = [@height/2, @width/2]
		
		@count = count
		@direction = :up
		
		@grid[@head[0]][@head[1]] = count
		
		add_fruit!
	end
	
	def decrement
		@grid.each do |row|
			row.map! do |cell|
				if cell.is_a?(Integer)
					cell -= 1
				end
				
				if cell == 0
					nil
				else
					cell
				end
			end
		end
	end
	
	def direction=(value)
		case @direction
		when :up
			if value == :down
				return
			end
		when :down
			if value == :up
				return
			end
		when :left
			if value == :right
				return
			end
		when :right
			if value == :left
				return
			end
		end
		
		@direction = value
	end
	
	def step
		decrement
		
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
		
		if @head[0] < 0 || @head[0] >= @height || @head[1] < 0 || @head[1] >= @width
			reset!
		end
		
		case @grid[@head[0]][@head[1]]
		when String
			@count += 1
			add_fruit!
		when Integer
			reset!
		end
		
		@grid[@head[0]][@head[1]] = @count
	end
end

class WormsView < Live::View
	def initialize(...)
		super
		
		@board = Board.new
	end
	
	def run!(dt = 0.1)
		@game ||= Async do
			while true
				@board&.step
				self.update!
				sleep(dt)
			end
		end
	end
	
	def bind(page)
		super
		
		self.run!
	end
	
	def close
		if @game
			@game.stop
			@game = nil
		end
		
		super
	end
	
	def handle(event)
		Console.info(self, event)
		
		case event[:type]
		when "keypress"
			detail = event[:detail]
			
			case detail[:key]
			when "w"
				@board.direction = :up
			when "s"
				@board.direction = :down
			when "a"
				@board.direction = :left
			when "d"
				@board.direction = :right
			end
		end
	end
	
	def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {value: event.target.value, key: event.key})"
	end
	
	def render(builder)
		builder.tag('table', tabIndex: 0, autofocus: true, onKeyPress: forward_keypress) do
			@board.grid.each do |row|
				builder.tag('tr') do
					row.each do |cell|
						if cell.is_a?(Integer)
							style = "background-color: hsl(#{cell * 10}, 100%, 50%)"
							builder.tag('td', style: style)
						elsif cell.is_a?(String)
							builder.tag('td') do
								builder.text(cell)
							end
						else
							builder.tag('td')
						end
					end
				end
			end
		end
	end
end

Application = Lively::Application[WormsView]
