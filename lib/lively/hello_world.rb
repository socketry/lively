module Lively
	class HelloWorld < Live::View
		def initialize(...)
			super
			
			@clock = nil
		end
		
		def bind(page)
			super
			
			@clock ||= Async do
				while true
					self.update!
					
					sleep 1
				end
			end
		end
		
		def close
			@clock&.stop
			
			super
		end
		
		def render(builder)
			builder.tag(:h1) do
				builder.text("Hello, I'm Lively!")
			end
			
			builder.tag(:p) do
				builder.text("The time is #{Time.now}.")
			end
			
			builder.tag(:p) do
				builder.text(<<~TEXT)
					Lively is a simple client-server SPA framework. It is designed to be easy to use and understand, while providing a solid foundation for building interactive web applications. Create an `application.rb` file and define your own `Application` class to get started.
				TEXT
			end
			
			builder.inline_tag(:pre) do
				builder.text(<<~TEXT)
					#!/usr/bin/env lively
					
					class Application < Lively::Application
						def body
							Lively::HelloWorld.new
						end
					end
				TEXT
			end
			
			builder.tag(:p) do
				builder.text("Check the `examples/` directory for... you guessed it... more examples.")
			end
		end
	end
end
