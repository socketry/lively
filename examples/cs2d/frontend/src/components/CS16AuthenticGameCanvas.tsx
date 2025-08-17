import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GameStats {
  health: number;
  armor: number;
  ammo: { current: number; max: number };
  score: { kills: number; deaths: number };
  money: number;
  currentWeapon: string;
  currentWeaponSlot: number;
  team: 'ct' | 't';
  roundTime: number;
  bombPlanted: boolean;
  bombTimer: number;
}

interface BuyMenuState {
  open: boolean;
  category: 'primary' | 'secondary' | 'equipment' | 'grenades' | null;
}

export const CS16AuthenticGameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Game state
  const [showMenu, setShowMenu] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showBuyMenu, setShowBuyMenu] = useState<BuyMenuState>({ open: false, category: null });
  const [chatMessage, setChatMessage] = useState('');
  const [consoleCommand, setConsoleCommand] = useState('');
  const [fps, setFps] = useState(60);
  
  // Player movement state
  const [keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    shift: false, ctrl: false, space: false
  });
  
  const [stats, setStats] = useState<GameStats>({
    health: 100,
    armor: 100,
    ammo: { current: 30, max: 90 },
    score: { kills: 0, deaths: 0 },
    money: 16000,
    currentWeapon: 'AK-47',
    currentWeaponSlot: 1,
    team: 'ct',
    roundTime: 115,
    bombPlanted: false,
    bombTimer: 35
  });

  // Weapon configurations
  const weapons = {
    1: { name: 'USP', ammo: { current: 12, max: 100 }, damage: 34, price: 500 },
    2: { name: 'Glock', ammo: { current: 20, max: 120 }, damage: 25, price: 400 },
    3: { name: 'AK-47', ammo: { current: 30, max: 90 }, damage: 36, price: 2500 },
    4: { name: 'M4A1', ammo: { current: 30, max: 90 }, damage: 33, price: 3100 },
    5: { name: 'AWP', ammo: { current: 10, max: 30 }, damage: 115, price: 4750 }
  };

  // Buy menu items
  const buyMenuItems = {
    primary: [
      { name: 'AK-47', price: 2500, damage: 36, key: '3' },
      { name: 'M4A1', price: 3100, damage: 33, key: '4' },
      { name: 'AWP', price: 4750, damage: 115, key: '5' }
    ],
    secondary: [
      { name: 'USP', price: 500, damage: 34, key: '1' },
      { name: 'Glock', price: 400, damage: 25, key: '2' }
    ],
    equipment: [
      { name: 'Kevlar Vest', price: 650, description: 'Body armor' },
      { name: 'Kevlar + Helmet', price: 1000, description: 'Full protection' },
      { name: 'Defuse Kit', price: 200, description: 'Faster bomb defusing' }
    ],
    grenades: [
      { name: 'HE Grenade', price: 300, damage: 82 },
      { name: 'Flashbang', price: 200, effect: 'Blinds enemies' },
      { name: 'Smoke Grenade', price: 300, effect: 'Concealment' }
    ]
  };

  // Audio system
  const playSound = useCallback((soundPath: string, volume = 0.3) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audio = new Audio(`/cstrike/sound/${soundPath}`);
    audio.volume = volume;
    audio.play().catch(console.warn);
  }, []);

  // Game loop with authentic CS 1.6 rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    let animationId: number;
    let lastTime = 0;
    let frameCount = 0;
    let fpsTime = 0;
    
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      
      frameCount++;
      fpsTime += deltaTime;
      if (fpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTime = 0;
      }
      
      // Clear with CS 1.6 style background
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw authentic CS 1.6 map elements
      drawCS16Map(ctx, canvas.width, canvas.height);
      
      // Draw crosshair (CS 1.6 style)
      drawCS16Crosshair(ctx, canvas.width / 2, canvas.height / 2);
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    const drawCS16Map = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Draw dust2-style map elements
      ctx.fillStyle = '#8B7355'; // Sand color
      ctx.fillRect(0, height - 100, width, 100); // Ground
      
      // Buildings
      ctx.fillStyle = '#654321';
      ctx.fillRect(100, height - 300, 200, 200); // Long A building
      ctx.fillRect(width - 300, height - 250, 150, 150); // Short A building
      
      // Boxes/crates
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(width / 2 - 50, height / 2, 100, 80); // Double doors boxes
      ctx.fillRect(300, height - 180, 60, 60); // Random crate
      
      // Player (authentic CS 1.6 player dot)
      ctx.fillStyle = stats.team === 'ct' ? '#0066CC' : '#CC3300';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw other players (simulated)
      ctx.fillStyle = stats.team === 'ct' ? '#CC3300' : '#0066CC';
      ctx.beginPath();
      ctx.arc(width * 0.3, height * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width * 0.7, height * 0.8, 6, 0, Math.PI * 2);
      ctx.fill();
    };
    
    const drawCS16Crosshair = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      
      // Classic CS 1.6 crosshair
      ctx.beginPath();
      // Horizontal line
      ctx.moveTo(x - 15, y);
      ctx.lineTo(x - 3, y);
      ctx.moveTo(x + 3, y);
      ctx.lineTo(x + 15, y);
      // Vertical line
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x, y - 3);
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x, y + 15);
      ctx.stroke();
    };
    
    gameLoop(0);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stats.team]);

  // Enhanced keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Don't handle if typing in chat/console
      if (showChat || showConsole) return;
      
      switch(key) {
        case 'escape':
          setShowMenu(prev => !prev);
          setShowBuyMenu({ open: false, category: null });
          break;
        case 'tab':
          e.preventDefault();
          setShowScoreboard(true);
          break;
        case 't':
          setShowChat(true);
          break;
        case '`':
        case '~':
          e.preventDefault();
          setShowConsole(prev => !prev);
          break;
        case 'b':
          if (!showBuyMenu.open) {
            setShowBuyMenu({ open: true, category: null });
            playSound('ui/buttonclick.wav');
          }
          break;
        case 'r':
          // Reload weapon
          setStats(prev => ({ 
            ...prev, 
            ammo: { ...prev.ammo, current: prev.ammo.max } 
          }));
          playSound('weapons/ak47_clipout.wav', 0.5);
          setTimeout(() => playSound('weapons/ak47_clipin.wav', 0.5), 1000);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          // Weapon switching
          const slot = parseInt(key);
          const weapon = weapons[slot as keyof typeof weapons];
          if (weapon) {
            setStats(prev => ({
              ...prev,
              currentWeapon: weapon.name,
              currentWeaponSlot: slot,
              ammo: weapon.ammo
            }));
            playSound('items/gunpickup2.wav', 0.3);
          }
          break;
        // Movement keys
        case 'w':
        case 'a':
        case 's':
        case 'd':
        case 'shift':
        case 'control':
        case ' ':
          setKeys(prev => ({ ...prev, [key === ' ' ? 'space' : key === 'control' ? 'ctrl' : key]: true }));
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (key === 'tab') {
        setShowScoreboard(false);
      }
      
      // Movement keys
      if (['w', 'a', 's', 'd', 'shift', 'control', ' '].includes(key)) {
        setKeys(prev => ({ ...prev, [key === ' ' ? 'space' : key === 'control' ? 'ctrl' : key]: false }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showChat, showConsole, showBuyMenu.open, playSound]);

  // Mouse controls
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    if (showMenu || showBuyMenu.open || showScoreboard) return;
    
    // Shooting
    if (stats.ammo.current > 0) {
      setStats(prev => ({
        ...prev,
        ammo: { ...prev.ammo, current: prev.ammo.current - 1 }
      }));
      
      // Play weapon sound based on current weapon
      switch(stats.currentWeapon) {
        case 'AK-47':
          playSound('weapons/ak47-1.wav', 0.6);
          break;
        case 'M4A1':
          playSound('weapons/m4a1-1.wav', 0.6);
          break;
        case 'AWP':
          playSound('weapons/awp1.wav', 0.8);
          break;
        case 'USP':
          playSound('weapons/usp1.wav', 0.4);
          break;
        case 'Glock':
          playSound('weapons/glock18-1.wav', 0.4);
          break;
      }
    } else {
      // Empty clip sound
      playSound('weapons/clipempty_rifle.wav', 0.5);
    }
  }, [stats.ammo.current, stats.currentWeapon, showMenu, showBuyMenu.open, showScoreboard, playSound]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => {
        if (prev.roundTime > 0) {
          return { ...prev, roundTime: prev.roundTime - 1 };
        }
        return prev;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-mono" data-testid="cs16-game-container">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        id="cs16-game-canvas"
        onClick={handleMouseClick}
        style={{ imageRendering: 'pixelated', position: 'relative', zIndex: 1 }}
      />
      
      {/* Authentic CS 1.6 HUD */}
      <div className="absolute inset-0 pointer-events-none select-none" style={{ pointerEvents: 'none' }}>
        {/* Top HUD */}
        <div className="absolute top-2 left-0 right-0 flex justify-between items-start px-4">
          {/* Round Timer */}
          <div className="bg-black bg-opacity-80 px-3 py-1 text-orange-400 font-bold text-lg border border-gray-600" data-testid="round-timer">
            {Math.floor(stats.roundTime / 60)}:{(stats.roundTime % 60).toString().padStart(2, '0')}
          </div>
          
          {/* Team Score */}
          <div className="bg-black bg-opacity-80 px-4 py-1 border border-gray-600" data-testid="team-score">
            <span className="text-blue-400 font-bold">Counter-Terrorists: 0</span>
            <span className="text-white mx-2">|</span>
            <span className="text-red-400 font-bold">Terrorists: 0</span>
          </div>
          
          {/* FPS and Net */}
          <div className="text-right space-y-1">
            <div className="bg-black bg-opacity-80 px-2 py-1 text-green-400 text-sm border border-gray-600">
              FPS: {fps}
            </div>
            <div className="bg-black bg-opacity-80 px-2 py-1 text-green-400 text-sm border border-gray-600">
              NET: 32ms
            </div>
          </div>
        </div>
        
        {/* Bottom Left HUD - Health, Armor, Money */}
        <div className="absolute bottom-4 left-4 space-y-2" style={{ pointerEvents: 'none' }}>
          <div className="flex space-x-4 bg-black bg-opacity-90 px-4 py-2 border border-gray-600" style={{ pointerEvents: 'none' }}>
            <div className="flex items-center space-x-2" style={{ pointerEvents: 'none' }}>
              <div className="w-4 h-4 bg-red-600 border border-red-400" style={{ pointerEvents: 'none' }}></div>
              <span className="text-white font-bold text-xl" data-testid="cs16-health" data-health={stats.health} style={{ pointerEvents: 'none' }}>
                {stats.health}
              </span>
            </div>
            <div className="flex items-center space-x-2" style={{ pointerEvents: 'none' }}>
              <div className="w-4 h-4 bg-blue-600 border border-blue-400" style={{ pointerEvents: 'none' }}></div>
              <span className="text-white font-bold text-xl" data-testid="cs16-armor" style={{ pointerEvents: 'none' }}>
                {stats.armor}
              </span>
            </div>
          </div>
          
          <div className="bg-black bg-opacity-90 px-4 py-2 border border-gray-600" style={{ pointerEvents: 'none' }}>
            <span className="text-green-400 font-bold text-lg" data-testid="cs16-money" style={{ pointerEvents: 'none' }}>
              ${stats.money}
            </span>
          </div>
        </div>
        
        {/* Bottom Right HUD - Weapon and Ammo */}
        <div className="absolute bottom-4 right-4 text-right space-y-2" style={{ pointerEvents: 'none' }}>
          <div className="bg-black bg-opacity-90 px-4 py-2 border border-gray-600" style={{ pointerEvents: 'none' }}>
            <div className="text-white font-bold text-lg" data-testid="cs16-weapon" style={{ pointerEvents: 'none' }}>
              {stats.currentWeapon}
            </div>
            <div className="text-yellow-400 font-bold text-3xl" data-testid="cs16-ammo" style={{ pointerEvents: 'none' }}>
              {stats.ammo.current} / {stats.ammo.max}
            </div>
          </div>
        </div>
        
        {/* Radar (Top Right) */}
        <div className="absolute top-4 right-4 w-40 h-40 bg-black bg-opacity-90 border-2 border-green-500" data-testid="cs16-radar">
          <div className="relative w-full h-full p-1">
            <div className="absolute top-1 left-1 text-green-400 text-xs font-bold">RADAR</div>
            <div className="w-full h-full bg-gray-800 relative">
              {/* Player position (center) */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-400 transform -translate-x-1/2 -translate-y-1/2"></div>
              {/* Teammates */}
              <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-blue-400"></div>
              <div className="absolute bottom-1/4 right-1/4 w-1.5 h-1.5 bg-blue-400"></div>
              {/* Enemies (when visible) */}
              <div className="absolute top-3/4 left-3/4 w-1.5 h-1.5 bg-red-400"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Buy Menu */}
      {showBuyMenu.open && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-800 border-2 border-gray-600 p-6 w-96" data-testid="cs16-buy-menu">
            <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-2">
              BUY EQUIPMENT
            </h2>
            
            {!showBuyMenu.category ? (
              <div className="space-y-2">
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'primary' }))}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600"
                >
                  1. Primary Weapons
                </button>
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'secondary' }))}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600"
                >
                  2. Secondary Weapons
                </button>
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'equipment' }))}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600"
                >
                  3. Equipment
                </button>
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'grenades' }))}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600"
                >
                  4. Grenades
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: null }))}
                  className="text-gray-400 hover:text-white mb-2"
                >
                  ← Back
                </button>
                {buyMenuItems[showBuyMenu.category].map((item, index) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (stats.money >= item.price) {
                        setStats(prev => ({ ...prev, money: prev.money - item.price }));
                        playSound('buttons/weapon_confirm.wav');
                        setShowBuyMenu({ open: false, category: null });
                      } else {
                        playSound('buttons/weapon_cant_buy.wav');
                      }
                    }}
                    className={`w-full text-left px-4 py-2 border border-gray-600 ${
                      stats.money >= item.price 
                        ? 'text-white hover:bg-gray-700' 
                        : 'text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {index + 1}. {item.name} - ${item.price}
                    {'damage' in item && <span className="text-gray-400 ml-2">DMG: {item.damage}</span>}
                  </button>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-2 border-t border-gray-600 text-gray-400 text-sm">
              Money: ${stats.money}
            </div>
          </div>
        </div>
      )}
      
      {/* Console */}
      {showConsole && (
        <div className="absolute top-0 left-0 w-full h-1/2 bg-black bg-opacity-95 text-green-400 font-mono text-sm p-4 pointer-events-auto overflow-hidden" data-testid="cs16-console">
          <div className="h-full overflow-y-auto">
            <div>Half-Life Console v1.6</div>
            <div>] map de_dust2</div>
            <div>] cl_sidespeed 400</div>
            <div>] cl_forwardspeed 400</div>
            <div>] fps_max 100</div>
            <div>] developer 1</div>
            <div className="text-yellow-400">FPS: {fps}</div>
          </div>
          <div className="mt-2 flex items-center">
            <span>] </span>
            <input
              type="text"
              value={consoleCommand}
              onChange={(e) => setConsoleCommand(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setConsoleCommand('');
                  setShowConsole(false);
                }
              }}
              className="bg-transparent outline-none text-green-400 flex-1 ml-1"
              autoFocus
              placeholder="Enter command..."
            />
          </div>
        </div>
      )}
      
      {/* Scoreboard */}
      {showScoreboard && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-800 border-2 border-gray-600 p-6 max-w-4xl w-full mx-4" data-testid="cs16-scoreboard">
            <h2 className="text-xl font-bold text-center mb-4 text-white">SCOREBOARD</h2>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Counter-Terrorists */}
              <div>
                <h3 className="text-blue-400 font-bold mb-2 border-b border-blue-400 pb-1">
                  COUNTER-TERRORISTS
                </h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-gray-400 text-sm">
                    <span>Name</span>
                    <span>Kills</span>
                    <span>Deaths</span>
                    <span>Ping</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-white" data-testid="player-stats">
                    <span>You</span>
                    <span>{stats.score.kills}</span>
                    <span>{stats.score.deaths}</span>
                    <span>32</span>
                  </div>
                </div>
              </div>
              
              {/* Terrorists */}
              <div>
                <h3 className="text-red-400 font-bold mb-2 border-b border-red-400 pb-1">
                  TERRORISTS
                </h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-gray-400 text-sm">
                    <span>Name</span>
                    <span>Kills</span>
                    <span>Deaths</span>
                    <span>Ping</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-white">
                    <span>Enemy1</span>
                    <span>2</span>
                    <span>1</span>
                    <span>45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Game Menu */}
      {showMenu && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-800 border-2 border-gray-600 p-6 w-80" data-testid="cs16-game-menu">
            <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-2">
              GAME MENU
            </h2>
            <div className="space-y-2">
              <button 
                onClick={() => setShowMenu(false)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600"
              >
                Resume Game
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600">
                Options
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600">
                Controls
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border border-gray-600">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat */}
      {showChat && (
        <div className="absolute bottom-20 left-4 w-96 bg-black bg-opacity-90 border border-gray-600 p-3 pointer-events-auto" data-testid="cs16-chat">
          <div className="h-32 overflow-y-auto mb-2 text-sm">
            <div className="text-blue-400">Player1: GL HF!</div>
            <div className="text-red-400">Enemy: gg</div>
            <div className="text-yellow-400">*DEAD* Teammate: nice shot</div>
          </div>
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                setChatMessage('');
                setShowChat(false);
              }
            }}
            placeholder="Say:"
            className="w-full bg-gray-700 border border-gray-600 px-2 py-1 text-white text-sm outline-none"
            autoFocus
          />
        </div>
      )}
    </div>
  );
};