import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { useAudioControls } from '../hooks/useAudioControls';
import {
  GamingButton,
  GamingCard,
  StatusIndicator,
  ProgressBar,
  LoadingSkeleton,
  Notification,
  GamingInput,
  GamingSelect,
  Badge,
  Avatar
} from './ui/GamingComponents';
import '../styles/gaming-theme.css';

// Gaming UI Components
const ParticleSystem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const createParticle = () => {
      if (!containerRef.current) return;
      
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.setProperty('--random-x', (Math.random() - 0.5) * 200 + 'px');
      particle.style.setProperty('--random-y', (Math.random() - 0.5) * 200 + 'px');
      
      containerRef.current.appendChild(particle);
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 8000);
    };

    const interval = setInterval(createParticle, 200);
    return () => clearInterval(interval);
  }, []);

  return <div ref={containerRef} className="particles-container" />;
};

const MatrixRain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    const createMatrixChar = () => {
      if (!containerRef.current) return;
      
      const char = document.createElement('div');
      char.className = 'matrix-char';
      char.textContent = chars[Math.floor(Math.random() * chars.length)];
      char.style.left = Math.random() * 100 + '%';
      char.style.animationDuration = (2 + Math.random() * 4) + 's';
      char.style.opacity = (0.3 + Math.random() * 0.4).toString();
      
      containerRef.current.appendChild(char);
      
      setTimeout(() => {
        if (char.parentNode) {
          char.parentNode.removeChild(char);
        }
      }, 6000);
    };

    const interval = setInterval(createMatrixChar, 100);
    return () => clearInterval(interval);
  }, []);

  return <div ref={containerRef} className="matrix-container" />;
};

const LoadingSkeleton: React.FC<{ width?: string; height?: string; className?: string }> = ({ 
  width = '100%', 
  height = '20px', 
  className = '' 
}) => (
  <div 
    className={`skeleton ${className}`} 
    style={{ width, height }}
  />
);

// Notification System
const useNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    icon?: string;
  }>>([]);

  const addNotification = (notification: Omit<typeof notifications[0], 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, addNotification, removeNotification };
};


const RoomCard: React.FC<{
  room: any;
  onJoin: (roomId: string) => void;
  isJoining: boolean;
}> = ({ room, onJoin, isJoining }) => (
  <GamingCard hover glow scanLine>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">🎮</span>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">{room.name}</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" size="sm">{room.mode}</Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {room.hasPassword && <Badge variant="warning" size="sm">🔒</Badge>}
        <StatusIndicator 
          status={
            room.status === 'waiting' ? 'online' : 
            room.status === 'playing' ? 'away' : 'offline'
          } 
        />
      </div>
    </div>
    
    <div className="flex items-center justify-between text-sm text-white/70 mb-4">
      <span>Map: <span className="text-blue-400">{room.map}</span></span>
      <span>Ping: <span className="text-green-400">{room.ping}ms</span></span>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-white/70">Players:</span>
        <Badge variant="primary" size="sm">{room.players}/{room.maxPlayers}</Badge>
        {room.bots > 0 && <Badge variant="success" size="sm">+{room.bots} bots</Badge>}
      </div>
      
      <GamingButton 
        size="sm" 
        onClick={() => onJoin(room.id)}
        disabled={room.players >= room.maxPlayers}
        loading={isJoining}
        variant={room.players >= room.maxPlayers ? 'secondary' : 'primary'}
      >
        {room.players >= room.maxPlayers ? 'Full' : 'Join'}
      </GamingButton>
    </div>
  </GamingCard>
);

