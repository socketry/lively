# frozen_string_literal: true

class GameState
  attr_reader :phase, :round_number, :max_rounds
  
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
    @buy_time_duration = 15 # 秒
    @round_end_duration = 5  # 秒
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
    
    # 自動過渡到遊戲階段
    Thread.new do
      sleep(@buy_time_duration)
      start_playing_phase
    end
  end
  
  def start_playing_phase
    @phase = PHASES[:playing]
    @phase_start_time = Time.now
  end
  
  def end_round
    @phase = PHASES[:round_end]
    @phase_start_time = Time.now
    @round_number += 1
    
    if @round_number > @max_rounds
      end_game
    else
      # 自動開始新回合
      Thread.new do
        sleep(@round_end_duration)
        start_buy_phase
      end
    end
  end
  
  def end_game
    @phase = PHASES[:game_over]
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
  
  def can_buy?
    buy_time? && time_remaining_in_phase > 0
  end
  
  def to_h
    {
      phase: @phase,
      round_number: @round_number,
      max_rounds: @max_rounds,
      time_in_phase: time_remaining_in_phase
    }
  end
end