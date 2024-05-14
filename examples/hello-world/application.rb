#!/usr/bin/env lively

class HelloWorldView < Live::View
	def bind(page)
		super
		self.update!
	end
	
	def render(builder)
		builder.text("Hello RubyKaigi 2024!")
	end
end

Application = Lively::Application[HelloWorldView]