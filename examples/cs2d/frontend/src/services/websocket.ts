import { io, type Socket } from 'socket.io-client'
import mitt, { type Emitter } from 'mitt'
// Remove hook imports - this is a service class, not a React component
// import { useWebSocketStore } from '@/stores/websocket'
// import { useAuthStore } from '@/stores/auth'
import type { WebSocketMessage } from '@/types/websocket'

type Events = {
  [key: string]: unknown
}

class WebSocketService {
  private socket: Socket | null = null
  private emitter: Emitter<Events> = mitt<Events>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private isConnecting = false

  constructor() {
    this.setupConnectionHandlers()
  }

  private setupConnectionHandlers() {
    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.socket?.disconnected) {
        this.reconnect()
      }
    })

    // Handle online/offline
    window.addEventListener('online', () => this.reconnect())
    window.addEventListener('offline', () => this.handleOffline())
  }

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection)
            resolve()
          }
        }, 100)
        return
      }

      this.isConnecting = true
      const wsUrl = url || import.meta.env.VITE_WS_URL || 'ws://localhost:9292'

      console.log('[WebSocket] Connecting to:', wsUrl)

      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
        auth: {
          token: this.getAuthToken()
        }
      })

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.flushMessageQueue()
        this.updateConnectionStatus('connected')
        resolve()
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason)
        this.isConnecting = false
        this.stopHeartbeat()
        this.updateConnectionStatus('disconnected')

        if (reason === 'io server disconnect') {
          // Server initiated disconnect, attempt reconnect
          this.reconnect()
        }
      })

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error)
        this.isConnecting = false
        this.updateConnectionStatus('error')
        reject(error)
      })

      this.socket.on('error', (error) => {
        console.error('[WebSocket] Error:', error)
        this.emitter.emit('error', error)
      })

      // Setup message handlers
      this.setupMessageHandlers()
    })
  }

  private setupMessageHandlers() {
    if (!this.socket) return

    // Handle ping/pong for heartbeat
    this.socket.on('pong', () => {
      this.updateConnectionStatus('connected')
    })

    // Handle server messages
    this.socket.on('message', (data: WebSocketMessage) => {
      this.handleMessage(data)
    })

    // Room events
    this.socket.on('room:created', (data) => {
      this.emitter.emit('room:created', data)
    })

    this.socket.on('room:joined', (data) => {
      this.emitter.emit('room:joined', data)
    })

    this.socket.on('room:left', (data) => {
      this.emitter.emit('room:left', data)
    })

    this.socket.on('room:updated', (data) => {
      this.emitter.emit('room:updated', data)
    })

    // Game events
    this.socket.on('game:started', (data) => {
      this.emitter.emit('game:started', data)
    })

    this.socket.on('game:state', (data) => {
      this.emitter.emit('game:state', data)
    })

    this.socket.on('game:player:move', (data) => {
      this.emitter.emit('game:player:move', data)
    })

    this.socket.on('game:player:shoot', (data) => {
      this.emitter.emit('game:player:shoot', data)
    })

    this.socket.on('game:ended', (data) => {
      this.emitter.emit('game:ended', data)
    })

    // Chat events
    this.socket.on('chat:message', (data) => {
      this.emitter.emit('chat:message', data)
    })
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('[WebSocket] Message received:', message)

    // Emit typed event
    this.emitter.emit(message.type, message.data)

    // Also emit generic message event
    this.emitter.emit('message', message)
  }

  send(type: string, data?: unknown): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    }

    if (this.socket?.connected) {
      this.socket.emit('message', message)
    } else {
      console.warn('[WebSocket] Not connected, queueing message:', message)
      this.messageQueue.push(message)
    }
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('[WebSocket] Not connected, cannot emit:', event)
    }
  }

  on<T = unknown>(event: string, handler: (data: T) => void): () => void {
    this.emitter.on(event, handler as (data: unknown) => void)
    return () => this.off(event, handler)
  }

  off<T = unknown>(event: string, handler: (data: T) => void): void {
    this.emitter.off(event, handler as (data: unknown) => void)
  }

  once<T = unknown>(event: string, handler: (data: T) => void): void {
    const wrappedHandler = (data: unknown) => {
      handler(data as T)
      this.emitter.off(event, wrappedHandler)
    }
    this.emitter.on(event, wrappedHandler)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message.type, message.data)
      }
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached')
      this.updateConnectionStatus('failed')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private handleOffline() {
    console.log('[WebSocket] Network offline')
    this.updateConnectionStatus('offline')
  }

  private updateConnectionStatus(
    status: 'connected' | 'disconnected' | 'error' | 'offline' | 'failed'
  ) {
    // TODO: Implement proper status update without hooks
    console.log('[WebSocket] Status updated to:', status)
    // wsStore.setConnectionStatus(status)
  }

  private getAuthToken(): string | undefined {
    // TODO: Implement proper auth token retrieval without hooks
    // const authStore = useAuthStore()
    // return authStore.token || undefined
    return undefined
  }

  disconnect() {
    console.log('[WebSocket] Disconnecting')
    this.stopHeartbeat()
    this.socket?.disconnect()
    this.socket = null
    this.messageQueue = []
    this.updateConnectionStatus('disconnected')
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get socketId(): string | undefined {
    return this.socket?.id
  }
}

// Singleton instance
let wsInstance: WebSocketService | null = null

export function setupWebSocket(): WebSocketService {
  if (!wsInstance) {
    wsInstance = new WebSocketService()
  }
  return wsInstance
}

export function useWebSocket(): WebSocketService {
  if (!wsInstance) {
    throw new Error('WebSocket not initialized. Call setupWebSocket() first.')
  }
  return wsInstance
}
