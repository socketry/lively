import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigate } from "react-router-dom"
import { useAppStore } from '@/stores/app'
import { useWebSocketStore } from '@/stores/websocket'
import styles from './AboutView.module.css';

interface AboutViewProps {
  // TODO: Define props from Vue component
}

export const AboutView: React.FC<AboutViewProps> = (props) => {
  const navigate = useNavigate();
  
  
const navigate = useNavigate()
const appStore = useApp()
const wsStore = useWebSocket()

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

  return (
    <div className={styles.container}>
      <div className="about-view">
    <div className="about-container">
      <header className="about-header">
        <button onClick={goBack} className="btn btn-secondary">← Back</button>)}
        <h1>About CS2D</h1>)}
      </header>

      <div className="about-content">
        <div className="about-section">
          <div className="game-info">
            <div className="game-logo">
              <h2>CS2D</h2>)}
              <p className="subtitle">Counter-Strike 2D</p>)}
            </div>
            <div className="version-info">
              <span className="version">Version 0.2.0</span>)}
              <span className="build">Phoenix</span>)}
            </div>
          </div>)}

          <div className="description">
            <p>
              CS2D is a modern web-based implementation of the classic Counter-Strike 2D experience.
              Built with Vue.js 3 and featuring real-time multiplayer gameplay, tile-based maps,
              and authentic CS 1.6 mechanics.
            </p>)}
          </div>
        </div>)}

        <div className="about-section">
          <h3>Features</h3>)}
          <div className="features-grid">
            <div className="feature-item">
              <h4>🎮 Authentic Gameplay</h4>)}
              <p>Classic Counter-Strike mechanics with modern web technology</p>)}
            </div>
            <div className="feature-item">
              <h4>🗺️ Tile-Based Maps</h4>)}
              <p>Complete mapping system with 4 classic CS maps and visual editor</p>)}
            </div>
            <div className="feature-item">
              <h4>⚡ Real-time Multiplayer</h4>)}
              <p>Low-latency WebSocket-based networking for smooth gameplay</p>)}
            </div>
            <div className="feature-item">
              <h4>🌍 Internationalization</h4>)}
              <p>Support for multiple languages including English and Traditional Chinese</p>)}
            </div>
            <div className="feature-item">
              <h4>🐳 Containerized</h4>)}
              <p>Docker-based deployment for easy setup and scaling</p>)}
            </div>
            <div className="feature-item">
              <h4>📱 Responsive Design</h4>)}
              <p>Works on desktop and mobile devices with adaptive UI</p>)}
            </div>
          </div>)}
        </div>

        <div className="about-section">
          <h3>Technology Stack</h3>)}
          <div className="tech-stack">
            <div className="tech-category">
              <h4>Frontend</h4>)}
              <ul>
                <li>Vue.js 3.4 with Composition API</li>)}
                <li>TypeScript 5.3</li>)}
                <li>Vite 5.0 (Build Tool)</li>)}
                <li>Pinia (State Management)</li>)}
                <li>Socket.io (WebSocket Client)</li>)}
                <li>SCSS (Styling)</li>)}
              </ul>
            </div>)}
            <div className="tech-category">
              <h4>Backend</h4>)}
              <ul>
                <li>Ruby with Lively Framework</li>)}
                <li>Redis (Data Storage)</li>)}
                <li>WebSocket (Real-time Communication)</li>)}
                <li>RESTful API</li>)}
              </ul>
            </div>)}
            <div className="tech-category">
              <h4>Infrastructure</h4>)}
              <ul>
                <li>Docker & Docker Compose</li>)}
                <li>Nginx (Reverse Proxy)</li>)}
                <li>GitHub Actions (CI/CD)</li>)}
                <li>Playwright (Testing)</li>)}
              </ul>
            </div>)}
          </div>
        </div>)}

        <div className="about-section">
          <h3>Available Maps</h3>)}
          <div className="maps-grid">
            <div className="map-item">
              <h4>de_dust2_simple</h4>)}
              <p>Classic Dust2 layout optimized for 2D gameplay</p>)}
              <span className="map-mode">Defuse Mode</span>)}
            </div>
            <div className="map-item">
              <h4>de_inferno_simple</h4>)}
              <p>Inferno with the famous banana area</p>)}
              <span className="map-mode">Defuse Mode</span>)}
            </div>
            <div className="map-item">
              <h4>aim_map</h4>)}
              <p>Fast-paced aim training map</p>)}
              <span className="map-mode">Deathmatch</span>)}
            </div>
            <div className="map-item">
              <h4>fy_iceworld</h4>)}
              <p>Close-quarters combat arena</p>)}
              <span className="map-mode">Fight Yard</span>)}
            </div>
          </div>)}
        </div>

        <div className="about-section">
          <h3>System Requirements</h3>)}
          <div className="requirements">
            <div className="requirement-category">
              <h4>Minimum</h4>)}
              <ul>
                <li>Modern web browser (Chrome 80+, Firefox 75+, Safari 13+)</li>)}
                <li>1 GB RAM</li>)}
                <li>Stable internet connection (1 Mbps+)</li>)}
                <li>JavaScript enabled</li>)}
              </ul>
            </div>)}
            <div className="requirement-category">
              <h4>Recommended</h4>)}
              <ul>
                <li>Chrome 100+ or Firefox 100+</li>)}
                <li>2 GB RAM</li>)}
                <li>Broadband internet (5 Mbps+)</li>)}
                <li>Hardware acceleration enabled</li>)}
                <li>Gaming mouse and keyboard</li>)}
              </ul>
            </div>)}
          </div>
        </div>)}

        <div className="about-section">
          <h3>Development</h3>)}
          <div className="development-info">
            <p>
              CS2D is an open-source project built with modern web technologies.
              The game features enterprise-grade architecture with Docker containerization,
              comprehensive testing, and CI/CD integration.
            </p>)}
            <div className="development-stats">
              <div className="stat-item">
                <span className="stat-value">10,000+</span>)}
                <span className="stat-label">Lines of Code</span>)}
              </div>
              <div className="stat-item">
                <span className="stat-value">80%</span>)}
                <span className="stat-label">Test Coverage</span>)}
              </div>
              <div className="stat-item">
                <span className="stat-value">60 FPS</span>)}
                <span className="stat-label">Target Performance</span>)}
              </div>
              <div className="stat-item">
                <span className="stat-value">< 100ms</span>)}
                <span className="stat-label">Network Latency</span>)}
              </div>
            </div>)}
          </div>
        </div>)}

        <div className="about-section">
          <h3>Acknowledgments</h3>)}
          <div className="acknowledgments">
            <p>Special thanks to:</p>)}
            <ul>
              <li>Vue.js team for the amazing framework</li>)}
              <li>Socket.io team for real-time capabilities</li>)}
              <li>The original Counter-Strike developers</li>)}
              <li>All contributors and testers</li>)}
              <li>Claude Code for development assistance</li>)}
            </ul>
          </div>)}
        </div>
      </div>)}

      <footer className="about-footer">
        <div className="footer-info">
          <p>&copy; 2025 CS2D Project. Built with ❤️ using Vue.js 3 and TypeScript.</p>)}
          <p className="footer-note">
            This is a fan-made project and is not affiliated with Valve Corporation.
          </p>)}
        </div>
        <div className="footer-actions">
          <button onClick={checkForUpdates} className="btn btn-primary">
            Check for Updates
          </button>)}
          <button onClick={openDiagnostics} className="btn btn-secondary">
            System Diagnostics
          </button>)}
        </div>
      </footer>)}
    </div>
  </div>)}
    </div>
  );
};

export default AboutView;