import React from 'react';

interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  mode: string;
  map: string;
  status: 'waiting' | 'playing';
  ping: number;
  hasPassword: boolean;
  bots: number;
  botDifficulty: 'easy' | 'normal' | 'hard' | 'expert';
}

interface RoomCardProps {
  room: Room;
  isJoiningRoom: string | null;
  onJoinRoom: (roomId: string) => void;
  onPlayUISound: (soundType?: 'click' | 'hover' | 'success' | 'error') => void;
  onNotifyGameAction: (action: string, message: string, type?: 'info' | 'success' | 'error') => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isJoiningRoom,
  onJoinRoom,
  onPlayUISound,
  onNotifyGameAction
}) => {
  const difficultyColors = {
    easy: 'text-green-400',
    normal: 'text-yellow-400',
    hard: 'text-orange-400',
    expert: 'text-red-400'
  };

  const difficultyIcons = {
    easy: '🟢',
    normal: '🟡',
    hard: '🟠',
    expert: '🔴'
  };

  const handleJoinClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isJoiningRoom !== room.id) {
      onPlayUISound('click');
      onNotifyGameAction('joining', `Joining ${room.name}...`, 'info');
      onJoinRoom(room.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { 
    if ((e.key === 'Enter' || e.key === ' ') && isJoiningRoom !== room.id) {
      onPlayUISound('click');
      onNotifyGameAction('joining', `Joining ${room.name}...`, 'info');
      onJoinRoom(room.id);
    }
  };

  return (
    <div
      className="text-left backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.3)] relative overflow-hidden group"
      onClick={handleJoinClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onPlayUISound('hover')}
      tabIndex={0}
      role="button"
      aria-label={`Join room ${room.name}`}
    >
      {/* Animated background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Status indicator pulse */}
      {room.status === 'waiting' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75" />
      )}

      {/* Room Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{room.name}</h3>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              room.status === 'waiting' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {room.status === 'waiting' ? '⏳ Waiting' : '🎮 In Game'}
            </span>
            {room.hasPassword && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                🔒 Private
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/60 text-sm">Ping</div>
          <div className={`font-bold ${
            room.ping < 30 ? 'text-green-400' : 
            room.ping < 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {room.ping}ms
          </div>
        </div>
      </div>

      {/* Room Info */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-white/60">Map</span>
          <span className="text-white font-semibold">{room.map}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/60">Mode</span>
          <span className="text-white font-semibold">{room.mode}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/60">Players</span>
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold">
              👥 {room.players}/{room.maxPlayers}
            </span>
            {room.bots > 0 && (
              <span className={`font-semibold ${difficultyColors[room.botDifficulty]}`}>
                {difficultyIcons[room.botDifficulty]} {room.bots} Bots
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Player Bar Visualization */}
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div className="h-full flex">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
            style={{ width: `${(room.players / room.maxPlayers) * 100}%` }}
          />
          {room.bots > 0 && (
            <div 
              className="bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-300"
              style={{ width: `${(room.bots / room.maxPlayers) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Join Button */}
      <div 
        className={`w-full mt-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 font-semibold text-center ${
          isJoiningRoom === room.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={handleJoinClick}
      >
        {isJoiningRoom === room.id ? (
          <span className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Joining...</span>
          </span>
        ) : (
          'Join Room'
        )}
      </div>
    </div>
  );
};