import React, { useEffect, useRef, useState } from 'react';
// Use the original GameCore for now until EnhancedGameCore is properly debugged
import { GameCore, Player } from '../../../src/game/GameCore';
import { WebSocketGameBridge } from '../../../src/game/WebSocketGameBridge';
import { setupWebSocket } from '../services/websocket';
import { GameHUD } from './game/HUD/GameHUD';

interface GameCanvasProps {
  roomId?: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameCore | null>(null);
  const bridgeRef = useRef<WebSocketGameBridge | null>(null);
  
  // Check for quickplay mode from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const isQuickPlay = urlParams.get('quickplay') === 'true';
  const [gameStats, setGameStats] = useState({
    fps: 0,
    players: 0,
    roundTime: 115,
    bombPlanted: false,
    ctScore: 0,
    tScore: 0,
    networkStats: {
      queueSize: 0,
      latency: 0,
      playersConnected: 0
    },
    multiplayerStats: {
      roomId: roomId || 'offline',
      connected: false,
      isHost: false,
      playersInRoom: 1
    }
  });

  // HUD-specific state
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [killFeed, setKillFeed] = useState<Array<{
    id: string;
    killer: string;
    victim: string;
    weapon: string;
    headshot: boolean;
    timestamp: number;
    killerTeam: 'ct' | 't';
    victimTeam: 'ct' | 't';
  }>>([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Prevent double initialization in React StrictMode
    if (gameRef.current) {
      console.log('⚠️ Game already initialized, skipping...');
      return;
    }

    console.log('🎮 Initializing GameCore engine...');
    
    // Initialize the actual GameCore engine
    const game = new GameCore(canvasRef.current);
    gameRef.current = game;

    // Create a local player for testing
    const localPlayer: Player = {
      id: 'local-player',
      name: 'Player',
      team: 'ct',
      position: { x: 300, y: 300 },  // Centered CT spawn
      velocity: { x: 0, y: 0 },
      health: 100,
      armor: 0,
      money: 16000,
      score: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      currentWeapon: 'ak47',
      weapons: ['knife', 'usps', 'ak47'],
      ammo: new Map([['ak47', 30], ['usps', 12]]),
      isAlive: true,
      isDucking: false,
      isWalking: false,
      isScoped: false,
      lastShotTime: 0,
      lastStepTime: 0,
      lastPosition: { x: 300, y: 300 },
      currentSurface: { material: 'concrete', volume: 1.0 },
      lastDamageTime: 0,
      isInPain: false,
      orientation: 0,  // Will be updated based on mouse position
      isBot: false,
      lastVoiceTime: 0
    };

    // Generate spawn positions to prevent overlap
    const getSpawnPosition = (index: number, team: 'ct' | 't') => {
      // CT spawns on left side, T spawns on right side
      const baseX = team === 'ct' ? 200 : 800;
      const baseY = 300;
      
      // Add offset to prevent players from spawning on top of each other
      const offsetX = (index % 3) * 100 - 100;  // -100, 0, 100
      const offsetY = Math.floor(index / 3) * 100;  // 0, 100, 200
      
      return {
        x: baseX + offsetX,
        y: baseY + offsetY
      };
    };

    // Add bots - more for quickplay mode
    const botNames = ['Bot_Alpha', 'Bot_Bravo', 'Bot_Charlie', 'Bot_Delta', 'Bot_Echo', 'Bot_Foxtrot'];
    const botCount = isQuickPlay ? 5 : 2; // More bots in quickplay mode
    
    const bots: Player[] = [];
    for (let i = 0; i < botCount; i++) {
      const team = i % 2 === 0 ? 't' : 'ct';
      const bot: Player = {
        ...localPlayer,
        id: `bot-${i + 1}`,
        name: botNames[i] || `Bot_${i + 1}`,
        team,
        position: getSpawnPosition(Math.floor(i / 2), team),
        orientation: team === 't' ? Math.PI : 0, // Face opposing team
        isBot: true,
        botPersonality: {
          aggressiveness: 0.4 + Math.random() * 0.4, // 0.4 - 0.8
          chattiness: Math.random() * 0.8, // 0 - 0.8  
          helpfulness: 0.5 + Math.random() * 0.4, // 0.5 - 0.9
          responseFrequency: 0.4 + Math.random() * 0.4 // 0.4 - 0.8
        }
      };
      bots.push(bot);
    }

    // Add players to game
    game.addPlayer(localPlayer);
    bots.forEach(bot => game.addPlayer(bot));
    
    if (isQuickPlay) {
      console.log('🎮 Quick Play Mode: Started with', botCount, 'bots');
    }
    game.setLocalPlayer('local-player');

    // Initialize WebSocket multiplayer bridge
    const bridge = new WebSocketGameBridge({
      enableVoiceChat: true,
      enablePositionalAudio: true,
      maxPlayersPerRoom: 10
    });
    bridgeRef.current = bridge;

    // Setup multiplayer if room ID provided
    if (roomId && roomId !== 'offline') {
      const wsService = setupWebSocket();
      bridge.connectWebSocket(wsService);
      // Note: WebSocketGameBridge may need updates for EnhancedGameCore
      // bridge.connectGameSystems(game, game.getStateManager());
      
      // Join the multiplayer room
      const playerId = 'local-player';
      const isHost = roomId === 'host'; // Simple host detection
      bridge.joinRoom(roomId, playerId);
      
      console.log('🌐 Multiplayer enabled for room:', roomId);
    } else {
      // Offline mode - no special setup needed for simplified version
      console.log('🔒 Offline mode enabled');
    }

    // Start the game loop
    game.start();

    console.log('✅ GameCore engine initialized with CS 1.6 audio system');

    // Update stats and HUD data periodically
    const statsInterval = setInterval(() => {
      const gameState = game.getState();
      const players = game.getPlayers();
      const connectionStatus = bridge.getConnectionStatus();
      const localPlayerData = players.find(p => p.id === 'local-player');
      
      setGameStats({
        fps: game.getFPS(),
        players: players.length,
        roundTime: gameState.roundTime,
        bombPlanted: gameState.bombPlanted,
        ctScore: gameState.ctScore,
        tScore: gameState.tScore,
        networkStats: {
          queueSize: 0,
          latency: 0,
          playersConnected: players.length
        },
        multiplayerStats: {
          roomId: connectionStatus.roomId,
          connected: connectionStatus.connected,
          isHost: false,
          playersInRoom: players.length
        }
      });

      // Update HUD-specific data
      if (localPlayerData) {
        setLocalPlayer(localPlayerData);
      }
      setAllPlayers(players);
    }, 100);

    // Cleanup
    return () => {
      clearInterval(statsInterval);
      // Stop game loop
      if (gameRef.current) {
        gameRef.current.stop();
        gameRef.current = null;
      }
      // Cleanup multiplayer bridge
      bridgeRef.current?.disconnect();
      bridgeRef.current = null;
    };
  }, [roomId, isQuickPlay]);

