import React, { useState } from 'react';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  isAlive: boolean;
  health: number;
}

interface DeathScreenHUDProps {
  killer: string;
  weapon: string;
  killerHealth: number;
  spectateTargets: Player[];
  respawnTime?: number;
}

const weaponIcons: Record<string, string> = {
  'ak47': '🔫', 'm4a4': '🔫', 'm4a1s': '🔫', 'awp': '🎯',
  'deagle': '🔫', 'glock': '🔫', 'usps': '🔫', 'knife': '🔪',
  'he_grenade': '💣', 'flashbang': '⚡', 'smoke_grenade': '💨'
};

export const DeathScreenHUD: React.FC<DeathScreenHUDProps> = ({
  killer,
  weapon,
  killerHealth,
  spectateTargets,
  respawnTime
}) => {
  const [currentSpectateIndex, setCurrentSpectateIndex] = useState(0);

  const handleNextSpectate = () => {
    if (spectateTargets.length > 0) {
      setCurrentSpectateIndex((prev) => (prev + 1) % spectateTargets.length);
    }
  };

  const handlePrevSpectate = () => {
    if (spectateTargets.length > 0) {
      setCurrentSpectateIndex((prev) => 
        prev === 0 ? spectateTargets.length - 1 : prev - 1
      );
    }
  };

  const currentSpectateTarget = spectateTargets[currentSpectateIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center pointer-events-auto">
      {/* Death Message */}
      <div className="bg-red-900 bg-opacity-90 rounded-lg border-2 border-red-500 p-6 mb-6 text-center animate-pulse">
        <div className="text-red-200 text-6xl mb-4">💀</div>
        <div className="text-white text-2xl font-bold mb-2">YOU HAVE BEEN ELIMINATED</div>
        
        <div className="bg-black bg-opacity-50 rounded p-4 space-y-2">
          <div className="flex items-center justify-center space-x-2 text-lg">
            <span className="text-red-400 font-bold">{killer}</span>
            <div className="flex items-center space-x-1">
              <span className="text-2xl">{weaponIcons[weapon] || '🔫'}</span>
              <span className="text-gray-400 text-sm uppercase">{weapon}</span>
            </div>
            <span className="text-blue-400 font-bold">YOU</span>
          </div>
          
          <div className="text-gray-300 text-sm">
            {killer} had <span className="text-green-400 font-bold">{killerHealth} HP</span> remaining
          </div>
        </div>
      </div>

      {/* Spectate Section */}
      {spectateTargets.length > 0 && (
        <div className="bg-gray-900 bg-opacity-90 rounded-lg border border-gray-600 p-4 mb-4">
          <div className="text-center mb-4">
            <h3 className="text-white text-xl font-bold mb-2">Spectating Teammates</h3>
            {currentSpectateTarget && (
              <div className="bg-black bg-opacity-50 rounded p-3">
                <div className="text-lg font-bold text-blue-400 mb-1">
                  {currentSpectateTarget.name}
                </div>
                <div className="text-sm text-gray-300">
                  Health: <span className={`font-bold ${
                    currentSpectateTarget.health > 75 ? 'text-green-400' :
                    currentSpectateTarget.health > 50 ? 'text-yellow-400' :
                    currentSpectateTarget.health > 25 ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {currentSpectateTarget.health} HP
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Spectate Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handlePrevSpectate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              disabled={spectateTargets.length <= 1}
            >
              ← Previous
            </button>
            <button
              onClick={handleNextSpectate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              disabled={spectateTargets.length <= 1}
            >
              Next →
            </button>
          </div>

          {/* Teammate List */}
          <div className="mt-4 flex justify-center space-x-2">
            {spectateTargets.map((target, index) => (
              <button
                key={target.id}
                onClick={() => setCurrentSpectateIndex(index)}
                className={`
                  px-3 py-1 rounded text-xs font-medium transition-colors
                  ${index === currentSpectateIndex 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                {target.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Respawn Timer (for deathmatch modes) */}
      {respawnTime !== undefined && respawnTime > 0 && (
        <div className="bg-green-900 bg-opacity-90 rounded-lg border border-green-500 p-4">
          <div className="text-center">
            <div className="text-green-200 text-lg font-bold mb-2">
              Respawning in:
            </div>
            <div className="text-green-400 text-3xl font-bold">
              {Math.ceil(respawnTime)}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-black bg-opacity-50 rounded p-3 text-center">
        <div className="text-gray-300 text-sm space-y-1">
          {spectateTargets.length > 0 && (
            <>
              <div>Use ← → arrow keys or click buttons to spectate teammates</div>
              <div>Mouse to look around while spectating</div>
            </>
          )}
          <div>Wait for the next round to respawn</div>
        </div>
      </div>

      {/* Death Statistics (optional) */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded p-3">
        <div className="text-gray-400 text-sm">
          <div className="text-white font-bold mb-2">This Round:</div>
          <div>Time Survived: 1:23</div>
          <div>Damage Dealt: 67</div>
          <div>Hits: 3/8</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-80 rounded p-3">
        <div className="text-gray-400 text-sm">
          <div className="text-white font-bold mb-2">Match Stats:</div>
          <div>K/D: 5/2</div>
          <div>ADR: 78.3</div>
          <div>HS%: 45%</div>
        </div>
      </div>
    </div>
  );
};