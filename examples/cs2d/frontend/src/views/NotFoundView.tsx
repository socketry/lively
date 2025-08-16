import { cn } from '@/utils/tailwind';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigate } from "react-router-dom"
import { useAppStore } from '@/stores/app'

interface NotFoundViewProps {
  // TODO: Define props from Vue component
}

export const NotFoundView: React.FC<NotFoundViewProps> = (props) => {
  const navigate = useNavigate();
  
  

const navigate = useNavigate()
const appStore = useApp()

const [randomFact, set${this.capitalize("randomFact")}] = useState('')

const facts = [
  "Counter-Strike was originally a mod for Half-Life released in 1999.",
  "The original CS2D was created by DC in 2004 and became hugely popular.",
  "The bomb timer in Counter-Strike is exactly 35 seconds.",
  "The AWP (Arctic Warfare Police) is one of the most iconic sniper rifles in gaming.",
  "dust2 is probably the most played map in Counter-Strike history.",
  "The term 'rushing B' became a popular meme in the Counter-Strike community.",
  "CS2D supports up to 32 players on a single server.",
  "This Vue.js version of CS2D was built with modern web technologies.",
  "WebSocket technology enables real-time multiplayer gaming in browsers.",
  "The tile-based map system allows for custom map creation and editing."
]

function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    goToLobby()
  }
}

function goToLobby() {
  navigate('/lobby')
}

function getRandomFact() {
  const randomIndex = Math.floor(Math.random() * facts.length)
  randomFact.value = facts[randomIndex]
}

useEffect(() => {
  getRandomFact()
  
  // Track 404 error
  appStore.addNotification({
    type: 'warning',
    title: '404 Error',
    message: 'Page not found - redirected to error page',
    duration: 3000
  }, [])
})

  return (
    <div className="container mx-auto px-4">
      <div className="not-found-view">
    <div className="not-found-container">
      <div className="error-content">
        <div className="error-code">404</div>)}
        <h1 className="error-title">Page Not Found</h1>)}
        <p className="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>)}
        
        <div className="suggested-actions">
          <h3>What you can do:</h3>)}
          <ul>
            <li>Check the URL for typos</li>)}
            <li>Go back to the previous page</li>)}
            <li>Return to the lobby</li>)}
            <li>Contact support if the problem persists</li>)}
          </ul>
        </div>)}

        <div className="action-buttons hover:scale-105 active:scale-95 transition-transform">
          <button onClick={goBack} className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform">
            ← Go Back
          </button>)}
          <button onClick={goToLobby} className="btn btn-primary hover:scale-105 active:scale-95 transition-transform">
            🏠 Go to Lobby
          </button>)}
        </div>

        <div className="fun-fact">
          <h4>🎮 Did you know?</h4>)}
          <p>{randomFact }</p>)}
        </div>
      </div>)}

      <div className="easter-egg">
        <div className="ascii-art">
          <pre>
    ╔══════════════════════════════╗
    ║           CS2D ERROR         ║
    ║                              ║
    ║    Bomb has been defused!    ║
    ║      But page was not...     ║
    ╚══════════════════════════════╝
          </pre>)}
        </div>
      </div>)}
    </div>
  </div>)}
    </div>
  );
};

export default NotFoundView;