import React from 'react';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  kills: number;
  deaths: number;
  assists: number;
  health: number;
}

interface TeamStats {
  ct: Player[];
  t: Player[];
}

interface RoundEndHUDProps {
  winner: 'ct' | 't';
  mvpPlayer?: string;
  teamStats: TeamStats;
  nextRoundIn: number;
  winCondition?: 'elimination' | 'bomb_defused' | 'bomb_exploded' | 'time_expired';
}

const winConditionMessages = {
  elimination: 'All enemies eliminated',
  bomb_defused: 'Bomb has been defused',
  bomb_exploded: 'The bomb has exploded',
  time_expired: 'Time expired'
};

const teamNames = {
  ct: 'Counter-Terrorists',
  t: 'Terrorists'
};

const teamColors = {
  ct: {
    primary: 'text-blue-400',
    bg: 'bg-blue-900 bg-opacity-30',
    border: 'border-blue-500',
    accent: 'bg-blue-600'
  },
  t: {
    primary: 'text-red-400',
    bg: 'bg-red-900 bg-opacity-30',
    border: 'border-red-500',
    accent: 'bg-red-600'
  }
};

export const RoundEndHUD: React.FC<RoundEndHUDProps> = ({
  winner,
  mvpPlayer,
  teamStats,
  nextRoundIn,
  winCondition = 'elimination'
}) => {
  const winnerColor = teamColors[winner];
  const winMessage = winConditionMessages[winCondition];
  const mvp = [...teamStats.ct, ...teamStats.t].find(p => p.id === mvpPlayer);

  // Calculate team totals
  const ctTotals = teamStats.ct.reduce((acc, player) => ({
    kills: acc.kills + player.kills,
    deaths: acc.deaths + player.deaths,
    assists: acc.assists + player.assists
  }), { kills: 0, deaths: 0, assists: 0 });

  const tTotals = teamStats.t.reduce((acc, player) => ({
    kills: acc.kills + player.kills,
    deaths: acc.deaths + player.deaths,
    assists: acc.assists + player.assists
  }), { kills: 0, deaths: 0, assists: 0 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header - Winner Announcement */}
        <div className={`${winnerColor.bg} ${winnerColor.border} border-2 p-6 text-center`}>
          <div className="space-y-3">
            {/* Winner Icon */}
            <div className="text-6xl">
              {winner === 'ct' ? '🛡️' : '💀'}
            </div>
            
            {/* Winner Title */}
            <h2 className={`${winnerColor.primary} text-4xl font-bold`}>
              {teamNames[winner]} WIN!
            </h2>
            
            {/* Win Condition */}
            <div className="text-white text-lg">
              {winMessage}
            </div>
            
            {/* Next Round Timer */}
            <div className="bg-black bg-opacity-50 rounded p-3 inline-block">
              <div className="text-gray-300 text-sm">Next round in:</div>
              <div className="text-white text-2xl font-bold">{nextRoundIn}s</div>
            </div>
          </div>
        </div>

        {/* MVP Section */}
        {mvp && (
          <div className="bg-yellow-900 bg-opacity-30 border-b border-gray-700 p-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="text-4xl">👑</div>
              <div>
                <div className="text-yellow-400 text-lg font-bold">MVP - Most Valuable Player</div>
                <div className="text-white text-xl">{mvp.name}</div>
                <div className="text-gray-300 text-sm">
                  {mvp.kills} Kills • {mvp.assists} Assists • {mvp.deaths} Deaths
                </div>
              </div>
              <div className="text-4xl">🏆</div>
            </div>
          </div>
        )}

        {/* Round Stats */}
        <div className="p-6">
          <h3 className="text-white text-xl font-bold text-center mb-6">Round Statistics</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Counter-Terrorists */}
            <div className="bg-blue-900 bg-opacity-20 rounded-lg p-4">
              <h4 className="text-blue-400 text-lg font-bold mb-3 text-center">
                Counter-Terrorists
              </h4>
              
              {/* Team Totals */}
              <div className="bg-black bg-opacity-30 rounded p-3 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Team Totals:</span>
                  <span className="text-white">
                    {ctTotals.kills}K {ctTotals.assists}A {ctTotals.deaths}D
                  </span>
                </div>
              </div>
              
              {/* Individual Players */}
              <div className="space-y-2">
                {teamStats.ct.map(player => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center p-2 rounded ${
                      player.id === mvpPlayer ? 'bg-yellow-900 bg-opacity-30' : 'bg-gray-800 bg-opacity-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {player.id === mvpPlayer && <span className="text-yellow-400">👑</span>}
                      <span className="text-white font-medium">{player.name}</span>
                      {player.health > 0 && (
                        <span className="text-green-400 text-xs">({player.health} HP)</span>
                      )}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {player.kills}/{player.deaths}/{player.assists}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terrorists */}
            <div className="bg-red-900 bg-opacity-20 rounded-lg p-4">
              <h4 className="text-red-400 text-lg font-bold mb-3 text-center">
                Terrorists
              </h4>
              
              {/* Team Totals */}
              <div className="bg-black bg-opacity-30 rounded p-3 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Team Totals:</span>
                  <span className="text-white">
                    {tTotals.kills}K {tTotals.assists}A {tTotals.deaths}D
                  </span>
                </div>
              </div>
              
              {/* Individual Players */}
              <div className="space-y-2">
                {teamStats.t.map(player => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center p-2 rounded ${
                      player.id === mvpPlayer ? 'bg-yellow-900 bg-opacity-30' : 'bg-gray-800 bg-opacity-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {player.id === mvpPlayer && <span className="text-yellow-400">👑</span>}
                      <span className="text-white font-medium">{player.name}</span>
                      {player.health > 0 && (
                        <span className="text-green-400 text-xs">({player.health} HP)</span>
                      )}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {player.kills}/{player.deaths}/{player.assists}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Special Achievements */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex justify-center space-x-6 text-sm">
            {/* Check for special achievements */}
            {mvp && mvp.kills >= 3 && (
              <div className="bg-purple-900 bg-opacity-50 rounded px-3 py-1 text-purple-300">
                🔥 Triple Kill - {mvp.name}
              </div>
            )}
            
            {teamStats.ct.some(p => p.health === 100) && (
              <div className="bg-green-900 bg-opacity-50 rounded px-3 py-1 text-green-300">
                💯 Flawless Round
              </div>
            )}
            
            {winCondition === 'bomb_defused' && (
              <div className="bg-blue-900 bg-opacity-50 rounded px-3 py-1 text-blue-300">
                🔧 Bomb Defused
              </div>
            )}
            
            {winCondition === 'bomb_exploded' && (
              <div className="bg-red-900 bg-opacity-50 rounded px-3 py-1 text-red-300">
                💥 Bomb Exploded
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-3 border-t border-gray-700">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>K/A/D = Kills / Assists / Deaths</div>
            <div className="text-white">
              Starting next round in <span className="font-bold text-yellow-400">{nextRoundIn}</span> seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};