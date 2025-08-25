import React, { useState } from 'react';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  position: { x: number; y: number };
  isAlive: boolean;
  orientation?: number;
}

interface GameState {
  bombPlanted: boolean;
}

interface MiniMapHUDProps {
  player: Player;
  allPlayers: Player[];
  gameState: GameState;
}

export const MiniMapHUD: React.FC<MiniMapHUDProps> = ({
  player,
  allPlayers,
  gameState
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Map boundaries (adjust based on your map size)
  const MAP_WIDTH = 1920;
  const MAP_HEIGHT = 1080;
  const MINIMAP_SIZE = isExpanded ? 300 : 150;

  // Convert game coordinates to minimap coordinates
  const gameToMinimap = (x: number, y: number) => {
    return {
      x: (x / MAP_WIDTH) * MINIMAP_SIZE,
      y: (y / MAP_HEIGHT) * MINIMAP_SIZE
    };
  };

  // Bomb sites (adjust positions based on your map)
  const bombSites = [
    { id: 'A', x: 400, y: 300, label: 'A' },
    { id: 'B', x: 1400, y: 700, label: 'B' }
  ];

  return (
    <div className="space-y-2">
      {/* Minimap Container */}
      <div
        className={`bg-black bg-opacity-90 rounded-lg p-2 border border-gray-600 transition-all duration-300 ${
          isExpanded ? 'scale-110' : ''
        }`}
        style={{ width: MINIMAP_SIZE + 16, height: MINIMAP_SIZE + 40 }}
      >
        {/* Map Area */}
        <div
          className="relative bg-gray-800 border border-gray-600 overflow-hidden"
          style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
        >
          {/* Map Grid */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#444"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Bomb Sites */}
          {bombSites.map(site => {
            const pos = gameToMinimap(site.x, site.y);
            return (
              <div
                key={site.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.x, top: pos.y }}
              >
                <div className="bg-yellow-600 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  {site.label}
                </div>
              </div>
            );
          })}

          {/* Players */}
          {allPlayers.map(p => {
            if (!p.isAlive) {
              // Dead players - show X marker
              const pos = gameToMinimap(p.position.x, p.position.y);
              return (
                <div
                  key={p.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.x, top: pos.y }}
                >
                  <div className={`text-lg ${
                    p.team === 'ct' ? 'text-blue-400' : 'text-red-400'
                  } opacity-50`}>
                    ✕
                  </div>
                </div>
              );
            }

            const pos = gameToMinimap(p.position.x, p.position.y);
            const isLocalPlayer = p.id === player.id;
            const rotation = p.orientation ? (p.orientation * 180 / Math.PI) : 0;

            return (
              <div
                key={p.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: pos.x, 
                  top: pos.y,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                }}
              >
                <div className={`relative ${isLocalPlayer ? 'scale-125' : ''}`}>
                  {/* Player Dot */}
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    p.team === 'ct' 
                      ? isLocalPlayer 
                        ? 'bg-blue-300 border-blue-500' 
                        : 'bg-blue-500 border-blue-700'
                      : isLocalPlayer
                        ? 'bg-red-300 border-red-500'
                        : 'bg-red-500 border-red-700'
                  }`} />
                  
                  {/* Direction Indicator */}
                  <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0.5 h-2 ${
                    p.team === 'ct' ? 'bg-blue-400' : 'bg-red-400'
                  }`} />
                  
                  {/* Player Name (on hover or if local player) */}
                  {(isLocalPlayer || isExpanded) && (
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs whitespace-nowrap ${
                      p.team === 'ct' ? 'text-blue-300' : 'text-red-300'
                    }`}>
                      {isLocalPlayer ? 'YOU' : p.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bomb Indicator (if planted) */}
          {gameState.bombPlanted && (
            <div className="absolute top-2 right-2">
              <div className="bg-red-600 text-white rounded px-2 py-1 text-xs font-bold animate-pulse">
                💣 BOMB
              </div>
            </div>
          )}

          {/* Player View Cone (for local player) */}
          {player.orientation !== undefined && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: gameToMinimap(player.position.x, player.position.y).x,
                top: gameToMinimap(player.position.x, player.position.y).y,
                transform: `translate(-50%, -50%) rotate(${player.orientation * 180 / Math.PI}deg)`
              }}
            >
              <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[30px] border-transparent border-b-blue-300 opacity-30" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mt-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors text-xs"
          >
            {isExpanded ? '−' : '+'}
          </button>
          
          <div className="text-gray-400 text-xs">
            {allPlayers.filter(p => p.isAlive && p.team === 'ct').length} CT | {allPlayers.filter(p => p.isAlive && p.team === 't').length} T
          </div>
          
          <div className="flex space-x-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              −
            </button>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Legend (when expanded) */}
      {isExpanded && (
        <div className="bg-black bg-opacity-80 rounded px-2 py-1 text-xs">
          <div className="text-blue-300">🔵 Counter-Terrorists</div>
          <div className="text-red-300">🔴 Terrorists</div>
          <div className="text-gray-300">✕ Dead Players</div>
          <div className="text-yellow-300">⬢ Bomb Sites</div>
        </div>
      )}
    </div>
  );
};