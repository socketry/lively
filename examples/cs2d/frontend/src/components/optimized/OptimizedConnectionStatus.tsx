import React, { memo, useEffect, useState, useCallback } from 'react';
import { useDebounce, useThrottle } from '@/hooks/usePerformance';
import { getPerformanceMonitor, type ConnectionQuality } from '@/utils/performanceMonitor';

interface ConnectionStatusProps {
  isConnected: boolean;
  reconnectAttempts: number;
  onManualReconnect?: () => void;
  serverUrl?: string;
  className?: string;
}

const statusColors = {
  excellent: 'bg-green-500 text-green-100',
  good: 'bg-blue-500 text-blue-100',
  fair: 'bg-yellow-500 text-yellow-900',
  poor: 'bg-orange-500 text-orange-100',
  disconnected: 'bg-red-500 text-red-100'
};

const statusIcons = {
  excellent: '🟢',
  good: '🔵',
  fair: '🟡',
  poor: '🟠',
  disconnected: '🔴'
};

const statusLabels = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  disconnected: 'Disconnected'
};

/**
 * Optimized connection status component with real-time monitoring
 */
export const OptimizedConnectionStatus = memo<ConnectionStatusProps>(({
  isConnected,
  reconnectAttempts,
  onManualReconnect,
  serverUrl,
  className = ''
}) => {
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    status: 'disconnected',
    latency: 0,
    packetLoss: 0,
    jitter: 0,
    stability: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const monitor = getPerformanceMonitor();

  // Debounce connection status updates to prevent excessive re-renders
  const debouncedConnected = useDebounce(isConnected, 500);
  const debouncedReconnectAttempts = useDebounce(reconnectAttempts, 1000);

  // Throttled connection test to avoid overwhelming the server
  const throttledConnectionTest = useThrottle(async () => {
    if (!serverUrl || !debouncedConnected) return;

    setIsTestingConnection(true);
    try {
      const latency = await monitor.measureConnectionLatency(serverUrl);
      const quality = monitor.assessConnectionQuality(latency);
      setConnectionQuality(quality);
    } catch (error) {
      console.warn('Connection test failed:', error);
      setConnectionQuality(prev => ({
        ...prev,
        status: 'poor',
        latency: -1
      }));
    } finally {
      setIsTestingConnection(false);
    }
  }, 5000); // Test at most every 5 seconds

  // Test connection periodically when connected
  useEffect(() => {
    if (debouncedConnected && serverUrl) {
      throttledConnectionTest();
      const interval = setInterval(throttledConnectionTest, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    } else {
      setConnectionQuality(prev => ({
        ...prev,
        status: 'disconnected',
        latency: 0,
        stability: 0
      }));
    }
  }, [debouncedConnected, serverUrl, throttledConnectionTest]);

  const handleReconnect = useCallback(() => {
    if (onManualReconnect) {
      onManualReconnect();
    }
  }, [onManualReconnect]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const status = debouncedConnected ? connectionQuality.status : 'disconnected';
  const isReconnecting = debouncedReconnectAttempts > 0 && !debouncedConnected;

  return (
    <div className={`transition-all duration-200 ${className}`}>
      {/* Compact Status Indicator */}
      <button
        onClick={toggleExpanded}
        className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-200 ${
          statusColors[status]
        } hover:shadow-lg`}
        data-testid="connection-status"
        data-status={status}
        aria-label={`Connection status: ${statusLabels[status]}`}
      >
        <div className="flex items-center space-x-1">
          {isTestingConnection ? (
            <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className={`w-2 h-2 rounded-full ${isReconnecting ? 'animate-pulse' : ''} ${
              debouncedConnected ? 'bg-current' : 'bg-current animate-pulse'
            }`} />
          )}
          <span className="text-sm font-medium">
            {isReconnecting ? 'Reconnecting...' : statusLabels[status]}
          </span>
        </div>
        
        {connectionQuality.latency > 0 && (
          <span className="text-xs opacity-80">
            {connectionQuality.latency}ms
          </span>
        )}
        
        <span className="text-xs opacity-60">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 p-4 min-w-72 backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg shadow-2xl z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Connection Status</h3>
              <button
                onClick={toggleExpanded}
                className="text-white/60 hover:text-white"
                aria-label="Close connection details"
              >
                ✕
              </button>
            </div>

            {/* Connection Quality Metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-white/60">Status</div>
                <div className="text-white flex items-center space-x-1">
                  <span>{statusIcons[status]}</span>
                  <span>{statusLabels[status]}</span>
                </div>
              </div>
              
              {connectionQuality.latency > 0 && (
                <div>
                  <div className="text-white/60">Latency</div>
                  <div className="text-white">{connectionQuality.latency}ms</div>
                </div>
              )}
              
              {connectionQuality.stability > 0 && (
                <div>
                  <div className="text-white/60">Stability</div>
                  <div className="text-white">{connectionQuality.stability}%</div>
                </div>
              )}

              {debouncedReconnectAttempts > 0 && (
                <div>
                  <div className="text-white/60">Reconnect Attempts</div>
                  <div className="text-white">{debouncedReconnectAttempts}</div>
                </div>
              )}
            </div>

            {/* Stability Bar */}
            {connectionQuality.stability > 0 && (
              <div>
                <div className="text-white/60 text-sm mb-1">Connection Stability</div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      connectionQuality.stability > 80
                        ? 'bg-green-500'
                        : connectionQuality.stability > 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${connectionQuality.stability}%` }}
                  />
                </div>
              </div>
            )}

            {/* Manual Reconnect Button */}
            {!debouncedConnected && onManualReconnect && (
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              >
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </button>
            )}

            {/* Performance Warning */}
            {monitor.isPerformanceDegraded() && (
              <div className="p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-200 text-xs">
                ⚠️ Performance degraded. Check your connection and system resources.
              </div>
            )}

            {/* Tips for Poor Connection */}
            {status === 'poor' && (
              <div className="p-2 bg-orange-500/20 border border-orange-500/30 rounded text-orange-200 text-xs">
                💡 Try moving closer to your router or closing other applications.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.reconnectAttempts === nextProps.reconnectAttempts &&
    prevProps.serverUrl === nextProps.serverUrl &&
    prevProps.className === nextProps.className
  );
});

OptimizedConnectionStatus.displayName = 'OptimizedConnectionStatus';