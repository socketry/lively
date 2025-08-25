import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { setupWebSocket } from '@/services/websocket';
import { 
  useDebounce, 
  useBatchedState, 
  useRenderPerformance, 
  useDebounceWebSocketState 
} from '@/hooks/usePerformance';
import { OptimizedPlayerCard, OptimizedTeamSection } from './OptimizedPlayerCard';
import { OptimizedChatComponent } from './OptimizedChatComponent';
import { OptimizedConnectionStatus } from './OptimizedConnectionStatus';
import { LazyWrapper, ConditionalLazy, LazyBotManagerPanel, LazyMapVoteModal } from '../lazy/LazyComponents';
import { getPerformanceMonitor } from '@/utils/performanceMonitor';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't' | 'spectator';
  ready: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'normal' | 'hard' | 'expert';
  kills: number;
  deaths: number;
  ping: number;
  avatar: string;
}

interface RoomSettings {
  name: string;
  map: string;
  mode: string;
  maxPlayers: number;
  roundTime: number;
  maxRounds: number;
  friendlyFire: boolean;
  botConfig: {
    enabled: boolean;
    count: number;
    difficulty: 'easy' | 'normal' | 'hard' | 'expert';
    fillEmpty: boolean;
    teamBalance: boolean;
  };
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  team?: 'ct' | 't' | 'all';
}

interface OptimizedWaitingRoomProps {
  roomId: string;
}

