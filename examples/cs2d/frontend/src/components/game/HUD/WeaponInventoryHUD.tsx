import React from 'react';

interface WeaponInventoryHUDProps {
  weapons: string[];
  currentWeapon: string;
  ammo: Map<string, number>;
  onWeaponSelect: (weaponIndex: number) => void;
}

const weaponSlots = {
  primary: ['ak47', 'm4a4', 'm4a1s', 'awp', 'scout', 'famas', 'galil'],
  secondary: ['deagle', 'glock', 'usps', 'p250', 'tec9', 'five-seven'],
  knife: ['knife'],
  grenades: ['he_grenade', 'flashbang', 'smoke_grenade', 'decoy', 'molotov', 'incgrenade']
};

const weaponIcons: Record<string, string> = {
  // Primary weapons
  'ak47': '🔫', 'm4a4': '🔫', 'm4a1s': '🔫', 'awp': '🎯',
  'scout': '🎯', 'famas': '🔫', 'galil': '🔫',
  
  // Secondary weapons
  'deagle': '🔫', 'glock': '🔫', 'usps': '🔫',
  'p250': '🔫', 'tec9': '🔫', 'five-seven': '🔫',
  
  // Knife
  'knife': '🔪',
  
  // Grenades
  'he_grenade': '💣', 'flashbang': '⚡', 'smoke_grenade': '💨',
  'decoy': '📻', 'molotov': '🔥', 'incgrenade': '🔥'
};

const getWeaponDisplayName = (weapon: string): string => {
  const names: Record<string, string> = {
    'ak47': 'AK-47', 'm4a4': 'M4A4', 'm4a1s': 'M4A1-S',
    'awp': 'AWP', 'scout': 'Scout', 'famas': 'FAMAS', 'galil': 'Galil',
    'deagle': 'Deagle', 'glock': 'Glock', 'usps': 'USP-S',
    'p250': 'P250', 'tec9': 'Tec-9', 'five-seven': 'Five-Seven',
    'knife': 'Knife',
    'he_grenade': 'HE', 'flashbang': 'Flash', 'smoke_grenade': 'Smoke',
    'decoy': 'Decoy', 'molotov': 'Molotov', 'incgrenade': 'Incendiary'
  };
  return names[weapon] || weapon.toUpperCase();
};

export const WeaponInventoryHUD: React.FC<WeaponInventoryHUDProps> = ({
  weapons,
  currentWeapon,
  ammo,
  onWeaponSelect
}) => {
  // Organize weapons by slots
  const organizedWeapons = {
    primary: weapons.find(w => weaponSlots.primary.includes(w)),
    secondary: weapons.find(w => weaponSlots.secondary.includes(w)),
    knife: weapons.find(w => weaponSlots.knife.includes(w)),
    grenades: weapons.filter(w => weaponSlots.grenades.includes(w))
  };

  const handleSlotClick = (slotIndex: number, weapon?: string) => {
    if (weapon) {
      const weaponIndex = weapons.indexOf(weapon);
      if (weaponIndex >= 0) {
        onWeaponSelect(weaponIndex);
      }
    }
  };

  const renderWeaponSlot = (
    slotNumber: number,
    weapon: string | undefined,
    label: string,
    isWide: boolean = false
  ) => {
    const isSelected = weapon === currentWeapon;
    const hasAmmo = weapon ? ammo.get(weapon) : 0;
    const isGrenade = weapon && weaponSlots.grenades.includes(weapon);
    const isEmpty = !weapon;

    return (
      <div
        className={`
          relative bg-black bg-opacity-80 rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${isSelected ? 'border-yellow-400 bg-yellow-900 bg-opacity-30' : 'border-gray-600'}
          ${isEmpty ? 'opacity-50' : 'hover:border-gray-400'}
          ${isWide ? 'w-20' : 'w-16'} h-16
        `}
        onClick={() => handleSlotClick(slotNumber, weapon)}
      >
        {/* Slot Number */}
        <div className="absolute top-0 left-0 bg-gray-700 text-white text-xs px-1 rounded-br">
          {slotNumber}
        </div>

        {/* Weapon Content */}
        <div className="flex flex-col items-center justify-center h-full p-1">
          {weapon ? (
            <>
              {/* Weapon Icon */}
              <div className="text-2xl">
                {weaponIcons[weapon] || '🔫'}
              </div>
              
              {/* Weapon Name */}
              <div className="text-xs text-white font-bold truncate w-full text-center">
                {getWeaponDisplayName(weapon)}
              </div>
              
              {/* Ammo Count (for weapons with ammo) */}
              {hasAmmo !== undefined && hasAmmo > 0 && !weapon.includes('knife') && (
                <div className={`text-xs ${isGrenade ? 'text-orange-300' : 'text-gray-300'}`}>
                  {isGrenade ? `x${hasAmmo}` : hasAmmo}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Empty Slot */}
              <div className="text-gray-500 text-xl">—</div>
              <div className="text-xs text-gray-500">{label}</div>
            </>
          )}
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute inset-0 rounded-lg border-2 border-yellow-400 animate-pulse pointer-events-none" />
        )}

        {/* Low Ammo Warning */}
        {weapon && !weapon.includes('knife') && hasAmmo !== undefined && hasAmmo <= 5 && hasAmmo > 0 && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  };

  const renderGrenadeSlots = () => {
    const maxGrenadeSlots = 4;
    const grenadeSlots = [];
    
    for (let i = 0; i < maxGrenadeSlots; i++) {
      const grenade = organizedWeapons.grenades[i];
      grenadeSlots.push(
        <div key={`grenade-${i}`} className="relative">
          {renderWeaponSlot(4 + i, grenade, 'Gren')}
        </div>
      );
    }
    
    return grenadeSlots;
  };

  return (
    <div className="flex items-end space-x-2">
      {/* Primary Weapon Slot */}
      <div className="relative">
        {renderWeaponSlot(1, organizedWeapons.primary, 'Primary', true)}
        <div className="text-xs text-gray-400 text-center mt-1">PRIMARY</div>
      </div>

      {/* Secondary Weapon Slot */}
      <div className="relative">
        {renderWeaponSlot(2, organizedWeapons.secondary, 'Secondary')}
        <div className="text-xs text-gray-400 text-center mt-1">PISTOL</div>
      </div>

      {/* Knife Slot */}
      <div className="relative">
        {renderWeaponSlot(3, organizedWeapons.knife, 'Knife')}
        <div className="text-xs text-gray-400 text-center mt-1">KNIFE</div>
      </div>

      {/* Grenade Slots */}
      <div className="flex space-x-1">
        {renderGrenadeSlots()}
      </div>

      {/* Quick Switch Indicator */}
      <div className="bg-black bg-opacity-60 rounded px-2 py-1 text-xs text-gray-300">
        <div>Q - Quick Switch</div>
        <div>1-5 - Select Slot</div>
        <div>Mouse Wheel - Cycle</div>
      </div>
    </div>
  );
};