import React, { memo, useCallback, useMemo } from 'react';
import { VirtualScrollList } from '../common/VirtualScrollList';
import { useDebounce, useRenderPerformance } from '@/hooks/usePerformance';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  team?: 'ct' | 't' | 'all';
}

interface OptimizedChatComponentProps {
  messages: ChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
  className?: string;
}

/**
 * Memoized chat message component for better performance
 */
const ChatMessageItem = memo<{ message: ChatMessage; index: number }>(({ message }) => {
  const formattedTime = useMemo(() => 
    message.timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    [message.timestamp]
  );

  return (
    <div className="p-2 bg-white/5 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-medium text-sm">{message.playerName}</span>
        <span className="text-white/40 text-xs">{formattedTime}</span>
      </div>
      <div className="text-white/80 text-sm">{message.message}</div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.message === nextProps.message.message;
});

ChatMessageItem.displayName = 'ChatMessageItem';

/**
 * Optimized chat component with virtual scrolling and debounced input
 */
export const OptimizedChatComponent = memo<OptimizedChatComponentProps>(({
  messages,
  chatInput,
  onChatInputChange,
  onSendMessage,
  className = ''
}) => {
  useRenderPerformance('OptimizedChatComponent');

  // Debounce input changes to reduce re-renders during typing
  const debouncedInput = useDebounce(chatInput, 100);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);

  const handleSendClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSendMessage();
  }, [onSendMessage]);

  // Memoized render function for virtual scroll
  const renderMessage = useCallback((message: ChatMessage, index: number) => (
    <ChatMessageItem message={message} index={index} />
  ), []);

  // Memoized key extractor
  const keyExtractor = useCallback((message: ChatMessage) => message.id, []);

  // Memoized recent messages count for performance monitoring
  const recentMessagesCount = useMemo(() => {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    return messages.filter(msg => msg.timestamp > oneMinuteAgo).length;
  }, [messages]);

  return (
    <div className={`backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">💬 Chat</h3>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-white/40">
            {messages.length} msgs, {recentMessagesCount} recent
          </div>
        )}
      </div>
      
      {/* Virtual scrolled message list */}
      <VirtualScrollList
        items={messages}
        itemHeight={60}
        containerHeight={256}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        className="mb-4 space-y-2"
        overscan={3}
      />
      
      {/* Chat input */}
      <div className="flex space-x-2">
        <input 
          type="text"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
          placeholder="Type a message..."
          aria-label="Chat message input"
        />
        <button 
          onClick={handleSendClick}
          disabled={!chatInput.trim()}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      
      {/* Typing indicator placeholder */}
      {chatInput !== debouncedInput && (
        <div className="text-xs text-white/40 mt-1">Typing...</div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if messages array changes or input changes
  return (
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages[prevProps.messages.length - 1]?.id === 
    nextProps.messages[nextProps.messages.length - 1]?.id &&
    prevProps.chatInput === nextProps.chatInput
  );
});

OptimizedChatComponent.displayName = 'OptimizedChatComponent';

/**
 * Chat context provider for optimized state management
 */
export interface ChatContextValue {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  messageCount: number;
}

export const ChatContext = React.createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = React.useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}