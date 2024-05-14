#!/usr/bin/env lively

class HelloWorldView < Live::View
	def bind(page)
		super
		
		# Update the view on reconnect:
		self.update!
	end
	
	def render(builder)
		builder.text("Hello World!")
	end
end

Application = Lively::Application[HelloWorldView]
