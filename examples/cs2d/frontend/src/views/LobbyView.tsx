import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useApp } from '@/contexts/AppContext';
import type { Room } from '@/types/game';
import { ResponsiveLobby } from '@/components/ResponsiveLobby';

const LobbyView: React.FC = () => {
  const navigate = useNavigate();
  const { sendMessage, connectionStatus } = useWebSocket();
  const { actions } = useApp();
  const { addNotification } = actions;
  const [rooms, _setRooms] = useState<Room[]>([]);
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

  return <ResponsiveLobby />;
};

export default LobbyView;