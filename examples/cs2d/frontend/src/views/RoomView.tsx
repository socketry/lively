import { cn } from '@/utils/tailwind';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useApp } from '@/contexts/AppContext';
import type { Room } from '@/types/game';

const RoomView: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { sendMessage } = useWebSocket();
  const { actions } = useApp();
  const { addNotification: _addNotification } = actions;
  const [roomData, _setRoomData] = useState<Room | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Join room
    if (params.roomId) {
      sendMessage('join_room', { roomId: params.roomId });
    }

    return () => {
      // Leave room on unmount
      if (params.roomId) {
        sendMessage('leave_room', { roomId: params.roomId });
      }
    };
  }, [params.roomId, sendMessage]);

  const toggleReady = () => {
    setIsReady(!isReady);
    sendMessage('player_ready', { ready: !isReady });
  };

  const startGame = () => {
    sendMessage('start_game', { roomId: params.roomId });
    navigate(`/game/${params.roomId}`);
  };

  const leaveRoom = () => {
    navigate('/lobby');
  };

  return (
    <div className="room-view">
      <div className="room-container">
        <header className="room-header">
          <button 
            onClick={leaveRoom} 
            className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform"
          >
            Leave Room
          </button>
          <h1>Room: {params.roomId}</h1>
        </header>

        <div className="room-content">
          <div className="players-section">
            <h2>Players</h2>
            <ul className="players-list">
              {roomData?.players?.map((player) => (
                <li key={player.id} className="player-item">
                  <span className="player-name">{player.name}</span>
                  <span className={cn('player-status', { ready: player.ready })}>
                    {player.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="room-actions">
            <button 
              onClick={toggleReady}
              className={cn('btn', isReady ? 'btn-success' : 'btn-warning')}
            >
              {isReady ? 'Ready!' : 'Not Ready'}
            </button>
            
            {roomData?.isHost && (
              <button 
                onClick={startGame}
                disabled={!roomData?.allReady}
                className="btn btn-primary"
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomView;