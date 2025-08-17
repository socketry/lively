import React, { useState } from 'react';

interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  mode: string;
  map: string;
  status: 'waiting' | 'playing';
}

export const GameLobby: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', name: 'Dust2 Classic', players: 3, maxPlayers: 10, mode: 'Deathmatch', map: 'de_dust2', status: 'waiting' },
    { id: '2', name: 'Aim Training', players: 8, maxPlayers: 8, mode: 'FFA', map: 'aim_map', status: 'playing' },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({
    name: '',
    mode: 'deathmatch',
    map: 'de_dust2',
    maxPlayers: 10,
    password: ''
  });

  const createRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomConfig.name || 'New Room',
      players: 1,
      maxPlayers: roomConfig.maxPlayers,
      mode: roomConfig.mode,
      map: roomConfig.map,
      status: 'waiting'
    };
    setRooms([...rooms, newRoom]);
    setShowCreateModal(false);
    // Navigate to room
    window.location.href = `/room/${newRoom.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-orange-500" data-testid="lobby-header">CS2D</h1>
            <span className="text-gray-400">Game Lobby</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">Players Online: 247</span>
            <div className="flex items-center space-x-2" data-testid="connection-status" data-status="connected">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500">Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 hover:bg-orange-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              data-testid="create-room-btn"
            >
              Create Room
            </button>
            <button 
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              data-testid="quick-join-btn"
            >
              Quick Join
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search rooms..."
              className="bg-gray-800 px-4 py-2 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select className="bg-gray-800 px-4 py-2 rounded-lg focus:outline-none">
              <option>All Modes</option>
              <option>Deathmatch</option>
              <option>Team Deathmatch</option>
              <option>Capture the Flag</option>
            </select>
          </div>
        </div>

        {/* Room List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" data-testid="room-list">
          <div className="grid grid-cols-7 gap-4 p-4 bg-gray-700 font-semibold text-sm text-gray-300">
            <div>Room Name</div>
            <div>Mode</div>
            <div>Map</div>
            <div>Players</div>
            <div>Ping</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No rooms available. Create one!
            </div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="grid grid-cols-7 gap-4 p-4 border-t border-gray-700 hover:bg-gray-750 transition-colors">
                <div className="font-semibold" data-testid="room-name">{room.name}</div>
                <div className="text-gray-400">{room.mode}</div>
                <div className="text-gray-400">{room.map}</div>
                <div className="text-gray-400" data-testid="player-count">
                  {room.players}/{room.maxPlayers}
                </div>
                <div className="text-green-400">32ms</div>
                <div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.status === 'waiting' ? 'bg-green-600' : 'bg-yellow-600'
                  }`}>
                    {room.status === 'waiting' ? 'Waiting' : 'In Game'}
                  </span>
                </div>
                <div>
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm transition-colors"
                    onClick={() => window.location.href = `/room/${room.id}`}
                  >
                    Join
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create Room</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name</label>
                <input
                  type="text"
                  value={roomConfig.name}
                  onChange={(e) => setRoomConfig({...roomConfig, name: e.target.value})}
                  className="w-full bg-gray-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter room name..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Game Mode</label>
                <select 
                  value={roomConfig.mode}
                  onChange={(e) => setRoomConfig({...roomConfig, mode: e.target.value})}
                  className="w-full bg-gray-700 px-3 py-2 rounded focus:outline-none"
                  data-testid="game-mode"
                >
                  <option value="deathmatch">Deathmatch</option>
                  <option value="team-deathmatch">Team Deathmatch</option>
                  <option value="capture-the-flag">Capture the Flag</option>
                  <option value="defuse">Defuse</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Map</label>
                <select 
                  value={roomConfig.map}
                  onChange={(e) => setRoomConfig({...roomConfig, map: e.target.value})}
                  className="w-full bg-gray-700 px-3 py-2 rounded focus:outline-none"
                  data-testid="selected-map"
                >
                  <option value="de_dust2">de_dust2</option>
                  <option value="de_inferno">de_inferno</option>
                  <option value="aim_map">aim_map</option>
                  <option value="fy_iceworld">fy_iceworld</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Max Players</label>
                <input
                  type="number"
                  min="2"
                  max="32"
                  value={roomConfig.maxPlayers}
                  onChange={(e) => setRoomConfig({...roomConfig, maxPlayers: parseInt(e.target.value)})}
                  className="w-full bg-gray-700 px-3 py-2 rounded focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Password (Optional)</label>
                <input
                  type="password"
                  value={roomConfig.password}
                  onChange={(e) => setRoomConfig({...roomConfig, password: e.target.value})}
                  className="w-full bg-gray-700 px-3 py-2 rounded focus:outline-none"
                  placeholder="Leave empty for public room"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded font-semibold transition-colors"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};