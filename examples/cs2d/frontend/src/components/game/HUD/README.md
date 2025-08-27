# CS2D HUD System

A comprehensive React-based HUD (Heads-Up Display) system for the CS2D game, featuring modern UI components, smooth animations, and authentic Counter-Strike-style design.

## Overview

The HUD system provides all essential game interface elements including health/armor display, weapon information, minimap, kill feed, buy menu, scoreboard, and more. It's designed to be responsive, performant, and visually appealing while maintaining the authentic Counter-Strike feel.

## Architecture

### Main Component: GameHUD
The `GameHUD` component serves as the main container and coordinator for all HUD elements. It handles:
- State management for all HUD components
- Keyboard input handling (B for buy menu, TAB for scoreboard, Z/X/C for radio)
- Event coordination between game logic and UI components
- Notification system management

### Individual HUD Components

1. **HealthArmorHUD** - Health/armor bars with visual indicators
2. **AmmoWeaponHUD** - Weapon information and ammo counters
3. **ScoreTimerHUD** - Round timer, team scores, bomb timer
4. **KillFeedHUD** - Recent kills with animations
5. **MiniMapHUD** - Overhead map view with player positions
6. **CrosshairHUD** - Customizable crosshair with hit markers
7. **WeaponInventoryHUD** - Weapon slots and selection
8. **BuyMenuHUD** - Equipment purchase interface
9. **ScoreboardHUD** - Player statistics and team information
10. **RadioMenuHUD** - Quick communication commands
11. **NotificationsHUD** - Game event notifications
12. **DeathScreenHUD** - Death information and spectate controls
13. **RoundEndHUD** - Round results and statistics

## Features

### Visual Design
- Authentic Counter-Strike color scheme (blue for CT, red for T)
- Smooth CSS animations and transitions
- Responsive scaling for different screen sizes
- High DPI display support
- Glassmorphism effects with transparency

### Functionality
- Real-time data updates from game state
- Interactive elements with hover effects
- Keyboard shortcuts for all menus
- Context-sensitive displays (buy menu only in freeze time)
- Multi-kill detection and special effects
- MVP tracking and round statistics

### Performance
- React.memo optimization for minimal re-renders
- Efficient state management
- CSS-based animations (no JavaScript animations)
- Minimal DOM manipulation
- Lazy loading of complex components

## Usage

### Basic Integration
```tsx
import { GameHUD } from './components/game/HUD/GameHUD';

// In your game component
<GameHUD
  player={localPlayer}
  gameState={gameState}
  allPlayers={allPlayers}
  killFeed={killFeed}
  onWeaponSwitch={handleWeaponSwitch}
  onBuyItem={handleBuyItem}
  onRadioCommand={handleRadioCommand}
  fps={fps}
  ping={ping}
/>
```

### Individual Components
```tsx
import { HealthArmorHUD, AmmoWeaponHUD } from './components/game/HUD';

// Use individual components
<HealthArmorHUD health={100} armor={50} money={16000} />
<AmmoWeaponHUD 
  currentWeapon="ak47" 
  currentAmmo={30} 
  reserveAmmo={90}
  isReloading={false}
  reloadProgress={0}
/>
```

## Data Requirements

### Player Object
```typescript
interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  health: number;
  armor: number;
  money: number;
  kills: number;
  deaths: number;
  assists: number;
  currentWeapon: string;
  weapons: string[];
  ammo: Map<string, number>;
  isAlive: boolean;
  position: { x: number; y: number };
  orientation?: number;
}
```

### Game State Object
```typescript
interface GameState {
  roundTime: number;
  bombPlanted: boolean;
  bombTimer?: number;
  ctScore: number;
  tScore: number;
  roundPhase: 'warmup' | 'freeze' | 'live' | 'post';
  mvpPlayer?: string;
}
```

## Keyboard Controls

- **B** - Toggle buy menu (freeze time only)
- **TAB** - Hold for scoreboard
- **Z/X/C** - Radio command menus
- **1-5** - Weapon selection
- **ESC** - Close any open menu
- **Arrow Keys** - Navigate menus

## Customization

### Crosshair Settings
```typescript
const crosshairSettings = {
  size: 20,
  thickness: 2,
  gap: 4,
  color: '#00FF00',
  opacity: 0.8,
  dynamic: true,
  style: 'classic' // 'classic', 'dot', 'circle', 'cross'
};
```

### Theme Colors
The HUD uses CSS custom properties for easy theming:
```css
:root {
  --hud-ct-color: #4169E1;
  --hud-t-color: #DC143C;
  --hud-bg-primary: rgba(0, 0, 0, 0.8);
  --hud-bg-secondary: rgba(31, 41, 55, 0.9);
  --hud-text-primary: #FFFFFF;
  --hud-text-secondary: #D1D5DB;
}
```

## Animations

### CSS Animations Used
- `healthPulse` - Low health warning
- `crosshairHit` - Hit marker feedback  
- `slideInFromRight` - Kill feed entries
- `bounceIn` - Notifications
- `modalFadeIn` - Menu transitions
- `scoreboardSlide` - Scoreboard entrance
- `timerFlash` - Critical timer warnings

### Performance Considerations
- All animations use CSS transforms and opacity
- Hardware acceleration enabled with `will-change`
- Animations pause when not visible
- Reduced motion support for accessibility

## Browser Compatibility

- Chrome 80+
- Firefox 72+
- Safari 13+
- Edge 80+

## Development

### Adding New HUD Elements
1. Create component in `/HUD/` directory
2. Add to `GameHUD.tsx` imports and JSX
3. Update `index.ts` exports
4. Add TypeScript interfaces if needed
5. Update this README

### Testing
- All components support React development tools
- Debug overlays available in development mode
- Console logging for event handling
- Performance monitoring built-in

## Future Enhancements

- Voice chat integration indicators
- Customizable HUD layouts
- Color blind accessibility options
- Additional crosshair styles
- More detailed statistics tracking
- Team communication history
- Spectator-specific features

---

This HUD system provides a complete, modern interface for the CS2D game while maintaining the authentic Counter-Strike experience that players expect.