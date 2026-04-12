# frozen_string_literal: true

module DataNexus
	# Shared game controller — owns the GameWorld and the tick loop.
	# Passed to all GameView instances via Lively's shared state mechanism.
	#
	# The controller manages the game lifecycle:
	# - Views register/unregister themselves on bind/close
	# - The tick loop starts when the first player joins
	# - Each tick, the world advances and all views are pushed updates
	# - The loop stops when the last player leaves
	class GameController
		attr_reader :world

		def initialize
			@world = GameWorld.new
			@views = Set.new
			@tick_task = nil
			@player_joined = Async::Condition.new
		end

		def add_view(view)
			@views << view
			@world.add_player(view.id)
			start!
		end

		def remove_view(view)
			@views.delete(view)
			@world.remove_player(view.id)

			# Stop the tick loop if no players remain
			if @views.empty? && @tick_task
				@tick_task.stop
				@tick_task = nil
			end
		end

		def reset!
			@world.restart!
			@views.each(&:reset_cursors!)
		end

		def play_sound_all(name)
			@views.each { |v| v.play_sound(name) }
		end

		private

		def start!
			@tick_task ||= Async do
				last_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

				loop do
					sleep(TICK_RATE)

					now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
					dt = now - last_time
					last_time = now

					prev_wave = @world.wave_number
					prev_game_over = @world.game_over?

					@world.tick([dt, 0.1].min)

					# Detect game events and notify all views
					if @world.wave_number != prev_wave
						if @world.wave_number % 10 == 0
							play_sound_all("roar") # Architect incoming
						else
							play_sound_all("alien") # New wave
						end
					end

					if @world.game_over? && !prev_game_over
						play_sound_all("death")
					end

					# Push updates to all connected views
					@views.each do |view|
						view.send_tick!
					rescue => error
						Console.error(self, "Error updating view:", error)
					end
				end
			end
		end
	end
end
