import { cn } from '@/utils/tailwind';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useApp } from '@/contexts/AppContext';
import type { Room } from '@/types/game';
import { ResponsiveWaitingRoom } from '@/components/ResponsiveWaitingRoom';

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
    <ResponsiveWaitingRoom roomId={params.roomId || 'default'} />
  );
};

export default RoomView;