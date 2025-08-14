# frozen_string_literal: true

class MVPRoundManager
	attr_reader :phase, :round_number, :round_time, :ct_score, :t_score
		
	FREEZE_TIME = 15.0  # CS 1.6 authentic freeze time
	BUY_TIME = 15.0     # CS 1.6 authentic buy time after freeze
	ROUND_TIME = 115.0
	MAX_ROUNDS = 30
	HALF_TIME = 15
		
	PHASES = [:freeze, :buy, :playing, :ended].freeze
		
	def initialize(game_room)
		@game_room = game_room
		@phase = :freeze
		@round_number = 0
		@round_time = 0
		@phase_timer = 0
		@ct_score = 0
		@t_score = 0
		@paused = true
	end
		
	def start_game
		@round_number = 1
		@ct_score = 0
		@t_score = 0
		@paused = false
		start_new_round
	end
		
	def pause
		@paused = true
	end
		
	def update(delta_time)
		return if @paused
				
		@phase_timer -= delta_time
		@round_time -= delta_time if @phase == :playing
				
		# 階段轉換
		case @phase
		when :freeze
			if @phase_timer <= 0
				enter_buy_phase
			end
		when :buy
			if @phase_timer <= 0
				enter_playing_phase
			end
		when :playing
		# 遊戲房間會檢查勝利條件
		when :ended
			if @phase_timer <= 0
				start_new_round
			end
		end
	end
		
	def can_buy?
		@phase == :buy || (@phase == :playing && @round_time > (ROUND_TIME - BUY_TIME))
	end
		
	def end_round(winning_team, reason)
		return if @phase == :ended
				
		@phase = :ended
		@phase_timer = 5.0 # 5秒顯示結果
				
		# 更新分數
		case winning_team
		when :ct
			@ct_score += 1
		when :t
			@t_score += 1
		end
				
		# 通知遊戲房間
		@game_room.on_round_end(winning_team, reason)
				
		# 檢查遊戲結束
		check_game_over
	end
		
	def get_state
		{
						phase: @phase,
						round_number: @round_number,
						round_time: @round_time.to_i,
						phase_timer: @phase_timer.to_i,
						ct_score: @ct_score,
						t_score: @t_score,
						max_rounds: MAX_ROUNDS,
						can_buy: can_buy?
				}
	end
		
		private
		
	def start_new_round
		# 檢查換邊
		if @round_number == HALF_TIME
			swap_teams
		end
				
		@phase = :freeze
		@phase_timer = FREEZE_TIME
		@round_time = ROUND_TIME
		@round_number += 1 unless @round_number >= MAX_ROUNDS
	end
		
	def enter_buy_phase
		@phase = :buy
		@phase_timer = BUY_TIME
	end
		
	def enter_playing_phase
		@phase = :playing
		# round_time 已經在設置，不需要 phase_timer
	end
		
	def check_game_over
		# 先贏得16回合的隊伍獲勝
		if @ct_score >= 16 || @t_score >= 16
			# 遊戲結束
			@paused = true
		# TODO: 顯示最終結果
		elsif @round_number >= MAX_ROUNDS
			# 平局或根據分數決定勝負
			@paused = true
		end
	end
		
	def swap_teams
		# 交換隊伍
		@game_room.players.each_value do |player|
			player.team = player.team == :ct ? :t : :ct
		end
				
		# 交換分數
		@ct_score, @t_score = @t_score, @ct_score
	end
end