# 🚀 CS2D Frontend Development Guide

## 📋 Table of Contents

1. [Technology Stack](#technology-stack)
2. [Development Setup](#development-setup)
3. [Code Quality Standards](#code-quality-standards)
4. [Git Workflow](#git-workflow)
5. [Component Guidelines](#component-guidelines)
6. [State Management](#state-management)
7. [WebSocket Communication](#websocket-communication)
8. [Testing Strategy](#testing-strategy)
9. [Performance Optimization](#performance-optimization)
10. [Deployment](#deployment)

## 🎯 Technology Stack

### Core Framework

- **Vue.js 3.4** - Progressive JavaScript framework
- **TypeScript 5.3** - Type safety and better IDE support
- **Vite 5.0** - Fast build tool and dev server

### State & Routing

- **Pinia 2.1** - State management (replacing Vuex)
- **Vue Router 4.2** - Client-side routing

### Styling

- **SCSS** - CSS preprocessor
- **CSS Modules** - Scoped styling
- **PostCSS** - CSS transformations

### Code Quality

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Stylelint** - CSS/SCSS linting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting
- **Commitlint** - Commit message linting

### Testing

- **Vitest** - Unit testing framework
- **Playwright** - E2E testing
- **Vue Test Utils** - Component testing

### Real-time & Networking

- **Socket.io Client** - WebSocket communication
- **Axios** - HTTP client

### Game Engine

- **Pixi.js** - 2D WebGL renderer

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/cs2d.git
cd cs2d/frontend

# Install dependencies
npm install

# Setup git hooks
npm run prepare

# Start development server
npm run dev
```

### Environment Variables

Create `.env.local` file:

```env
# WebSocket server
VITE_WS_URL=ws://localhost:9292

# API server
VITE_API_URL=http://localhost:9294

# Environment
VITE_ENV=development

# Debug mode
VITE_DEBUG=true
```

## 📏 Code Quality Standards

### TypeScript Guidelines

#### ✅ DO:

```typescript
// Use explicit types for function parameters and return values
function calculateDamage(weapon: Weapon, distance: number): number {
  return weapon.damage * (1 - distance / weapon.range)
}

// Use interfaces for object shapes
interface Player {
  id: string
  name: string
  position: Position
  health: number
}

// Use enums for constants
enum Team {
  CT = 'ct',
  T = 't',
  SPECTATOR = 'spectator'
}

// Use type guards
function isPlayer(entity: Entity): entity is Player {
  return 'health' in entity && 'team' in entity
}
```

#### ❌ DON'T:

```typescript
// Avoid any type
let data: any = fetchData() // Bad

// Avoid non-null assertions without checks
const name = player!.name // Bad

// Avoid magic numbers
if (health < 30) {
  /* ... */
} // Bad - use constants
```

### Vue Component Guidelines

#### Component Structure

```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import type { Player } from '@/types'

// 2. Props
const props = defineProps<{
  player: Player
  showHealth?: boolean
}>()

// 3. Emits
const emit = defineEmits<{
  'update:player': [player: Player]
  action: [type: string, payload: any]
}>()

// 4. Reactive state
const isLoading = ref(false)
const error = ref<Error | null>(null)

// 5. Computed properties
const displayName = computed(() => props.player.name || 'Anonymous')

// 6. Methods
function handleAction() {
  // Implementation
}

// 7. Lifecycle hooks
onMounted(() => {
  // Setup code
})

// 8. Watchers (if needed)
watch(
  () => props.player,
  (newPlayer) => {
    // Handle player change
  }
)
</script>

<style scoped lang="scss">
@import '@/styles/variables';

// Component styles
</style>
```

#### Naming Conventions

- **Components**: PascalCase (`PlayerCard.vue`)
- **Props**: camelCase (`showHealth`)
- **Events**: kebab-case (`update:player`)
- **CSS Classes**: kebab-case (`.player-card`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- **Composables**: camelCase with 'use' prefix (`useWebSocket`)

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Testing changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes

#### Examples:

```bash
feat(game): add weapon switching functionality

- Implement weapon wheel UI
- Add keyboard shortcuts (1-5)
- Update weapon state in store

Closes #123
```

## 🌊 Git Workflow

### Branch Strategy

```
main
  ├── develop
  │     ├── feature/weapon-system
  │     ├── feature/map-editor
  │     └── feature/chat-system
  ├── release/v0.2.0
  └── hotfix/critical-bug
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation
- `test/` - Testing improvements
- `perf/` - Performance improvements

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes following coding standards
3. Commit with conventional commits
4. Push branch and create PR
5. Pass all CI checks
6. Get code review approval
7. Squash and merge to `develop`

## 🧩 Component Guidelines

### Component Categories

#### 1. **Base Components** (`@/components/base/`)

Reusable, generic components:

```typescript
// BaseButton.vue
// BaseInput.vue
// BaseModal.vue
```

#### 2. **Layout Components** (`@/components/layout/`)

Page structure components:

```typescript
// AppHeader.vue
// AppSidebar.vue
// AppFooter.vue
```

#### 3. **Feature Components** (`@/components/features/`)

Business logic components:

```typescript
// GameCanvas.vue
// ChatBox.vue
// WeaponSelector.vue
```

#### 4. **Common Components** (`@/components/common/`)

Shared UI components:

```typescript
// LoadingSpinner.vue
// ErrorMessage.vue
// NotificationToast.vue
```

### Composables Pattern

Create reusable logic with composables:

```typescript
// composables/useGameControls.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useGameControls() {
  const keys = ref<Set<string>>(new Set())

  function handleKeyDown(e: KeyboardEvent) {
    keys.value.add(e.key)
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys.value.delete(e.key)
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return {
    keys,
    isPressed: (key: string) => keys.value.has(key)
  }
}
```

## 🏪 State Management

### Store Organization

```typescript
// stores/game.ts
export const useGameStore = defineStore('game', () => {
  // State
  const players = ref<Map<string, Player>>(new Map())
  const gameState = ref<GameState>('idle')

  // Getters
  const alivePlayers = computed(() => Array.from(players.value.values()).filter((p) => p.isAlive))

  // Actions
  function addPlayer(player: Player) {
    players.value.set(player.id, player)
  }

  return {
    // Expose state
    players: readonly(players),
    gameState: readonly(gameState),

    // Expose getters
    alivePlayers,

    // Expose actions
    addPlayer
  }
})
```

### Store Best Practices

1. **Use composition API syntax** for stores
2. **Keep stores focused** - one domain per store
3. **Use readonly** for exposed state
4. **Avoid direct mutations** outside actions
5. **Use getters** for derived state

## 🔌 WebSocket Communication

### Message Format

```typescript
interface WebSocketMessage {
  type: string
  data?: any
  timestamp: number
  sequence?: number
}
```

### Event Naming Convention

```typescript
// Namespace:action format
'room:create'
'room:join'
'room:leave'
'game:start'
'game:player:move'
'game:player:shoot'
'chat:message'
```

### Client-Side Prediction

```typescript
// Send input immediately
function movePlayer(dx: number, dy: number) {
  // Apply locally (prediction)
  player.x += dx
  player.y += dy

  // Send to server
  ws.send('game:player:move', {
    dx,
    dy,
    sequence: ++inputSequence
  })

  // Store for reconciliation
  pendingInputs.push({ dx, dy, sequence: inputSequence })
}

// Reconcile with server state
function reconcile(serverState: GameState) {
  // Apply server state
  player.x = serverState.x
  player.y = serverState.y

  // Re-apply unacknowledged inputs
  const unprocessed = pendingInputs.filter((i) => i.sequence > serverState.lastProcessed)

  unprocessed.forEach((input) => {
    player.x += input.dx
    player.y += input.dy
  })
}
```

## 🧪 Testing Strategy

### Unit Testing

```typescript
// tests/unit/stores/game.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'

describe('Game Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should add player correctly', () => {
    const store = useGameStore()
    const player = { id: '1', name: 'Test', health: 100 }

    store.addPlayer(player)

    expect(store.players.get('1')).toEqual(player)
  })
})
```

### Component Testing

```typescript
// tests/unit/components/PlayerCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerCard from '@/components/PlayerCard.vue'

describe('PlayerCard', () => {
  it('renders player name', () => {
    const wrapper = mount(PlayerCard, {
      props: {
        player: { name: 'John', health: 100 }
      }
    })

    expect(wrapper.text()).toContain('John')
  })
})
```

### E2E Testing

```typescript
// tests/e2e/lobby.test.ts
import { test, expect } from '@playwright/test'

test('create and join room', async ({ page }) => {
  await page.goto('/lobby')

  // Create room
  await page.fill('#room-name', 'Test Room')
  await page.click('#create-room')

  // Verify redirect to room
  await expect(page).toHaveURL(/\/room\//)
})
```

## ⚡ Performance Optimization

### Code Splitting

```typescript
// Lazy load routes
const GameView = () => import('@/views/GameView.vue')

// Lazy load heavy components
const MapEditor = defineAsyncComponent(() => import('@/components/MapEditor.vue'))
```

### Asset Optimization

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-vue': ['vue', 'vue-router', 'pinia'],
        'vendor-game': ['pixi.js'],
        'vendor-utils': ['dayjs', 'lodash-es']
      }
    }
  }
}
```

### Performance Monitoring

```typescript
// utils/performance.ts
export function measurePerformance(name: string, fn: () => void) {
  performance.mark(`${name}-start`)
  fn()
  performance.mark(`${name}-end`)
  performance.measure(name, `${name}-start`, `${name}-end`)

  const measure = performance.getEntriesByName(name)[0]
  console.log(`[Performance] ${name}: ${measure.duration}ms`)
}
```

### Memory Management

```typescript
// Cleanup in components
onUnmounted(() => {
  // Remove event listeners
  window.removeEventListener('resize', handleResize)

  // Clear timers
  clearInterval(updateTimer)

  // Dispose WebGL resources
  gameRenderer?.destroy()

  // Clear references
  players.value.clear()
})
```

## 🚀 Deployment

### Build for Production

```bash
# Type check
npm run type-check

# Run tests
npm run test
npm run test:e2e

# Build
npm run build

# Preview build
npm run preview
```

### Docker Deployment

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### Environment-Specific Builds

```bash
# Development
npm run build -- --mode development

# Staging
npm run build -- --mode staging

# Production
npm run build -- --mode production
```

## 📚 Additional Resources

### Documentation

- [Vue.js 3 Docs](https://vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Pinia Docs](https://pinia.vuejs.org/)

### Tools

- [Vue DevTools](https://devtools.vuejs.org/)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Bundle Analyzer](https://www.npmjs.com/package/rollup-plugin-visualizer)

### Best Practices

- [Vue Style Guide](https://vuejs.org/style-guide/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Web Performance](https://web.dev/performance/)

---

## 🤝 Contributing

Please read our [Contributing Guide](../CONTRIBUTING.md) before submitting a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

_Last Updated: August 2025_
_Version: 0.2.0_
