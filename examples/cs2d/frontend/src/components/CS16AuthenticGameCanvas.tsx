import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

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
  // Simple round/phase state for SPA demo
  const [phase, setPhase] = useState<'team-select' | 'freeze' | 'live'>(
    'team-select'
  );
  const [buyTimeRemaining, setBuyTimeRemaining] = useState(20);
  
  // Player movement state
  const [_keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    shift: false, ctrl: false, space: false
  });
  
  // Visual effects state
  const [visualEffects, setVisualEffects] = useState<Array<{
    id: string;
    type: 'muzzleFlash' | 'bulletTracer' | 'explosion' | 'hitEffect';
    x: number;
    y: number;
    startTime: number;
    duration: number;
    color?: string;
    size?: number;
    targetX?: number;
    targetY?: number;
  }>>([]);
  
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

  // Score and bomb-related state
  const [ctScore, setCtScore] = useState(0);
  const [tScore, setTScore] = useState(0);
  const [hasBomb, setHasBomb] = useState(false);
  const [bombPosition, setBombPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPlanting, setIsPlanting] = useState(false);
  const [plantProgress, setPlantProgress] = useState(0);
  const [isDefusing, setIsDefusing] = useState(false);
  const [defuseProgress, setDefuseProgress] = useState(0);
  const [defuseKit, setDefuseKit] = useState(false);

  // Bomb logic constants
  const PLANT_TIME_MS = 3000;
  const DEFUSE_TIME_MS = 10000;
  const DEFUSE_KIT_TIME_MS = 5000;
  const BOMB_TIMER_DEFAULT = 40; // seconds

  // Weapon configurations
  const weapons = useMemo(() => ({
    1: { name: 'USP', ammo: { current: 12, max: 100 }, damage: 34, price: 500 },
    2: { name: 'Glock', ammo: { current: 20, max: 120 }, damage: 25, price: 400 },
    3: { name: 'AK-47', ammo: { current: 30, max: 90 }, damage: 36, price: 2500 },
    4: { name: 'M4A1', ammo: { current: 30, max: 90 }, damage: 33, price: 3100 },
    5: { name: 'AWP', ammo: { current: 10, max: 30 }, damage: 115, price: 4750 }
  }), []);

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
      const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext || W.webkitAudioContext;
      audioContextRef.current = new Ctor();
    }
    
    const audio = new Audio(`/cstrike/sound/${soundPath}`);
    audio.volume = volume;
    audio.play().catch(console.warn);
  }, []);

  // Helper function to add visual effects
  const addVisualEffect = useCallback((type: 'muzzleFlash' | 'bulletTracer' | 'explosion' | 'hitEffect', x: number, y: number, options?: { targetX?: number; targetY?: number; size?: number; duration?: number }) => {
    const effect = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      startTime: Date.now(),
      duration: options?.duration || (type === 'muzzleFlash' ? 100 : type === 'bulletTracer' ? 200 : type === 'explosion' ? 500 : 300),
      targetX: options?.targetX,
      targetY: options?.targetY,
      size: options?.size
    };
    
    setVisualEffects(prev => [...prev, effect]);
  }, []);

  // Game loop with authentic CS 1.6 rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set to 1920x1080 resolution for pixel perfect rendering
    canvas.width = 1920;
    canvas.height = 1080;
    
    // Enable pixel art rendering
    ctx.imageSmoothingEnabled = false;
    type VendorCtx = CanvasRenderingContext2D & {
      webkitImageSmoothingEnabled?: boolean;
      mozImageSmoothingEnabled?: boolean;
    };
    const vctx = ctx as VendorCtx;
    vctx.webkitImageSmoothingEnabled = false;
    vctx.mozImageSmoothingEnabled = false;
    
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
      
      // Clear with pixel art style background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add pixel grid pattern for retro feel
      drawPixelGrid(ctx, canvas.width, canvas.height);
      
      // Draw authentic CS 1.6 map elements
      drawCS16Map(ctx, canvas.width, canvas.height);
      
      // Draw visual effects
      drawVisualEffects(ctx, timestamp);
      // Optional tactical overlays
      drawTacticalMap(ctx, canvas.width, canvas.height);
      drawTacticalCover(ctx, canvas.width, canvas.height);
      
      // Draw crosshair (CS 1.6 style)
      drawCS16Crosshair(ctx, canvas.width / 2, canvas.height / 2);
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    const drawCS16Map = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Pixel art style map with classic CS colors
      drawPixelArtMap(ctx, width, height);
      
      // Pixel art players
      drawPixelPlayer(ctx, width / 2, height / 2, stats.team === 'ct' ? 'ct' : 't', true); // Current player
      
      // Other players with different positions
      drawPixelPlayer(ctx, width * 0.3, height * 0.3, stats.team === 'ct' ? 't' : 'ct', false);
      drawPixelPlayer(ctx, width * 0.7, height * 0.8, stats.team === 'ct' ? 't' : 'ct', false);
      drawPixelPlayer(ctx, width * 0.2, height * 0.7, stats.team, false); // Teammate
    };
    
    // Pixel grid background for retro feel
    const drawPixelGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const gridSize = 4;
      ctx.strokeStyle = 'rgba(40, 40, 40, 0.3)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };
    
    // Pixel art style map drawing
    const drawPixelArtMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Ground/floor tiles - desert dust color
      ctx.fillStyle = '#8B7355';
      for (let x = 0; x < width; x += 32) {
        for (let y = height - 160; y < height; y += 32) {
          drawPixelTile(ctx, x, y, 32, 32, '#8B7355');
        }
      }
      
      // Building structures - pixel art style
      drawPixelBuilding(ctx, 200, height - 600, 400, 400, '#654321', '#8B4513'); // Long A building
      drawPixelBuilding(ctx, width - 600, height - 500, 300, 300, '#654321', '#8B4513'); // Short A building
      drawPixelBuilding(ctx, 100, height - 500, 600, 200, '#654321', '#8B4513'); // B site complex
      
      // Crates/boxes - pixelated style
      drawPixelCrate(ctx, width / 2 - 100, height / 2, 200, 160, '#8B4513', '#A0522D');
      drawPixelCrate(ctx, 600, height - 360, 120, 120, '#8B4513', '#A0522D');
      drawPixelCrate(ctx, width - 300, height / 2 + 100, 160, 120, '#8B4513', '#A0522D');
      
      // Spawn areas - pixel style
      drawPixelSpawnArea(ctx, 100, 100, 300, 200, 'ct');
      drawPixelSpawnArea(ctx, width - 400, height - 300, 300, 200, 't');
    };
    
    // Pixel art tile drawing
    const drawPixelTile = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      
      // Add pixel art border
      ctx.strokeStyle = '#5A4A3A';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      
      // Add texture detail
      ctx.fillStyle = '#7A6A5A';
      ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillRect(x + w - 6, y + h - 6, 4, 4);
    };
    
    // Pixel art building
    const drawPixelBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wallColor: string, roofColor: string) => {
      // Main building wall
      ctx.fillStyle = wallColor;
      ctx.fillRect(x, y, w, h);
      
      // Pixel art roof
      ctx.fillStyle = roofColor;
      ctx.fillRect(x, y, w, 20);
      
      // Windows - pixelated
      const windowSize = 16;
      for (let wx = x + 20; wx < x + w - 20; wx += 40) {
        for (let wy = y + 40; wy < y + h - 20; wy += 50) {
          // Window frame
          ctx.fillStyle = '#2A2A2A';
          ctx.fillRect(wx, wy, windowSize, windowSize);
          // Window interior
          ctx.fillStyle = '#4A4A4A';
          ctx.fillRect(wx + 2, wy + 2, windowSize - 4, windowSize - 4);
        }
      }
      
      // Building outline
      ctx.strokeStyle = '#4A3A2A';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    };
    
    // Pixel art crate
    const drawPixelCrate = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, crateColor: string, edgeColor: string) => {
      // Main crate body
      ctx.fillStyle = crateColor;
      ctx.fillRect(x, y, w, h);
      
      // Crate edges for 3D effect
      ctx.fillStyle = edgeColor;
      ctx.fillRect(x + w - 8, y, 8, h); // Right edge
      ctx.fillRect(x, y + h - 8, w, 8); // Bottom edge
      
      // Crate planks
      const plankHeight = 8;
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      for (let py = y; py < y + h; py += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
        ctx.stroke();
      }
      
      // Corner reinforcements
      ctx.fillStyle = '#3A2A1A';
      ctx.fillRect(x, y, 8, 8);
      ctx.fillRect(x + w - 8, y, 8, 8);
      ctx.fillRect(x, y + h - 8, 8, 8);
      ctx.fillRect(x + w - 8, y + h - 8, 8, 8);
    };
    
    // Pixel art spawn area
    const drawPixelSpawnArea = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, team: 'ct' | 't') => {
      const teamColors = {
        ct: { primary: '#4A7C59', secondary: '#5C946E', border: '#2E5233' },
        t: { primary: '#8B4513', secondary: '#A0522D', border: '#654321' }
      };
      
      const colors = teamColors[team];
      
      // Spawn area floor
      ctx.fillStyle = colors.primary;
      ctx.fillRect(x, y, w, h);
      
      // Pixel pattern overlay
      for (let px = x; px < x + w; px += 16) {
        for (let py = y; py < y + h; py += 16) {
          if ((px + py) % 32 === 0) {
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(px, py, 8, 8);
          }
        }
      }
      
      // Border
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      // Team indicator corners
      ctx.fillStyle = team === 'ct' ? '#0066CC' : '#CC3300';
      ctx.fillRect(x, y, 20, 20);
      ctx.fillRect(x + w - 20, y, 20, 20);
      ctx.fillRect(x, y + h - 20, 20, 20);
      ctx.fillRect(x + w - 20, y + h - 20, 20, 20);
    };
    
    // Pixel art player
    const drawPixelPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, team: 'ct' | 't', isCurrentPlayer: boolean) => {
      const size = isCurrentPlayer ? 24 : 16;
      const colors = {
        ct: { body: '#4A7C59', uniform: '#2E5233', helmet: '#6B8E6B' },
        t: { body: '#8B4513', uniform: '#654321', helmet: '#A0522D' }
      };
      
      const teamColors = colors[team];
      
      // Player body (square for pixel art)
      ctx.fillStyle = teamColors.body;
      ctx.fillRect(x - size/2, y - size/2, size, size);
      
      // Uniform details
      ctx.fillStyle = teamColors.uniform;
      ctx.fillRect(x - size/2 + 2, y - size/2 + 2, size - 4, size - 4);
      
      // Helmet/head
      ctx.fillStyle = teamColors.helmet;
      ctx.fillRect(x - size/3, y - size/2, size * 2/3, size/2);
      
      // Weapon (simple rectangle)
      ctx.fillStyle = '#2A2A2A';
      ctx.fillRect(x + size/2, y - 2, 12, 4);
      
      // Team color indicator
      ctx.fillStyle = team === 'ct' ? '#0066CC' : '#CC3300';
      ctx.fillRect(x - 2, y - size/2 - 4, 4, 4);
      
      // Current player indicator
      if (isCurrentPlayer) {
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - size/2 - 2, y - size/2 - 2, size + 4, size + 4);
      }
    };
    
    // Helpers for tactical geometry (neon/glass styled)
    const drawGlassBuilding = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
      glow: number
    ) => {
      ctx.save();
      ctx.fillStyle = color + '33';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow * 40;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    };

    const drawNeonCrate = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
      glow: string
    ) => {
      ctx.save();
      ctx.fillStyle = color + '22';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    };

    // Complex tactical map layout with geometric shapes
    const drawTacticalMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Main compound structure (inspired by reference layout)
      drawGlassBuilding(ctx, width * 0.1, height * 0.2, width * 0.25, height * 0.4, '#3B82F6', 0.15); // Long A site
      drawGlassBuilding(ctx, width * 0.7, height * 0.15, width * 0.2, height * 0.3, '#8B5CF6', 0.15); // Short A site
      drawGlassBuilding(ctx, width * 0.05, height * 0.7, width * 0.3, height * 0.25, '#10B981', 0.15); // B site complex
      
      // Central corridor system
      drawGlassBuilding(ctx, width * 0.4, height * 0.45, width * 0.2, height * 0.1, '#6B7280', 0.1); // Mid corridor
      drawGlassBuilding(ctx, width * 0.45, height * 0.3, width * 0.1, height * 0.15, '#6B7280', 0.1); // Mid to A connector
      
      // Spawn areas with team colors
      drawSpawnArea(ctx, width * 0.05, height * 0.05, width * 0.15, height * 0.1, 'ct'); // CT spawn
      drawSpawnArea(ctx, width * 0.8, height * 0.85, width * 0.15, height * 0.1, 't'); // T spawn
      
      // Additional tactical positions
      drawGlassBuilding(ctx, width * 0.6, height * 0.6, width * 0.15, height * 0.15, '#F59E0B', 0.1); // Mid control room
      drawGlassBuilding(ctx, width * 0.35, height * 0.75, width * 0.1, height * 0.2, '#EF4444', 0.1); // B tunnels
    };
    
    // Strategic cover positions and tactical elements
    const drawTacticalCover = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Double doors area (central strategic position)
      drawNeonCrate(ctx, width * 0.47, height * 0.52, width * 0.06, height * 0.04, '#F59E0B', '#FCD34D');
      drawNeonCrate(ctx, width * 0.47, height * 0.44, width * 0.06, height * 0.04, '#F59E0B', '#FCD34D');
      
      // A site cover
      drawNeonCrate(ctx, width * 0.15, height * 0.25, width * 0.04, height * 0.06, '#3B82F6', '#60A5FA');
      drawNeonCrate(ctx, width * 0.25, height * 0.35, width * 0.05, height * 0.05, '#3B82F6', '#60A5FA');
      drawNeonCrate(ctx, width * 0.75, height * 0.2, width * 0.04, height * 0.08, '#8B5CF6', '#A78BFA');
      
      // B site defensive positions
      drawNeonCrate(ctx, width * 0.1, height * 0.75, width * 0.06, height * 0.05, '#10B981', '#6EE7B7');
      drawNeonCrate(ctx, width * 0.2, height * 0.85, width * 0.05, height * 0.06, '#10B981', '#6EE7B7');
      drawNeonCrate(ctx, width * 0.25, height * 0.72, width * 0.04, height * 0.04, '#10B981', '#6EE7B7');
      
      // Mid area strategic crates
      drawNeonCrate(ctx, width * 0.55, height * 0.65, width * 0.03, height * 0.05, '#F59E0B', '#FCD34D');
      drawNeonCrate(ctx, width * 0.42, height * 0.62, width * 0.04, height * 0.04, '#EF4444', '#FCA5A5');
      
      // Long range positions
      drawNeonCrate(ctx, width * 0.3, height * 0.1, width * 0.08, height * 0.03, '#6366F1', '#A5B4FC');
      drawNeonCrate(ctx, width * 0.85, height * 0.5, width * 0.03, height * 0.08, '#EC4899', '#F9A8D4');
      
      // Tactical barriers (thin walls for cover)
      drawTacticalBarrier(ctx, width * 0.38, height * 0.35, width * 0.02, height * 0.08);
      drawTacticalBarrier(ctx, width * 0.62, height * 0.45, width * 0.08, height * 0.02);
      drawTacticalBarrier(ctx, width * 0.15, height * 0.6, width * 0.02, height * 0.1);
    };
    
    // Spawn area with team-specific styling
    const drawSpawnArea = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, team: 'ct' | 't') => {
      const colors = {
        ct: { primary: '#3B82F6', glow: '#93C5FD' },
        t: { primary: '#EF4444', glow: '#FCA5A5' }
      };
      
      const teamColors = colors[team];
      
      // Spawn area base
      ctx.fillStyle = teamColors.primary + '20';
      ctx.fillRect(x, y, w, h);
      
      // Glowing border
      ctx.shadowColor = teamColors.glow;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = teamColors.primary + '80';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;
      
      // Team indicator corners
      ctx.fillStyle = teamColors.glow;
      const cornerSize = Math.min(w, h) * 0.1;
      ctx.fillRect(x, y, cornerSize, cornerSize);
      ctx.fillRect(x + w - cornerSize, y, cornerSize, cornerSize);
      ctx.fillRect(x, y + h - cornerSize, cornerSize, cornerSize);
      ctx.fillRect(x + w - cornerSize, y + h - cornerSize, cornerSize, cornerSize);
    };
    
    // Tactical barriers for strategic positioning
    const drawTacticalBarrier = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      // Semi-transparent barrier
      ctx.fillStyle = 'rgba(75, 85, 99, 0.8)';
      ctx.fillRect(x, y, w, h);
      
      // Metallic edge effect
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      
      // Corner reinforcements
      const cornerSize = Math.min(w, h) * 0.15;
      ctx.fillStyle = '#D1D5DB';
      ctx.fillRect(x, y, cornerSize, cornerSize);
      ctx.fillRect(x + w - cornerSize, y + h - cornerSize, cornerSize, cornerSize);
    };
    
    // Visual effects rendering system
    const drawVisualEffects = (ctx: CanvasRenderingContext2D, currentTime: number) => {
      const activeEffects = visualEffects.filter(effect => 
        currentTime - effect.startTime < effect.duration
      );
      
      // Remove expired effects
      if (activeEffects.length !== visualEffects.length) {
        setVisualEffects(activeEffects);
      }
      
      activeEffects.forEach(effect => {
        const progress = (currentTime - effect.startTime) / effect.duration;
        const alpha = Math.max(0, 1 - progress);
        
        switch (effect.type) {
          case 'muzzleFlash':
            drawMuzzleFlash(ctx, effect.x, effect.y, progress, alpha);
            break;
          case 'bulletTracer':
            if (effect.targetX !== undefined && effect.targetY !== undefined) {
              drawBulletTracer(ctx, effect.x, effect.y, effect.targetX, effect.targetY, progress, alpha);
            }
            break;
          case 'explosion':
            drawExplosion(ctx, effect.x, effect.y, progress, alpha, effect.size || 30);
            break;
          case 'hitEffect':
            drawHitEffect(ctx, effect.x, effect.y, progress, alpha);
            break;
        }
      });
    };
    
    // Muzzle flash effect
    const drawMuzzleFlash = (ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, alpha: number) => {
      const size = 20 * (1 - progress * 0.8);
      const colors = ['#FFD700', '#FF6B35', '#FF0000'];
      
      ctx.globalAlpha = alpha;
      
      // Multiple flash layers for realistic effect
      colors.forEach((color, index) => {
        const layerSize = size * (1 - index * 0.2);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, layerSize);
        gradient.addColorStop(0, color + 'FF');
        gradient.addColorStop(0.5, color + '80');
        gradient.addColorStop(1, color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, layerSize, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.globalAlpha = 1;
    };
    
    // Bullet tracer effect
    const drawBulletTracer = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, progress: number, alpha: number) => {
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;
      
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00FF88';
      ctx.shadowBlur = 4;
      
      // Tracer line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      
      // Bright tip
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };
    
    // Explosion effect
    const drawExplosion = (ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, alpha: number, maxSize: number) => {
      const size = maxSize * progress;
      const innerSize = size * 0.6;
      
      ctx.globalAlpha = alpha;
      
      // Outer explosion ring
      const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      outerGradient.addColorStop(0, 'rgba(255, 165, 0, 0)');
      outerGradient.addColorStop(0.3, 'rgba(255, 69, 0, 0.8)');
      outerGradient.addColorStop(0.7, 'rgba(255, 0, 0, 0.6)');
      outerGradient.addColorStop(1, 'rgba(128, 0, 0, 0)');
      
      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner bright core
      const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, innerSize);
      innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      innerGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.8)');
      innerGradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
      
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(x, y, innerSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    };
    
    // Hit effect (sparks/impact)
    const drawHitEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, alpha: number) => {
      const sparkCount = 8;
      const sparkLength = 15 * (1 - progress);
      
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 3;
      
      for (let i = 0; i < sparkCount; i++) {
        const angle = (i / sparkCount) * Math.PI * 2;
        const endX = x + Math.cos(angle) * sparkLength;
        const endY = y + Math.sin(angle) * sparkLength;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };
    
    const drawCS16Crosshair = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      // Pixel art style crosshair
      ctx.fillStyle = '#00FF00';
      
      // Horizontal bars (pixel blocks)
      ctx.fillRect(x - 16, y - 1, 8, 3); // Left
      ctx.fillRect(x + 8, y - 1, 8, 3);  // Right
      
      // Vertical bars (pixel blocks)
      ctx.fillRect(x - 1, y - 16, 3, 8); // Top
      ctx.fillRect(x - 1, y + 8, 3, 8);  // Bottom
      
      // Center pixel dot
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(x - 1, y - 1, 3, 3);
      
      // Pixel art outline for visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 16, y - 1, 8, 3);
      ctx.strokeRect(x + 8, y - 1, 8, 3);
      ctx.strokeRect(x - 1, y - 16, 3, 8);
      ctx.strokeRect(x - 1, y + 8, 3, 8);
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    };
    
    gameLoop(0);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stats.team, visualEffects]);

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
          // Only allow buying during freeze/buy time
          if (!showBuyMenu.open && phase === 'freeze') {
            setShowBuyMenu({ open: true, category: null });
            playSound('ui/buttonclick.wav');
          }
          break;
        case 'e': {
          if (phase !== 'live') break;
          // Planting (Terrorists with bomb, not yet planted)
          if (stats.team === 't' && hasBomb && !stats.bombPlanted && !isPlanting) {
            setIsPlanting(true);
            setPlantProgress(0);
            const start = Date.now();
            plantTimerRef.current = window.setInterval(() => {
              const elapsed = Date.now() - start;
              const progress = Math.min(1, elapsed / PLANT_TIME_MS);
              setPlantProgress(progress);
              if (progress >= 1) {
                if (plantTimerRef.current) window.clearInterval(plantTimerRef.current);
                plantTimerRef.current = null;
                setIsPlanting(false);
                setHasBomb(false);
                setBombPosition({ x: (canvasRef.current?.width || 1920) / 2, y: (canvasRef.current?.height || 1080) / 2 });
                setStats((prev) => ({ ...prev, bombPlanted: true, bombTimer: BOMB_TIMER_DEFAULT }));
                playSound('radio/bombpl.wav', 0.7);
              }
            }, 50);
          }
          // Defusing (CTs near bomb when planted)
          else if (stats.team === 'ct' && stats.bombPlanted && !isDefusing) {
            setIsDefusing(true);
            setDefuseProgress(0);
            const start = Date.now();
            const total = defuseKit ? DEFUSE_KIT_TIME_MS : DEFUSE_TIME_MS;
            defuseTimerRef.current = window.setInterval(() => {
              const elapsed = Date.now() - start;
              const progress = Math.min(1, elapsed / total);
              setDefuseProgress(progress);
              if (progress >= 1) {
                if (defuseTimerRef.current) window.clearInterval(defuseTimerRef.current);
                defuseTimerRef.current = null;
                setIsDefusing(false);
                playSound('radio/bombdef.wav', 0.8);
                endRound('ct');
              }
            }, 50);
          }
          break;
        }
        case 'g': {
          // Demo grenade explosion effect
          const canvas = canvasRef.current;
          if (canvas) {
            addVisualEffect('explosion', Math.random() * canvas.offsetWidth, Math.random() * canvas.offsetHeight, { size: 50, duration: 800 });
            playSound('weapons/hegrenade-1.wav', 0.8);
          }
          break;
        }
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
        case '5': {
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
        }
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
      if (key === 'e') {
        // Cancel current plant/defuse
        if (plantTimerRef.current) window.clearInterval(plantTimerRef.current);
        if (defuseTimerRef.current) window.clearInterval(defuseTimerRef.current);
        plantTimerRef.current = null;
        defuseTimerRef.current = null;
        setIsPlanting(false);
        setIsDefusing(false);
        setPlantProgress(0);
        setDefuseProgress(0);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showChat, showConsole, showBuyMenu.open, playSound, addVisualEffect, weapons]);

  // Mouse controls
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    if (showMenu || showBuyMenu.open || showScoreboard || phase !== 'live') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const playerX = canvas.width / 2;
    const playerY = canvas.height / 2;
    
    // Shooting
    if (stats.ammo.current > 0) {
      setStats(prev => ({
        ...prev,
        ammo: { ...prev.ammo, current: prev.ammo.current - 1 }
      }));
      
      // Add visual effects
      addVisualEffect('muzzleFlash', playerX, playerY);
      addVisualEffect('bulletTracer', playerX, playerY, { 
        targetX: clickX, 
        targetY: clickY,
        duration: 150 
      });
      
      // Random chance for hit effect at target location
      if (Math.random() < 0.3) { // 30% hit chance for demo
        addVisualEffect('hitEffect', clickX, clickY);
      }
      
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
  }, [stats.ammo, stats.currentWeapon, showMenu, showBuyMenu.open, showScoreboard, playSound, addVisualEffect, phase]);

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

  // Freeze/buy timer countdown when in freeze phase
  useEffect(() => {
    if (phase !== 'freeze') return;
    const id = setInterval(() => {
      setBuyTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('live');
          setShowBuyMenu({ open: false, category: null });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // On entering freeze, reset round states and assign bomb to Terrorists
  useEffect(() => {
    if (phase === 'freeze') {
      // Reset bomb-related state for new round
      setIsPlanting(false);
      setPlantProgress(0);
      setIsDefusing(false);
      setDefuseProgress(0);
      setBombPosition(null);
      setStats((prev) => ({ ...prev, bombPlanted: false, bombTimer: 0, roundTime: 115 }));
      // Assign bomb if player is T
      setHasBomb((prevHasBomb) => (stats.team === 't' ? true : false));
    }
  }, [phase]);

  // Bomb timer countdown when planted
  useEffect(() => {
    if (!stats.bombPlanted || stats.bombTimer <= 0) return;
    const id = setInterval(() => {
      setStats((prev) => {
        if (!prev.bombPlanted) return prev;
        const next = Math.max(0, prev.bombTimer - 1);
        return { ...prev, bombTimer: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stats.bombPlanted, stats.bombTimer]);

  // When bomb timer hits zero, Terrorists win by explosion
  useEffect(() => {
    if (stats.bombPlanted && stats.bombTimer === 0) {
      endRound('t');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.bombPlanted, stats.bombTimer]);

  // Refs for plant/defuse timers
  const plantTimerRef = useRef<number | null>(null);
  const defuseTimerRef = useRef<number | null>(null);

  const endRound = (winner: 'ct' | 't') => {
    if (winner === 'ct') setCtScore((s) => s + 1);
    if (winner === 't') setTScore((s) => s + 1);
    // Award simple economy
    const WIN_REWARD = 3250;
    const LOSS_REWARD = 1400;
    setStats((prev) => ({
      ...prev,
      money: prev.money + (prev.team === winner ? WIN_REWARD : LOSS_REWARD),
      bombPlanted: false,
      bombTimer: 0,
      roundTime: 115
    }));
    setBombPosition(null);
    setIsPlanting(false);
    setIsDefusing(false);
    setPlantProgress(0);
    setDefuseProgress(0);
    setPhase('freeze');
    setBuyTimeRemaining(20);
    // Give/clear bomb for next round
    setHasBomb((prevHasBomb) => (stats.team === 't' ? true : false));
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-mono" data-testid="cs16-game-container">
      {/* Game Canvas - Full 1920x1080 */}
      <canvas
        ref={canvasRef}
        className="w-full h-screen cursor-crosshair"
        id="cs16-game-canvas"
        onClick={handleMouseClick}
        style={{ 
          imageRendering: 'pixelated', 
          position: 'relative', 
          zIndex: 1,
          width: '100vw',
          height: '100vh',
          objectFit: 'contain'
        }}
      />
      
      {/* Authentic CS 1.6 HUD */}
      <div className="absolute inset-0 pointer-events-none select-none" style={{ pointerEvents: 'none' }}>
        {/* Phase banners */}
        {phase !== 'live' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
            <div className="px-4 py-2 bg-black/80 border-2 border-yellow-500 text-yellow-300 font-bold" style={{ imageRendering: 'pixelated' }}>
              {phase === 'team-select' ? 'Select Team' : `Freeze Time — Buy: ${buyTimeRemaining}s`}
            </div>
          </div>
          {stats.bombPlanted && (
            <div className="bg-red-900/80 border-4 border-double border-red-600 px-4 py-2 ml-4"
                 style={{
                   fontFamily: 'monospace',
                   fontSize: '14px',
                   fontWeight: 'bold',
                   color: '#FFAAAA',
                   imageRendering: 'pixelated'
                 }}
                 data-testid="bomb-timer-box">
              💣 BOMB: {stats.bombTimer}s
            </div>
          )}
        )}
        {/* Top HUD - Pixel Art Style */}
        <div className="absolute top-2 left-0 right-0 flex justify-between items-start px-4">
          {/* Round Timer - Pixel Style */}
          <div className="bg-black border-4 border-double border-yellow-500 px-4 py-2" 
               style={{
                 fontFamily: 'monospace',
                 fontSize: '18px',
                 fontWeight: 'bold',
                 color: '#FFD700',
                 imageRendering: 'pixelated',
                 textShadow: '2px 2px 0px #000000'
               }}
               data-testid="round-timer">
            {Math.floor(stats.roundTime / 60)}:{(stats.roundTime % 60).toString().padStart(2, '0')}
  </div>
  
  {/* Team Selection Overlay */}
  {phase === 'team-select' && (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-50">
      <div className="bg-black border-4 border-double border-blue-400 p-6 w-[520px]" style={{ imageRendering: 'pixelated' }}>
        <div className="text-center text-white font-bold text-xl mb-4">CHOOSE TEAM</div>
        <div className="grid grid-cols-3 gap-4">
          <button
            className="p-4 bg-blue-900/40 border-2 border-blue-500 text-blue-200 hover:bg-blue-800/60"
            onClick={() => {
              setStats(prev => ({ ...prev, team: 'ct', money: 800, currentWeapon: 'USP', currentWeaponSlot: 1, ammo: { current: 12, max: 100 } }));
              setPhase('freeze');
              setBuyTimeRemaining(20);
            }}
          >
            CT — Counter‑Terrorists
          </button>
          <button
            className="p-4 bg-red-900/40 border-2 border-red-500 text-red-200 hover:bg-red-800/60"
            onClick={() => {
              setStats(prev => ({ ...prev, team: 't', money: 800, currentWeapon: 'Glock', currentWeaponSlot: 2, ammo: { current: 20, max: 120 } }));
              setPhase('freeze');
              setBuyTimeRemaining(20);
            }}
          >
            T — Terrorists
          </button>
          <button
            className="p-4 bg-gray-800 border-2 border-gray-600 text-gray-200 hover:bg-gray-700"
            onClick={() => {
              // Simple spectator defaults
              setStats(prev => ({ ...prev, team: 'ct' }));
              setPhase('freeze');
              setBuyTimeRemaining(20);
            }}
          >
            SPECTATOR
          </button>
        </div>
      </div>
    </div>
  )}

          {/* Team Score - Pixel Style */}
          <div className="bg-black border-4 border-double border-gray-500 px-6 py-2"
               style={{
                 fontFamily: 'monospace',
                 fontSize: '14px',
                 fontWeight: 'bold',
                 imageRendering: 'pixelated'
               }}
               data-testid="team-score">
            <span style={{ color: '#4A90E2', textShadow: '1px 1px 0px #000000' }}>CT: {ctScore}</span>
            <span style={{ color: '#FFFFFF', margin: '0 8px' }}>|</span>
            <span style={{ color: '#E74C3C', textShadow: '1px 1px 0px #000000' }}>T: {tScore}</span>
          </div>

          {/* FPS and Net - Pixel Style */}
          <div className="text-right space-y-1">
            <div className="bg-black border-2 border-green-500 px-3 py-1"
                 style={{
                   fontFamily: 'monospace',
                   fontSize: '12px',
                   color: '#00FF00',
                   fontWeight: 'bold',
                   textShadow: '1px 1px 0px #000000'
                 }}>
              FPS: {fps}
            </div>
            <div className="bg-black border-2 border-green-500 px-3 py-1"
                 style={{
                   fontFamily: 'monospace',
                   fontSize: '12px',
                   color: '#00FF00',
                   fontWeight: 'bold',
                   textShadow: '1px 1px 0px #000000'
                 }}>
              NET: 32ms
            </div>
          </div>
        </div>
        
        {/* Bottom Left HUD - Health, Armor, Money - Pixel Art Style */}
        <div className="absolute bottom-4 left-4 space-y-2" style={{ pointerEvents: 'none' }}>
          <div className="flex space-x-4 bg-black border-4 border-double border-white px-6 py-3" style={{ pointerEvents: 'none' }}>
            <div className="flex items-center space-x-3" style={{ pointerEvents: 'none' }}>
              {/* Health Icon - Pixel Art Heart */}
              <div style={{ 
                width: '16px', 
                height: '16px', 
                backgroundColor: '#FF0000',
                border: '2px solid #AA0000',
                imageRendering: 'pixelated',
                pointerEvents: 'none'
              }} />
              <span style={{
                fontFamily: 'monospace',
                fontSize: '24px',
                fontWeight: 'bold',
                color: stats.health > 50 ? '#00FF00' : stats.health > 25 ? '#FFFF00' : '#FF0000',
                textShadow: '2px 2px 0px #000000',
                imageRendering: 'pixelated',
                pointerEvents: 'none'
              }} data-testid="cs16-health" data-health={stats.health}>
                {stats.health}
              </span>
            </div>
            <div className="flex items-center space-x-3" style={{ pointerEvents: 'none' }}>
              {/* Armor Icon - Pixel Art Shield */}
              <div style={{ 
                width: '16px', 
                height: '16px', 
                backgroundColor: '#0066FF',
                border: '2px solid #004499',
                imageRendering: 'pixelated',
                pointerEvents: 'none'
              }} />
              <span style={{
                fontFamily: 'monospace',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#4A90E2',
                textShadow: '2px 2px 0px #000000',
                imageRendering: 'pixelated',
                pointerEvents: 'none'
              }} data-testid="cs16-armor">
                {stats.armor}
              </span>
            </div>
          </div>
          
          <div className="bg-black border-4 border-double border-green-500 px-6 py-3" style={{ pointerEvents: 'none' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#00FF00',
              textShadow: '2px 2px 0px #000000',
              imageRendering: 'pixelated',
              pointerEvents: 'none'
            }} data-testid="cs16-money">
              ${stats.money}
            </span>
          </div>
        </div>
        
        {/* Bottom Right HUD - Weapon and Ammo - Pixel Art Style */}
        <div className="absolute bottom-4 right-4 text-right space-y-2" style={{ pointerEvents: 'none' }}>
          <div className="bg-black border-4 border-double border-orange-500 px-6 py-3" style={{ pointerEvents: 'none' }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#FFA500',
              textShadow: '2px 2px 0px #000000',
              imageRendering: 'pixelated',
              pointerEvents: 'none'
            }} data-testid="cs16-weapon">
              {stats.currentWeapon}
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '32px',
              fontWeight: 'bold',
              color: stats.ammo.current > 10 ? '#FFD700' : stats.ammo.current > 5 ? '#FF8800' : '#FF0000',
              textShadow: '3px 3px 0px #000000',
              imageRendering: 'pixelated',
              pointerEvents: 'none'
            }} data-testid="cs16-ammo">
              {stats.ammo.current} / {stats.ammo.max}
            </div>
            {hasBomb && stats.team === 't' && !stats.bombPlanted && (
              <div className="mt-2 text-red-300 text-sm" style={{ imageRendering: 'pixelated' }}>
                You have the bomb — Hold [E] to plant
              </div>
            )}
            {stats.bombPlanted && stats.team === 'ct' && (
              <div className="mt-2 text-blue-300 text-sm" style={{ imageRendering: 'pixelated' }}>
                Bomb planted — Hold [E] to defuse {defuseKit ? '(kit)' : ''}
              </div>
            )}
          </div>
        </div>
        
        {/* Pixel Art Radar */}
        <div className="absolute top-4 right-4 w-48 h-48 bg-black border-4 border-double border-green-500" 
             data-testid="cs16-radar"
             style={{
               imageRendering: 'pixelated'
             }}>
          <div className="relative w-full h-full p-1">
            <div className="absolute top-1 left-2"
                 style={{
                   fontFamily: 'monospace',
                   fontSize: '10px',
                   fontWeight: 'bold',
                   color: '#00FF00',
                   textShadow: '1px 1px 0px #000000',
                   imageRendering: 'pixelated'
                 }}>
              TACTICAL RADAR
            </div>
            <div className="w-full h-full relative mt-4 bg-black border-2 border-green-500">
              {/* Pixel Grid Background */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(to right, #003300 0%, #003300 1px, transparent 1px), linear-gradient(to bottom, #003300 0%, #003300 1px, transparent 1px)',
                backgroundSize: '8px 8px'
              }} />
              
              {/* Map Structures - Pixel Style */}
              <div className="absolute border border-yellow-500" style={{ 
                left: '10%', top: '20%', width: '25%', height: '40%',
                backgroundColor: '#8B4513',
                imageRendering: 'pixelated'
              }} />
              <div className="absolute border border-yellow-500" style={{ 
                left: '70%', top: '15%', width: '20%', height: '30%',
                backgroundColor: '#8B4513',
                imageRendering: 'pixelated'
              }} />
              <div className="absolute border border-yellow-500" style={{ 
                left: '5%', top: '70%', width: '30%', height: '25%',
                backgroundColor: '#8B4513',
                imageRendering: 'pixelated'
              }} />
              
              {/* Spawn Areas - Pixel Blocks */}
              <div className="absolute border-2" style={{ 
                left: '5%', top: '5%', width: '15%', height: '10%',
                backgroundColor: '#0066FF',
                borderColor: '#004499',
                imageRendering: 'pixelated'
              }} />
              <div className="absolute border-2" style={{ 
                left: '80%', top: '85%', width: '15%', height: '10%',
                backgroundColor: '#FF0000',
                borderColor: '#AA0000',
                imageRendering: 'pixelated'
              }} />
              
              {/* Current Player - Pixel Square */}
              <div className="absolute animate-pulse" style={{ 
                left: '48%', top: '48%', width: '6px', height: '6px',
                backgroundColor: stats.team === 'ct' ? '#00FFFF' : '#FFFF00',
                border: '1px solid #FFFFFF',
                transform: 'translate(-50%, -50%)',
                imageRendering: 'pixelated'
              }} />
              
              {/* Teammates - Pixel Dots */}
              <div className="absolute" style={{ 
                left: '20%', top: '30%', width: '4px', height: '4px',
                backgroundColor: stats.team === 'ct' ? '#0066FF' : '#FF0000',
                border: '1px solid #FFFFFF',
                transform: 'translate(-50%, -50%)',
                imageRendering: 'pixelated'
              }} />
              <div className="absolute" style={{ 
                left: '20%', top: '70%', width: '4px', height: '4px',
                backgroundColor: stats.team === 'ct' ? '#0066FF' : '#FF0000',
                border: '1px solid #FFFFFF',
                transform: 'translate(-50%, -50%)',
                imageRendering: 'pixelated'
              }} />
              
              {/* Enemies - Pixel Dots */}
              <div className="absolute" style={{ 
                left: '75%', top: '80%', width: '4px', height: '4px',
                backgroundColor: stats.team === 'ct' ? '#FF0000' : '#0066FF',
                border: '1px solid #FFFFFF',
                transform: 'translate(-50%, -50%)',
                imageRendering: 'pixelated'
              }} />
              
              {/* Crates - Small Pixel Blocks */}
              <div className="absolute" style={{ 
                left: '47%', top: '52%', width: '3px', height: '2px',
                backgroundColor: '#A0522D',
                imageRendering: 'pixelated'
              }} />
              <div className="absolute" style={{ 
                left: '15%', top: '25%', width: '2px', height: '3px',
                backgroundColor: '#A0522D',
                imageRendering: 'pixelated'
              }} />
              <div className="absolute" style={{ 
                left: '10%', top: '75%', width: '3px', height: '3px',
                backgroundColor: '#A0522D',
                imageRendering: 'pixelated'
              }} />
              
              {/* Radar Sweep - Pixel Style */}
              <div className="absolute inset-0 pointer-events-none animate-pulse">
                <div className="absolute inset-0" style={{
                  background: `conic-gradient(from ${Date.now() * 0.05 % 360}deg, transparent 0deg, rgba(0, 255, 0, 0.2) 15deg, transparent 30deg)`,
                  imageRendering: 'pixelated'
                }} />
              </div>
            </div>
            
            {/* Radar Info - Pixel Style */}
            <div className="absolute bottom-1 left-2"
                 style={{
                   fontFamily: 'monospace',
                   fontSize: '8px',
                   color: '#00FF00',
                   textShadow: '1px 1px 0px #000000',
                   imageRendering: 'pixelated'
                 }}>
              <div>RANGE: 100m</div>
              <div>SCAN: ACTIVE</div>
            </div>
          </div>
        </div>
      </div>
      
  {/* Buy Menu - Pixel Art Style */}
  {showBuyMenu.open && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center pointer-events-auto">
          <div className="bg-black border-4 border-double border-yellow-500 p-8 w-96" 
               data-testid="cs16-buy-menu"
               style={{
                 imageRendering: 'pixelated',
                 boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)'
               }}>
            <h2 style={{
              fontFamily: 'monospace',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#FFD700',
              textAlign: 'center',
              textShadow: '2px 2px 0px #000000',
              marginBottom: '16px',
              borderBottom: '3px solid #FFD700',
              paddingBottom: '8px'
            }}>
              *** BUY EQUIPMENT ***
            </h2>
            
            {!showBuyMenu.category ? (
              <div className="space-y-3">
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'primary' }))}
                  className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-yellow-600 hover:border-yellow-500"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    textShadow: '1px 1px 0px #000000',
                    imageRendering: 'pixelated'
                  }}
                >
                  [1] PRIMARY WEAPONS
                </button>
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'secondary' }))}
                  className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-yellow-600 hover:border-yellow-500"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    textShadow: '1px 1px 0px #000000',
                    imageRendering: 'pixelated'
                  }}
                >
                  [2] SECONDARY WEAPONS
                </button>
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'equipment' }))}
                  className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-yellow-600 hover:border-yellow-500"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    textShadow: '1px 1px 0px #000000',
                    imageRendering: 'pixelated'
                  }}
                >
                  [3] EQUIPMENT
                </button>
                <button 
                  onClick={() => setShowBuyMenu(prev => ({ ...prev, category: 'grenades' }))}
                  className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-yellow-600 hover:border-yellow-500"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    textShadow: '1px 1px 0px #000000',
                    imageRendering: 'pixelated'
                  }}
                >
                  [4] GRENADES
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
                      if (stats.money < item.price) {
                        playSound('buttons/weapon_cant_buy.wav');
                        return;
                      }
                      // Equipment handling
                      if (showBuyMenu.category === 'equipment') {
                        if (item.name === 'Defuse Kit' && stats.team === 'ct') {
                          setDefuseKit(true);
                          setStats(prev => ({ ...prev, money: prev.money - item.price }));
                          playSound('items/kevlar.wav', 0.5);
                          setShowBuyMenu({ open: false, category: null });
                          return;
                        }
                        if (item.name.startsWith('Kevlar')) {
                          setStats(prev => ({ ...prev, money: prev.money - item.price, armor: 100 }));
                          playSound('items/kevlar.wav', 0.5);
                          setShowBuyMenu({ open: false, category: null });
                          return;
                        }
                      }
                      // Weapons handling
                      const nameToSlot: Record<string, number> = { 'USP': 1, 'Glock': 2, 'AK-47': 3, 'M4A1': 4, 'AWP': 5 };
                      const slot = nameToSlot[item.name];
                      const weapon = slot ? weapons[slot as 1|2|3|4|5] : undefined;
                      if (weapon) {
                        setStats(prev => ({
                          ...prev,
                          money: prev.money - item.price,
                          currentWeapon: weapon.name,
                          currentWeaponSlot: slot,
                          ammo: { ...weapon.ammo }
                        }));
                        playSound('items/gunpickup2.wav', 0.3);
                        setShowBuyMenu({ open: false, category: null });
                        return;
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
      
      {/* Game Menu - Pixel Art Style */}
      {showMenu && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center pointer-events-auto">
          <div className="bg-black border-4 border-double border-red-500 p-8 w-80" 
               data-testid="cs16-game-menu"
               style={{
                 imageRendering: 'pixelated',
                 boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)'
               }}>
            <h2 style={{
              fontFamily: 'monospace',
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#FF4444',
              textAlign: 'center',
              textShadow: '2px 2px 0px #000000',
              marginBottom: '20px',
              borderBottom: '3px solid #FF4444',
              paddingBottom: '8px'
            }}>
              *** GAME MENU ***
            </h2>
            <div className="space-y-3">
              <button 
                onClick={() => setShowMenu(false)}
                className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-green-600 hover:border-green-400"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textShadow: '1px 1px 0px #000000',
                  imageRendering: 'pixelated'
                }}
              >
                [ESC] RESUME GAME
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-blue-600 hover:border-blue-400"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textShadow: '1px 1px 0px #000000',
                  imageRendering: 'pixelated'
                }}>
                [O] OPTIONS
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-blue-600 hover:border-blue-400"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textShadow: '1px 1px 0px #000000',
                  imageRendering: 'pixelated'
                }}>
                [C] CONTROLS
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-800 border-2 border-white hover:bg-red-600 hover:border-red-400"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textShadow: '1px 1px 0px #000000',
                  imageRendering: 'pixelated'
                }}>
                [Q] DISCONNECT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plant/Defuse Progress */}
      {isPlanting && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 border-2 border-yellow-500 px-6 py-3 text-yellow-300"
             style={{ imageRendering: 'pixelated' }}>
          PLANTING... {Math.round(plantProgress * 100)}%
          <div className="w-64 h-2 bg-gray-700 mt-2">
            <div className="h-2 bg-yellow-400" style={{ width: `${plantProgress * 100}%` }} />
          </div>
        </div>
      )}
      {isDefusing && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 border-2 border-blue-500 px-6 py-3 text-blue-300"
             style={{ imageRendering: 'pixelated' }}>
          DEFUSING... {Math.round(defuseProgress * 100)}% {defuseKit ? '(KIT)' : ''}
          <div className="w-64 h-2 bg-gray-700 mt-2">
            <div className="h-2 bg-blue-400" style={{ width: `${defuseProgress * 100}%` }} />
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
          />
        </div>
      )}
    </div>
  );
};
