import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

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

export const EnhancedWaitingRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useI18n();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player1', team: 'ct', ready: true, isBot: false, kills: 0, deaths: 0, ping: 45, avatar: '👤' },
    { id: 'bot1', name: '[BOT] Alpha', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot2', name: '[BOT] Bravo', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: '2', name: 'Player2', team: 't', ready: false, isBot: false, kills: 0, deaths: 0, ping: 67, avatar: '👤' },
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
  const [selectedTeam, setSelectedTeam] = useState<'ct' | 't' | 'spectator'>('ct');
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [showMapVote, setShowMapVote] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(true); // For demo purposes

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20 border-green-500/30',
    normal: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    hard: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    expert: 'text-red-400 bg-red-500/20 border-red-500/30'
  };

  const teamColors = {
    ct: 'from-blue-500 to-cyan-500',
    t: 'from-orange-500 to-red-500',
    spectator: 'from-gray-500 to-gray-600'
  };

  const addBot = (difficulty: 'easy' | 'normal' | 'hard' | 'expert') => {
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

    setPlayers([...players, newBot]);
  };

  const removeBot = (botId: string) => {
    setPlayers(players.filter(p => p.id !== botId));
  };

  const kickPlayer = (playerId: string) => {
    if (isHost) {
      setPlayers(players.filter(p => p.id !== playerId));
    }
  };

  const changeTeam = (playerId: string, newTeam: 'ct' | 't' | 'spectator') => {
    setPlayers(players.map(p => 
      p.id === playerId ? { ...p, team: newTeam } : p
    ));
  };

  const toggleReady = () => {
    // Toggle ready status for current player
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
            // Start game
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
      setChatInput('');
    }
  };

  const ctPlayers = players.filter(p => p.team === 'ct');
  const tPlayers = players.filter(p => p.team === 't');
  const spectators = players.filter(p => p.team === 'spectator');
  const allReady = players.filter(p => !p.isBot).every(p => p.ready);

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
                {roomSettings.name}
              </h1>
              <p className="text-white/70">
                {roomSettings.mode} • {roomSettings.map} • {players.length}/{roomSettings.maxPlayers} players
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
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
                    disabled={!allReady || players.length < 2}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${
                      allReady && players.length >= 2
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

      {/* Bot Manager Panel */}
      {showBotPanel && isHost && (
        <div className="fixed top-20 right-4 z-50 w-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">🤖 Bot Manager</h3>
            <button 
              onClick={() => setShowBotPanel(false)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">Add Bots by Difficulty</h4>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => addBot('easy')}
                  className="px-3 py-2 bg-green-600/30 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-600/40 transition-all"
                >
                  + Easy Bot
                </button>
                <button 
                  onClick={() => addBot('normal')}
                  className="px-3 py-2 bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-yellow-400 hover:bg-yellow-600/40 transition-all"
                >
                  + Normal Bot
                </button>
                <button 
                  onClick={() => addBot('hard')}
                  className="px-3 py-2 bg-orange-600/30 border border-orange-500/50 rounded-lg text-orange-400 hover:bg-orange-600/40 transition-all"
                >
                  + Hard Bot
                </button>
                <button 
                  onClick={() => addBot('expert')}
                  className="px-3 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-600/40 transition-all"
                >
                  + Expert Bot
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-2">Current Bots</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {players.filter(p => p.isBot).map(bot => (
                  <div key={bot.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">🤖</span>
                      <div>
                        <div className="text-white font-medium">{bot.name}</div>
                        <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${difficultyColors[bot.botDifficulty || 'normal']}`}>
                          {bot.botDifficulty?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeBot(bot.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-white">
                <input 
                  type="checkbox"
                  checked={roomSettings.botConfig.fillEmpty}
                  onChange={(e) => setRoomSettings({
                    ...roomSettings,
                    botConfig: {...roomSettings.botConfig, fillEmpty: e.target.checked}
                  })}
                  className="rounded"
                />
                <span>Auto-fill empty slots</span>
              </label>
              
              <label className="flex items-center space-x-2 text-white">
                <input 
                  type="checkbox"
                  checked={roomSettings.botConfig.teamBalance}
                  onChange={(e) => setRoomSettings({
                    ...roomSettings,
                    botConfig: {...roomSettings.botConfig, teamBalance: e.target.checked}
                  })}
                  className="rounded"
                />
                <span>Auto team balance</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Teams Section */}
          <div className="col-span-2 space-y-6">
            {/* Counter-Terrorists */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    CT
                  </span>
                  <span>Counter-Terrorists</span>
                </h2>
                <span className="text-white/60">{ctPlayers.length} players</span>
              </div>
              
              <div className="space-y-3">
                {ctPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{player.name}</span>
                          {player.isBot && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[player.botDifficulty || 'normal']}`}>
                              {player.botDifficulty?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span>K/D: {player.kills}/{player.deaths}</span>
                          <span>Ping: {player.ping}ms</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {player.ready && (
                        <span className="text-green-400 text-sm">✅ Ready</span>
                      )}
                      {isHost && player.id !== '1' && (
                        <button 
                          onClick={() => kickPlayer(player.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 8 - ctPlayers.length) }).map((_, i) => (
                  <div key={`ct-empty-${i}`} className="p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 border-dashed">
                    <div className="text-white/30 text-center">Empty Slot</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terrorists */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    T
                  </span>
                  <span>Terrorists</span>
                </h2>
                <span className="text-white/60">{tPlayers.length} players</span>
              </div>
              
              <div className="space-y-3">
                {tPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{player.name}</span>
                          {player.isBot && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[player.botDifficulty || 'normal']}`}>
                              {player.botDifficulty?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span>K/D: {player.kills}/{player.deaths}</span>
                          <span>Ping: {player.ping}ms</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {player.ready && (
                        <span className="text-green-400 text-sm">✅ Ready</span>
                      )}
                      {isHost && player.id !== '1' && (
                        <button 
                          onClick={() => kickPlayer(player.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 8 - tPlayers.length) }).map((_, i) => (
                  <div key={`t-empty-${i}`} className="p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 border-dashed">
                    <div className="text-white/30 text-center">Empty Slot</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Room Settings */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">⚙️ Room Settings</h3>
              
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
                <div className="flex justify-between">
                  <span className="text-white/60">Bots</span>
                  <span className="text-white font-medium">
                    {players.filter(p => p.isBot).length} ({roomSettings.botConfig.difficulty})
                  </span>
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">💬 Chat</h3>
              
              <div className="h-64 overflow-y-auto mb-4 space-y-2">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="p-2 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">{msg.playerName}</span>
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
                  className="flex-1 px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="Type a message..."
                />
                <button 
                  onClick={sendMessage}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                >
                  Send
                </button>
              </div>
            </div>
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