export const OptimizedWaitingRoom: React.FC<OptimizedWaitingRoomProps> = ({ roomId }) => {
  useRenderPerformance('OptimizedWaitingRoom');
  
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null);
  const performanceMonitor = getPerformanceMonitor();
  
  // Use batched state for frequently changing data
  const [players, setPlayers, flushPlayerUpdates] = useBatchedState<Player[]>([
    { id: '1', name: 'Player1', team: 'ct', ready: false, isBot: false, kills: 0, deaths: 0, ping: 45, avatar: '👤' },
    { id: 'bot1', name: '[BOT] Alpha', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot2', name: '[BOT] Charlie', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot3', name: '[BOT] Delta', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot4', name: '[BOT] Echo', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot5', name: '[BOT] Foxtrot', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot6', name: '[BOT] Bravo', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
  ]);

  // Debounced WebSocket state for room settings
  const [immediateSettings, debouncedSettings, updateSettings] = useDebounceWebSocketState<RoomSettings>({
    name: 'Epic Battle Room',
    map: 'de_dust2',
    mode: 'bombDefusal',
    maxPlayers: 16,
    roundTime: 120,
    maxRounds: 30,
    friendlyFire: false,
    botConfig: {
      enabled: true,
      count: 4,
      difficulty: 'normal',
      fillEmpty: true,
      teamBalance: true
    }
  }, 500);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', playerId: '1', playerName: 'Player1', message: 'Ready for battle!', timestamp: new Date(), team: 'all' },
    { id: '2', playerId: 'bot1', playerName: '[BOT] Alpha', message: 'Affirmative!', timestamp: new Date(), team: 'all' },
  ]);
  
  const [chatInput, setChatInput] = useState('');
  const debouncedChatInput = useDebounce(chatInput, 100);
  
  // UI state
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [showMapVote, setShowMapVote] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHost] = useState(true);
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnectAttempts: 0
  });

  // Memoized computed values
  const teamStats = useMemo(() => {
    const ctPlayers = players.filter(p => p.team === 'ct');
    const tPlayers = players.filter(p => p.team === 't');
    const humanPlayers = players.filter(p => !p.isBot);
    const readyHumanPlayers = humanPlayers.filter(p => p.ready);
    const allReady = humanPlayers.every(p => p.ready);
    
    return {
      ctPlayers,
      tPlayers,
      humanPlayers,
      readyHumanPlayers,
      allReady,
      canStartGame: isHost && allReady && humanPlayers.length >= 1
    };
  }, [players, isHost]);

  // Optimized callbacks
  const addBot = useCallback((difficulty: 'easy' | 'normal' | 'hard' | 'expert') => {
    const botNames = ['Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet'];
    const availableName = botNames.find(name => 
      !players.some(p => p.name === `[BOT] ${name}`)
    ) || 'Bot';

    const ctCount = players.filter(p => p.team === 'ct').length;
    const tCount = players.filter(p => p.team === 't').length;
    const team = ctCount <= tCount ? 'ct' : 't';

    const newBot: Player = {
      id: `bot${Date.now()}`,
      name: `[BOT] ${availableName}`,
      team,
      ready: true,
      isBot: true,
      botDifficulty: difficulty,
      kills: 0,
      deaths: 0,
      ping: 1,
      avatar: '🤖'
    };

    setPlayers(prev => [...prev, newBot]);
  }, [players, setPlayers]);

  const removeBot = useCallback((botId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== botId));
  }, [setPlayers]);

  const kickPlayer = useCallback((playerId: string) => {
    if (isHost) {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    }
  }, [isHost, setPlayers]);

  const toggleReady = useCallback(() => {
    setPlayers(prev => prev.map(p => 
      p.id === '1' ? { ...p, ready: !p.ready } : p
    ));
  }, [setPlayers]);

  const startGame = useCallback(() => {
    if (teamStats.canStartGame) {
      setCountdown(10);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            window.location.href = `/game/${roomId}`;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [teamStats.canStartGame, roomId]);

  const sendMessage = useCallback(() => {
    if (debouncedChatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: '1',
        playerName: 'Player1',
        message: debouncedChatInput,
        timestamp: new Date(),
        team: 'all'
      };
      setChatMessages(prev => [...prev.slice(-99), newMessage]); // Keep last 100 messages
      
      if (wsRef.current?.isConnected) {
        wsRef.current.emit('chat:message', { 
          sender: newMessage.playerName, 
          team: newMessage.team, 
          text: newMessage.message, 
          roomId 
        });
      }
      setChatInput('');
    }
  }, [debouncedChatInput, roomId]);

  const handleReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.connect().catch(() => {
        setConnectionState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
      });
    }
  }, []);

  // WebSocket connection management with performance monitoring
  useEffect(() => {
    const ws = setupWebSocket();
    wsRef.current = ws;

    const connectWithMonitoring = () => {
      const startTime = performance.now();
      return ws.connect()
        .then(() => {
          const connectionTime = performance.now() - startTime;
          performanceMonitor.measureRender('WebSocketConnection', () => connectionTime);
          setConnectionState({ isConnected: true, reconnectAttempts: 0 });
        })
        .catch(() => {
          setConnectionState(prev => ({ 
            isConnected: false, 
            reconnectAttempts: prev.reconnectAttempts + 1 
          }));
        });
    };

    connectWithMonitoring();
    
    ws.emit('room:join', { roomId });

    const offRoomUpdated = ws.on('room:updated', (data: any) => {
      const room = Array.isArray(data) ? null : data;
      if (room && (room.id === roomId || room.roomId === roomId)) {
        if (Array.isArray(room.players)) {
          const mapped: Player[] = room.players.map((p: any) => ({
            id: String(p.id || p.name),
            name: String(p.name || 'Player'),
            team: (p.team === 'ct' || p.team === 't') ? p.team : 'ct',
            ready: !!p.ready,
            isBot: !!p.isBot,
            botDifficulty: p.botDifficulty || 'normal',
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            ping: p.ping || 32,
            avatar: p.isBot ? '🤖' : '👤'
          }));
          setPlayers(mapped);
          flushPlayerUpdates(); // Force immediate update for important data
        }
      }
    });

    const offChat = ws.on('chat:message', (msg: any) => {
      const m = msg as { sender: string; team: 'all' | 'ct' | 't' | 'dead'; text: string };
      setChatMessages(prev => [...prev.slice(-99), {
        id: String(Date.now()),
        playerId: 'remote',
        playerName: m.sender,
        message: m.text,
        timestamp: new Date(),
        team: m.team
      }]);
    });

    return () => {
      offRoomUpdated();
      offChat();
      ws.emit('room:leave', { roomId });
    };
  }, [roomId, setPlayers, flushPlayerUpdates, performanceMonitor]);

  // Auto-flush batched updates when critical actions happen
  useEffect(() => {
    if (teamStats.allReady || countdown !== null) {
      flushPlayerUpdates();
    }
  }, [teamStats.allReady, countdown, flushPlayerUpdates]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent">
                {debouncedSettings.name}
              </h1>
              <p className="text-white/70">
                {debouncedSettings.mode} • {debouncedSettings.map} • {players.length}/{debouncedSettings.maxPlayers} players
              </p>
              
              {/* Performance Debug Panel (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 p-2 bg-black/30 rounded text-xs text-green-400 font-mono">
                  🎮 Host: {isHost ? 'YES' : 'NO'} | Ready: {teamStats.readyHumanPlayers.length}/{teamStats.humanPlayers.length} | Can Start: {teamStats.canStartGame ? 'YES' : 'NO'} | Performance: {performanceMonitor.getSummary().performanceScore}%
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Optimized Connection Status */}
              <OptimizedConnectionStatus
                isConnected={connectionState.isConnected}
                reconnectAttempts={connectionState.reconnectAttempts}
                onManualReconnect={handleReconnect}
                serverUrl={import.meta.env.VITE_WS_URL || 'ws://localhost:9292'}
              />
              
              {isHost && (
                <>
                  <button 
                    onClick={() => setShowBotPanel(!showBotPanel)}
                    className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
                  >
                    🤖 Bot Manager
                  </button>
                  <button 
                    onClick={() => setShowMapVote(!showMapVote)}
                    className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
                  >
                    🗺️ Change Map
                  </button>
                  <button 
                    onClick={startGame}
                    disabled={!teamStats.canStartGame}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${
                      teamStats.canStartGame
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    ▶️ Start Game
                  </button>
                </>
              )}
              
              <button 
                onClick={toggleReady}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  players.find(p => p.id === '1')?.ready
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                }`}
              >
                {players.find(p => p.id === '1')?.ready ? '✅ Ready' : '⏸️ Not Ready'}
              </button>
              
              <button 
                onClick={() => window.location.href = '/lobby'}
                className="px-4 py-2 backdrop-blur-md bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-600/30 transition-all"
              >
                🚪 Leave Room
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Lazy-loaded Bot Manager Panel */}
      <ConditionalLazy condition={showBotPanel && isHost}>
        <LazyBotManagerPanel
          players={players}
          roomSettings={debouncedSettings}
          isHost={isHost}
          onClose={() => setShowBotPanel(false)}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onUpdateSettings={updateSettings}
        />
      </ConditionalLazy>

      {/* Lazy-loaded Map Vote Modal */}
      <ConditionalLazy condition={showMapVote && isHost}>
        <LazyMapVoteModal
          currentMap={debouncedSettings.map}
          isHost={isHost}
          onClose={() => setShowMapVote(false)}
          onMapSelect={(map) => updateSettings(prev => ({ ...prev, map }))}
        />
      </ConditionalLazy>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Teams Section */}
          <div className="col-span-2 space-y-6">
            <OptimizedTeamSection
              title="Counter-Terrorists"
              players={teamStats.ctPlayers}
              teamColor="bg-gradient-to-br from-blue-500 to-cyan-500"
              icon="CT"
              isHost={isHost}
              onKickPlayer={kickPlayer}
              maxSlots={8}
            />
            
            <OptimizedTeamSection
              title="Terrorists"
              players={teamStats.tPlayers}
              teamColor="bg-gradient-to-br from-orange-500 to-red-500"
              icon="T"
              isHost={isHost}
              onKickPlayer={kickPlayer}
              maxSlots={8}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Room Settings */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">⚙️ Room Settings</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Map</span>
                  <span className="text-white font-medium">{debouncedSettings.map}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Mode</span>
                  <span className="text-white font-medium">{debouncedSettings.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Round Time</span>
                  <span className="text-white font-medium">{debouncedSettings.roundTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Max Rounds</span>
                  <span className="text-white font-medium">{debouncedSettings.maxRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Friendly Fire</span>
                  <span className="text-white font-medium">{debouncedSettings.friendlyFire ? 'On' : 'Off'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Bots</span>
                  <span className="text-white font-medium">
                    {players.filter(p => p.isBot).length} ({debouncedSettings.botConfig.difficulty})
                  </span>
                </div>
              </div>
            </div>

            {/* Optimized Chat */}
            <OptimizedChatComponent
              messages={chatMessages}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              onSendMessage={sendMessage}
            />
          </div>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-9xl font-black text-white mb-4 animate-pulse">
              {countdown}
            </div>
            <div className="text-3xl text-white/80">Game Starting...</div>
          </div>
        </div>
      )}
    </div>
  );
};