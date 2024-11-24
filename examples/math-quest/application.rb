#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

class Equation
	def initialize(lhs, operator, rhs)
		@lhs = lhs
		@operator = operator
		@rhs = rhs
	end
	
	def answer
		@lhs.send(@operator, @rhs)
	end
	
	def to_s
		"#{@lhs} #{@operator} #{@rhs}"
	end
	
	def correct?(input)
		self.answer == input.to_i
	end
	
	def self.generate(level)
		case level
		when 0
			self.new(rand(0..10), "+", rand(0..10))
		when 1
			self.new(rand(0..20), "+", rand(0..20))
		when 2
			self.new(rand(0..10), ["+", "-"].sample, rand(0..10))
		when 3
			self.new(rand(-10..10), ["+", "-"].sample, rand(-10..10))
		when 4
			self.new(rand(0..10), "*", rand(0..10))
		else
			self.new(rand(-10..10), "*", rand(-10..10))
		end
	end
end

class MathQuestView < Live::View
	def initialize(...)
		super
		
		@data[:level] ||= 0
		@data[:time] ||= 60
		@data[:score] ||= 0
		
		@update = nil
		@equation = nil
	end
	
	def bind(page)
		super(page)
		
		self.reset
		self.start
	end
	
	def close
		Console.warn(self, "Stopping...")
		
		self.stop
		
		super
	end
	
	def start
		@update ||= Async do |task|
			while true
				task.sleep(1.0)
				
				Console.warn(self, "Updating...")
				
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
	
	def level
		(self.score/10).round
	end
	
	def score
		@data["score"].to_i
	end
	
	def score= score
		@data["score"] = score
	end
	
	def reset
		@answer = nil
		@equation = Equation.generate(self.level)
	end
	
	def handle(event)
		@answer = event.dig(:detail, :value)
		
		if @equation.correct?(@answer)
			self.reset
			self.score += 1
			
			self.update!
		end
	end
	
	def forward_value
		"live.forwardEvent(#{JSON.dump(@id)}, event, {action: 'change', value: event.target.value})"
	end
	
	def render(builder)
		builder.tag("p", class: "toolbar") do
			builder.text "Score: #{self.score}"
		end
		
		builder.tag("p", class: "equation") do
			if @equation
				builder.text @equation.to_s
				builder.text " = "
				builder.inline("input", type: "text", value: @answer, oninput: forward_value)
			else
				builder.text "Preparing..."
			end
		end
	end
end

Application = Lively::Application[MathQuestView]
