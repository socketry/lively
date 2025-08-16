import { cn } from '@/utils/tailwind';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useApp } from '@/contexts/AppContext';

const LobbyView: React.FC = () => {
  const navigate = useNavigate();
  const { sendMessage, connectionStatus } = useWebSocket();
  const { actions } = useApp();
  const { addNotification } = actions;
  const [rooms, setRooms] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    // Fetch available rooms
    if (connectionStatus === 'connected') {
      sendMessage('get_rooms', {});
    }
  }, [connectionStatus, sendMessage]);

  const createRoom = () => {
    setIsCreatingRoom(true);
    sendMessage('create_room', { name: `Room ${Date.now()}` });
    setTimeout(() => {
      setIsCreatingRoom(false);
      addNotification({
        type: 'success',
        title: 'Room Created',
        message: 'New game room has been created!'
      });
    }, 1000);
  };

  const joinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="lobby-view">
      <div className="lobby-container">
        <header className="lobby-header">
          <h1>CS2D Lobby</h1>
          <button 
            onClick={() => navigate('/settings')} 
            className="btn btn-secondary"
          >
            Settings
          </button>
        </header>

        <div className="lobby-content">
          <div className="room-controls">
            <button 
              onClick={createRoom} 
              disabled={isCreatingRoom}
              className="btn btn-primary hover:scale-105 active:scale-95 transition-transform"
            >
              {isCreatingRoom ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div className="room-list">
            <h2>Available Rooms</h2>
            {rooms.length === 0 ? (
              <p className="no-rooms">No rooms available. Create one!</p>
            ) : (
              <ul>
                {rooms.map((room: any) => (
                  <li key={room.id} className="room-item">
                    <span className="room-name">{room.name}</span>
                    <span className="room-players">{room.players}/10</span>
                    <button 
                      onClick={() => joinRoom(room.id)}
                      className="btn btn-sm btn-primary"
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;