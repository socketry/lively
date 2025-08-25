import { useEffect, useRef, useState } from 'react';
import { setupWebSocket } from '@/services/websocket';

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

export const useWebSocketConnection = () => {
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([
    { 
      id: '1', 
      name: 'Dust2 Classic - Bots Enabled', 
      players: 3, 
      maxPlayers: 10, 
      mode: 'deathmatch', 
      map: 'de_dust2', 
      status: 'waiting', 
      ping: 32,
      hasPassword: false,
      bots: 4,
      botDifficulty: 'normal'
    },
    { 
      id: '2', 
      name: 'Aim Training - Expert Bots', 
      players: 2, 
      maxPlayers: 8, 
      mode: 'freeForAll', 
      map: 'aim_map', 
      status: 'playing', 
      ping: 45,
      hasPassword: true,
      bots: 6,
      botDifficulty: 'expert'
    },
  ]);

  // WebSocket: connect and listen for room updates
  useEffect(() => {
    const ws = setupWebSocket();
    wsRef.current = ws;
    ws.connect().then(() => setIsConnected(true)).catch(() => setIsConnected(false));
    
    const offCreated = ws.on('room:created', (data: any) => {
      const id = (data && (data.id || data.roomId)) || String(Date.now());
      window.location.href = `/room/${id}`;
    });
    
    const offUpdated = ws.on('room:updated', (data: any) => {
      // Accept either { rooms: [...] } or array
      const list = Array.isArray(data) ? data : (data?.rooms || []);
      if (Array.isArray(list) && list.length) {
        // Normalize minimal fields
        const mapped: Room[] = list.map((r: any) => ({
          id: String(r.id || r.roomId || Date.now()),
          name: r.name || 'Room',
          players: (r.players && (r.players.length || r.players)) || 0,
          maxPlayers: r.maxPlayers || 10,
          mode: r.mode || 'deathmatch',
          map: r.map || 'de_dust2',
          status: r.status || 'waiting',
          ping: 32,
          hasPassword: !!r.hasPassword,
          bots: r.bots || 0,
          botDifficulty: r.botDifficulty || 'normal'
        }));
        setRooms(mapped);
      }
    });
    
    return () => { 
      offCreated(); 
      offUpdated(); 
    };
  }, []);

  const createRoom = (roomConfig: any, t: (key: string) => string) => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomConfig.name || t('lobby.roomName'),
      players: 1,
      maxPlayers: roomConfig.maxPlayers,
      mode: roomConfig.mode,
      map: roomConfig.map,
      status: 'waiting',
      ping: Math.floor(Math.random() * 50) + 10,
      hasPassword: roomConfig.password !== '',
      bots: roomConfig.botConfig.enabled ? roomConfig.botConfig.count : 0,
      botDifficulty: roomConfig.botConfig.difficulty
    };
    
    // Try server create, fall back to local
    if (wsRef.current?.isConnected) {
      wsRef.current.emit('room:create', {
        name: roomConfig.name || t('lobby.roomName'),
        mode: roomConfig.mode,
        map: roomConfig.map,
        maxPlayers: roomConfig.maxPlayers,
        password: roomConfig.password || undefined,
        bots: roomConfig.botConfig
      });
    } else {
      setRooms(prevRooms => [...prevRooms, newRoom]);
      window.location.href = `/room/${newRoom.id}`;
    }
  };

  return {
    wsRef,
    isConnected,
    rooms,
    setRooms,
    createRoom
  };
};