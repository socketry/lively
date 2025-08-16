# TailwindCSS Integration Guide for CS2D

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--cs-primary: #ff6b00     /* Orange - Main brand color */
--cs-secondary: #00a8ff   /* Blue - Secondary actions */
--cs-success: #00ff00     /* Green - Success states */
--cs-danger: #ff0000      /* Red - Error/danger states */
--cs-warning: #ffaa00     /* Yellow - Warning states */

/* Team Colors */
--team-ct: #0066cc        /* Counter-Terrorist blue */
--team-t: #cc6600         /* Terrorist orange */
--team-spectator: #999999 /* Spectator gray */
```

### Typography Scale
- `text-xs`: 0.75rem - UI labels, badges
- `text-sm`: 0.875rem - Secondary text, descriptions
- `text-base`: 1rem - Body text
- `text-lg`: 1.125rem - Subheadings
- `text-xl`: 1.25rem - Section headers
- `text-2xl`: 1.5rem - Page titles
- `text-3xl`: 1.875rem - Hero text

### Spacing System
- `space-y-2`: 0.5rem vertical spacing
- `gap-4`: 1rem grid/flex gap
- `p-4`: 1rem padding
- `m-8`: 2rem margin

## 🧩 Component Classes

### Buttons
```tsx
// Primary button
<button className="btn-cs">
  Join Game
</button>

// Secondary button
<button className="px-4 py-2 border border-cs-primary text-cs-primary rounded hover:bg-cs-primary hover:text-white transition-colors">
  Spectate
</button>

// Danger button
<button className="px-4 py-2 bg-cs-danger text-white rounded hover:bg-red-700 transition-colors">
  Leave Game
</button>
```

### Cards
```tsx
// Game room card
<div className="card-cs hover:scale-105 transition-transform cursor-pointer">
  <h3 className="text-lg font-bold text-cs-primary">Room Name</h3>
  <p className="text-sm text-gray-400">Players: 12/24</p>
</div>

// Player card
<div className="bg-cs-dark border border-cs-border rounded-lg p-3 flex items-center justify-between">
  <span className="text-white">{playerName}</span>
  <span className={cn("text-sm", getHealthColor(health))}>{health} HP</span>
</div>
```

### Forms
```tsx
// Input field
<input 
  type="text"
  className="w-full px-3 py-2 bg-cs-dark border border-cs-border rounded focus:border-cs-primary focus:outline-none transition-colors"
  placeholder="Enter player name"
/>

// Select dropdown
<select className="w-full px-3 py-2 bg-cs-dark border border-cs-border rounded focus:border-cs-primary focus:outline-none">
  <option>Select team</option>
  <option value="ct">Counter-Terrorist</option>
  <option value="t">Terrorist</option>
</select>
```

### Status Indicators
```tsx
// Connection status
<div className="flex items-center gap-2">
  <div className={cn(
    "w-2 h-2 rounded-full",
    isConnected ? "bg-cs-success animate-pulse" : "bg-cs-danger"
  )} />
  <span className="text-sm text-gray-400">
    {isConnected ? "Connected" : "Disconnected"}
  </span>
</div>

// Player health bar
<div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
  <div 
    className={cn(
      "h-full transition-all duration-300",
      getHealthColor(health)
    )}
    style={{ width: `${health}%` }}
  />
</div>
```

## 🎮 Game-Specific Utilities

### Team Styling
```tsx
import { getTeamStyles } from '@/utils/tailwind';

<div className={getTeamStyles(player.team)}>
  {player.name}
</div>
```

### Weapon Rarity
```tsx
import { gameClasses } from '@/utils/tailwind';

<span className={gameClasses[weapon.rarity]}>
  {weapon.name}
</span>
```

### Animations
- `animate-damage-flash`: Red flash for damage indication
- `animate-reload`: Rotation animation for reload
- `animate-defuse`: Progress bar for bomb defuse
- `animate-plant`: Scale animation for bomb plant

## 📱 Responsive Design

### Breakpoints
- `xs:` 475px - Mobile landscape
- `sm:` 640px - Tablet portrait
- `md:` 768px - Tablet landscape
- `lg:` 1024px - Small desktop
- `xl:` 1280px - Desktop
- `2xl:` 1536px - Large desktop
- `3xl:` 1920px - Full HD

### Mobile-First Approach
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid layout */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text sizing */}
</div>
```

## 🌙 Dark Mode

Dark mode is enabled by default with `darkMode: 'class'` strategy.

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// Dark mode specific styles
<div className="bg-white dark:bg-cs-dark text-black dark:text-white">
  Content adapts to theme
</div>
```

## ⚡ Performance Tips

1. **Use PurgeCSS**: Automatically removes unused styles in production
2. **Avoid @apply in components**: Use utility classes directly
3. **Group utilities**: Use `cn()` helper for conditional classes
4. **Leverage JIT mode**: Generates styles on-demand
5. **Use CSS variables**: For dynamic values that change frequently

## 🔧 Utility Helpers

### cn() - Class Name Merger
```tsx
import { cn } from '@/utils/tailwind';

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  {
    "object-syntax": true,
    "not-applied": false
  }
)}>
```

### Dynamic Classes
```tsx
// Health-based coloring
<span className={getHealthColor(player.health)}>
  {player.health} HP
</span>

// Team-based styling
<div className={getTeamStyles(player.team)}>
  {player.name}
</div>
```

## 📋 Migration Checklist

- [x] TailwindCSS installed and configured
- [x] PostCSS setup complete
- [x] CSS Modules removed
- [x] Components use Tailwind utilities
- [x] Custom utility helpers created
- [x] Dark mode implemented
- [x] Responsive design verified
- [x] Performance optimized
- [x] Documentation complete

## 🚀 Next Steps

1. **Component Library**: Build reusable Tailwind components
2. **Design Tokens**: Create consistent design variables
3. **Animation Library**: Expand game-specific animations
4. **Theme Variants**: Add team-specific themes
5. **A11y Improvements**: Enhance accessibility with Tailwind

---

Generated with Multi-Agent Development System
