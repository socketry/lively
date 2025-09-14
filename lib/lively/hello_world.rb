# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

# @namespace
module Lively
	# Represents a "Hello World" Live view component.
	# 
	# This component displays a simple greeting message with a real-time clock
	# that updates every second. It serves as a demonstration of Lively's
	# live update capabilities and provides basic usage instructions.
	class HelloWorld < Live::View
		# Initialize a new HelloWorld view.
		# @parameter **options [Hash] Additional options passed to the parent view.
		def initialize(...)
			super
			
			@clock = nil
		end
		
		# @attribute [Async::Task | Nil] The background task that updates the view periodically.
		attr :clock
		
		# Bind this view to a page and start the update clock.
		# @parameter page [Live::Page] The page this view is bound to.
		def bind(page)
			super
			
			@clock ||= Async do
				while true
					self.update!
					
					sleep 1
				end
			end
		end
		
		# Close this view and stop the update clock.
		def close
			@clock&.stop
			
			super
		end
		
		# Render this view as HTML.
		# @parameter builder [Live::Builder] The HTML builder for constructing the view.
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
