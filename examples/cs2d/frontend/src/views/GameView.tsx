import { cn } from '@/utils/tailwind';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useWebSocketStore } from '@/contexts/WebSocketContext';

const GameView: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { state, actions } = useGame();
  const { actions: wsActions } = useWebSocketStore();
  const [isLoading, setIsLoading] = useState(true);

  // Create a mock sendMessage function since WebSocket context doesn't have one
  const sendMessage = (type: string, data: any) => {
    console.log('Sending message:', type, data);
    // In a real implementation, this would use a WebSocket connection
  };

  useEffect(() => {
    // Initialize game when component mounts
    const initGame = async () => {
      setIsLoading(true);
      try {
        // Join game room
        if (params.roomId) {
          actions.initializeGame(params.roomId);
          sendMessage('join_game', { roomId: params.roomId });
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setIsLoading(false);
      }
    };

    initGame();

    return () => {
      // Clean up game when component unmounts
      if (params.roomId) {
        sendMessage('leave_game', { roomId: params.roomId });
      }
    };
  }, [params.roomId, actions, sendMessage]);

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center min-h-screen",
        "bg-gray-900 text-white"
      )}>
        <div className={cn(
          "flex flex-col items-center space-y-4",
          "p-8 rounded-lg bg-gray-800 shadow-xl"
        )}>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium">Loading game...</div>
        </div>
      </div>
    );
  }

  // Convert Map to Array for rendering
  const playersArray = Array.from(state.players.values());

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
      "text-white overflow-hidden"
    )}>
      <div className={cn(
        "container mx-auto h-screen flex flex-col",
        "p-4 md:p-6 lg:p-8"
      )}>
        <header className={cn(
          "flex items-center justify-between",
          "bg-gray-800/50 backdrop-blur-sm rounded-lg",
          "p-4 mb-6 border border-gray-700/50"
        )}>
          <button 
            onClick={handleBackToLobby} 
            className={cn(
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
              "text-white font-medium px-4 py-2 rounded-md",
              "transition-all duration-200 ease-in-out",
              "hover:scale-105 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            )}
          >
            ← Back to Lobby
          </button>
          <h1 className={cn(
            "text-xl md:text-2xl font-bold",
            "bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
          )}>
            Game Room: {params.roomId || 'Unknown'}
          </h1>
        </header>

        <div className={cn(
          "flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6",
          "overflow-hidden"
        )}>
          <div className={cn(
            "lg:col-span-3 bg-black/30 rounded-lg",
            "border border-gray-700/50 overflow-hidden",
            "relative"
          )}>
            <canvas 
              id="game-canvas" 
              className={cn(
                "w-full h-full",
                "bg-gray-900 border-2 border-gray-700"
              )}
            />
            <div className={cn(
              "absolute top-4 left-4 text-sm font-mono",
              "bg-black/70 px-2 py-1 rounded text-green-400"
            )}>
              FPS: {state.fps} | Ping: {state.ping}ms
            </div>
          </div>

          <div className={cn(
            "bg-gray-800/50 backdrop-blur-sm rounded-lg",
            "border border-gray-700/50 p-4",
            "flex flex-col space-y-4 overflow-y-auto"
          )}>
            <div className="player-list">
              <h3 className={cn(
                "text-lg font-semibold mb-3",
                "text-blue-400 border-b border-gray-700 pb-2"
              )}>Players ({playersArray.length})</h3>
              <ul className="space-y-2">
                {playersArray.map((player) => (
                  <li key={player.id} className={cn(
                    "flex items-center justify-between",
                    "bg-gray-700/30 rounded-md p-2",
                    "border-l-4",
                    player.team === 'terrorist' ? 'border-red-500' : 
                    player.team === 'counter_terrorist' ? 'border-blue-500' : 'border-gray-500',
                    player.health <= 0 ? 'opacity-50' : ''
                  )}>    
                    <div className="flex flex-col">
                      <span className={cn(
                        "font-medium text-sm",
                        player.id === state.localPlayer?.id ? 'text-yellow-400' : 'text-white'
                      )}>
                        {player.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        HP: {player.health} | K/D: {player.kills}/{player.deaths}
                      </span>
                    </div>
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      player.health > 0 ? 'bg-green-500' : 'bg-red-500'
                    )} />
                  </li>
                ))}
                {playersArray.length === 0 && (
                  <li className="text-gray-500 text-center py-4">
                    No players in game
                  </li>
                )}
              </ul>
            </div>

            <div className="game-stats">
              <h3 className={cn(
                "text-lg font-semibold mb-3",
                "text-green-400 border-b border-gray-700 pb-2"
              )}>Game Stats</h3>
              <div className="space-y-2">
                <div className={cn(
                  "flex justify-between items-center",
                  "bg-gray-700/30 rounded-md p-2"
                )}>
                  <span className="text-sm text-gray-300">Round:</span>
                  <span className="font-mono text-white">{state.roundNumber}</span>
                </div>
                <div className={cn(
                  "flex justify-between items-center", 
                  "bg-gray-700/30 rounded-md p-2"
                )}>
                  <span className="text-sm text-gray-300">Time:</span>
                  <span className="font-mono text-white">
                    {Math.floor(state.roundTime / 60)}:{(state.roundTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className={cn(
                  "flex justify-between items-center",
                  "bg-gray-700/30 rounded-md p-2"
                )}>
                  <span className="text-sm text-gray-300">Score:</span>
                  <span className="font-mono text-white">
                    {state.teamScores.ct} - {state.teamScores.t}
                  </span>
                </div>
                {state.bombPlanted && (
                  <div className={cn(
                    "flex justify-between items-center",
                    "bg-red-900/50 border border-red-500 rounded-md p-2",
                    "animate-pulse"
                  )}>
                    <span className="text-sm text-red-300">💣 Bomb:</span>
                    <span className="font-mono text-red-400">
                      {state.bombTimer}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameView;