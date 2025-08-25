import React from 'react';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  kills: number;
  deaths: number;
  assists: number;
  score?: number;
  isAlive: boolean;
}

interface ScoreboardHUDProps {
  players: Player[];
  ctScore: number;
  tScore: number;
  localPlayerId: string;
  mvpPlayer?: string;
  ping: number;
}

export const ScoreboardHUD: React.FC<ScoreboardHUDProps> = ({
  players,
  ctScore,
  tScore,
  localPlayerId,
  mvpPlayer,
  ping
}) => {
  const ctPlayers = players.filter(p => p.team === 'ct').sort((a, b) => (b.score || b.kills) - (a.score || a.kills));
  const tPlayers = players.filter(p => p.team === 't').sort((a, b) => (b.score || b.kills) - (a.score || a.kills));

  const calculateKDRatio = (kills: number, deaths: number): string => {
    return deaths === 0 ? kills.toFixed(1) : (kills / deaths).toFixed(2);
  };

  const calculateScore = (player: Player): number => {
    return player.score || (player.kills * 2 + player.assists);
  };

  const PlayerRow: React.FC<{ player: Player; rank: number }> = ({ player, rank }) => {
    const isLocalPlayer = player.id === localPlayerId;
    const isMVP = player.id === mvpPlayer;
    const score = calculateScore(player);
    const kd = calculateKDRatio(player.kills, player.deaths);

    return (
      <tr className={`
        ${isLocalPlayer ? 'bg-blue-900 bg-opacity-50' : 'hover:bg-gray-700'}
        ${!player.isAlive ? 'opacity-60' : ''}
        transition-colors
      `}>
        <td className="px-4 py-2 text-center text-gray-300">#{rank}</td>
        <td className="px-4 py-2">
          <div className="flex items-center space-x-2">
            {/* Status Indicators */}
            <div className="flex space-x-1">
              {!player.isAlive && <span className="text-red-400 text-sm">💀</span>}
              {isMVP && <span className="text-yellow-400 text-sm">👑</span>}
              {isLocalPlayer && <span className="text-blue-400 text-sm">➤</span>}
            </div>
            
            {/* Player Name */}
            <span className={`font-medium ${
              isLocalPlayer ? 'text-blue-300 font-bold' : 'text-white'
            }`}>
              {player.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-2 text-center text-green-400 font-bold">{score}</td>
        <td className="px-4 py-2 text-center text-white font-bold">{player.kills}</td>
        <td className="px-4 py-2 text-center text-gray-300">{player.assists}</td>
        <td className="px-4 py-2 text-center text-red-300">{player.deaths}</td>
        <td className="px-4 py-2 text-center text-gray-300">{kd}</td>
        <td className="px-4 py-2 text-center text-gray-300">
          {isLocalPlayer ? `${ping}ms` : `${Math.floor(Math.random() * 50 + 20)}ms`}
        </td>
      </tr>
    );
  };

  const TeamSection: React.FC<{ 
    players: Player[]; 
    teamName: string; 
    teamScore: number; 
    teamColor: string;
    bgColor: string;
  }> = ({ players, teamName, teamScore, teamColor, bgColor }) => (
    <div className="mb-6">
      {/* Team Header */}
      <div className={`${bgColor} px-4 py-3 rounded-t-lg border-b border-gray-600`}>
        <div className="flex justify-between items-center">
          <h3 className={`${teamColor} text-xl font-bold`}>
            {teamName} ({players.filter(p => p.isAlive).length}/{players.length})
          </h3>
          <div className={`${teamColor} text-2xl font-bold`}>
            {teamScore} Rounds
          </div>
        </div>
      </div>

      {/* Team Players */}
      <div className="bg-gray-800 rounded-b-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700 text-gray-300 text-sm">
              <th className="px-4 py-2 text-center">#</th>
              <th className="px-4 py-2 text-left">Player</th>
              <th className="px-4 py-2 text-center">Score</th>
              <th className="px-4 py-2 text-center">K</th>
              <th className="px-4 py-2 text-center">A</th>
              <th className="px-4 py-2 text-center">D</th>
              <th className="px-4 py-2 text-center">K/D</th>
              <th className="px-4 py-2 text-center">Ping</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <PlayerRow key={player.id} player={player} rank={index + 1} />
            ))}
            {/* Fill empty slots if less than 5 players */}
            {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, index) => (
              <tr key={`empty-${index}`} className="opacity-30">
                <td className="px-4 py-2 text-center text-gray-500">#{players.length + index + 1}</td>
                <td className="px-4 py-2 text-gray-500">Empty Slot</td>
                <td className="px-4 py-2 text-center text-gray-500">—</td>
                <td className="px-4 py-2 text-center text-gray-500">—</td>
                <td className="px-4 py-2 text-center text-gray-500">—</td>
                <td className="px-4 py-2 text-center text-gray-500">—</td>
                <td className="px-4 py-2 text-center text-gray-500">—</td>
                <td className="px-4 py-2 text-center text-gray-500">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-2xl font-bold">Scoreboard</h2>
            <div className="text-gray-400 text-sm">
              Hold TAB to view • Round {ctScore + tScore + 1}
            </div>
          </div>

          {/* Match Score */}
          <div className="mt-3 flex justify-center">
            <div className="flex bg-gray-700 rounded-lg overflow-hidden">
              <div className="bg-blue-600 px-8 py-3">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">Counter-Terrorists</div>
                  <div className="text-blue-200 text-3xl font-bold">{ctScore}</div>
                </div>
              </div>
              <div className="w-1 bg-white"></div>
              <div className="bg-red-600 px-8 py-3">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">Terrorists</div>
                  <div className="text-red-200 text-3xl font-bold">{tScore}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <TeamSection
            players={ctPlayers}
            teamName="Counter-Terrorists"
            teamScore={ctScore}
            teamColor="text-blue-400"
            bgColor="bg-blue-900 bg-opacity-30"
          />

          <TeamSection
            players={tPlayers}
            teamName="Terrorists"
            teamScore={tScore}
            teamColor="text-red-400"
            bgColor="bg-red-900 bg-opacity-30"
          />
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-3 border-t border-gray-700">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              {mvpPlayer && (
                <span className="text-yellow-400">
                  👑 MVP: {players.find(p => p.id === mvpPlayer)?.name || 'Unknown'}
                </span>
              )}
            </div>
            <div className="flex space-x-4">
              <span>Total Players: {players.length}</span>
              <span>Alive: {players.filter(p => p.isAlive).length}</span>
              <span>Your Ping: {ping}ms</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-800 px-6 py-2 text-xs text-gray-500 border-t border-gray-700">
          <div className="flex justify-center space-x-6">
            <span>💀 Dead</span>
            <span>👑 MVP</span>
            <span>➤ You</span>
            <span>K = Kills</span>
            <span>A = Assists</span>
            <span>D = Deaths</span>
            <span>K/D = Kill/Death Ratio</span>
          </div>
        </div>
      </div>
    </div>
  );
};