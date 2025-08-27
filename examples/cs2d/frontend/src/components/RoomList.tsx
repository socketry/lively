import React from 'react';
import { RoomCard } from './RoomCard';
import { LobbySkeletonGrid } from './common/SkeletonLoader';

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

interface RoomListProps {
  rooms: Room[];
  isInitialLoading: boolean;
  isJoiningRoom: string | null;
  searchQuery: string;
  filterMode: string;
  showOnlyWithBots: boolean;
  onJoinRoom: (roomId: string) => void;
  onPlayUISound: (soundType?: 'click' | 'hover' | 'success' | 'error') => void;
  onNotifyGameAction: (action: string, message: string, type?: 'info' | 'success' | 'error') => void;
  onShowCreateModal: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  isInitialLoading,
  isJoiningRoom,
  searchQuery,
  filterMode,
  showOnlyWithBots,
  onJoinRoom,
  onPlayUISound,
  onNotifyGameAction,
  onShowCreateModal
}) => {
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'all' || room.mode === filterMode;
    const matchesBotFilter = !showOnlyWithBots || room.bots > 0;
    return matchesSearch && matchesMode && matchesBotFilter;
  });

  if (isInitialLoading) {
    return <LobbySkeletonGrid count={6} />;
  }

  if (filteredRooms.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-12 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-2xl font-bold text-white mb-2">No Rooms Found</h3>
        <p className="text-white/60 mb-6">Try adjusting your filters or create a new room</p>
        <button 
          onClick={onShowCreateModal}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 font-bold"
        >
          Create First Room
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="room-list">
      {filteredRooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isJoiningRoom={isJoiningRoom}
          onJoinRoom={onJoinRoom}
          onPlayUISound={onPlayUISound}
          onNotifyGameAction={onNotifyGameAction}
        />
      ))}
    </div>
  );
};