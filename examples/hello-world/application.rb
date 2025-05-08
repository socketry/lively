#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

class HelloWorldView < Live::View
	def bind(page)
		super
		self.update!
	end
	
	def render(builder)
		builder.text("Hello World!")
	end
end

Application = Lively::Application[HelloWorldView]
