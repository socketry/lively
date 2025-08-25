import React, { useState, useEffect } from 'react';

interface CrosshairHUDProps {
  isMoving: boolean;
  isScoped: boolean;
  isDucking: boolean;
  hitMarker?: boolean;
  isShooting?: boolean;
}

export const CrosshairHUD: React.FC<CrosshairHUDProps> = ({
  isMoving,
  isScoped,
  isDucking,
  hitMarker = false,
  isShooting = false
}) => {
  const [settings, setSettings] = useState({
    size: 20,
    thickness: 2,
    gap: 4,
    color: '#00FF00',
    opacity: 0.8,
    dynamic: true,
    style: 'classic' as 'classic' | 'dot' | 'cross' | 'circle'
  });

  const [hitMarkerVisible, setHitMarkerVisible] = useState(false);

  // Handle hit marker animation
  useEffect(() => {
    if (hitMarker) {
      setHitMarkerVisible(true);
      const timer = setTimeout(() => setHitMarkerVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [hitMarker]);

  // Calculate dynamic crosshair properties
  let dynamicSize = settings.size;
  let dynamicGap = settings.gap;
  let dynamicOpacity = settings.opacity;

  if (settings.dynamic) {
    // Hide when scoped
    if (isScoped) {
      dynamicOpacity *= 0.1;
    }
    
    // Expand when moving
    if (isMoving) {
      dynamicSize += 8;
      dynamicGap += 3;
    }
    
    // Shrink when ducking
    if (isDucking) {
      dynamicSize *= 0.7;
      dynamicGap *= 0.7;
    }
    
    // Expand when shooting
    if (isShooting) {
      dynamicSize += 5;
      dynamicGap += 2;
    }
  }

  if (isScoped) {
    return null; // No crosshair when scoped
  }

  const renderClassicCrosshair = () => (
    <svg
      width="100"
      height="100"
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: dynamicOpacity }}
    >
      {/* Top line */}
      <line
        x1="50"
        y1={50 - dynamicGap}
        x2="50"
        y2={50 - dynamicGap - dynamicSize}
        stroke={settings.color}
        strokeWidth={settings.thickness}
        strokeLinecap="square"
      />
      
      {/* Bottom line */}
      <line
        x1="50"
        y1={50 + dynamicGap}
        x2="50"
        y2={50 + dynamicGap + dynamicSize}
        stroke={settings.color}
        strokeWidth={settings.thickness}
        strokeLinecap="square"
      />
      
      {/* Left line */}
      <line
        x1={50 - dynamicGap}
        y1="50"
        x2={50 - dynamicGap - dynamicSize}
        y2="50"
        stroke={settings.color}
        strokeWidth={settings.thickness}
        strokeLinecap="square"
      />
      
      {/* Right line */}
      <line
        x1={50 + dynamicGap}
        y1="50"
        x2={50 + dynamicGap + dynamicSize}
        y2="50"
        stroke={settings.color}
        strokeWidth={settings.thickness}
        strokeLinecap="square"
      />
    </svg>
  );

  const renderDotCrosshair = () => (
    <div
      className="absolute w-1 h-1 bg-current rounded-full transform -translate-x-1/2 -translate-y-1/2"
      style={{
        color: settings.color,
        opacity: dynamicOpacity,
        width: settings.thickness * 2,
        height: settings.thickness * 2
      }}
    />
  );

  const renderCircleCrosshair = () => (
    <div
      className="absolute border-2 border-current rounded-full transform -translate-x-1/2 -translate-y-1/2"
      style={{
        color: settings.color,
        opacity: dynamicOpacity,
        width: dynamicSize * 2,
        height: dynamicSize * 2,
        borderWidth: settings.thickness
      }}
    />
  );

  const renderCrossCrosshair = () => (
    <svg
      width="100"
      height="100"
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: dynamicOpacity }}
    >
      {/* Full cross lines */}
      <line
        x1="50"
        y1="0"
        x2="50"
        y2="100"
        stroke={settings.color}
        strokeWidth={settings.thickness}
        strokeLinecap="square"
        opacity="0.3"
      />
      <line
        x1="0"
        y1="50"
        x2="100"
        y2="50"
        stroke={settings.color}
        strokeWidth={settings.thickness}
        strokeLinecap="square"
        opacity="0.3"
      />
      
      {/* Center gap */}
      <circle
        cx="50"
        cy="50"
        r={dynamicGap}
        fill="transparent"
        stroke={settings.color}
        strokeWidth={settings.thickness}
      />
    </svg>
  );

  return (
    <div className="relative w-0 h-0">
      {/* Main Crosshair */}
      {settings.style === 'classic' && renderClassicCrosshair()}
      {settings.style === 'dot' && renderDotCrosshair()}
      {settings.style === 'circle' && renderCircleCrosshair()}
      {settings.style === 'cross' && renderCrossCrosshair()}

      {/* Hit Marker */}
      {hitMarkerVisible && (
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="40" height="40" className="animate-ping">
            {/* X-shaped hit marker */}
            <line
              x1="10"
              y1="10"
              x2="30"
              y2="30"
              stroke="#FFD700"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="30"
              y1="10"
              x2="10"
              y2="30"
              stroke="#FFD700"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Damage Indicator */}
      {hitMarkerVisible && (
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none top-8">
          <div className="bg-red-600 bg-opacity-80 rounded px-2 py-1 text-white text-xs font-bold animate-bounce">
            HIT
          </div>
        </div>
      )}

      {/* Crosshair Settings Panel (for development/settings menu) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-10 left-10 bg-black bg-opacity-80 rounded p-2 text-xs text-white min-w-[200px] pointer-events-auto">
          <div className="mb-2 font-bold">Crosshair Settings</div>
          
          <div className="space-y-1">
            <div>
              <label>Size: </label>
              <input
                type="range"
                min="10"
                max="50"
                value={settings.size}
                onChange={e => setSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                className="w-20"
              />
              <span className="ml-2">{settings.size}</span>
            </div>
            
            <div>
              <label>Gap: </label>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.gap}
                onChange={e => setSettings(prev => ({ ...prev, gap: parseInt(e.target.value) }))}
                className="w-20"
              />
              <span className="ml-2">{settings.gap}</span>
            </div>
            
            <div>
              <label>Thickness: </label>
              <input
                type="range"
                min="1"
                max="8"
                value={settings.thickness}
                onChange={e => setSettings(prev => ({ ...prev, thickness: parseInt(e.target.value) }))}
                className="w-20"
              />
              <span className="ml-2">{settings.thickness}</span>
            </div>
            
            <div>
              <label>Color: </label>
              <input
                type="color"
                value={settings.color}
                onChange={e => setSettings(prev => ({ ...prev, color: e.target.value }))}
                className="w-8 h-6"
              />
            </div>
            
            <div>
              <label>Style: </label>
              <select
                value={settings.style}
                onChange={e => setSettings(prev => ({ ...prev, style: e.target.value as any }))}
                className="bg-gray-800 text-white rounded px-1"
              >
                <option value="classic">Classic</option>
                <option value="dot">Dot</option>
                <option value="circle">Circle</option>
                <option value="cross">Cross</option>
              </select>
            </div>
            
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={settings.dynamic}
                  onChange={e => setSettings(prev => ({ ...prev, dynamic: e.target.checked }))}
                  className="mr-2"
                />
                Dynamic
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Movement/State Indicators */}
      {settings.dynamic && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 space-x-2">
          {isMoving && <span className="text-yellow-400">MOVING</span>}
          {isDucking && <span className="text-blue-400">CROUCHED</span>}
          {isShooting && <span className="text-red-400">FIRING</span>}
        </div>
      )}
    </div>
  );
};