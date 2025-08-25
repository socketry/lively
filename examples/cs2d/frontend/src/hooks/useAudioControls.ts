import { useState } from 'react';

export const useAudioControls = () => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [soundEffect] = useState(new Audio('/sounds/ui/click.wav')); // Fallback UI sound

  const playUISound = (soundType: 'click' | 'hover' | 'success' | 'error' = 'click') => {
    if (!audioEnabled) return;
    
    try {
      soundEffect.currentTime = 0;
      soundEffect.volume = 0.3;
      soundEffect.play().catch(() => {
        // Fallback: visual feedback only
        console.log(`UI Sound: ${soundType}`);
      });
    } catch (e) {
      // Silent fail for audio
    }
  };

  const notifyGameAction = (action: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    // Play corresponding UI sound
    playUISound(type === 'success' ? 'success' : type === 'error' ? 'error' : 'click');
    
    // Simple console notification for now
    console.log(`[${type.toUpperCase()}] ${action}: ${message}`);
    // Could add toast notification here in the future
  };

  return {
    audioEnabled,
    setAudioEnabled,
    playUISound,
    notifyGameAction
  };
};