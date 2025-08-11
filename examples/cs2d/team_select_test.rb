#!/usr/bin/env lively
# frozen_string_literal: true

require "securerandom"

class TeamSelectTestView < Live::View
	def initialize(...)
		super
		@team_selected = false
		@selected_team = nil
	end
	
	def bind(page)
		super
		self.update!
	end
	
	def handle(event)
		puts "\n=== TEST EVENT RECEIVED ==="
		puts "Event type: #{event[:type]}"
		puts "Event detail: #{event[:detail]}"
		puts "Full event: #{event.inspect}"
		puts "========================\n"
		
		if event[:type] == "click"
			action = event.dig(:detail, :action)
			case action
			when "select_ct"
				@selected_team = "CT"
				@team_selected = true
				self.update!
			when "select_t"
				@selected_team = "T"  
				@team_selected = true
				self.update!
			end
		end
	end
	
	def render(builder)
		if @team_selected
			builder.tag(:div, style: "padding: 50px; text-align: center;") do
				builder.tag(:h1) { builder.text("You selected: #{@selected_team}") }
			end
		else
			builder.tag(:div, data: { live: @id }, style: "padding: 50px; text-align: center;") do
				builder.tag(:h1) { builder.text("Select Team") }
				
				builder.tag(:button, 
										data: { live: "click", action: "select_ct" },
										style: "padding: 20px; margin: 10px; background: blue; color: white;") do
					builder.text("CT Team")
				end
				
				builder.tag(:button,
										data: { live: "click", action: "select_t" },
										style: "padding: 20px; margin: 10px; background: orange; color: white;") do
					builder.text("T Team")
				end
			end
		end
	end
end

Application = Lively::Application[TeamSelectTestView]