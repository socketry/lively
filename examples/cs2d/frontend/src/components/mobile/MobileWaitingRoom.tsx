import React, { useState, useEffect, useRef } from 'react';
import { setupWebSocket } from '@/services/websocket';
import { useIsMobile, useIsTouchDevice } from '@/hooks/useResponsive';

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

export const MobileWaitingRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null)
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings' | 'bots'>('chat');
  
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player1', team: 'ct', ready: false, isBot: false, kills: 0, deaths: 0, ping: 45, avatar: '👤' },
    { id: 'bot1', name: '[BOT] Alpha', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot2', name: '[BOT] Charlie', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot3', name: '[BOT] Delta', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot4', name: '[BOT] Echo', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
  ]);

  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
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
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', playerId: '1', playerName: 'Player1', message: 'Ready for battle!', timestamp: new Date(), team: 'all' },
    { id: '2', playerId: 'bot1', playerName: '[BOT] Alpha', message: 'Affirmative!', timestamp: new Date(), team: 'all' },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHost] = useState(true);

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20 border-green-500/30',
    normal: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    hard: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    expert: 'text-red-400 bg-red-500/20 border-red-500/30'
  };

  const toggleReady = () => {
    setPlayers(players.map(p => 
      p.id === '1' ? { ...p, ready: !p.ready } : p
    ));
  };

  const startGame = () => {
    if (isHost) {
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
  };

  const sendMessage = () => {
    if (chatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: '1',
        playerName: 'Player1',
        message: chatInput,
        timestamp: new Date(),
        team: 'all'
      };
      setChatMessages([...chatMessages, newMessage]);
      if (wsRef.current?.isConnected) {
        wsRef.current.emit('chat:message', { sender: newMessage.playerName, team: newMessage.team, text: newMessage.message, roomId })
      }
      setChatInput('');
    }
  };

  const ctPlayers = players.filter(p => p.team === 'ct');
  const tPlayers = players.filter(p => p.team === 't');
  const allReady = players.filter(p => !p.isBot).every(p => p.ready);

  // WebSocket setup
  useEffect(() => {
    const ws = setupWebSocket()
    wsRef.current = ws
    ws.connect().catch(() => {})
    ws.emit('room:join', { roomId })
    
    const offRoomUpdated = ws.on('room:updated', (data: any) => {
      const room = Array.isArray(data) ? null : data
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
            avatar: '👤'
          }))
          setPlayers(mapped)
        }
      }
    })
    
    const offChat = ws.on('chat:message', (msg: any) => {
      const m = msg as { sender:string; team:'all'|'ct'|'t'|'dead'; text:string }
      setChatMessages(prev => [...prev, { 
        id: String(Date.now()), 
        playerId: 'remote', 
        playerName: m.sender, 
        message: m.text, 
        timestamp: new Date(), 
        team: m.team 
      }].slice(-100))
    })
    
    return () => { 
      offRoomUpdated(); 
      offChat(); 
      ws.emit('room:leave', { roomId }) 
    }
  }, [roomId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex flex-col relative">
      {/* Mobile Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl relative z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg font-black bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent truncate">
                {roomSettings.name}
              </h1>
              <p className="text-white/70 text-sm">
                {roomSettings.mode} • {players.length}/{roomSettings.maxPlayers}
              </p>
            </div>
            
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-3 rounded-lg transition-all ${
                isTouch ? 'min-h-[48px] min-w-[48px]' : 'p-2'
              } ${
                sidebarOpen 
                  ? 'bg-white/20 border-white/30' 
                  : 'bg-white/10 border-white/20'
              } border backdrop-blur-md text-white`}
            >
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Teams Grid - Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Counter-Terrorists */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    CT
                  </span>
                  <span>Counter-Terrorists</span>
                </h2>
                <span className="text-white/60 text-sm">{ctPlayers.length}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ctPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-lg">{player.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-white font-medium text-sm truncate">{player.name}</span>
                          {player.isBot && (
                            <span className={`text-xs px-1 py-0.5 rounded ${difficultyColors[player.botDifficulty || 'normal']}`}>
                              {player.botDifficulty?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">
                          {player.kills}/{player.deaths} • {player.ping}ms
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {player.ready && (
                        <span className="text-green-400 text-xs">✅</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 5 - ctPlayers.length) }).map((_, i) => (
                  <div key={`ct-empty-${i}`} className="p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 border-dashed">
                    <div className="text-white/30 text-center text-sm">Empty</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terrorists */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    T
                  </span>
                  <span>Terrorists</span>
                </h2>
                <span className="text-white/60 text-sm">{tPlayers.length}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-lg">{player.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-white font-medium text-sm truncate">{player.name}</span>
                          {player.isBot && (
                            <span className={`text-xs px-1 py-0.5 rounded ${difficultyColors[player.botDifficulty || 'normal']}`}>
                              {player.botDifficulty?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">
                          {player.kills}/{player.deaths} • {player.ping}ms
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {player.ready && (
                        <span className="text-green-400 text-xs">✅</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 5 - tPlayers.length) }).map((_, i) => (
                  <div key={`t-empty-${i}`} className="p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 border-dashed">
                    <div className="text-white/30 text-center text-sm">Empty</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Sidebar */}
        <div className={`fixed inset-y-0 right-0 z-40 w-80 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } backdrop-blur-xl bg-white/5 border-l border-white/20`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex space-x-2">
                {(['chat', 'settings', 'bots'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-white/20 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {tab === 'chat' && '💬'}
                    {tab === 'settings' && '⚙️'}
                    {tab === 'bots' && '🤖'}
                    {' '}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <div className="h-64 overflow-y-auto space-y-2">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className="p-2 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-xs">{msg.playerName}</span>
                          <span className="text-white/40 text-xs">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-white/80 text-sm">{msg.message}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 text-sm"
                      placeholder="Type a message..."
                    />
                    <button 
                      onClick={sendMessage}
                      className={`px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all ${
                        isTouch ? 'min-h-[44px] min-w-[44px]' : ''
                      }`}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Room Settings</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Map</span>
                      <span className="text-white font-medium">{roomSettings.map}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Mode</span>
                      <span className="text-white font-medium">{roomSettings.mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Round Time</span>
                      <span className="text-white font-medium">{roomSettings.roundTime}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Max Rounds</span>
                      <span className="text-white font-medium">{roomSettings.maxRounds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Friendly Fire</span>
                      <span className="text-white font-medium">{roomSettings.friendlyFire ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'bots' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Bot Manager</h3>
                  <div className="space-y-2">
                    {players.filter(p => p.isBot).map(bot => (
                      <div key={bot.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🤖</span>
                          <div>
                            <div className="text-white font-medium text-sm">{bot.name}</div>
                            <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${difficultyColors[bot.botDifficulty || 'normal']}`}>
                              {bot.botDifficulty?.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="backdrop-blur-xl bg-white/5 border-t border-white/10 p-4">
        <div className="flex items-center justify-between space-x-3">
          <button 
            onClick={toggleReady}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              isTouch ? 'min-h-[48px]' : 'py-2'
            } ${
              players.find(p => p.id === '1')?.ready
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
            }`}
          >
            {players.find(p => p.id === '1')?.ready ? '✅ Ready' : '⏸️ Not Ready'}
          </button>
          
          {isHost && (
            <button 
              onClick={startGame}
              disabled={!allReady || players.filter(p => !p.isBot).length < 1}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                isTouch ? 'min-h-[48px]' : 'py-2'
              } ${
                allReady && players.filter(p => !p.isBot).length >= 1
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              ▶️ Start Game
            </button>
          )}
          
          <button 
            onClick={() => window.location.href = '/lobby'}
            className={`px-4 py-3 backdrop-blur-md bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-600/30 transition-all ${
              isTouch ? 'min-h-[48px] min-w-[48px]' : 'py-2'
            }`}
          >
            🚪
          </button>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-6xl font-black text-white mb-4 animate-pulse">
              {countdown}
            </div>
            <div className="text-xl text-white/80">Game Starting...</div>
          </div>
        </div>
      )}
    </div>
  );
};