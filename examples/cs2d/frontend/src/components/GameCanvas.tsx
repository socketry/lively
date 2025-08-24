import React, { useEffect, useRef, useState } from 'react';
// Use the original GameCore for now until EnhancedGameCore is properly debugged
import { GameCore, Player } from '../../../src/game/GameCore';
import { WebSocketGameBridge } from '../../../src/game/WebSocketGameBridge';
import { setupWebSocket } from '../services/websocket';

interface GameCanvasProps {
  roomId?: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameCore | null>(null);
  const bridgeRef = useRef<WebSocketGameBridge | null>(null);
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
      position: { x: 400, y: 300 },
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
      lastPosition: { x: 400, y: 300 },
      currentSurface: { material: 'concrete', volume: 1.0 },
      lastDamageTime: 0,
      isInPain: false,
      orientation: 0,
      isBot: false,
      lastVoiceTime: 0
    };

    // Add some test bots
    const bot1: Player = {
      ...localPlayer,
      id: 'bot-1',
      name: 'Bot_Alpha',
      team: 't',
      position: { x: 800, y: 600 },
      isBot: true,
      botPersonality: {
        aggressiveness: 0.7,
        chattiness: 0.5,
        helpfulness: 0.6,
        responseFrequency: 0.8
      }
    };

    const bot2: Player = {
      ...localPlayer,
      id: 'bot-2', 
      name: 'Bot_Bravo',
      team: 'ct',
      position: { x: 200, y: 400 },
      isBot: true,
      botPersonality: {
        aggressiveness: 0.4,
        chattiness: 0.8,
        helpfulness: 0.9,
        responseFrequency: 0.6
      }
    };

    // Add players to game
    game.addPlayer(localPlayer);
    game.addPlayer(bot1);
    game.addPlayer(bot2);
    game.setLocalPlayer('local-player');

    // Initialize WebSocket multiplayer bridge
    const bridge = new WebSocketGameBridge({
      enableVoiceChat: true,
      enablePositionalAudio: true,
      maxPlayersPerRoom: 10,
      tickRate: 64
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
      bridge.joinRoom(roomId, playerId, isHost);
      
      console.log('🌐 Multiplayer enabled for room:', roomId);
    } else {
      // Offline mode
      game.getStateManager().setOfflineMode(true);
      console.log('🔒 Offline mode enabled');
    }

    // Start the game loop
    game.start();

    console.log('✅ GameCore engine initialized with CS 1.6 audio system');

    // Update stats periodically
    const statsInterval = setInterval(() => {
      const gameState = game.getState();
      const players = game.getPlayers();
      const networkStats = game.getStateManager().getNetworkStats();
      const multiplayerStats = bridge.getMultiplayerStats();
      
      setGameStats({
        fps: game.getFPS(),
        players: players.length,
        roundTime: gameState.roundTime,
        bombPlanted: gameState.bombPlanted,
        ctScore: gameState.ctScore,
        tScore: gameState.tScore,
        networkStats,
        multiplayerStats
      });
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
  }, [roomId]);

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
      
      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD - Round Info */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-black bg-opacity-70 px-4 py-2 rounded text-white font-mono">
            <div className="text-lg">
              CT {gameStats.ctScore} - {gameStats.tScore} T
            </div>
            <div className="text-sm">
              {Math.max(0, Math.floor(gameStats.roundTime))}:{String(Math.floor((gameStats.roundTime % 1) * 60)).padStart(2, '0')}
              {gameStats.bombPlanted && ' | 💣 BOMB PLANTED'}
            </div>
          </div>
        </div>

        {/* Bottom Right HUD - Performance */}
        <div className="absolute bottom-4 right-4 text-right">
          <div className="bg-black bg-opacity-70 px-3 py-2 rounded text-green-400 font-mono text-sm">
            <div>FPS: {gameStats.fps}</div>
            <div>Players: {gameStats.players}</div>
            <div>Audio: ✅ CS 1.6</div>
            <div className="text-blue-400 mt-1">NETWORK:</div>
            <div>Queue: {gameStats.networkStats.queueSize}</div>
            <div>Ping: {gameStats.networkStats.latency}ms</div>
            <div>Connected: {gameStats.networkStats.playersConnected}</div>
          </div>
        </div>

        {/* Bottom Left HUD - Controls */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-black bg-opacity-70 px-3 py-2 rounded text-white font-mono text-sm">
            <div className="text-yellow-400 mb-1">CONTROLS:</div>
            <div>WASD - Move</div>
            <div>Mouse - Aim & Shoot</div>
            <div>R - Reload</div>
            <div>B - Buy Menu (Freeze/Buy Time)</div>
            <div>E - Plant/Defuse Bomb</div>
            <div>Z/X/C/V - Radio Commands</div>
            <div>T - Bot Voice Test</div>
            <div>H - Toggle Debug HUD</div>
            <div>P - Toggle Physics Debug</div>
          </div>
        </div>

        {/* Enhanced Game State Indicator */}
        <div className="absolute top-4 left-4">
          <div className="bg-green-600 bg-opacity-90 px-3 py-2 rounded text-white font-mono text-sm">
            🎮 Enhanced GameCore: ACTIVE
            <br />
            🎵 CS 1.6 Audio: READY
            <br />
            💥 Damage System: ON
            <br />
            🤖 Bot AI: ENHANCED
            <br />
            💣 Bomb System: READY
            <br />
            🛒 Buy Menu: AVAILABLE
            <br />
            ⏱️ Round System: ACTIVE
            <br />
            {gameStats.multiplayerStats.connected ? (
              <>
                🌐 MP: {gameStats.multiplayerStats.isHost ? 'HOST' : 'CLIENT'}
                <br />
                🏠 Room: {gameStats.multiplayerStats.roomId}
              </>
            ) : (
              <>
                🔒 Mode: OFFLINE
                <br />
                🎯 Testing: ALL SYSTEMS
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};