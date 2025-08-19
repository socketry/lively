import React, { memo, useCallback } from 'react';
import { useRenderPerformance } from '@/hooks/usePerformance';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't' | 'spectator';
  ready: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'normal' | 'hard' | 'expert';
  kills: number;
  deaths: number;
  ping: number;
  avatar: string;
}

interface RoomSettings {
  name: string;
  map: string;
  mode: string;
  maxPlayers: number;
  roundTime: number;
  maxRounds: number;
  friendlyFire: boolean;
  botConfig: {
    enabled: boolean;
    count: number;
    difficulty: 'easy' | 'normal' | 'hard' | 'expert';
    fillEmpty: boolean;
    teamBalance: boolean;
  };
}

interface BotManagerPanelProps {
  players: Player[];
  roomSettings: RoomSettings;
  isHost: boolean;
  onClose: () => void;
  onAddBot: (difficulty: 'easy' | 'normal' | 'hard' | 'expert') => void;
  onRemoveBot: (botId: string) => void;
  onUpdateSettings: (settings: RoomSettings) => void;
}

const difficultyColors = {
  easy: 'text-green-400 bg-green-500/20 border-green-500/30',
  normal: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  hard: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  expert: 'text-red-400 bg-red-500/20 border-red-500/30'
};

export const BotManagerPanel = memo<BotManagerPanelProps>(({
  players,
  roomSettings,
  isHost,
  onClose,
  onAddBot,
  onRemoveBot,
  onUpdateSettings
}) => {
  useRenderPerformance('BotManagerPanel');

  const handleAddBot = useCallback((difficulty: 'easy' | 'normal' | 'hard' | 'expert') => {
    onAddBot(difficulty);
  }, [onAddBot]);

  const handleRemoveBot = useCallback((botId: string) => {
    onRemoveBot(botId);
  }, [onRemoveBot]);

  const handleSettingsChange = useCallback((
    key: keyof RoomSettings['botConfig'], 
    value: boolean | number | string
  ) => {
    onUpdateSettings({
      ...roomSettings,
      botConfig: {
        ...roomSettings.botConfig,
        [key]: value
      }
    });
  }, [roomSettings, onUpdateSettings]);

  const botPlayers = players.filter(p => p.isBot);

  if (!isHost) {
    return (
      <div className="fixed top-20 right-4 z-50 w-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
        <div className="text-center text-white/60">
          Only the host can manage bots
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🤖 Bot Manager</h3>
        <button 
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Close bot manager"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Quick Add Bots */}
        <div>
          <h4 className="text-white font-semibold mb-2">Add Bots by Difficulty</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleAddBot('easy')}
              className="px-3 py-2 bg-green-600/30 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-600/40 transition-all"
              disabled={players.length >= roomSettings.maxPlayers}
            >
              + Easy Bot
            </button>
            <button 
              onClick={() => handleAddBot('normal')}
              className="px-3 py-2 bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-yellow-400 hover:bg-yellow-600/40 transition-all"
              disabled={players.length >= roomSettings.maxPlayers}
            >
              + Normal Bot
            </button>
            <button 
              onClick={() => handleAddBot('hard')}
              className="px-3 py-2 bg-orange-600/30 border border-orange-500/50 rounded-lg text-orange-400 hover:bg-orange-600/40 transition-all"
              disabled={players.length >= roomSettings.maxPlayers}
            >
              + Hard Bot
            </button>
            <button 
              onClick={() => handleAddBot('expert')}
              className="px-3 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-600/40 transition-all"
              disabled={players.length >= roomSettings.maxPlayers}
            >
              + Expert Bot
            </button>
          </div>
        </div>
        
        {/* Current Bots List */}
        <div>
          <h4 className="text-white font-semibold mb-2">
            Current Bots ({botPlayers.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {botPlayers.length === 0 ? (
              <div className="text-white/60 text-center py-4">No bots in the game</div>
            ) : (
              botPlayers.map(bot => (
                <div key={bot.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <div className="text-white font-medium">{bot.name}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${difficultyColors[bot.botDifficulty || 'normal']}`}>
                        {bot.botDifficulty?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveBot(bot.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    aria-label={`Remove ${bot.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Bot Configuration Options */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <h4 className="text-white font-semibold">Bot Settings</h4>
          
          <label className="flex items-center space-x-2 text-white">
            <input 
              type="checkbox"
              checked={roomSettings.botConfig.fillEmpty}
              onChange={(e) => handleSettingsChange('fillEmpty', e.target.checked)}
              className="rounded"
            />
            <span>Auto-fill empty slots</span>
          </label>
          
          <label className="flex items-center space-x-2 text-white">
            <input 
              type="checkbox"
              checked={roomSettings.botConfig.teamBalance}
              onChange={(e) => handleSettingsChange('teamBalance', e.target.checked)}
              className="rounded"
            />
            <span>Auto team balance</span>
          </label>

          <div>
            <label className="block text-white/80 mb-2">Default Bot Difficulty</label>
            <select 
              value={roomSettings.botConfig.difficulty}
              onChange={(e) => handleSettingsChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
            >
              <option value="easy">🟢 Easy</option>
              <option value="normal">🟡 Normal</option>
              <option value="hard">🟠 Hard</option>
              <option value="expert">🔴 Expert</option>
            </select>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-white font-semibold mb-2">Quick Actions</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                botPlayers.forEach(bot => handleRemoveBot(bot.id));
              }}
              disabled={botPlayers.length === 0}
              className="flex-1 px-3 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-600/40 transition-all disabled:opacity-50"
            >
              Remove All
            </button>
            <button
              onClick={() => {
                const slotsNeeded = Math.floor((roomSettings.maxPlayers - players.length) / 2);
                for (let i = 0; i < slotsNeeded; i++) {
                  handleAddBot(roomSettings.botConfig.difficulty);
                }
              }}
              disabled={players.length >= roomSettings.maxPlayers}
              className="flex-1 px-3 py-2 bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-600/40 transition-all disabled:opacity-50"
            >
              Fill Slots
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BotManagerPanel.displayName = 'BotManagerPanel';