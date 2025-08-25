import React from 'react';

interface AmmoWeaponHUDProps {
  currentWeapon: string;
  currentAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
}

const weaponDisplayNames: Record<string, string> = {
  'ak47': 'AK-47',
  'm4a4': 'M4A4',
  'm4a1s': 'M4A1-S',
  'awp': 'AWP',
  'deagle': 'Desert Eagle',
  'glock': 'Glock-18',
  'usps': 'USP-S',
  'knife': 'Knife',
  'he_grenade': 'HE Grenade',
  'flashbang': 'Flashbang',
  'smoke_grenade': 'Smoke Grenade'
};

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

export const AmmoWeaponHUD: React.FC<AmmoWeaponHUDProps> = ({
  currentWeapon,
  currentAmmo,
  reserveAmmo,
  isReloading,
  reloadProgress
}) => {
  const weaponName = weaponDisplayNames[currentWeapon] || currentWeapon.toUpperCase();
  const weaponIcon = weaponIcons[currentWeapon] || '🔫';
  const isLowAmmo = currentAmmo <= 5 && currentWeapon !== 'knife';
  const hasNoAmmo = currentAmmo === 0 && currentWeapon !== 'knife';

  return (
    <div className="text-right space-y-2">
      {/* Weapon Name */}
      <div className="bg-black bg-opacity-80 rounded px-3 py-1">
        <div className="flex items-center justify-end">
          <span className="text-white text-lg font-bold mr-2">{weaponName}</span>
          <span className="text-2xl">{weaponIcon}</span>
        </div>
      </div>

      {/* Ammo Display */}
      {currentWeapon !== 'knife' && (
        <div className="bg-black bg-opacity-80 rounded p-3 min-w-[200px]">
          <div className="flex items-center justify-end mb-2">
            {/* Current Ammo */}
            <span className={`text-4xl font-bold ${
              hasNoAmmo ? 'text-red-500 animate-pulse' :
              isLowAmmo ? 'text-yellow-400' : 'text-white'
            }`}>
              {currentAmmo}
            </span>
            
            {/* Separator */}
            <span className="text-white text-2xl mx-2">/</span>
            
            {/* Reserve Ammo */}
            <span className="text-gray-400 text-xl">
              {reserveAmmo}
            </span>
          </div>

          {/* Ammo Status */}
          {hasNoAmmo && (
            <div className="text-red-500 text-center text-xs animate-pulse font-bold">
              NO AMMO - RELOAD!
            </div>
          )}
          {isLowAmmo && !hasNoAmmo && (
            <div className="text-yellow-400 text-center text-xs font-bold">
              LOW AMMO
            </div>
          )}

          {/* Reload Progress */}
          {isReloading && (
            <div className="mt-2">
              <div className="flex items-center justify-center mb-1">
                <span className="text-yellow-400 text-sm font-bold animate-pulse">
                  RELOADING...
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-100"
                  style={{ width: `${reloadProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knife Special Display */}
      {currentWeapon === 'knife' && (
        <div className="bg-black bg-opacity-80 rounded p-3 min-w-[200px]">
          <div className="text-center">
            <div className="text-white text-lg font-bold">READY</div>
            <div className="text-gray-400 text-sm">Left: Slash | Right: Stab</div>
          </div>
        </div>
      )}

      {/* Grenade Special Display */}
      {['he_grenade', 'flashbang', 'smoke_grenade'].includes(currentWeapon) && (
        <div className="bg-black bg-opacity-80 rounded p-3 min-w-[200px]">
          <div className="text-center">
            <div className="text-white text-lg font-bold">x{currentAmmo}</div>
            <div className="text-gray-400 text-sm">Left Click to Throw</div>
          </div>
        </div>
      )}

      {/* Fire Mode Indicator (for rifles) */}
      {['ak47', 'm4a4', 'm4a1s'].includes(currentWeapon) && (
        <div className="bg-black bg-opacity-60 rounded px-2 py-1">
          <div className="text-gray-300 text-xs text-center">
            AUTO
          </div>
        </div>
      )}

      {/* Scope Indicator (for AWP) */}
      {currentWeapon === 'awp' && (
        <div className="bg-black bg-opacity-60 rounded px-2 py-1">
          <div className="text-gray-300 text-xs text-center">
            Right Click: Scope
          </div>
        </div>
      )}
    </div>
  );
};