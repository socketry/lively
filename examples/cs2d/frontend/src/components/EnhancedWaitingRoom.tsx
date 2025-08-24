import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupWebSocket } from '@/services/websocket';
import { TeamSectionSkeleton, ChatSkeleton, RoomSettingsSkeleton } from './common/SkeletonLoader';
import { ConnectionStatus } from './common/ConnectionStatus';
import { useGameNotifications } from './common/NotificationContainer';
import { useBotManagementState, useConnectionState } from '@/hooks/useLoadingState';
import LoadingOverlay from './common/LoadingOverlay';
import {
  ARIA_LABELS,
  KEYBOARD_KEYS,
  isActionKey,
  handleEscapeKey,
  createButtonProps,
  createListProps,
  createListItemProps,
  focusUtils,
  announceToScreenReader
} from '@/utils/accessibility';

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
  const navigate = useNavigate();
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null)
  const { notifyPlayerReady, notifyBotAction, notifyConnectionStatus } = useGameNotifications();
  const botManagementState = useBotManagementState();
  const connectionState = useConnectionState();
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player1', team: 'ct', ready: false, isBot: false, kills: 0, deaths: 0, ping: 45, avatar: '👤' },
    { id: 'bot1', name: '[BOT] Alpha', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot2', name: '[BOT] Charlie', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot3', name: '[BOT] Delta', team: 'ct', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot4', name: '[BOT] Echo', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot5', name: '[BOT] Foxtrot', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
    { id: 'bot6', name: '[BOT] Bravo', team: 't', ready: true, isBot: true, botDifficulty: 'normal', kills: 0, deaths: 0, ping: 1, avatar: '🤖' },
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
  const [chatMode, setChatMode] = useState<'all'|'team'|'dead'>('all')
  // Selected team management not used in current UI; can be added later
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [showMapVote, setShowMapVote] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHost] = useState(true); // For demo purposes

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20 border-green-500/30',
    normal: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    hard: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    expert: 'text-red-400 bg-red-500/20 border-red-500/30'
  };

  // Team gradient colors (unused)

  const addBot = async (difficulty: 'easy' | 'normal' | 'hard' | 'expert') => {
    await botManagementState.execute(
      async () => {
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

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setPlayers(prev => [...prev, newBot]);
        notifyBotAction('added', newBot.name, difficulty);
        
        return newBot;
      },
      {
        loadingMessage: 'Adding bot...',
        successMessage: `Bot added successfully!`,
        errorMessage: 'Failed to add bot'
      }
    );
  };

  const removeBot = async (botId: string) => {
    const bot = players.find(p => p.id === botId);
    if (!bot) return;
    
    await botManagementState.execute(
      async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setPlayers(prev => prev.filter(p => p.id !== botId));
        notifyBotAction('removed', bot.name);
        
        return botId;
      },
      {
        loadingMessage: 'Removing bot...',
        errorMessage: 'Failed to remove bot'
      }
    );
  };

  const kickPlayer = (playerId: string) => {
    if (isHost) {
      setPlayers(players.filter(p => p.id !== playerId));
    }
  };

  // Team switching UI not active in current demo

  const toggleReady = async () => {
    const currentPlayer = players.find(p => p.id === '1');
    if (!currentPlayer) return;
    
    const newReadyState = !currentPlayer.ready;
    
    // Optimistically update UI
    setPlayers(prev => prev.map(p => 
      p.id === '1' ? { ...p, ready: newReadyState } : p
    ));
    
    // Notify about the change
    notifyPlayerReady(currentPlayer.name, newReadyState);
    
    // Simulate server sync in background
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (wsRef.current?.isConnected) {
        wsRef.current.emit('player:ready', { roomId, playerId: '1', ready: newReadyState });
      }
    } catch (error) {
      // Revert on error
      setPlayers(prev => prev.map(p => 
        p.id === '1' ? { ...p, ready: !newReadyState } : p
      ));
    }
  };

  const startGame = () => {
    if (isHost) {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // Navigate to game using React Router
            navigate('/game');
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
        team: chatMode
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
  // Spectator list is not displayed in current layout
  const allReady = players.filter(p => !p.isBot).every(p => p.ready);
  const humanPlayers = players.filter(p => !p.isBot);
  const readyHumanPlayers = humanPlayers.filter(p => p.ready);
  
  // Debug info for development
  useEffect(() => {
    console.log('🎮 Room Status:', {
      isHost,
      allReady,
      humanPlayers: humanPlayers.length,
      readyHumanPlayers: readyHumanPlayers.length,
      totalPlayers: players.length,
      canStartGame: isHost && allReady && humanPlayers.length >= 1
    });
  }, [isHost, allReady, humanPlayers.length, readyHumanPlayers.length, players.length]);

  // Initial loading effect
  useEffect(() => {
    const initializeRoom = async () => {
      setIsInitialLoading(true);
      
      try {
        // Simulate initial data loading
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsInitialLoading(false);
      } catch (error) {
        setIsInitialLoading(false);
      }
    };
    
    initializeRoom();
  }, []);

  // WebSocket wiring for room events
  useEffect(() => {
    const connectToRoom = async () => {
      await connectionState.execute(
        async () => {
          const ws = setupWebSocket();
          wsRef.current = ws;
          
          await ws.connect();
          ws.emit('room:join', { roomId });
          
          const offRoomUpdated = ws.on('room:updated', (data: any) => {
            setIsDataLoading(true);
            
            // If payload has players for this room, update
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
                  avatar: '👤'
                }));
                setPlayers(mapped);
              }
            }
            
            setTimeout(() => setIsDataLoading(false), 300);
          });
          
          const offChat = ws.on('chat:message', (msg: any) => {
            const m = msg as { sender:string; team:'all'|'ct'|'t'|'dead'; text:string };
            setChatMessages(prev => [...prev, { 
              id: String(Date.now()), 
              playerId: 'remote', 
              playerName: m.sender, 
              message: m.text, 
              timestamp: new Date(), 
              team: m.team 
            }].slice(-100));
          });
          
          // Store cleanup functions
          return { ws, cleanup: () => { offRoomUpdated(); offChat(); ws.emit('room:leave', { roomId }); } };
        },
        {
          loadingMessage: 'Connecting to room...',
          successMessage: 'Connected to room successfully!',
          errorMessage: 'Failed to connect to room'
        }
      );
    };
    
    connectToRoom();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.emit('room:leave', { roomId });
      }
    };
  }, [roomId, connectionState]);

  // Focus trap for modals
  const trapFocus = (event: React.KeyboardEvent) => {
    if (showBotPanel) {
      const modalRef = document.querySelector('.bot-manager-modal') as HTMLElement;
      focusUtils.trapFocus(event, modalRef);
    }
  };

  // Handle global keyboard shortcuts
  const handleGlobalKeyDown = (event: React.KeyboardEvent) => {
    // Escape key closes modals
    if (event.key === KEYBOARD_KEYS.ESCAPE) {
      if (showBotPanel) {
        setShowBotPanel(false);
        announceToScreenReader('Bot manager closed');
      }
      if (showMapVote) {
        setShowMapVote(false);
        announceToScreenReader('Map vote panel closed');
      }
    }
    
    // Focus management for modals
    trapFocus(event);
  };

  // Focus management for bot panel
  useEffect(() => {
    if (showBotPanel) {
      const modalElement = document.querySelector('.bot-manager-modal') as HTMLElement;
      if (modalElement) {
        // Focus first focusable element in modal
        setTimeout(() => focusUtils.focusFirst(modalElement), 100);
      }
      announceToScreenReader('Bot manager opened', 'assertive');
    }
  }, [showBotPanel]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden relative"
      onKeyDown={handleGlobalKeyDown}
      role="application"
      aria-label="CS2D Waiting Room"
    >
      {/* Skip navigation link */}
      <a 
        href="#main-content" 
        className="skip-nav sr-only focus:not-sr-only"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>
      
      {/* Live region for screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="live-region"
        id="announcements"
      ></div>
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header 
        className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl"
        role="banner"
        aria-label={ARIA_LABELS.roomHeader}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className="text-3xl font-black bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent"
                id="room-title"
              >
                {roomSettings.name}
              </h1>
              <p 
                className="text-white/70"
                aria-label={`Game mode: ${roomSettings.mode}, Map: ${roomSettings.map}, Players: ${players.length} of ${roomSettings.maxPlayers}`}
              >
                {roomSettings.mode} • {roomSettings.map} • {players.length}/{roomSettings.maxPlayers} players
              </p>
              
              {/* Status Debug Panel */}
              <div 
                className="mt-2 p-2 bg-black/30 rounded text-xs text-green-400 font-mono"
                aria-label={`Room status: Host ${isHost ? 'yes' : 'no'}, Ready players ${readyHumanPlayers.length} of ${humanPlayers.length}, Can start game ${(isHost && allReady && humanPlayers.length >= 1) ? 'yes' : 'no'}`}
                role="status"
              >
                🎮 Host: {isHost ? 'YES' : 'NO'} | Ready: {readyHumanPlayers.length}/{humanPlayers.length} | Can Start: {(isHost && allReady && humanPlayers.length >= 1) ? 'YES' : 'NO'}
              </div>
            </div>
            
            <nav 
              className="flex items-center space-x-4"
              role="navigation"
              aria-label="Room controls"
            >
              {isHost && (
                <>
                  <button 
                    {...createButtonProps(ARIA_LABELS.botManager, () => setShowBotPanel(!showBotPanel))}
                    className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all focus-visible"
                    aria-expanded={showBotPanel}
                    aria-controls="bot-manager-panel"
                  >
                    🤖 Bot Manager
                  </button>
                  <button 
                    {...createButtonProps('Change map vote', () => setShowMapVote(!showMapVote))}
                    className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all focus-visible"
                    aria-expanded={showMapVote}
                  >
                    🗺️ Change Map
                  </button>
                  <button 
                    {...createButtonProps(
                      `${ARIA_LABELS.startGame}. ${allReady ? 'All players ready' : `Waiting for ${humanPlayers.length - readyHumanPlayers.length} players`}`,
                      startGame,
                      !allReady || players.filter(p => !p.isBot).length < 1
                    )}
                    className={`px-6 py-2 rounded-lg font-bold transition-all focus-visible ${
                      allReady && players.filter(p => !p.isBot).length >= 1
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed disabled'
                    }`}
                    aria-describedby="start-game-status"
                  >
                    ▶️ Start Game {!allReady && players.filter(p => !p.isBot).length > 0 && '(Waiting for players)'}
                  </button>
                  <div id="start-game-status" className="sr-only">
                    Ready players: {players.filter(p => !p.isBot && p.ready).length} of {players.filter(p => !p.isBot).length}
                  </div>
                </>
              )}
              
              <button 
                {...createButtonProps(
                  `${ARIA_LABELS.readyToggle}. Currently ${players.find(p => p.id === '1')?.ready ? 'ready' : 'not ready'}`,
                  toggleReady
                )}
                className={`px-6 py-2 rounded-lg font-bold transition-all focus-visible ${
                  players.find(p => p.id === '1')?.ready
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white player-ready'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white player-not-ready'
                }`}
                aria-pressed={players.find(p => p.id === '1')?.ready}
              >
                {players.find(p => p.id === '1')?.ready ? '✅ Ready' : '⏸️ Not Ready'}
              </button>
              
              <button 
                {...createButtonProps(ARIA_LABELS.leaveRoom, () => window.location.href = '/lobby')}
                className="px-4 py-2 backdrop-blur-md bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-600/30 transition-all focus-visible"
              >
                🚪 Leave Room
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Bot Manager Modal */}
      {showBotPanel && isHost && (
        <>
          {/* Modal backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            aria-hidden="true"
            onClick={() => setShowBotPanel(false)}
          />
          
          {/* Bot Manager Panel */}
          <div 
            className="bot-manager-modal fixed top-20 right-4 z-50 w-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bot-manager-title"
            aria-describedby="bot-manager-description"
            id="bot-manager-panel"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 
                id="bot-manager-title"
                className="text-xl font-bold text-white"
              >
                🤖 Bot Manager
              </h3>
              <button 
                {...createButtonProps('Close bot manager', () => setShowBotPanel(false))}
                className="text-white/60 hover:text-white focus-visible modal-close"
                aria-label="Close bot manager"
              >
                ✕
              </button>
            </div>
            
            <div 
              id="bot-manager-description"
              className="sr-only"
            >
              Manage bots in the current game room. Add, remove, and configure bot difficulty.
            </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">Add Bots by Difficulty</h4>
              <div 
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label="Add bot buttons by difficulty level"
              >
                <button 
                  {...createButtonProps('Add easy difficulty bot to the game', () => {
                    addBot('easy');
                    announceToScreenReader('Easy bot added to game');
                  })}
                  className="px-3 py-2 bg-green-600/30 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-600/40 transition-all focus-visible"
                >
                  + Easy Bot
                </button>
                <button 
                  {...createButtonProps('Add normal difficulty bot to the game', () => {
                    addBot('normal');
                    announceToScreenReader('Normal bot added to game');
                  })}
                  className="px-3 py-2 bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-yellow-400 hover:bg-yellow-600/40 transition-all focus-visible"
                >
                  + Normal Bot
                </button>
                <button 
                  {...createButtonProps('Add hard difficulty bot to the game', () => {
                    addBot('hard');
                    announceToScreenReader('Hard bot added to game');
                  })}
                  className="px-3 py-2 bg-orange-600/30 border border-orange-500/50 rounded-lg text-orange-400 hover:bg-orange-600/40 transition-all focus-visible"
                >
                  + Hard Bot
                </button>
                <button 
                  {...createButtonProps('Add expert difficulty bot to the game', () => {
                    addBot('expert');
                    announceToScreenReader('Expert bot added to game');
                  })}
                  className="px-3 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-600/40 transition-all focus-visible"
                >
                  + Expert Bot
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-2">Current Bots ({players.filter(p => p.isBot).length})</h4>
              <div 
                className="space-y-2 max-h-48 overflow-y-auto"
                {...createListProps('Current bots in the game')}
              >
                {players.filter(p => p.isBot).length === 0 ? (
                  <div className="text-white/60 text-center py-4">
                    No bots in the game
                  </div>
                ) : (
                  players.filter(p => p.isBot).map((bot, index) => (
                    <div 
                      key={bot.id} 
                      className="flex items-center justify-between p-2 bg-white/5 rounded-lg focus-within:bg-white/10"
                      {...createListItemProps(index, players.filter(p => p.isBot).length)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl" aria-hidden="true">🤖</span>
                        <div>
                          <div className="text-white font-medium">{bot.name}</div>
                          <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${difficultyColors[bot.botDifficulty || 'normal']}`}>
                            {bot.botDifficulty?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <button 
                        {...createButtonProps(`Remove ${bot.name} from the game`, () => {
                          removeBot(bot.id);
                          announceToScreenReader(`${bot.name} removed from game`);
                        })}
                        className="text-red-400 hover:text-red-300 focus-visible p-1 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <fieldset className="space-y-2">
              <legend className="text-white font-semibold mb-2">Bot Settings</legend>
              <label className="flex items-center space-x-2 text-white cursor-pointer">
                <input 
                  type="checkbox"
                  checked={roomSettings.botConfig.fillEmpty}
                  onChange={(e) => {
                    setRoomSettings({
                      ...roomSettings,
                      botConfig: {...roomSettings.botConfig, fillEmpty: e.target.checked}
                    });
                    announceToScreenReader(`Auto-fill empty slots ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                  className="rounded focus-visible"
                  aria-describedby="fill-empty-desc"
                />
                <span>Auto-fill empty slots</span>
              </label>
              <div id="fill-empty-desc" className="text-xs text-white/60 ml-6">
                Automatically add bots to fill empty player slots
              </div>
              
              <label className="flex items-center space-x-2 text-white cursor-pointer">
                <input 
                  type="checkbox"
                  checked={roomSettings.botConfig.teamBalance}
                  onChange={(e) => {
                    setRoomSettings({
                      ...roomSettings,
                      botConfig: {...roomSettings.botConfig, teamBalance: e.target.checked}
                    });
                    announceToScreenReader(`Auto team balance ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                  className="rounded focus-visible"
                  aria-describedby="team-balance-desc"
                />
                <span>Auto team balance</span>
              </label>
              <div id="team-balance-desc" className="text-xs text-white/60 ml-6">
                Automatically balance bots between teams
              </div>
            </fieldset>
          </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main 
        id="main-content"
        className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8"
        role="main"
        aria-label="Waiting room content"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Teams Section */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Counter-Terrorists */}
            <section 
              className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl lg:rounded-2xl shadow-2xl p-4 lg:p-6"
              aria-labelledby="ct-team-heading"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 
                  id="ct-team-heading"
                  className="text-xl lg:text-2xl font-bold text-white flex items-center space-x-2"
                >
                  <span 
                    className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white text-xs lg:text-sm font-bold"
                    aria-hidden="true"
                  >
                    CT
                  </span>
                  <span>Counter-Terrorists</span>
                </h2>
                <span 
                  className="text-white/60 text-sm lg:text-base"
                  aria-label={`${ctPlayers.length} players on Counter-Terrorist team`}
                >
                  {ctPlayers.length} players
                </span>
              </div>
              
              <div 
                className="space-y-2 lg:space-y-3"
                {...createListProps('Counter-Terrorist team players')}
              >
                {ctPlayers.map((player, index) => (
                  <div 
                    key={player.id} 
                    className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 focus-within:bg-white/10 transition-all"
                    {...createListItemProps(index, ctPlayers.length)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl lg:text-2xl" aria-hidden="true">{player.avatar}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{player.name}</span>
                          {player.isBot && (
                            <span 
                              className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[player.botDifficulty || 'normal']}`}
                              aria-label={`Bot difficulty: ${player.botDifficulty}`}
                            >
                              {player.botDifficulty?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span aria-label={`Kills: ${player.kills}, Deaths: ${player.deaths}`}>
                            K/D: {player.kills}/{player.deaths}
                          </span>
                          <span aria-label={`Network ping: ${player.ping} milliseconds`}>
                            Ping: {player.ping}ms
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {player.ready ? (
                        <span 
                          className="text-green-400 text-sm player-ready"
                          aria-label={`${player.name} is ready`}
                        >
                          ✅ Ready
                        </span>
                      ) : (
                        <span 
                          className="text-yellow-400 text-sm player-not-ready"
                          aria-label={`${player.name} is not ready`}
                        >
                          ⏸️ Not Ready
                        </span>
                      )}
                      {isHost && player.id !== '1' && (
                        <button 
                          {...createButtonProps(`Kick ${player.name} from the game`, () => kickPlayer(player.id))}
                          className="text-red-400 hover:text-red-300 focus-visible p-1 rounded"
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
            </section>

            {/* Terrorists */}
            <section 
              className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl lg:rounded-2xl shadow-2xl p-4 lg:p-6"
              aria-labelledby="t-team-heading"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 
                  id="t-team-heading"
                  className="text-xl lg:text-2xl font-bold text-white flex items-center space-x-2"
                >
                  <span 
                    className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-xs lg:text-sm font-bold"
                    aria-hidden="true"
                  >
                    T
                  </span>
                  <span>Terrorists</span>
                </h2>
                <span 
                  className="text-white/60 text-sm lg:text-base"
                  aria-label={`${tPlayers.length} players on Terrorist team`}
                >
                  {tPlayers.length} players
                </span>
              </div>
              
              <div 
                className="space-y-2 lg:space-y-3"
                {...createListProps('Terrorist team players')}
              >
                {tPlayers.map((player, index) => (
                  <div 
                    key={player.id} 
                    className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 focus-within:bg-white/10 transition-all"
                    {...createListItemProps(index, tPlayers.length)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl lg:text-2xl" aria-hidden="true">{player.avatar}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{player.name}</span>
                          {player.isBot && (
                            <span 
                              className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[player.botDifficulty || 'normal']}`}
                              aria-label={`Bot difficulty: ${player.botDifficulty}`}
                            >
                              {player.botDifficulty?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span aria-label={`Kills: ${player.kills}, Deaths: ${player.deaths}`}>
                            K/D: {player.kills}/{player.deaths}
                          </span>
                          <span aria-label={`Network ping: ${player.ping} milliseconds`}>
                            Ping: {player.ping}ms
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {player.ready ? (
                        <span 
                          className="text-green-400 text-sm player-ready"
                          aria-label={`${player.name} is ready`}
                        >
                          ✅ Ready
                        </span>
                      ) : (
                        <span 
                          className="text-yellow-400 text-sm player-not-ready"
                          aria-label={`${player.name} is not ready`}
                        >
                          ⏸️ Not Ready
                        </span>
                      )}
                      {isHost && player.id !== '1' && (
                        <button 
                          {...createButtonProps(`Kick ${player.name} from the game`, () => kickPlayer(player.id))}
                          className="text-red-400 hover:text-red-300 focus-visible p-1 rounded"
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
            </section>
          </div>

          {/* Right Sidebar */}
          <aside 
            className="space-y-4 lg:space-y-6"
            role="complementary"
            aria-label="Room information and chat"
          >
            {/* Room Settings */}
            <section 
              className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl lg:rounded-2xl shadow-2xl p-4 lg:p-6"
              aria-labelledby="room-settings-heading"
            >
              <h3 
                id="room-settings-heading"
                className="text-lg lg:text-xl font-bold text-white mb-4"
              >
                ⚙️ Room Settings
              </h3>
              
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-white/60">Map</dt>
                  <dd className="text-white font-medium">{roomSettings.map}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Mode</dt>
                  <dd className="text-white font-medium">{roomSettings.mode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Round Time</dt>
                  <dd className="text-white font-medium">
                    <span aria-label={`${roomSettings.roundTime} seconds per round`}>
                      {roomSettings.roundTime}s
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Max Rounds</dt>
                  <dd className="text-white font-medium">{roomSettings.maxRounds}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Friendly Fire</dt>
                  <dd 
                    className={`text-white font-medium ${
                      roomSettings.friendlyFire ? 'text-orange-400' : 'text-green-400'
                    }`}
                    aria-label={`Friendly fire is ${roomSettings.friendlyFire ? 'enabled' : 'disabled'}`}
                  >
                    {roomSettings.friendlyFire ? 'On' : 'Off'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Bots</dt>
                  <dd 
                    className="text-white font-medium"
                    aria-label={`${players.filter(p => p.isBot).length} bots with ${roomSettings.botConfig.difficulty} difficulty`}
                  >
                    {players.filter(p => p.isBot).length} ({roomSettings.botConfig.difficulty})
                  </dd>
                </div>
              </dl>
            </section>

            {/* Chat */}
            <section 
              className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl lg:rounded-2xl shadow-2xl p-4 lg:p-6"
              aria-labelledby="chat-heading"
            >
              <h3 
                id="chat-heading"
                className="text-lg lg:text-xl font-bold text-white mb-4"
              >
                💬 Chat
              </h3>
              
              <div 
                className="h-48 lg:h-64 overflow-y-auto mb-4 space-y-2"
                role="log"
                aria-label="Chat messages"
                aria-live="polite"
                {...createListProps('Game chat messages')}
              >
                {chatMessages.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    className="p-2 bg-white/5 rounded-lg"
                    {...createListItemProps(index, chatMessages.length)}
                    role="article"
                    aria-label={`Message from ${msg.playerName} at ${msg.timestamp.toLocaleTimeString()}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">{msg.playerName}</span>
                      <time 
                        className="text-white/40 text-xs"
                        dateTime={msg.timestamp.toISOString()}
                        aria-label={`Sent at ${msg.timestamp.toLocaleTimeString()}`}
                      >
                        {msg.timestamp.toLocaleTimeString()}
                      </time>
                    </div>
                    <div className="text-white/80 text-sm" role="text">{msg.message}</div>
                  </div>
                ))}
              </div>
              
              <form 
                className="flex space-x-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                aria-label="Send chat message"
              >
                <label htmlFor="chat-input" className="sr-only">
                  Type a chat message
                </label>
                <input 
                  id="chat-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === KEYBOARD_KEYS.ENTER && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus-visible"
                  placeholder="Type a message..."
                  maxLength={500}
                  aria-describedby="chat-hint"
                />
                <div id="chat-hint" className="sr-only">
                  Press Enter to send message. Maximum 500 characters.
                </div>
                <button 
                  type="submit"
                  {...createButtonProps('Send chat message', sendMessage, !chatInput.trim())}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all focus-visible disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </section>
          </aside>
        </div>
      </main>

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
