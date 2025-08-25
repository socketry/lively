# frozen_string_literal: true

class GameState
	attr_reader :phase, :round_number, :max_rounds, :scores, :bomb_info, :recent_events
		
	PHASES = {
				waiting: :waiting,        # 等待玩家
				buy_time: :buy_time,       # 購買時間
				playing: :playing,         # 遊戲進行中
				round_end: :round_end,     # 回合結束
				game_over: :game_over      # 遊戲結束
		}.freeze
		
	def initialize
		@phase = PHASES[:waiting]
		@round_number = 1
		@max_rounds = 30
		@phase_start_time = Time.now
		@buy_time_duration = 20 # 秒
		@round_end_duration = 5  # 秒
		@round_time = 115 # 1:55 round time
		@round_start_time = Time.now
				
		# Scoring
		@scores = { ct: 0, t: 0 }
				
		# Bomb system
		@bomb_info = {
						planted: false,
						defused: false,
						exploded: false,
						plant_time: nil,
						defuse_time: nil,
						site: nil,
						planter_id: nil,
						defuser_id: nil,
						timer: 40.0 # 40 seconds until explosion
				}
				
		# Events for broadcasting
		@recent_events = []
		@event_counter = 0
	end
		
	def waiting?
		@phase == PHASES[:waiting]
	end
		
	def buy_time?
		@phase == PHASES[:buy_time]
	end
		
	def playing?
		@phase == PHASES[:playing]
	end
		
	def round_ended?
		@phase == PHASES[:round_end]
	end
		
	def game_over?
		@phase == PHASES[:game_over]
	end
		
	def start_buy_phase
		@phase = PHASES[:buy_time]
		@phase_start_time = Time.now
	end
		
	def start_playing_phase
		@phase = PHASES[:playing]
		@phase_start_time = Time.now
		@round_start_time = Time.now
	end
		
	def end_round(winning_team, reason)
		@phase = PHASES[:round_end]
		@phase_start_time = Time.now
				
		# Update scores
		@scores[winning_team] += 1
				
		# Add event
		add_event({
						type: "round_ended",
						winning_team: winning_team,
						reason: reason,
						round_number: @round_number,
						scores: @scores.dup
				})
				
		@round_number += 1
				
		# Check for game end
		if game_should_end?
			end_game
		end
	end
		
	def end_game
		@phase = PHASES[:game_over]
				
		winner = @scores[:ct] > @scores[:t] ? :ct : :t
		add_event({
						type: "game_ended",
						winner: winner,
						final_scores: @scores.dup
				})
	end
		
	def time_remaining_in_phase
		case @phase
		when PHASES[:buy_time]
			[@buy_time_duration - (Time.now - @phase_start_time), 0].max
		when PHASES[:round_end]
			[@round_end_duration - (Time.now - @phase_start_time), 0].max
		else
			0
		end
	end
		
	def round_time_left
		return 0 unless playing?
		[@round_time - (Time.now - @round_start_time), 0].max
	end
		
	def round_active?
		playing? && round_time_left > 0
	end
		
	def current_phase
		@phase
	end
		
	def buy_time
		@buy_time_duration
	end
		
	def can_buy?
		buy_time? && time_remaining_in_phase > 0
	end
		
	# Bomb system methods
	def start_bomb_plant(player_id, site)
		@bomb_info[:planted] = false # Still planting
		@bomb_info[:plant_time] = Time.now
		@bomb_info[:site] = site
		@bomb_info[:planter_id] = player_id
				
		add_event({
						type: "bomb_plant_started",
						player_id: player_id,
						site: site
				})
	end
		
	def complete_bomb_plant
		@bomb_info[:planted] = true
		@bomb_info[:plant_time] = Time.now
				
		add_event({
						type: "bomb_planted",
						site: @bomb_info[:site],
						timer: @bomb_info[:timer]
				})
	end
		
	def start_bomb_defuse(player_id, defuse_time)
		@bomb_info[:defuse_time] = defuse_time
		@bomb_info[:defuser_id] = player_id
				
		add_event({
						type: "bomb_defuse_started",
						player_id: player_id,
						defuse_time: defuse_time
				})
	end
		
	def complete_bomb_defuse
		@bomb_info[:defused] = true
				
		add_event({
						type: "bomb_defused",
						defuser_id: @bomb_info[:defuser_id]
				})
	end
		
	def explode_bomb
		@bomb_info[:exploded] = true
				
		add_event({
						type: "bomb_exploded",
						site: @bomb_info[:site]
				})
	end
		
	def bomb_planted?
		@bomb_info[:planted]
	end
		
	def bomb_defused?
		@bomb_info[:defused]
	end
		
	def bomb_exploded?
		@bomb_info[:exploded]
	end
		
	def bomb_time_remaining
		return 0 unless bomb_planted?
		return 0 if bomb_defused? || bomb_exploded?
				
		elapsed = Time.now - @bomb_info[:plant_time]
		[@bomb_info[:timer] - elapsed, 0].max
	end
		
	# Game state management
	def update(delta_time)
		# Update bomb timer if planted
		if bomb_planted? && !bomb_defused? && !bomb_exploded?
			if bomb_time_remaining <= 0
				explode_bomb
			end
		end
				
		# Clear old events
		clear_old_events
	end
		
	def start_new_round
		@phase = PHASES[:buy_time]
		@phase_start_time = Time.now
				
		# Reset bomb
		@bomb_info = {
						planted: false,
						defused: false,
						exploded: false,
						plant_time: nil,
						defuse_time: nil,
						site: nil,
						planter_id: nil,
						defuser_id: nil,
						timer: 40.0
				}
				
		add_event({
						type: "new_round_started",
						round_number: @round_number,
						buy_time: @buy_time_duration
				})
	end
		
	def add_event(event)
		@event_counter += 1
		event[:id] = @event_counter
		event[:timestamp] = Time.now.to_f * 1000
		@recent_events << event
	end
		
	def clear_old_events
		# Keep only events from the last 5 seconds
		cutoff_time = (Time.now.to_f * 1000) - 5000
		@recent_events.reject! { |event| event[:timestamp] < cutoff_time }
	end
		
	def game_should_end?
		# Game ends when one team reaches 16 rounds or after 30 rounds total
		@scores[:ct] >= 16 || @scores[:t] >= 16 || @round_number > @max_rounds
	end
		
	def to_h
		{
						phase: @phase,
						round_number: @round_number,
						max_rounds: @max_rounds,
						time_in_phase: time_remaining_in_phase,
						round_time_left: round_time_left,
						scores: @scores,
						bomb_info: @bomb_info,
						recent_events: @recent_events
				}
	end
		
		private
		
	def reset_for_new_round
		@phase = PHASES[:waiting]
		@recent_events.clear
	end
end