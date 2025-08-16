<template>
  <div class="not-found-view">
    <div class="not-found-container">
      <div class="error-content">
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <p class="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div class="suggested-actions">
          <h3>What you can do:</h3>
          <ul>
            <li>Check the URL for typos</li>
            <li>Go back to the previous page</li>
            <li>Return to the lobby</li>
            <li>Contact support if the problem persists</li>
          </ul>
        </div>

        <div class="action-buttons">
          <button @click="goBack" class="btn btn-secondary">
            ← Go Back
          </button>
          <button @click="goToLobby" class="btn btn-primary">
            🏠 Go to Lobby
          </button>
        </div>

        <div class="fun-fact">
          <h4>🎮 Did you know?</h4>
          <p>{{ randomFact }}</p>
        </div>
      </div>

      <div class="easter-egg">
        <div class="ascii-art">
          <pre>
    ╔══════════════════════════════╗
    ║           CS2D ERROR         ║
    ║                              ║
    ║    Bomb has been defused!    ║
    ║      But page was not...     ║
    ╚══════════════════════════════╝
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

const randomFact = ref('')

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
  router.push('/lobby')
}

function getRandomFact() {
  const randomIndex = Math.floor(Math.random() * facts.length)
  randomFact.value = facts[randomIndex]
}

onMounted(() => {
  getRandomFact()
  
  // Track 404 error
  appStore.addNotification({
    type: 'warning',
    title: '404 Error',
    message: 'Page not found - redirected to error page',
    duration: 3000
  })
})
</script>

<style scoped>
.not-found-view {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  color: var(--cs-light);
}

.not-found-container {
  max-width: 600px;
  padding: 2rem;
  text-align: center;
}

.error-content {
  background: rgba(42, 42, 42, 0.9);
  border-radius: 12px;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--cs-border);
  backdrop-filter: blur(10px);
}

.error-code {
  font-size: 8rem;
  font-weight: 900;
  color: var(--cs-primary);
  text-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
  margin-bottom: 1rem;
  line-height: 1;
}

.error-title {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--cs-light);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.error-message {
  font-size: 1.2rem;
  color: var(--cs-gray);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.suggested-actions {
  text-align: left;
  margin-bottom: 2rem;
  background: #1a1a1a;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid var(--cs-primary);
}

.suggested-actions h3 {
  color: var(--cs-primary);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.suggested-actions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggested-actions li {
  padding: 0.5rem 0;
  color: var(--cs-gray);
  position: relative;
  padding-left: 1.5rem;
}

.suggested-actions li::before {
  content: "→";
  color: var(--cs-primary);
  position: absolute;
  left: 0;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.fun-fact {
  background: #1a1a1a;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--cs-border);
  text-align: left;
}

.fun-fact h4 {
  color: var(--cs-accent);
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.fun-fact p {
  color: var(--cs-gray);
  margin: 0;
  line-height: 1.5;
  font-style: italic;
}

.easter-egg {
  margin-top: 2rem;
}

.ascii-art {
  color: var(--cs-primary);
  font-family: monospace;
  font-size: 0.8rem;
  opacity: 0.7;
  line-height: 1.2;
}

.ascii-art pre {
  margin: 0;
  white-space: pre;
  text-shadow: 0 0 10px rgba(255, 107, 53, 0.3);
}

/* Animations */
@keyframes glow {
  0%, 100% {
    text-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
  }
  50% {
    text-shadow: 0 0 30px rgba(255, 107, 53, 0.8);
  }
}

.error-code {
  animation: glow 2s ease-in-out infinite;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-content {
  animation: slideIn 0.5s ease-out;
}

.easter-egg {
  animation: slideIn 0.5s ease-out 0.3s both;
}

/* Responsive design */
@media (max-width: 768px) {
  .not-found-container {
    padding: 1rem;
  }
  
  .error-content {
    padding: 2rem 1rem;
  }
  
  .error-code {
    font-size: 6rem;
  }
  
  .error-title {
    font-size: 2rem;
  }
  
  .error-message {
    font-size: 1.1rem;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .action-buttons .btn {
    width: 100%;
    max-width: 200px;
  }
  
  .ascii-art {
    font-size: 0.6rem;
  }
}

@media (max-width: 480px) {
  .error-code {
    font-size: 4rem;
  }
  
  .error-title {
    font-size: 1.5rem;
  }
  
  .suggested-actions {
    text-align: center;
  }
  
  .suggested-actions ul {
    text-align: left;
    display: inline-block;
  }
}

/* Easter egg hover effect */
.ascii-art:hover {
  color: var(--cs-accent);
  transform: scale(1.05);
  transition: all 0.3s ease;
}

/* Button hover effects */
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
</style>