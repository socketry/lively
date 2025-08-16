import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { ConnectionStatus, WebSocketMessage } from '@/types/websocket';

interface ConnectionInfo extends ConnectionStatus {
  connected: boolean;
  messageCount: number;
  queuedCount: number;
}

interface WebSocketState {
  connectionStatus: ConnectionStatus;
  messageHistory: WebSocketMessage[];
  lastMessage: WebSocketMessage | null;
  queuedMessages: WebSocketMessage[];
}

type WebSocketAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus['status'] }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_RECONNECT_ATTEMPTS' }
  | { type: 'ADD_MESSAGE'; payload: WebSocketMessage }
  | { type: 'QUEUE_MESSAGE'; payload: WebSocketMessage }
  | { type: 'CLEAR_QUEUED_MESSAGES' }
  | { type: 'CLEAR_MESSAGE_HISTORY' }
  | { type: 'RESET' };

const initialState: WebSocketState = {
  connectionStatus: {
    status: 'disconnected',
    reconnectAttempts: 0,
    lastConnected: undefined,
    latency: undefined
  },
  messageHistory: [],
  lastMessage: null,
  queuedMessages: []
};

function webSocketReducer(state: WebSocketState, action: WebSocketAction): WebSocketState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS': {
      const newConnectionStatus = { ...state.connectionStatus };
      newConnectionStatus.status = action.payload;

      if (action.payload === 'connected') {
        newConnectionStatus.lastConnected = new Date();
        newConnectionStatus.reconnectAttempts = 0;
      } else if (action.payload === 'disconnected' || action.payload === 'error') {
        newConnectionStatus.latency = undefined;
      }

      return { ...state, connectionStatus: newConnectionStatus };
    }

    case 'SET_LATENCY':
      return {
        ...state,
        connectionStatus: { ...state.connectionStatus, latency: action.payload }
      };

    case 'INCREMENT_RECONNECT_ATTEMPTS':
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          reconnectAttempts: state.connectionStatus.reconnectAttempts + 1
        }
      };

    case 'RESET_RECONNECT_ATTEMPTS':
      return {
        ...state,
        connectionStatus: { ...state.connectionStatus, reconnectAttempts: 0 }
      };

    case 'ADD_MESSAGE': {
      const messageWithTimestamp = { ...action.payload, timestamp: Date.now() };
      const newMessageHistory = [...state.messageHistory, messageWithTimestamp];
      
      // Keep only last 100 messages
      const trimmedHistory = newMessageHistory.length > 100 
        ? newMessageHistory.slice(-100) 
        : newMessageHistory;

      return {
        ...state,
        messageHistory: trimmedHistory,
        lastMessage: action.payload
      };
    }

    case 'QUEUE_MESSAGE':
      return {
        ...state,
        queuedMessages: [...state.queuedMessages, action.payload]
      };

    case 'CLEAR_QUEUED_MESSAGES':
      return { ...state, queuedMessages: [] };

    case 'CLEAR_MESSAGE_HISTORY':
      return { ...state, messageHistory: [], lastMessage: null };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface WebSocketContextType {
  state: WebSocketState;
  actions: {
    setConnectionStatus: (status: ConnectionStatus['status']) => void;
    setLatency: (latency: number) => void;
    incrementReconnectAttempts: () => void;
    resetReconnectAttempts: () => void;
    addMessage: (message: WebSocketMessage) => void;
    queueMessage: (message: WebSocketMessage) => void;
    getQueuedMessages: () => WebSocketMessage[];
    clearMessageHistory: () => void;
    getConnectionInfo: () => ConnectionInfo;
    reset: () => void;
  };
  computed: {
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    hasError: boolean;
    latency: number | undefined;
    reconnectAttempts: number;
  };
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(webSocketReducer, initialState);

  const actions = {
    setConnectionStatus: (status: ConnectionStatus['status']) =>
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }),

    setLatency: (latency: number) =>
      dispatch({ type: 'SET_LATENCY', payload: latency }),

    incrementReconnectAttempts: () =>
      dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' }),

    resetReconnectAttempts: () =>
      dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' }),

    addMessage: (message: WebSocketMessage) =>
      dispatch({ type: 'ADD_MESSAGE', payload: message }),

    queueMessage: (message: WebSocketMessage) =>
      dispatch({ type: 'QUEUE_MESSAGE', payload: message }),

    getQueuedMessages: () => {
      const messages = [...state.queuedMessages];
      dispatch({ type: 'CLEAR_QUEUED_MESSAGES' });
      return messages;
    },

    clearMessageHistory: () =>
      dispatch({ type: 'CLEAR_MESSAGE_HISTORY' }),

    getConnectionInfo: () => ({
      status: state.connectionStatus.status,
      connected: state.connectionStatus.status === 'connected',
      lastConnected: state.connectionStatus.lastConnected,
      latency: state.connectionStatus.latency,
      reconnectAttempts: state.connectionStatus.reconnectAttempts,
      messageCount: state.messageHistory.length,
      queuedCount: state.queuedMessages.length
    }),

    reset: () =>
      dispatch({ type: 'RESET' })
  };

  const computed = {
    isConnected: state.connectionStatus.status === 'connected',
    isConnecting: state.connectionStatus.status === 'connecting',
    isDisconnected: state.connectionStatus.status === 'disconnected',
    hasError: state.connectionStatus.status === 'error',
    latency: state.connectionStatus.latency,
    reconnectAttempts: state.connectionStatus.reconnectAttempts
  };

  return (
    <WebSocketContext.Provider value={{ state, actions, computed }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketStore = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketStore must be used within WebSocketProvider');
  }
  return context;
};

// Alias for compatibility  
export const useWebSocket = () => {
  const { state, actions, computed } = useWebSocketStore();
  
  // Mock sendMessage function for development
  const sendMessage = (type: string, data?: unknown) => {
    console.log('WebSocket mock send:', type, data);
    // Add to message history for testing
    actions.addMessage({ type, data, timestamp: Date.now() });
  };
  
  return {
    connectionStatus: state.connectionStatus.status,
    latency: state.connectionStatus.latency,
    reconnectAttempts: state.connectionStatus.reconnectAttempts,
    sendMessage,
    connect: () => actions.setConnectionStatus('connected'),
    disconnect: () => actions.setConnectionStatus('disconnected'),
    ...computed
  };
};