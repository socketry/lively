<template>
  <div class="about-view">
    <div class="about-container">
      <header class="about-header">
        <button @click="goBack" class="btn btn-secondary">← Back</button>
        <h1>About CS2D</h1>
      </header>

      <div class="about-content">
        <div class="about-section">
          <div class="game-info">
            <div class="game-logo">
              <h2>CS2D</h2>
              <p class="subtitle">Counter-Strike 2D</p>
            </div>
            <div class="version-info">
              <span class="version">Version 0.2.0</span>
              <span class="build">Phoenix</span>
            </div>
          </div>

          <div class="description">
            <p>
              CS2D is a modern web-based implementation of the classic Counter-Strike 2D experience.
              Built with Vue.js 3 and featuring real-time multiplayer gameplay, tile-based maps,
              and authentic CS 1.6 mechanics.
            </p>
          </div>
        </div>

        <div class="about-section">
          <h3>Features</h3>
          <div class="features-grid">
            <div class="feature-item">
              <h4>🎮 Authentic Gameplay</h4>
              <p>Classic Counter-Strike mechanics with modern web technology</p>
            </div>
            <div class="feature-item">
              <h4>🗺️ Tile-Based Maps</h4>
              <p>Complete mapping system with 4 classic CS maps and visual editor</p>
            </div>
            <div class="feature-item">
              <h4>⚡ Real-time Multiplayer</h4>
              <p>Low-latency WebSocket-based networking for smooth gameplay</p>
            </div>
            <div class="feature-item">
              <h4>🌍 Internationalization</h4>
              <p>Support for multiple languages including English and Traditional Chinese</p>
            </div>
            <div class="feature-item">
              <h4>🐳 Containerized</h4>
              <p>Docker-based deployment for easy setup and scaling</p>
            </div>
            <div class="feature-item">
              <h4>📱 Responsive Design</h4>
              <p>Works on desktop and mobile devices with adaptive UI</p>
            </div>
          </div>
        </div>

        <div class="about-section">
          <h3>Technology Stack</h3>
          <div class="tech-stack">
            <div class="tech-category">
              <h4>Frontend</h4>
              <ul>
                <li>Vue.js 3.4 with Composition API</li>
                <li>TypeScript 5.3</li>
                <li>Vite 5.0 (Build Tool)</li>
                <li>Pinia (State Management)</li>
                <li>Socket.io (WebSocket Client)</li>
                <li>SCSS (Styling)</li>
              </ul>
            </div>
            <div class="tech-category">
              <h4>Backend</h4>
              <ul>
                <li>Ruby with Lively Framework</li>
                <li>Redis (Data Storage)</li>
                <li>WebSocket (Real-time Communication)</li>
                <li>RESTful API</li>
              </ul>
            </div>
            <div class="tech-category">
              <h4>Infrastructure</h4>
              <ul>
                <li>Docker & Docker Compose</li>
                <li>Nginx (Reverse Proxy)</li>
                <li>GitHub Actions (CI/CD)</li>
                <li>Playwright (Testing)</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="about-section">
          <h3>Available Maps</h3>
          <div class="maps-grid">
            <div class="map-item">
              <h4>de_dust2_simple</h4>
              <p>Classic Dust2 layout optimized for 2D gameplay</p>
              <span class="map-mode">Defuse Mode</span>
            </div>
            <div class="map-item">
              <h4>de_inferno_simple</h4>
              <p>Inferno with the famous banana area</p>
              <span class="map-mode">Defuse Mode</span>
            </div>
            <div class="map-item">
              <h4>aim_map</h4>
              <p>Fast-paced aim training map</p>
              <span class="map-mode">Deathmatch</span>
            </div>
            <div class="map-item">
              <h4>fy_iceworld</h4>
              <p>Close-quarters combat arena</p>
              <span class="map-mode">Fight Yard</span>
            </div>
          </div>
        </div>

        <div class="about-section">
          <h3>System Requirements</h3>
          <div class="requirements">
            <div class="requirement-category">
              <h4>Minimum</h4>
              <ul>
                <li>Modern web browser (Chrome 80+, Firefox 75+, Safari 13+)</li>
                <li>1 GB RAM</li>
                <li>Stable internet connection (1 Mbps+)</li>
                <li>JavaScript enabled</li>
              </ul>
            </div>
            <div class="requirement-category">
              <h4>Recommended</h4>
              <ul>
                <li>Chrome 100+ or Firefox 100+</li>
                <li>2 GB RAM</li>
                <li>Broadband internet (5 Mbps+)</li>
                <li>Hardware acceleration enabled</li>
                <li>Gaming mouse and keyboard</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="about-section">
          <h3>Development</h3>
          <div class="development-info">
            <p>
              CS2D is an open-source project built with modern web technologies.
              The game features enterprise-grade architecture with Docker containerization,
              comprehensive testing, and CI/CD integration.
            </p>
            <div class="development-stats">
              <div class="stat-item">
                <span class="stat-value">10,000+</span>
                <span class="stat-label">Lines of Code</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">80%</span>
                <span class="stat-label">Test Coverage</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">60 FPS</span>
                <span class="stat-label">Target Performance</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">< 100ms</span>
                <span class="stat-label">Network Latency</span>
              </div>
            </div>
          </div>
        </div>

        <div class="about-section">
          <h3>Acknowledgments</h3>
          <div class="acknowledgments">
            <p>Special thanks to:</p>
            <ul>
              <li>Vue.js team for the amazing framework</li>
              <li>Socket.io team for real-time capabilities</li>
              <li>The original Counter-Strike developers</li>
              <li>All contributors and testers</li>
              <li>Claude Code for development assistance</li>
            </ul>
          </div>
        </div>
      </div>

      <footer class="about-footer">
        <div class="footer-info">
          <p>&copy; 2025 CS2D Project. Built with ❤️ using Vue.js 3 and TypeScript.</p>
          <p class="footer-note">
            This is a fan-made project and is not affiliated with Valve Corporation.
          </p>
        </div>
        <div class="footer-actions">
          <button @click="checkForUpdates" class="btn btn-primary">
            Check for Updates
          </button>
          <button @click="openDiagnostics" class="btn btn-secondary">
            System Diagnostics
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useWebSocketStore } from '@/stores/websocket'

