import React, { memo } from 'react';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't' | 'spectator';
  ready: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'normal' | 'hard' | 'expert';
  kills: number;
  deaths: number;
  ping: number;
  avatar: string;
}

interface OptimizedPlayerCardProps {
  player: Player;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  className?: string;
}

const difficultyColors = {
  easy: 'text-green-400 bg-green-500/20 border-green-500/30',
  normal: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  hard: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  expert: 'text-red-400 bg-red-500/20 border-red-500/30'
};

/**
 * Optimized player card component with React.memo
 * Only re-renders when player data or host status changes
 */
export const OptimizedPlayerCard = memo<OptimizedPlayerCardProps>(({
  player,
  isHost,
  onKick,
  className = ''
}) => {
  const handleKick = React.useCallback(() => {
    onKick?.(player.id);
  }, [onKick, player.id]);

  return (
    <div className={`flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all ${className}`}>
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{player.avatar}</span>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">{player.name}</span>
            {player.isBot && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[player.botDifficulty || 'normal']}`}>
                {player.botDifficulty?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-white/60">
            <span>K/D: {player.kills}/{player.deaths}</span>
            <span>Ping: {player.ping}ms</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {player.ready && (
          <span className="text-green-400 text-sm">✅ Ready</span>
        )}
        {isHost && player.id !== '1' && (
          <button 
            onClick={handleKick}
            className="text-red-400 hover:text-red-300 transition-colors"
            aria-label={`Kick ${player.name}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for shallow equality check
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.name === nextProps.player.name &&
    prevProps.player.ready === nextProps.player.ready &&
    prevProps.player.kills === nextProps.player.kills &&
    prevProps.player.deaths === nextProps.player.deaths &&
    prevProps.player.ping === nextProps.player.ping &&
    prevProps.isHost === nextProps.isHost &&
    prevProps.className === nextProps.className
  );
});

OptimizedPlayerCard.displayName = 'OptimizedPlayerCard';

/**
 * Optimized team section with virtual scrolling support
 */
interface OptimizedTeamSectionProps {
  title: string;
  players: Player[];
  teamColor: string;
  icon: string;
  isHost: boolean;
  onKickPlayer?: (playerId: string) => void;
  maxSlots: number;
}

export const OptimizedTeamSection = memo<OptimizedTeamSectionProps>(({
  title,
  players,
  teamColor,
  icon,
  isHost,
  onKickPlayer,
  maxSlots
}) => {
  const emptySlots = Math.max(0, maxSlots - players.length);
  const emptySlotsList = Array.from({ length: emptySlots }, (_, i) => i);

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span className={`w-8 h-8 ${teamColor} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
            {icon}
          </span>
          <span>{title}</span>
        </h2>
        <span className="text-white/60">{players.length} players</span>
      </div>
      
      <div className="space-y-3">
        {players.map(player => (
          <OptimizedPlayerCard
            key={player.id}
            player={player}
            isHost={isHost}
            onKick={onKickPlayer}
          />
        ))}
        
        {/* Empty slots */}
        {emptySlotsList.map(index => (
          <div key={`empty-${index}`} className="p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 border-dashed">
            <div className="text-white/30 text-center">Empty Slot</div>
          </div>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if players array length or individual player data changes
  if (prevProps.players.length !== nextProps.players.length) return false;
  if (prevProps.isHost !== nextProps.isHost) return false;
  if (prevProps.title !== nextProps.title) return false;
  
  // Deep comparison for players array
  return prevProps.players.every((player, index) => {
    const nextPlayer = nextProps.players[index];
    return (
      player.id === nextPlayer.id &&
      player.ready === nextPlayer.ready &&
      player.kills === nextPlayer.kills &&
      player.deaths === nextPlayer.deaths &&
      player.ping === nextPlayer.ping
    );
  });
});

OptimizedTeamSection.displayName = 'OptimizedTeamSection';