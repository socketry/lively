import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isVisible: boolean;
  loadingText?: string;
  progress?: number;
  showTips?: boolean;
  onComplete?: () => void;
}

const gameTips = [
  "Tip: Use headphones for better 3D audio positioning",
  "Tip: Pre-aim common angles for faster reactions",
  "Tip: Economy management is crucial - save when needed",
  "Tip: Communication with teammates wins rounds",
  "Tip: Learn spray patterns for better weapon control",
  "Tip: Use sound cues to locate enemies",
  "Tip: Crosshair placement at head level saves time",
  "Tip: Flash your teammates before peeking together",
  "Tip: Buy armor early rounds for better survivability",
  "Tip: Watch the minimap for tactical awareness",
  "Tip: Practice counter-strafing for accurate shots",
  "Tip: Use grenades to control map areas",
  "Tip: Learn common callouts for your team",
  "Tip: Keep your crosshair at the right height",
  "Tip: Master the art of peeking angles safely"
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isVisible,
  loadingText = "Loading CS2D...",
  progress = 0,
  showTips = true,
  onComplete
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    // Rotate tips every 3 seconds
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % gameTips.length);
    }, 3000);

    // Animate loading dots
    const dotsInterval = setInterval(() => {
      setLoadingDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => {
      clearInterval(tipInterval);
      clearInterval(dotsInterval);
    };
  }, [isVisible]);

  // Smooth progress animation
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      const diff = progress - displayProgress;
      if (Math.abs(diff) < 0.1) {
        setDisplayProgress(progress);
        if (progress >= 100 && onComplete) {
          setTimeout(onComplete, 500);
        }
      } else {
        setDisplayProgress(prev => prev + diff * 0.1);
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [progress, displayProgress, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="loading-screen" data-testid="loading-screen">
      {/* Background with animated particles */}
      <div className="loading-background">
        <div className="particle-field">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="loading-content">
        {/* CS2D Logo */}
        <div className="loading-logo">
          <div className="logo-text">CS2D</div>
          <div className="logo-subtitle">Counter-Strike 2D</div>
        </div>

        {/* Loading text */}
        <div className="loading-text" data-testid="loading-text">
          {loadingText}{loadingDots}
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="progress-text">{Math.round(displayProgress)}%</div>
        </div>

        {/* Game tips */}
        {showTips && (
          <div className="tips-container" data-testid="loading-tip">
            <div className="tip-text" key={currentTip}>
              {gameTips[currentTip]}
            </div>
          </div>
        )}

        {/* Loading details */}
        <div className="loading-details">
          <div className="detail-item">
            <span className="detail-label">Audio:</span>
            <span className={`detail-status ${displayProgress > 20 ? 'loaded' : 'loading'}`}>
              {displayProgress > 20 ? '✓ Loaded' : 'Loading...'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Graphics:</span>
            <span className={`detail-status ${displayProgress > 50 ? 'loaded' : 'loading'}`}>
              {displayProgress > 50 ? '✓ Loaded' : 'Loading...'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Game Logic:</span>
            <span className={`detail-status ${displayProgress > 80 ? 'loaded' : 'loading'}`}>
              {displayProgress > 80 ? '✓ Loaded' : 'Loading...'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Network:</span>
            <span className={`detail-status ${displayProgress > 95 ? 'loaded' : 'loading'}`}>
              {displayProgress > 95 ? '✓ Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="loading-footer">
        <div className="powered-by">Powered by TypeScript & React</div>
        <div className="version">Version 2.0.0</div>
      </div>
    </div>
  );
};

export default LoadingScreen;