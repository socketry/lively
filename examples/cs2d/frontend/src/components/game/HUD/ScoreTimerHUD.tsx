import React from 'react';

interface ScoreTimerHUDProps {
  ctScore: number;
  tScore: number;
  roundTime: number;
  bombTimer?: number;
  bombPlanted: boolean;
  roundPhase: 'warmup' | 'freeze' | 'live' | 'post';
}

export const ScoreTimerHUD: React.FC<ScoreTimerHUDProps> = ({
  ctScore,
  tScore,
  roundTime,
  bombTimer,
  bombPlanted,
  roundPhase
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBombTime = (seconds: number): string => {
    return seconds.toFixed(1);
  };

  const isLowTime = roundTime <= 10;
  const isBombCritical = bombTimer !== undefined && bombTimer <= 10;

  return (
    <div className="text-center space-y-2">
      {/* Scoreboard */}
      <div className="bg-black bg-opacity-90 rounded-lg overflow-hidden min-w-[300px]">
        <div className="flex">
          {/* CT Side */}
          <div className="bg-blue-600 flex-1 px-4 py-2">
            <div className="text-white font-bold text-xl">
              CT {ctScore}
            </div>
          </div>
          
          {/* Divider */}
          <div className="w-1 bg-white"></div>
          
          {/* T Side */}
          <div className="bg-red-600 flex-1 px-4 py-2">
            <div className="text-white font-bold text-xl">
              {tScore} T
            </div>
          </div>
        </div>
      </div>

      {/* Round Timer */}
      <div className="bg-black bg-opacity-90 rounded-lg px-4 py-2">
        <div className={`text-2xl font-bold ${
          isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {formatTime(roundTime)}
        </div>
        
        {/* Round Phase Indicator */}
        <div className="text-xs text-gray-300 mt-1">
          {roundPhase === 'warmup' && 'WARMUP'}
          {roundPhase === 'freeze' && 'FREEZE TIME'}
          {roundPhase === 'live' && 'ROUND LIVE'}
          {roundPhase === 'post' && 'ROUND END'}
        </div>
      </div>

      {/* Bomb Timer */}
      {bombPlanted && bombTimer !== undefined && (
        <div className={`bg-red-900 bg-opacity-95 rounded-lg px-4 py-2 border-2 ${
          isBombCritical ? 'border-red-400 animate-pulse' : 'border-red-600'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">💣</span>
            <span className={`text-xl font-bold ${
              isBombCritical ? 'text-red-300 animate-pulse' : 'text-red-400'
            }`}>
              {formatBombTime(bombTimer)}
            </span>
          </div>
          <div className="text-red-300 text-xs mt-1">
            BOMB PLANTED
          </div>
          
          {/* Bomb Timer Bar */}
          <div className="w-full bg-red-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isBombCritical ? 'bg-red-400 animate-pulse' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, (bombTimer / 35) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Round Number */}
      <div className="bg-black bg-opacity-60 rounded px-3 py-1">
        <div className="text-gray-300 text-sm">
          Round {ctScore + tScore + 1}
        </div>
      </div>

      {/* Special States */}
      {roundPhase === 'freeze' && (
        <div className="bg-blue-900 bg-opacity-80 rounded px-3 py-1">
          <div className="text-blue-300 text-sm font-bold animate-pulse">
            🛒 BUY TIME
          </div>
        </div>
      )}

      {roundPhase === 'warmup' && (
        <div className="bg-yellow-900 bg-opacity-80 rounded px-3 py-1">
          <div className="text-yellow-300 text-sm font-bold">
            🔥 WARMUP PHASE
          </div>
        </div>
      )}
    </div>
  );
};