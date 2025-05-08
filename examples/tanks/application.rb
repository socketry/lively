#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

require_relative "png"
require "base64"

class Map
	def initialize(width = 128, height = 128)
		@width = width
		@height = height
		
		@buffer = IO::Buffer.new(width * height)
		
		@buffer.slice(0, width * (height / 2)).clear(128)
	end
	
	attr :width
	attr :height
	attr :buffer
	
	def step
		x = rand(@width)
		y = rand(@height)
		value = rand(256)
		
		@buffer.set_value(:U8, x + y * @width, value)
	end
end

class TanksView < Live::View
	def initialize(...)
		super
		
		@map = Map.new
		@loop = nil
	end
	
	def bind(page)
		super
		
		@loop ||= Async do
			while true
				@map.step
				self.update!
				
				sleep 0.001
			end
		end
	end
	
	def close
		if @loop
			@loop.stop
			@loop = nil
		end
		
		super
	end
	
	def map_data
		data = PNG.greyscale(@map.width, @map.height, @map.buffer)
		
		return "data:image/png;base64,#{Base64.strict_encode64(data)}"
	end
	
	def render(builder)
		builder.tag("img", src: map_data)
	end
end

Application = Lively::Application[TanksView]
