#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025, by Samuel Williams.

class WormsView < Live::View
	def render(builder)
		builder.tag("div") do
			builder.text("Hello, world!")
		end
	end
end

Application = Lively::Application[WormsView]
