// Remove unused import
// import { cn } from '@/utils/tailwind';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

type SupportedLanguage = 'en' | 'zh-TW';

interface GameSettings {
  volume: number;
  sensitivity: number;
  graphics: string;
  language: SupportedLanguage;
}

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const { addNotification } = actions;
  const settings = { volume: state.volume * 100, sensitivity: 50, graphics: 'medium', language: state.language };
  const updateSettings = (newSettings: GameSettings) => { actions.setVolume(newSettings.volume / 100); actions.setLanguage(newSettings.language); };
  const [localSettings, setLocalSettings] = useState(settings || {
    volume: 50,
    sensitivity: 50,
    graphics: 'medium',
    language: 'en' as SupportedLanguage
  });

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSettings({ ...localSettings, volume: parseInt(e.target.value) });
  };

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSettings({ ...localSettings, sensitivity: parseInt(e.target.value) });
  };

  const handleGraphicsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalSettings({ ...localSettings, graphics: e.target.value });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalSettings({ ...localSettings, language: e.target.value as SupportedLanguage });
  };

  const saveSettings = () => {
    updateSettings(localSettings);
    addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: 'Your settings have been saved successfully!'
    });
  };

  const resetSettings = () => {
    const defaultSettings = {
      volume: 50,
      sensitivity: 50,
      graphics: 'medium',
      language: 'en' as SupportedLanguage
    };
    setLocalSettings(defaultSettings);
    updateSettings(defaultSettings);
    addNotification({
      type: 'info',
      title: 'Settings Reset',
      message: 'Settings have been reset to defaults.'
    });
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="settings-view">
      <div className="settings-container">
        <header className="settings-header">
          <button 
            onClick={goBack} 
            className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform"
          >
            ← Back
          </button>
          <h1>Settings</h1>
        </header>

        <div className="settings-content">
          <div className="settings-section">
            <h2>Audio</h2>
            <div className="setting-item">
              <label htmlFor="volume">Volume: {localSettings.volume}%</label>
              <input 
                type="range" 
                id="volume"
                min="0" 
                max="100" 
                value={localSettings.volume}
                onChange={handleVolumeChange}
                className="slider"
              />
            </div>
          </div>

          <div className="settings-section">
            <h2>Controls</h2>
            <div className="setting-item">
              <label htmlFor="sensitivity">Mouse Sensitivity: {localSettings.sensitivity}%</label>
              <input 
                type="range" 
                id="sensitivity"
                min="1" 
                max="100" 
                value={localSettings.sensitivity}
                onChange={handleSensitivityChange}
                className="slider"
              />
            </div>
          </div>

          <div className="settings-section">
            <h2>Graphics</h2>
            <div className="setting-item">
              <label htmlFor="graphics">Quality:</label>
              <select 
                id="graphics"
                value={localSettings.graphics}
                onChange={handleGraphicsChange}
                className="select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h2>Language</h2>
            <div className="setting-item">
              <label htmlFor="language">Language:</label>
              <select 
                id="language"
                value={localSettings.language}
                onChange={handleLanguageChange}
                className="select"
              >
                <option value="en">English</option>
                <option value="zh-TW">繁體中文</option>
              </select>
            </div>
          </div>

          <div className="settings-actions">
            <button 
              onClick={saveSettings}
              className="btn btn-primary hover:scale-105 active:scale-95 transition-transform"
            >
              Save Settings
            </button>
            <button 
              onClick={resetSettings}
              className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;