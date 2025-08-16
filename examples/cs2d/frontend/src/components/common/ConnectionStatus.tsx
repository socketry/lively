import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocketStore } from '@/stores/websocket'
import { useWebSocket } from '@/services/websocket'
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  // TODO: Define props from Vue component
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = (props) => {
  const navigate = useNavigate();
  
  

const wsStore = useWebSocket()
const ws = useWebSocket()

const [isMinimized, set${this.capitalize("isMinimized")}] = useState(false)
const [showDetails, set${this.capitalize("showDetails")}] = useState(false)

const connectionStatus = useMemo(() => wsStore.connectionStatus.status, [])
const latency = useMemo(() => wsStore.latency, [])
const reconnectAttempts = useMemo(() => wsStore.reconnectAttempts, [])
const lastConnected = useMemo(() => wsStore.connectionStatus.lastConnected, [])

const statusText = useMemo(() => {
  switch (connectionStatus.value, []) {
    case 'connected':
      return 'Connected'
    case 'connecting':
      return 'Connecting...'
    case 'disconnected':
      return 'Disconnected'
    case 'error':
      return 'Connection Error'
    case 'offline':
      return 'Offline'
    default:
      return 'Unknown'
  }
})

function toggleMinimized() {
  isMinimized.value = !isMinimized.value
  if (!isMinimized.value) {
    showDetails.value = false
  }
}

function reconnect() {
  ws.connect()
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

  return (
    <div className={styles.container}>
      <div
    className="connection-status"
    className={{
      [connectionStatus]: true,
      minimized: isMinimized
    }}
    onClick={toggleMinimized}
  >
    <div className="status-indicator">
      <div className="status-dot"></div>)}
    </div>
    
    <div {!isMinimized && ( className="status-content">
      <div className="status-text">
        <span className="status-label">{statusText }</span>)}
        <span {latency && ( className="latency">{latency }ms</span>)}
      </div>
      
      <div {showDetails && ( className="status-details">
        <div className="detail-item">
          <span className="detail-label">Reconnect attempts:</span>)}
          <span className="detail-value">{reconnectAttempts }</span>)}
        </div>
        <div {lastConnected && ( className="detail-item">
          <span className="detail-label">Last connected:</span>)}
          <span className="detail-value">{formatTime(lastConnected) }</span>)}
        </div>
      </div>)}
      
      <div {connectionStatus === 'disconnected' && ( className="status-actions">
        <button @click.stop="reconnect" className="reconnect-btn">
          Reconnect
        </button>)}
      </div>
    </div>)}
  </div>
    </div>
  );
};

export default ConnectionStatus;