const PlayerProfile: React.FC = () => (
  <GamingCard>
    <div className="flex items-center space-x-4 mb-6">
      <Avatar size="lg" status="online">
        <span className="text-white font-bold text-xl">👤</span>
      </Avatar>
      <div>
        <h2 className="hologram-text text-xl font-bold font-gaming">Player</h2>
        <div className="flex items-center space-x-2 mb-1">
          <Badge variant="primary" size="sm">Level 42</Badge>
          <Badge variant="warning" size="sm">Global Elite</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-yellow-400">★</span>
          <span className="text-white/70 text-sm">2,847 Rating</span>
        </div>
      </div>
    </div>
    
    <div className="space-y-4">
      <ProgressBar 
        value={2847} 
        max={3000} 
        label="Rating" 
        color="var(--neon-blue)" 
        showPercentage
        animated
      />
      <ProgressBar 
        value={156} 
        max={200} 
        label="Wins" 
        color="var(--neon-green)" 
        showPercentage
        animated
      />
      <ProgressBar 
        value={89} 
        max={100} 
        label="Accuracy %" 
        color="var(--neon-orange)" 
        showPercentage
        animated
      />
    </div>
    
    <div className="mt-6 pt-6 border-t border-white/10">
      <h3 className="text-white font-semibold mb-3">Recent Achievements</h3>
      <div className="flex items-center space-x-2">
        <Badge variant="success" className="flex items-center space-x-1">
          <span>🏆</span>
          <span>Headshot Master</span>
        </Badge>
      </div>
    </div>
  </GamingCard>
);