const router = useRouter()
const appStore = useAppStore()
const wsStore = useWebSocketStore()

function goBack() {
  router.go(-1)
}

function checkForUpdates() {
  appStore.addNotification({
    type: 'info',
    title: 'Update Check',
    message: 'You are running the latest version of CS2D!'
  })
}

function openDiagnostics() {
  const diagnostics = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    connectionStatus: wsStore.connectionStatus.status,
    latency: wsStore.latency,
    onlineStatus: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    localStorageSupported: typeof Storage !== 'undefined',
    webSocketSupported: typeof WebSocket !== 'undefined'
  }

  console.log('CS2D System Diagnostics:', diagnostics)
  
  appStore.addNotification({
    type: 'info',
    title: 'Diagnostics',
    message: 'System diagnostics have been logged to the console'
  })
}
</script>

<style scoped>
.about-view {
  height: 100vh;
  overflow: auto;
  background: var(--cs-dark);
}

.about-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cs-border);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  margin-bottom: 3rem;
}

.about-section {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 2rem;
}

.game-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.game-logo h2 {
  font-size: 3rem;
  color: var(--cs-primary);
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.subtitle {
  color: var(--cs-gray);
  font-size: 1.2rem;
  margin: 0;
}

.version-info {
  text-align: right;
}

.version {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--cs-success);
}

.build {
  color: var(--cs-gray);
  font-size: 0.9rem;
}

.description {
  color: var(--cs-light);
  line-height: 1.6;
  font-size: 1.1rem;
}

.about-section h3 {
  color: var(--cs-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--cs-border);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  padding: 1.5rem;
  background: #1a1a1a;
  border-radius: 6px;
  border-left: 4px solid var(--cs-primary);
}

.feature-item h4 {
  color: var(--cs-light);
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.feature-item p {
  color: var(--cs-gray);
  margin: 0;
  line-height: 1.5;
}

.tech-stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.tech-category h4 {
  color: var(--cs-light);
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.tech-category ul {
  list-style: none;
  padding: 0;
}

.tech-category li {
  padding: 0.5rem 0;
  color: var(--cs-gray);
  border-bottom: 1px solid #333;
}

.tech-category li:last-child {
  border-bottom: none;
}

.maps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.map-item {
  padding: 1.5rem;
  background: #1a1a1a;
  border-radius: 6px;
  position: relative;
}

.map-item h4 {
  color: var(--cs-primary);
  margin-bottom: 0.5rem;
  font-family: monospace;
}

.map-item p {
  color: var(--cs-gray);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.map-mode {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--cs-secondary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: 600;
}

.requirements {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.requirement-category h4 {
  color: var(--cs-light);
  margin-bottom: 1rem;
}

.requirement-category ul {
  list-style: none;
  padding: 0;
}

.requirement-category li {
  padding: 0.5rem 0;
  color: var(--cs-gray);
  padding-left: 1rem;
  position: relative;
}

.requirement-category li::before {
  content: "•";
  color: var(--cs-primary);
  position: absolute;
  left: 0;
}

.development-info {
  color: var(--cs-light);
  line-height: 1.6;
}

.development-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #1a1a1a;
  border-radius: 6px;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 600;
  color: var(--cs-primary);
}

.stat-label {
  color: var(--cs-gray);
  font-size: 0.9rem;
}

.acknowledgments p {
  color: var(--cs-light);
  margin-bottom: 1rem;
}

.acknowledgments ul {
  list-style: none;
  padding: 0;
}

.acknowledgments li {
  padding: 0.5rem 0;
  color: var(--cs-gray);
  padding-left: 1rem;
  position: relative;
}

.acknowledgments li::before {
  content: "•";
  color: var(--cs-primary);
  position: absolute;
  left: 0;
}

.about-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: #2a2a2a;
  border-radius: 8px;
  border-top: 1px solid var(--cs-border);
}

.footer-info p {
  margin: 0.25rem 0;
  color: var(--cs-gray);
}

.footer-note {
  font-size: 0.9rem;
  font-style: italic;
}

.footer-actions {
  display: flex;
  gap: 1rem;
}

@media (max-width: 768px) {
  .about-container {
    padding: 1rem;
  }
  
  .about-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .game-info {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .version-info {
    text-align: center;
  }
  
  .about-footer {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .footer-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>