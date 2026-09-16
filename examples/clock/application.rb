#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025-2026, by Samuel Williams.

class ClockView < Live::View
	def initialize(...)
		super
		@twenty_four_hour = true
	end

	def tag_name
		"live-clock"
	end

	def bind(page)
		super

		@task ||= Async do |task|
			loop do
				task.sleep(0.25)
				self.update!
			end
		end
	end

	def close
		if task = @task
			@task = nil
			task.stop
		end

		super
	end

	def handle(event)
		if event.dig(:detail, :action) == "toggle-format"
			@twenty_four_hour = !@twenty_four_hour
			self.update!
		end
	end

	def forward_event(action)
		"live.forwardEvent('#{@id}', event, {action: '#{action}'})"
	end

	def render(builder)
		now = Time.now
		seconds = now.hour * 3_600 + now.min * 60 + now.sec + now.subsec.to_f
		second_angle = seconds * 6
		minute_angle = seconds / 10.0
		hour_angle = seconds / 120.0
		day_progress = seconds.fdiv(86_400) * 100
		hour = @twenty_four_hour ? now.strftime("%H") : now.strftime("%I")

		builder.tag("link", rel: "stylesheet", href: "/_static/index.css")

		builder.tag("main", class: "clock-page") do
			builder.inline("span", class: "ambient ambient-one", aria: {hidden: "true"})
			builder.inline("span", class: "ambient ambient-two", aria: {hidden: "true"})

			builder.tag("section", class: "clock-shell", aria: {label: "Current local time"}) do
				builder.tag("header", class: "clock-header") do
					builder.tag("div") do
						builder.tag("p", class: "eyebrow") do
							builder.inline("span", class: "live-dot", aria: {hidden: "true"})
							builder.text("Live local time")
						end

						builder.tag("h1") {builder.text("A quieter way to watch time.")}
					end

					builder.tag(
						"button",
						type: "button",
						class: "format-toggle",
						onclick: forward_event("toggle-format"),
						aria: {label: "Switch time format"}
					) do
						builder.inline("span", class: "format-label") {builder.text(@twenty_four_hour ? "24 hour" : "12 hour")}
						builder.inline("span", class: "toggle-icon", aria: {hidden: "true"}) {builder.text("↗")}
					end
				end

				builder.tag("div", class: "clock-content") do
					builder.tag("div", class: "analog-panel") do
						builder.inline("span", class: "dial-glow", aria: {hidden: "true"})

						builder.tag("div", class: "dial", aria: {hidden: "true"}) do
							builder.inline("span", class: "numeral numeral-12") {builder.text("12")}
							builder.inline("span", class: "numeral numeral-3") {builder.text("3")}
							builder.inline("span", class: "numeral numeral-6") {builder.text("6")}
							builder.inline("span", class: "numeral numeral-9") {builder.text("9")}

							builder.inline("span", class: "hand hour-hand", style: "--angle: #{hour_angle}deg")
							builder.inline("span", class: "hand minute-hand", style: "--angle: #{minute_angle}deg")
							builder.inline("span", class: "hand second-hand", style: "--angle: #{second_angle}deg")
							builder.inline("span", class: "hand-pin")
						end
					end

					builder.tag("div", class: "digital-panel") do
						builder.tag("div", class: "digital-time", aria: {live: "polite", label: now.strftime("%H:%M:%S")}) do
							builder.inline("span", class: "time-main") {builder.text("#{hour}:#{now.strftime('%M')}")}
							builder.inline("span", class: "time-seconds") {builder.text(now.strftime("%S"))}
							unless @twenty_four_hour
								builder.inline("span", class: "time-period") {builder.text(now.strftime("%p"))}
							end
						end

						builder.tag("p", class: "date-line") do
							builder.text(now.strftime("%A, %-d %B"))
							builder.inline("span") {builder.text(now.strftime("%Y"))}
						end

						builder.tag("div", class: "day-progress") do
							builder.tag("div", class: "progress-label") do
								builder.inline("span") {builder.text("Day progress")}
								builder.inline("span") {builder.text("#{day_progress.round}%")}
							end
							builder.tag("div", class: "progress-track", role: "progressbar", aria: {valuenow: day_progress.round, valuemin: 0, valuemax: 100}) do
								builder.inline("span", style: "width: #{day_progress}%")
							end
						end

						builder.tag("div", class: "clock-meta") do
							builder.tag("div", class: "meta-card") do
								builder.inline("span", class: "meta-icon", aria: {hidden: "true"}) {builder.text("⌖")}
								builder.tag("div") do
									builder.tag("span", class: "meta-label") {builder.text("Time zone")}
									builder.tag("strong") {builder.text("#{now.strftime('%Z')} · UTC#{now.strftime('%:z')}")}
								end
							end

							builder.tag("div", class: "meta-card") do
								builder.inline("span", class: "meta-icon sun-icon", aria: {hidden: "true"}) {builder.text("✦")}
								builder.tag("div") do
									builder.tag("span", class: "meta-label") {builder.text("Seconds today")}
									builder.tag("strong") {builder.text(seconds.floor.to_s.reverse.scan(/.{1,3}/).join(",").reverse)}
								end
							end
						end
					end
				end
			end
		end
	end
end

Application = Lively::Application[ClockView]