  // HUD Event Handlers
  const handleWeaponSwitch = (weaponIndex: number) => {
    if (gameRef.current) {
      // Implement weapon switching logic
      console.log('Switching to weapon index:', weaponIndex);
    }
  };

  const handleBuyItem = (itemId: string) => {
    if (gameRef.current) {
      // Implement buy item logic
      console.log('Buying item:', itemId);
    }
  };

  const handleRadioCommand = (command: string) => {
    if (gameRef.current) {
      // Implement radio command logic
      console.log('Radio command:', command);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* New HUD System */}
      {localPlayer && (
        <GameHUD
          player={localPlayer}
          gameState={{
            roundTime: gameStats.roundTime,
            bombPlanted: gameStats.bombPlanted,
            ctScore: gameStats.ctScore,
            tScore: gameStats.tScore,
            roundPhase: 'live' // TODO: Get from actual game state
          }}
          allPlayers={allPlayers}
          killFeed={killFeed}
          onWeaponSwitch={handleWeaponSwitch}
          onBuyItem={handleBuyItem}
          onRadioCommand={handleRadioCommand}
          fps={gameStats.fps}
          ping={gameStats.networkStats.latency}
        />
      )}
      
      {/* Quick Play Indicator */}
      {isQuickPlay && (
        <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 rounded-lg shadow-lg">
          <div className="text-white font-bold flex items-center space-x-2">
            <span>🎮</span>
            <span>Quick Play Mode</span>
          </div>
        </div>
      )}
      
      {/* Development/Debug Overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 px-3 py-2 rounded text-green-400 font-mono text-xs">
          <div className="text-white font-bold mb-1">DEBUG INFO:</div>
          <div>New HUD: ✅ ACTIVE</div>
          <div>FPS: {gameStats.fps}</div>
          <div>Players: {gameStats.players}</div>
          <div>Audio: ✅ CS 1.6</div>
          {isQuickPlay && <div>🎮 Quick Play: ACTIVE</div>}
          {gameStats.multiplayerStats.connected ? (
            <>
              <div>🌐 MP: {gameStats.multiplayerStats.isHost ? 'HOST' : 'CLIENT'}</div>
              <div>Room: {gameStats.multiplayerStats.roomId}</div>
            </>
          ) : (
            <div>🔒 Mode: OFFLINE</div>
          )}
        </div>
      )}
    </div>
  );
};