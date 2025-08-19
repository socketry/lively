import React, { memo } from 'react';

export const SettingsPanel = memo(() => (
  <div className="p-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl">
    <h3 className="text-xl font-bold text-white mb-4">⚙️ Settings</h3>
    <div className="text-white/60">Settings panel will be implemented here.</div>
  </div>
));

SettingsPanel.displayName = 'SettingsPanel';