import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConnectionStatus } from '@/types/websocket'

export const useWebSocketStore = defineStore('websocket', () => {
  // State
  const connectionStatus = ref<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0,
    lastConnected: undefined,
    latency: undefined
  })

  const messageHistory = ref<any[]>([])
  const lastMessage = ref<any>(null)
  const queuedMessages = ref<any[]>([])

  // Getters
  const isConnected = computed(() => connectionStatus.value.status === 'connected')
  const isConnecting = computed(() => connectionStatus.value.status === 'connecting')
  const isDisconnected = computed(() => connectionStatus.value.status === 'disconnected')
  const hasError = computed(() => connectionStatus.value.status === 'error')
  const latency = computed(() => connectionStatus.value.latency)
  const reconnectAttempts = computed(() => connectionStatus.value.reconnectAttempts)

  // Actions
  function setConnectionStatus(status: ConnectionStatus['status']): void {
    connectionStatus.value.status = status

    if (status === 'connected') {
      connectionStatus.value.lastConnected = new Date()
      connectionStatus.value.reconnectAttempts = 0
    } else if (status === 'disconnected' || status === 'error') {
      connectionStatus.value.latency = undefined
    }
  }

  function setLatency(latencyMs: number): void {
    connectionStatus.value.latency = latencyMs
  }

  function incrementReconnectAttempts(): void {
    connectionStatus.value.reconnectAttempts++
  }

  function resetReconnectAttempts(): void {
    connectionStatus.value.reconnectAttempts = 0
  }

  function addMessage(message: any): void {
    messageHistory.value.push({
      ...message,
      timestamp: Date.now()
    })
    lastMessage.value = message

    // Keep only last 100 messages
    if (messageHistory.value.length > 100) {
      messageHistory.value = messageHistory.value.slice(-100)
    }
  }

  function queueMessage(message: any): void {
    queuedMessages.value.push(message)
  }

  function getQueuedMessages(): any[] {
    const messages = [...queuedMessages.value]
    queuedMessages.value = []
    return messages
  }

  function clearMessageHistory(): void {
    messageHistory.value = []
    lastMessage.value = null
  }

  function getConnectionInfo() {
    return {
      status: connectionStatus.value.status,
      connected: isConnected.value,
      lastConnected: connectionStatus.value.lastConnected,
      latency: connectionStatus.value.latency,
      reconnectAttempts: connectionStatus.value.reconnectAttempts,
      messageCount: messageHistory.value.length,
      queuedCount: queuedMessages.value.length
    }
  }

  function reset(): void {
    connectionStatus.value = {
      status: 'disconnected',
      reconnectAttempts: 0,
      lastConnected: undefined,
      latency: undefined
    }
    messageHistory.value = []
    lastMessage.value = null
    queuedMessages.value = []
  }

  return {
    // State
    connectionStatus,
    messageHistory,
    lastMessage,
    queuedMessages,

    // Getters
    isConnected,
    isConnecting,
    isDisconnected,
    hasError,
    latency,
    reconnectAttempts,

    // Actions
    setConnectionStatus,
    setLatency,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    addMessage,
    queueMessage,
    getQueuedMessages,
    clearMessageHistory,
    getConnectionInfo,
    reset
  }
})
