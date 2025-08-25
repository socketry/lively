import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { PixelInput } from './PixelInput';

interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  mode: string;
  map: string;
  status: 'waiting' | 'playing';
  ping: number;
}

export const PixelGameLobby: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', name: '🔫 DUST2 CLASSIC', players: 4, maxPlayers: 10, mode: 'DM', map: 'de_dust2', status: 'waiting', ping: 32 },
    { id: '2', name: '🎯 AIM TRAINING', players: 2, maxPlayers: 8, mode: 'AIM', map: 'aim_map', status: 'playing', ping: 45 },
    { id: '3', name: '🧟 ZOMBIE MODE', players: 7, maxPlayers: 20, mode: 'ZM', map: 'zm_panic', status: 'waiting', ping: 28 },
    { id: '4', name: '💀 HEADSHOT ONLY', players: 6, maxPlayers: 12, mode: 'HS', map: 'de_inferno', status: 'waiting', ping: 15 },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({
    name: '',
    mode: 'DM',
    map: 'de_dust2',
    maxPlayers: 10,
    password: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const createRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomConfig.name || '🆕 NEW ROOM',
      players: 1,
      maxPlayers: roomConfig.maxPlayers,
      mode: roomConfig.mode,
      map: roomConfig.map,
      status: 'waiting',
      ping: Math.floor(Math.random() * 50) + 10
    };
    setRooms([...rooms, newRoom]);
    setShowCreateModal(false);
    navigate(`/pixel/room/${newRoom.id}`);
  };

  const joinRoom = (roomId: string) => {
    navigate(`/pixel/room/${roomId}`);
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="min-h-screen bg-black relative overflow-hidden"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* 像素背景图案 */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Crect x='0' y='0' width='20' height='20'/%3E%3Crect x='20' y='20' width='20' height='20'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* 像素头部 */}
      <header className="relative z-10 border-b-4 border-gray-600 bg-gray-900">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            {/* 游戏Logo */}
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 bg-blue-600 border-3 border-blue-400 border-b-blue-800 border-r-blue-800 flex items-center justify-center"
                style={{ borderWidth: '3px', borderStyle: 'solid' }}
              >
                <span 
                  className="font-pixel text-white text-base"
                  style={{ textShadow: '2px 2px 0px #000', letterSpacing: '2px' }}
                >
                  CS
                </span>
              </div>
              <div>
                <h1 
                  className="font-pixel text-2xl text-white" 
                  data-testid="pixel-lobby-header"
                  style={{ textShadow: '2px 2px 0px #000', letterSpacing: '2px' }}
                >
                  CS2D RETRO
                </h1>
                <p 
                  className="font-pixel text-green-400 mt-1 text-xs"
                  style={{ letterSpacing: '1px' }}
                >
                  8-BIT SHOOTER
                </p>
              </div>
            </div>

            {/* 在线状态 */}
            <div className="flex items-center space-x-4">
              <div 
                className="font-pixel text-gray-400 text-xs"
                style={{ letterSpacing: '1px' }}
              >
                PLAYERS: 1247
              </div>
              <div className="flex items-center space-x-2" data-testid="pixel-connection-status">
                <div className="w-3 h-3 bg-green-400 animate-pulse" />
                <span 
                  className="font-pixel text-green-400 text-xs"
                  style={{ letterSpacing: '1px' }}
                >
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* 控制面板 */}
        <PixelPanel title="GAME LOBBY" className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <PixelInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="SEARCH ROOMS..."
              testId="search-rooms"
            />
            <PixelButton
              onClick={() => setShowCreateModal(true)}
              variant="success"
              testId="create-room-btn"
              className="w-full"
            >
              CREATE ROOM
            </PixelButton>
            <PixelButton
              onClick={() => navigate('/pixel/game')}
              variant="warning"
              testId="quick-join-btn"
              className="w-full"
            >
              QUICK JOIN
            </PixelButton>
          </div>
        </PixelPanel>

        {/* 房间列表 */}
        <PixelPanel title="SERVER LIST" className="w-full">
          <div className="space-y-2">
            {/* 表头 */}
            <div className="grid grid-cols-6 gap-4 p-2 border-b-2 border-gray-600">
              <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>ROOM NAME</span>
              <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>MODE</span>
              <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>MAP</span>
              <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>PLAYERS</span>
              <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>PING</span>
              <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>STATUS</span>
            </div>

            {/* 房间列表 */}
            {filteredRooms.map(room => (
              <button
                key={room.id}
                type="button"
                className="text-left grid grid-cols-6 gap-4 p-2 hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => joinRoom(room.id)}
                data-testid={`room-${room.id}`}
              >
                <span className="font-pixel text-white text-xs truncate" style={{ letterSpacing: '1px' }}>
                  {room.name}
                </span>
                <span className="font-pixel text-blue-400 text-xs" style={{ letterSpacing: '1px' }}>
                  {room.mode}
                </span>
                <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>
                  {room.map}
                </span>
                <span className="font-pixel text-white text-xs" style={{ letterSpacing: '1px' }}>
                  {room.players}/{room.maxPlayers}
                </span>
                <span className={`font-pixel text-xs ${room.ping < 50 ? 'text-green-400' : 'text-yellow-400'}`} style={{ letterSpacing: '1px' }}>
                  {room.ping}ms
                </span>
                <span className={`font-pixel text-xs ${room.status === 'waiting' ? 'text-green-400' : 'text-red-400'}`} style={{ letterSpacing: '1px' }}>
                  {room.status === 'waiting' ? 'WAITING' : 'PLAYING'}
                </span>
              </button>
            ))}
          </div>
        </PixelPanel>

        {/* 底部信息 */}
        <PixelPanel className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-pixel text-green-400 text-base" style={{ textShadow: '2px 2px 0px #000', letterSpacing: '2px' }}>SERVER INFO</div>
              <div className="font-pixel text-gray-400 text-xs mt-2" style={{ letterSpacing: '1px' }}>
                REGION: US-WEST
                <br />
                VERSION: 2.1.0
              </div>
            </div>
            <div>
              <div className="font-pixel text-yellow-400 text-base" style={{ textShadow: '2px 2px 0px #000', letterSpacing: '2px' }}>GAME MODES</div>
              <div className="font-pixel text-gray-400 text-xs mt-2" style={{ letterSpacing: '1px' }}>
                DM • AIM • ZM • HS
                <br />
                BOMB • GUN • 1V1
              </div>
            </div>
            <div>
              <div className="font-pixel text-red-400 text-base" style={{ textShadow: '2px 2px 0px #000', letterSpacing: '2px' }}>CONTROLS</div>
              <div className="font-pixel text-gray-400 text-xs mt-2" style={{ letterSpacing: '1px' }}>
                WASD: MOVE
                <br />
                MOUSE: AIM & SHOOT
              </div>
            </div>
          </div>
        </PixelPanel>
      </div>

      {/* 创建房间模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50">
          <PixelPanel title="CREATE NEW ROOM" className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-w-90vw max-h-90vh overflow-auto z-50" glow>
            <div className="space-y-4">
              <div>
                <label htmlFor="px-room-name" className="font-pixel text-white text-xs block mb-2" style={{ letterSpacing: '1px' }}>ROOM NAME</label>
                <PixelInput
                  id="px-room-name"
                  value={roomConfig.name}
                  onChange={(value) => setRoomConfig({...roomConfig, name: value})}
                  placeholder="ENTER ROOM NAME..."
                  maxLength={32}
                  testId="room-name-input"
                />
              </div>

              <div>
                <label htmlFor="px-game-mode" className="font-pixel text-white text-xs block mb-2" style={{ letterSpacing: '1px' }}>GAME MODE</label>
                <select
                  id="px-game-mode"
                  value={roomConfig.mode}
                  onChange={(e) => setRoomConfig({...roomConfig, mode: e.target.value})}
                  className="font-pixel w-full bg-black text-green-400 p-2 outline-none border-3 border-solid border-gray-800 border-b-gray-400 border-r-gray-400" style={{ imageRendering: 'pixelated', borderWidth: '3px', borderStyle: 'solid' }}
                  data-testid="game-mode-select"
                >
                  <option value="DM">DEATHMATCH</option>
                  <option value="AIM">AIM TRAINING</option>
                  <option value="ZM">ZOMBIE MODE</option>
                  <option value="HS">HEADSHOT ONLY</option>
                  <option value="BOMB">BOMB DEFUSAL</option>
                </select>
              </div>

              <div>
                <label htmlFor="px-map" className="font-pixel text-white text-xs block mb-2" style={{ letterSpacing: '1px' }}>MAP</label>
                <select
                  id="px-map"
                  value={roomConfig.map}
                  onChange={(e) => setRoomConfig({...roomConfig, map: e.target.value})}
                  className="font-pixel w-full bg-black text-green-400 p-2 outline-none border-3 border-solid border-gray-800 border-b-gray-400 border-r-gray-400" style={{ imageRendering: 'pixelated', borderWidth: '3px', borderStyle: 'solid' }}
                  data-testid="map-select"
                >
                  <option value="de_dust2">DE_DUST2</option>
                  <option value="de_inferno">DE_INFERNO</option>
                  <option value="aim_map">AIM_MAP</option>
                  <option value="zm_panic">ZM_PANIC</option>
                </select>
              </div>

              <div>
                <label htmlFor="px-max-players" className="font-pixel text-white text-xs block mb-2" style={{ letterSpacing: '1px' }}>MAX PLAYERS</label>
                <select
                  id="px-max-players"
                  value={roomConfig.maxPlayers}
                  onChange={(e) => setRoomConfig({...roomConfig, maxPlayers: parseInt(e.target.value)})}
                  className="font-pixel w-full bg-black text-green-400 p-2 outline-none border-3 border-solid border-gray-800 border-b-gray-400 border-r-gray-400" style={{ imageRendering: 'pixelated', borderWidth: '3px', borderStyle: 'solid' }}
                  data-testid="max-players-select"
                >
                  <option value={4}>4 PLAYERS</option>
                  <option value={8}>8 PLAYERS</option>
                  <option value={10}>10 PLAYERS</option>
                  <option value={16}>16 PLAYERS</option>
                  <option value={20}>20 PLAYERS</option>
                </select>
              </div>

              <div>
                <label htmlFor="px-password" className="font-pixel text-white text-xs block mb-2" style={{ letterSpacing: '1px' }}>PASSWORD (OPTIONAL)</label>
                <PixelInput
                  id="px-password"
                  value={roomConfig.password}
                  onChange={(value) => setRoomConfig({...roomConfig, password: value})}
                  placeholder="LEAVE EMPTY FOR PUBLIC..."
                  type="password"
                  testId="room-password-input"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <PixelButton
                  onClick={createRoom}
                  variant="success"
                  className="flex-1"
                  testId="confirm-create-room"
                >
                  CREATE
                </PixelButton>
                <PixelButton
                  onClick={() => setShowCreateModal(false)}
                  variant="danger"
                  className="flex-1"
                  testId="cancel-create-room"
                >
                  CANCEL
                </PixelButton>
              </div>
            </div>
          </PixelPanel>
        </div>
      )}
    </div>
  );
};