export const ModernGamingLobby: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { wsRef, isConnected, rooms, createRoom } = useWebSocketConnection();
  const { audioEnabled, setAudioEnabled, playUISound } = useAudioControls();
  const { notifications, addNotification, removeNotification } = useNotifications();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'quick' | 'browser' | 'friends'>('quick');

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const navigateToRoom = (roomId: string) => {
    setIsJoiningRoom(roomId);
    playUISound?.('success');
    addNotification({
      type: 'info',
      title: 'Joining Room',
      message: 'Connecting to game server...',
      icon: '🎮'
    });
    setTimeout(() => {
      navigate(`/game/${roomId}`);
    }, 500);
  };

  const quickJoinWithBots = () => {
    playUISound?.('click');
    addNotification({
      type: 'success',
      title: 'Bot Match Started',
      message: 'Preparing your bot opponents...',
      icon: '🤖'
    });
    navigate('/game/bot-match');
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterMode === 'all' || room.mode === filterMode)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="glass-panel p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
            <div>
              <h2 className="hologram-text text-2xl font-bold font-gaming">Loading CS2D</h2>
              <p className="text-white/60">Initializing game systems...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Advanced Background Effects */}
      <div className="absolute inset-0">
        <div className="cyber-grid absolute inset-0 opacity-10" />
        <ParticleSystem />
        <MatrixRain />
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Premium Header */}
      <header className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Enhanced Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg neon-button">
                <span className="text-white font-black text-2xl font-gaming">CS</span>
              </div>
              <div>
                <h1 className="hologram-text text-4xl font-black font-gaming">CS2D ELITE</h1>
                <p className="text-white/70 font-body">Next-Generation Combat Experience</p>
              </div>
            </div>

            {/* Premium Navigation */}
            <nav className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                isConnected ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'status-online' : 'status-offline'
                }`} />
                <span className={`text-sm font-medium ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <GamingButton variant="secondary" size="sm">
                🏆 Leaderboard
              </GamingButton>
              
              <GamingButton variant="secondary" size="sm">
                📊 Stats
              </GamingButton>
              
              <LanguageSwitcher />
              
              <button 
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center glass-button ${
                  audioEnabled ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {audioEnabled ? '🔊' : '🔇'}
              </button>
              
              <GamingButton size="sm">
                👤 Profile
              </GamingButton>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Player Profile & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <PlayerProfile />
            
            {/* Quick Actions */}
            <GamingCard>
              <h3 className="text-white font-bold text-lg mb-4 font-gaming flex items-center">
                <span className="mr-2">⚡</span>
                Quick Play
              </h3>
              <div className="space-y-3">
                <GamingButton 
                  variant="primary" 
                  size="md" 
                  fullWidth
                  onClick={quickJoinWithBots}
                  icon="⚡"
                >
                  Instant Bot Match
                </GamingButton>
                <GamingButton 
                  variant="success" 
                  size="md" 
                  fullWidth
                  onClick={() => setShowCreateModal(true)}
                  icon="➕"
                >
                  Create Room
                </GamingButton>
                <GamingButton 
                  variant="secondary" 
                  size="md" 
                  fullWidth
                  icon="🎯"
                  onClick={() => {
                    addNotification({
                      type: 'info',
                      title: 'Coming Soon',
                      message: 'Aim training mode is in development',
                      icon: '🎯'
                    });
                  }}
                >
                  Aim Training
                </GamingButton>
              </div>
            </GamingCard>

            {/* Game Modes */}
            <GamingCard>
              <h3 className="text-white font-bold text-lg mb-4 font-gaming flex items-center">
                <span className="mr-2">🎮</span>
                Game Modes
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'Deathmatch', icon: '💀', rooms: 23 },
                  { name: 'Team DM', icon: '👥', rooms: 15 },
                  { name: 'Bomb Defusal', icon: '💣', rooms: 8 },
                  { name: 'Hostage Rescue', icon: '🚨', rooms: 5 }
                ].map((mode) => (
                  <button 
                    key={mode.name}
                    className="w-full p-3 text-left glass-button rounded-lg text-white hover:text-blue-400 transition-colors hover:scale-102 gpu-accelerated"
                    onClick={() => {
                      setFilterMode(mode.name.toLowerCase().replace(' ', ''));
                      setSelectedTab('browser');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>{mode.icon}</span>
                        <span>{mode.name}</span>
                      </div>
                      <Badge variant="secondary" size="sm">{mode.rooms} rooms</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </GamingCard>
          </div>

          {/* Center Column - Room Browser */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="glass-panel p-2 mb-6">
              <div className="flex space-x-2">
                {[
                  { id: 'quick', label: '⚡ Quick Play', icon: '🎮' },
                  { id: 'browser', label: '🌐 Server Browser', icon: '🖥️' },
                  { id: 'friends', label: '👥 Friends', icon: '💬' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex-1 p-4 rounded-lg font-semibold transition-all ${
                      selectedTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedTab === 'browser' && (
              <>
                {/* Search and Filters */}
                <GamingCard className="mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <GamingInput
                        type="text"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon="🔍"
                      />
                    </div>
                    
                    <GamingSelect
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Modes' },
                        { value: 'deathmatch', label: 'Deathmatch' },
                        { value: 'teamDeathmatch', label: 'Team DM' },
                        { value: 'bombDefusal', label: 'Bomb Defusal' }
                      ]}
                    />
                    
                    <GamingButton 
                      variant="secondary" 
                      icon="🔄"
                      onClick={() => {
                        addNotification({
                          type: 'info',
                          title: 'Refreshing',
                          message: 'Updating room list...',
                          icon: '🔄'
                        });
                      }}
                    >
                      Refresh
                    </GamingButton>
                  </div>
                </GamingCard>

                {/* Room Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredRooms.length > 0 ? (
                    filteredRooms.map((room) => (
                      <RoomCard
                        key={room.id}
                        room={room}
                        onJoin={navigateToRoom}
                        isJoining={isJoiningRoom === room.id}
                      />
                    ))
                  ) : (
                    <div className="col-span-2">
                      <GamingCard className="p-12 text-center">
                        <div className="text-white/50 mb-4">
                          <span className="text-6xl">🎮</span>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">No Rooms Found</h3>
                        <p className="text-white/60 mb-6">Try adjusting your search or create a new room</p>
                        <GamingButton 
                          onClick={() => setShowCreateModal(true)}
                          icon="➕"
                        >
                          Create Room
                        </GamingButton>
                      </GamingCard>
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'quick' && (
              <GamingCard className="p-8">
                <div className="text-center">
                  <div className="text-8xl mb-6 animate-bounce">⚡</div>
                  <h2 className="hologram-text text-3xl font-bold font-gaming mb-4">Instant Action</h2>
                  <p className="text-white/70 text-lg mb-8">Jump straight into the action with AI opponents</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
                    <GamingButton 
                      variant="primary" 
                      size="lg" 
                      className="h-20"
                      onClick={quickJoinWithBots}
                    >
                      <div>
                        <div className="font-bold">🤖 Bot Match</div>
                        <div className="text-sm opacity-80">Practice with AI</div>
                      </div>
                    </GamingButton>
                    
                    <GamingButton 
                      variant="success" 
                      size="lg" 
                      className="h-20"
                      onClick={() => {
                        addNotification({
                          type: 'info',
                          title: 'Training Mode',
                          message: 'Feature coming soon!',
                          icon: '🎯'
                        });
                      }}
                    >
                      <div>
                        <div className="font-bold">🎯 Training</div>
                        <div className="text-sm opacity-80">Improve skills</div>
                      </div>
                    </GamingButton>
                  </div>

                  {/* Stats Preview */}
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">121</div>
                      <div className="text-sm text-white/60">FPS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">24ms</div>
                      <div className="text-sm text-white/60">Latency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">847</div>
                      <div className="text-sm text-white/60">Players Online</div>
                    </div>
                  </div>
                </div>
              </GamingCard>
            )}

            {selectedTab === 'friends' && (
              <GamingCard className="p-8">
                <div className="text-center">
                  <div className="text-8xl mb-6">👥</div>
                  <h2 className="hologram-text text-3xl font-bold font-gaming mb-4">Friends System</h2>
                  <p className="text-white/70 text-lg mb-8">Connect with other players (Coming Soon)</p>
                  
                  <div className="space-y-4 max-w-md mx-auto">
                    {[
                      { name: 'Friend Invites', desc: 'Send and receive invitations' },
                      { name: 'Party System', desc: 'Team up with friends' },
                      { name: 'Voice Chat', desc: 'In-game communication' }
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 glass-button rounded-lg">
                        <LoadingSkeleton width="40px" height="40px" variant="circular" />
                        <div className="flex-1 text-left">
                          <LoadingSkeleton width="80%" height="16px" className="mb-2" />
                          <LoadingSkeleton width="60%" height="12px" />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8">
                    <Badge variant="warning" className="animate-pulse">
                      Coming in v2.1.0
                    </Badge>
                  </div>
                </div>
              </GamingCard>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <GamingCard className="w-full max-w-2xl mx-4 gpu-accelerated" style={{ animation: 'scale-in 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="hologram-text text-3xl font-bold font-gaming">Create Room</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 glass-button rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <GamingInput
                label="Room Name"
                placeholder="Enter room name..."
                icon="🏠"
              />
              
              <GamingSelect
                label="Game Mode"
                options={[
                  { value: 'deathmatch', label: '💀 Deathmatch' },
                  { value: 'teamDeathmatch', label: '👥 Team Deathmatch' },
                  { value: 'bombDefusal', label: '💣 Bomb Defusal' }
                ]}
              />
              
              <GamingSelect
                label="Map"
                options={[
                  { value: 'de_dust2', label: '🏜️ Dust 2' },
                  { value: 'de_inferno', label: '🔥 Inferno' },
                  { value: 'de_mirage', label: '🌆 Mirage' }
                ]}
              />
              
              <GamingInput
                type="number"
                label="Max Players"
                defaultValue="10"
                icon="👥"
              />
            </div>

            {/* Bot Configuration Preview */}
            <GamingCard className="mb-6 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center">
                  <span className="mr-2">🤖</span>
                  Bot Configuration
                </h3>
                <Badge variant="success" size="sm">Optional</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GamingSelect
                  label="Bot Count"
                  options={[
                    { value: '0', label: 'No Bots' },
                    { value: '4', label: '4 Bots' },
                    { value: '8', label: '8 Bots' }
                  ]}
                />
                <GamingSelect
                  label="Difficulty"
                  options={[
                    { value: 'easy', label: '🟢 Easy' },
                    { value: 'normal', label: '🟡 Normal' },
                    { value: 'hard', label: '🔴 Hard' }
                  ]}
                />
              </div>
            </GamingCard>
            
            <div className="flex justify-end space-x-4">
              <GamingButton 
                variant="secondary" 
                onClick={() => setShowCreateModal(false)}
                icon="❌"
              >
                Cancel
              </GamingButton>
              <GamingButton 
                variant="primary"
                onClick={() => {
                  setShowCreateModal(false);
                  addNotification({
                    type: 'success',
                    title: 'Room Created!',
                    message: 'Your game room is ready',
                    icon: '🎮'
                  });
                }}
                icon="🚀"
              >
                Create Room
              </GamingButton>
            </div>
          </GamingCard>
        </div>
      )}

      {/* Notification System */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            icon={notification.icon}
            onClose={() => removeNotification(notification.id)}
            autoClose
            duration={4000}
          />
        ))}
      </div>
    </div>
  );
};