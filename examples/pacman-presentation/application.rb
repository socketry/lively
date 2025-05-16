#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025, by Samuel Williams.

class PacmanView < Live::View
	def bind(page)
		super
		
		@task ||= Async do
			# Update the view every second:
			loop do
				sleep 1
				self.update!
			end
		end
	end
	
	def close
		if task = @task
			@task = nil
			task.stop
		end
	end

	def render(builder)
		builder.tag("div") do
			builder.text(Time.now.to_s)
		end
	end
end

Application = Lively::Application[PacmanView]