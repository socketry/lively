#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

class GameAudioView < Live::View
	def tag_name
		"live-game-audio"
	end
	
	def render(builder)
		builder.tag("link", rel: "stylesheet", href: "/_static/index.css")
		
		builder.tag("div", class: "game-audio") do
			builder.tag("h1") do
				builder.text("Game Audio Lab")
			end
			
			builder.tag("h2", class: "control-title") do
				builder.text("🔧 Control Panel")
			end
			
			builder.tag("div", class: "control-panel") do
				builder.tag("label", class: "volume-control") do
					builder.text("Volume:")
					builder.tag("input", 
						type: "range", 
						min: "0", 
						max: "1", 
						step: "0.1", 
						value: "1.0",
						oninput: "this.closest('live-game-audio').audio.setVolume(this.value); this.nextElementSibling.textContent = Math.round(this.value * 100) + '%'",
						class: "volume-slider"
					) {}
					builder.tag("span", id: "volume-display", class: "volume-display") do
						builder.text("100%")
					end
				end
			end
			
			builder.tag("div", class: "visualization-container") do
				builder.tag("h3") {builder.text("🌊 Real-time Waveform Analysis")}
				builder.tag("canvas", 
					id: "waveform-canvas", 
					width: "800", 
					height: "200",
					class: "waveform-canvas"
				) {}
				builder.tag("canvas", 
					id: "alert-canvas", 
					width: "800", 
					height: "100",
					class: "alert-canvas"
				) {}
				
				builder.tag("label", class: "visualization-toggle") do
					builder.tag("input", 
						type: "checkbox", 
						checked: "checked",
						onchange: "this.checked ? this.closest('live-game-audio').enableVisualization() : this.closest('live-game-audio').disableVisualization()",
						class: "visualization-checkbox"
					) {}
					builder.text("📊 Enable Real-time Visualization")
				end
			end
			
			# Sound effects grid
			builder.tag("h2") do
				builder.text("🎮 Classic Game Sounds")
			end
			
			builder.tag("div", class: "sound-grid") do
				
				# Classic game sounds
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('jump')", 
					class: "sound jump"
				) do
					builder.text("🦘 Jump")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('coin')", 
					class: "sound coin"
				) do
					builder.text("💰 Coin")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('powerup')", 
					class: "sound powerup"
				) do
					builder.text("⚡ Power-Up")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('death')", 
					class: "sound death"
				) do
					builder.text("💀 Death")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('laser')", 
					class: "sound laser"
				) do
					builder.text("🔫 Laser")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('explosion')", 
					class: "sound explosion"
				) do
					builder.text("💥 Explosion")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('beep')", 
					class: "sound beep"
				) do
					builder.text("📢 Beep")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('blip')", 
					class: "sound blip"
				) do
					builder.text("🔊 Blip")
				end
			end
			
			# Creature sounds section
			builder.tag("h2") do
				builder.text("🐾 Creature Sounds")
			end
			
			builder.tag("div", class: "sound-grid") do
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('meow')", 
					class: "sound meow"
				) do
					builder.text("🐱 Cat Meow")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('bark')", 
					class: "sound bark"
				) do
					builder.text("🐶 Dog Bark")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('duck')", 
					class: "sound duck"
				) do
					builder.text("🦆 Duck Quack")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('alien')", 
					class: "sound alien"
				) do
					builder.text("👽 Alien")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('roar')",
					class: "sound roar"
				) do
					builder.text("🦁 Lion Roar")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('chirp')", 
					class: "sound chirp"
				) do
					builder.text("🐦 Bird Chirp")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('howl')", 
					class: "sound howl"
				) do
					builder.text("🐺 Wolf Howl")
				end
			end
			
			# Music controls section
			builder.tag("h2") do
				builder.text("🎵 Background Music")
			end
			
			builder.tag("div", class: "sound-grid") do
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.playSound('music')", 
					class: "sound music-play"
				) do
					builder.text("▶️ Play Background Music")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.stopSound('music')", 
					class: "sound music-stop"
				) do
					builder.text("⏹️ Stop Background Music")
				end
				
				builder.tag("button", 
					onclick: "this.closest('live-game-audio').audio.stopAllSounds()", 
					class: "sound music-stop-all"
				) do
					builder.text("⏹️ Stop All Sounds")
				end
			end
		end
	end
	
	private
	
	# Button styles moved to CSS classes in index.css
end

Application = Lively::Application[GameAudioView]