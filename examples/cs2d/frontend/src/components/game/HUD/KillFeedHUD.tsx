import React, { useEffect, useState } from 'react';

interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
  killerTeam: 'ct' | 't';
  victimTeam: 'ct' | 't';
}

interface KillFeedHUDProps {
  killFeed: KillFeedEntry[];
}

const weaponIcons: Record<string, string> = {
  'ak47': '🔫',
  'm4a4': '🔫',
  'm4a1s': '🔫',
  'awp': '🎯',
  'deagle': '🔫',
  'glock': '🔫',
  'usps': '🔫',
  'knife': '🔪',
  'he_grenade': '💣',
  'flashbang': '⚡',
  'smoke_grenade': '💨'
};

export const KillFeedHUD: React.FC<KillFeedHUDProps> = ({ killFeed }) => {
  const [visibleEntries, setVisibleEntries] = useState<KillFeedEntry[]>([]);

  useEffect(() => {
    const now = Date.now();
    // Show only entries from the last 10 seconds, max 5 entries
    const filtered = killFeed
      .filter(entry => (now - entry.timestamp) < 10000)
      .slice(-5)
      .reverse(); // Most recent first

    setVisibleEntries(filtered);
  }, [killFeed]);

  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 min-w-[300px]">
      {visibleEntries.map((entry, index) => {
        const age = Date.now() - entry.timestamp;
        const opacity = Math.max(0.3, 1 - (age / 10000));
        const isRecent = age < 2000;
        
        return (
          <div
            key={entry.id}
            className={`bg-black bg-opacity-80 rounded px-3 py-2 flex items-center justify-between transition-all duration-300 ${
              isRecent ? 'scale-105 border border-yellow-400' : ''
            }`}
            style={{ opacity }}
          >
            <div className="flex items-center space-x-2 flex-1">
              {/* Killer Name */}
              <span className={`font-bold ${
                entry.killerTeam === 'ct' ? 'text-blue-400' : 'text-red-400'
              }`}>
                {entry.killer}
              </span>

              {/* Weapon Icon */}
              <div className="flex items-center space-x-1">
                {entry.headshot && (
                  <span className="text-yellow-400 text-sm animate-pulse">🎯</span>
                )}
                <span className="text-lg">
                  {weaponIcons[entry.weapon] || '🔫'}
                </span>
              </div>

              {/* Victim Name */}
              <span className={`font-bold ${
                entry.victimTeam === 'ct' ? 'text-blue-400' : 'text-red-400'
              }`}>
                {entry.victim}
              </span>
            </div>

            {/* Additional Info */}
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              {entry.headshot && (
                <span className="text-yellow-400 font-bold">HS</span>
              )}
              {entry.weapon && (
                <span className="uppercase">{entry.weapon}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Multi-kill indicators */}
      {visibleEntries.length >= 2 && (
        <div className="text-center">
          {(() => {
            const recentKills = visibleEntries.filter(entry => 
              (Date.now() - entry.timestamp) < 3000
            );
            
            if (recentKills.length >= 4) {
              return (
                <div className="bg-purple-900 bg-opacity-90 rounded px-3 py-1 animate-pulse">
                  <span className="text-purple-300 font-bold text-sm">
                    🔥 ULTRA KILL! 🔥
                  </span>
                </div>
              );
            } else if (recentKills.length >= 3) {
              return (
                <div className="bg-red-900 bg-opacity-90 rounded px-3 py-1 animate-pulse">
                  <span className="text-red-300 font-bold text-sm">
                    🔥 MULTI KILL! 🔥
                  </span>
                </div>
              );
            } else if (recentKills.length >= 2) {
              return (
                <div className="bg-yellow-900 bg-opacity-90 rounded px-3 py-1">
                  <span className="text-yellow-300 font-bold text-sm">
                    ⚡ DOUBLE KILL! ⚡
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};