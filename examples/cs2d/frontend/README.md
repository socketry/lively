# 🎮 CS2D Frontend - Vue.js 3 + TypeScript

Modern, performant frontend for CS2D game built with Vue.js 3, TypeScript, and WebSocket real-time communication.

## ✨ Features

- 🎯 **Vue.js 3.4** with Composition API
- 📝 **TypeScript** for type safety
- 🚀 **Vite 5** for lightning-fast development
- 🏪 **Pinia** for state management
- 🔌 **Socket.io** for real-time WebSocket communication
- 🎨 **SCSS** with CSS Modules
- 🧪 **Vitest** for unit testing
- 🎭 **Playwright** for E2E testing
- 🔍 **ESLint + Prettier** for code quality
- 🪝 **Husky + lint-staged** for pre-commit hooks
- 📦 **PWA** support with offline capabilities

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:5173
```

## 📦 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run test            # Run unit tests
npm run test:ui         # Run tests with UI
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Lint code
npm run lint:style      # Lint styles
npm run format          # Format code with Prettier
npm run type-check      # Type check with TypeScript

# Git Hooks
npm run prepare         # Setup Husky
npm run pre-commit      # Run pre-commit checks
npm run commit          # Commit with Commitizen
```

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── assets/          # Static assets
│   ├── components/      # Vue components
│   │   ├── base/       # Base components
│   │   ├── common/     # Common UI components
│   │   ├── features/   # Feature components
│   │   └── layout/     # Layout components
│   ├── composables/     # Vue composables
│   ├── locales/         # i18n translations
│   ├── router/          # Vue Router config
│   ├── services/        # API services
│   │   ├── websocket.ts # WebSocket client
│   │   └── api.ts      # REST API client
│   ├── stores/          # Pinia stores
│   │   ├── app.ts      # App state
│   │   ├── auth.ts     # Authentication
│   │   ├── game.ts     # Game state
│   │   └── websocket.ts # WebSocket state
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── views/           # Page components
│   ├── App.vue          # Root component
│   └── main.ts          # Entry point
├── tests/
│   ├── e2e/            # E2E tests
│   ├── unit/           # Unit tests
│   └── setup.ts        # Test setup
├── public/             # Public assets
├── .husky/             # Git hooks
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Vite config
├── vitest.config.ts    # Vitest config
└── playwright.config.ts # Playwright config
```

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
VITE_WS_URL=ws://localhost:9292
VITE_API_URL=http://localhost:9294
VITE_ENV=development
VITE_DEBUG=true
```

### VS Code Settings

Recommended extensions:

- Vue - Official
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- Stylelint
- GitLens

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Debug mode
npm run test:e2e:debug

# Specific browser
npx playwright test --project=chromium
```

## 📝 Code Quality

### Pre-commit Hooks

Automatically runs on commit:

1. ESLint - Fix JavaScript/TypeScript issues
2. Prettier - Format code
3. Stylelint - Fix CSS/SCSS issues
4. Type Check - Verify TypeScript types
5. Unit Tests - Run affected tests

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Use Commitizen for guided commits
npm run commit

# Or write manually
git commit -m "feat(game): add weapon switching"
```

### Code Review Checklist

- [ ] TypeScript types are properly defined
- [ ] Components follow Vue.js best practices
- [ ] State management is consistent
- [ ] WebSocket events are handled properly
- [ ] Error handling is implemented
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Performance impact is considered

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Output in dist/ directory
```

### Docker

```bash
# Build Docker image
docker build -t cs2d-frontend .

# Run container
docker run -p 80:80 cs2d-frontend
```

### CI/CD

GitHub Actions workflow automatically:

1. Runs linting and type checking
2. Executes unit and E2E tests
3. Builds production bundle
4. Deploys to staging/production

## 🔌 WebSocket Events

### Client → Server

```typescript
// Room events
'room:create'
'room:join'
'room:leave'

// Game events
'game:player:move'
'game:player:shoot'
'game:player:reload'

// Chat events
'chat:message'
```

### Server → Client

```typescript
// Room events
'room:created'
'room:joined'
'room:updated'

// Game events
'game:state'
'game:player:spawn'
'game:player:death'

// Chat events
'chat:message'
'chat:user:joined'
```

## 📊 Performance

### Metrics

- **Bundle Size**: < 300KB gzipped
- **First Paint**: < 1s
- **Time to Interactive**: < 2s
- **Lighthouse Score**: > 90

### Optimizations

- Code splitting with dynamic imports
- Tree shaking unused code
- Lazy loading routes and components
- WebSocket connection pooling
- Virtual scrolling for long lists
- Canvas rendering for game
- Web Workers for heavy computations

## 🐛 Debugging

### Vue DevTools

Install [Vue DevTools](https://devtools.vuejs.org/) browser extension for:

- Component inspection
- State management debugging
- Performance profiling
- Event tracking

### Network Debugging

```typescript
// Enable debug mode
localStorage.setItem('debug', 'socket.io-client:*')

// View WebSocket frames in browser DevTools
// Network tab → WS → Frames
```

## 📚 Documentation

- [Development Guide](./DEVELOPMENT_GUIDE.md) - Detailed development guidelines
- [API Documentation](./docs/API.md) - WebSocket and REST API reference
- [Component Library](./docs/COMPONENTS.md) - Reusable components
- [State Management](./docs/STATE.md) - Pinia stores documentation

## 🤝 Contributing

Please read our [Contributing Guide](../CONTRIBUTING.md) before submitting a Pull Request.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`npm run commit`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- Vue.js team for the amazing framework
- Vite team for the blazing fast build tool
- Socket.io team for real-time capabilities
- All contributors and testers

---

**Built with ❤️ using Vue.js 3 and TypeScript**

_Version: 0.2.0 | Last Updated: August 2025_
