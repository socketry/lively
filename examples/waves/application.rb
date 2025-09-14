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
		@time = 0
		
		# Use floating point arrays for wave simulation (need 3 buffers for wave equation)
		@current = Array.new(width * height, 0.0)
		@previous = Array.new(width * height, 0.0)
		@next = Array.new(width * height, 0.0)
		
		# U8 buffer for rendering
		@buffer = IO::Buffer.new(width * height)
		@buffer.clear
	end
	
	attr :width
	attr :height
	
	def buffer
		# Convert float values to U8 buffer for rendering
		# Use only positive values with better contrast
		@current.each_with_index do |val, i|
			# Take absolute value and scale for better contrast
			display_val = (val.abs * 3.0).to_i  # Amplify by 3x for better visibility
			@buffer.set_value(:U8, i, [display_val, 255].min)
		end
		@buffer
	end
	
	def add_ripple(x, y, intensity)
		return if x < 0 || x >= @width || y < 0 || y >= @height
		
		# Add ripple in a small circle for better visibility
		radius = 3
		(-radius..radius).each do |dx|
			(-radius..radius).each do |dy|
				nx, ny = x + dx, y + dy
				next if nx < 0 || nx >= @width || ny < 0 || ny >= @height
				
				distance = Math.sqrt(dx*dx + dy*dy)
				if distance <= radius
					falloff = 1.0 - (distance / radius)
					idx = nx + ny * @width
					@current[idx] = [@current[idx] + intensity * falloff, 255.0].min
				end
			end
		end
	end
	
	def step
		@time += 1
		
		# Add wave every 60 frames:
		if @time % 60 == 0
			add_ripple(@width/2, @height/2, 250)
		end
		
		# Wave equation for ripples: next = 2*current - previous + wave_speed * laplacian:
		wave_speed = 0.5  # Reduced to prevent saturation
		damping = 0.995   # Slightly more damping for stability
		
		@next.fill(0.0)  # Start fresh
		
		(1...@height-1).each do |y|
			(1...@width-1).each do |x|
				idx = x + y * @width
				current_value = @current[idx]
				previous_value = @previous[idx]
				
				# Calculate Laplacian (wave propagation)
				neighbors_sum = 
					@current[(x-1) + y * @width] +       # left
					@current[(x+1) + y * @width] +       # right  
					@current[x + (y-1) * @width] +       # up
					@current[x + (y+1) * @width]         # down
				
				laplacian = neighbors_sum - 4 * current_value
				
				# Wave equation: next = 2*current - previous + wave_speed * laplacian
				next_value = (2.0 * current_value - previous_value + wave_speed * laplacian) * damping
				
				# Aggressive clamping to prevent saturation
				@next[idx] = next_value#.clamp(-200.0, 200.0)
			end
		end
		
		# Swap buffers for wave equation:
		@previous, @current, @next = @current, @next, @previous
	end
end

class WavesView < Live::View
	def initialize(...)
		super
		
		@map = Map.new(256, 256)  # Larger canvas for better effect
		@loop = nil
	end
	
	def bind(page)
		super
		
		@loop ||= Async do
			while true
				@map.step
				
				self.update!
				
				sleep(1.0/60.0)
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
		builder.tag("div", style: "text-align: center; padding: 20px;") do
			builder.tag("h1") {builder.text("Real-time Wave Simulation")}
			builder.tag("img", src: map_data, style: "border: 2px solid #333; image-rendering: pixelated; width: 512px; height: 512px;")
		end
	end
end

Application = Lively::Application[WavesView]
