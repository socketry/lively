import React, { useState } from 'react';

interface WeaponItem {
  id: string;
  name: string;
  price: number;
  damage: number;
  fireRate: number;
  accuracy: number;
  icon: string;
  description: string;
  killAward: number;
  category: string;
}

interface BuyMenuHUDProps {
  money: number;
  team: 'ct' | 't';
  onBuyItem: (itemId: string) => void;
  onClose: () => void;
}

const weapons: Record<string, WeaponItem[]> = {
  pistols: [
    {
      id: 'glock',
      name: 'Glock-18',
      price: 200,
      damage: 28,
      fireRate: 400,
      accuracy: 56,
      icon: '🔫',
      description: 'Standard T-side pistol with burst fire',
      killAward: 300,
      category: 'pistol'
    },
    {
      id: 'usps',
      name: 'USP-S',
      price: 200,
      damage: 35,
      fireRate: 350,
      accuracy: 66,
      icon: '🔫',
      description: 'Silenced CT-side pistol',
      killAward: 300,
      category: 'pistol'
    },
    {
      id: 'p250',
      name: 'P250',
      price: 300,
      damage: 38,
      fireRate: 400,
      accuracy: 64,
      icon: '🔫',
      description: 'Versatile pistol for both teams',
      killAward: 300,
      category: 'pistol'
    },
    {
      id: 'deagle',
      name: 'Desert Eagle',
      price: 700,
      damage: 63,
      fireRate: 267,
      accuracy: 51,
      icon: '🔫',
      description: 'High damage hand cannon',
      killAward: 300,
      category: 'pistol'
    }
  ],
  rifles: [
    {
      id: 'famas',
      name: 'FAMAS',
      price: 2250,
      damage: 30,
      fireRate: 666,
      accuracy: 66,
      icon: '🔫',
      description: 'CT budget rifle with burst fire',
      killAward: 300,
      category: 'rifle'
    },
    {
      id: 'galil',
      name: 'Galil AR',
      price: 2000,
      damage: 30,
      fireRate: 666,
      accuracy: 60,
      icon: '🔫',
      description: 'T budget rifle',
      killAward: 300,
      category: 'rifle'
    },
    {
      id: 'm4a4',
      name: 'M4A4',
      price: 3100,
      damage: 33,
      fireRate: 666,
      accuracy: 71,
      icon: '🔫',
      description: 'CT standard rifle',
      killAward: 300,
      category: 'rifle'
    },
    {
      id: 'ak47',
      name: 'AK-47',
      price: 2700,
      damage: 36,
      fireRate: 600,
      accuracy: 73,
      icon: '🔫',
      description: 'T standard rifle - one shot headshot',
      killAward: 300,
      category: 'rifle'
    },
    {
      id: 'awp',
      name: 'AWP',
      price: 4750,
      damage: 115,
      fireRate: 41,
      accuracy: 85,
      icon: '🎯',
      description: 'One shot, one kill sniper rifle',
      killAward: 100,
      category: 'sniper'
    }
  ],
  smgs: [
    {
      id: 'mac10',
      name: 'MAC-10',
      price: 1050,
      damage: 29,
      fireRate: 800,
      accuracy: 48,
      icon: '🔫',
      description: 'T fast firing SMG',
      killAward: 600,
      category: 'smg'
    },
    {
      id: 'mp9',
      name: 'MP9',
      price: 1250,
      damage: 26,
      fireRate: 857,
      accuracy: 52,
      icon: '🔫',
      description: 'CT fast firing SMG',
      killAward: 600,
      category: 'smg'
    },
    {
      id: 'ump45',
      name: 'UMP-45',
      price: 1200,
      damage: 35,
      fireRate: 666,
      accuracy: 51,
      icon: '🔫',
      description: 'Balanced SMG for both teams',
      killAward: 600,
      category: 'smg'
    }
  ],
  equipment: [
    {
      id: 'kevlar',
      name: 'Kevlar Vest',
      price: 650,
      damage: 0,
      fireRate: 0,
      accuracy: 0,
      icon: '🛡️',
      description: 'Reduces damage from bullets',
      killAward: 0,
      category: 'equipment'
    },
    {
      id: 'helmet',
      name: 'Kevlar + Helmet',
      price: 1000,
      damage: 0,
      fireRate: 0,
      accuracy: 0,
      icon: '⛑️',
      description: 'Full body armor protection',
      killAward: 0,
      category: 'equipment'
    },
    {
      id: 'defuse_kit',
      name: 'Defuse Kit',
      price: 400,
      damage: 0,
      fireRate: 0,
      accuracy: 0,
      icon: '🔧',
      description: 'Faster bomb defusal (CT only)',
      killAward: 0,
      category: 'equipment'
    }
  ],
  grenades: [
    {
      id: 'he_grenade',
      name: 'HE Grenade',
      price: 300,
      damage: 100,
      fireRate: 0,
      accuracy: 0,
      icon: '💣',
      description: 'High explosive damage',
      killAward: 300,
      category: 'grenade'
    },
    {
      id: 'flashbang',
      name: 'Flashbang',
      price: 200,
      damage: 0,
      fireRate: 0,
      accuracy: 0,
      icon: '⚡',
      description: 'Blinds enemies',
      killAward: 0,
      category: 'grenade'
    },
    {
      id: 'smoke_grenade',
      name: 'Smoke Grenade',
      price: 300,
      damage: 0,
      fireRate: 0,
      accuracy: 0,
      icon: '💨',
      description: 'Blocks vision',
      killAward: 0,
      category: 'grenade'
    },
    {
      id: 'molotov',
      name: team === 'ct' ? 'Incendiary' : 'Molotov',
      price: 400,
      damage: 40,
      fireRate: 0,
      accuracy: 0,
      icon: '🔥',
      description: 'Area denial fire damage',
      killAward: 300,
      category: 'grenade'
    }
  ]
};

export const BuyMenuHUD: React.FC<BuyMenuHUDProps> = ({
  money,
  team,
  onBuyItem,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('rifles');
  const [selectedItem, setSelectedItem] = useState<WeaponItem | null>(null);

  const categories = ['pistols', 'rifles', 'smgs', 'equipment', 'grenades'];

  const categoryNames = {
    pistols: 'Pistols',
    rifles: 'Rifles',
    smgs: 'SMGs',
    equipment: 'Equipment',
    grenades: 'Grenades'
  };

  const getItemsForCategory = (category: string): WeaponItem[] => {
    let items = weapons[category] || [];
    
    // Filter team-specific items
    if (category === 'equipment') {
      items = items.filter(item => 
        item.id !== 'defuse_kit' || team === 'ct'
      );
    }
    
    return items;
  };

  const canAfford = (item: WeaponItem): boolean => {
    return money >= item.price;
  };

  const handleBuyItem = (item: WeaponItem) => {
    if (canAfford(item)) {
      onBuyItem(item.id);
    }
  };

  const renderStatBar = (value: number, maxValue: number = 100) => (
    <div className="w-full bg-gray-700 rounded-full h-1">
      <div
        className="bg-green-500 h-1 rounded-full"
        style={{ width: `${(value / maxValue) * 100}%` }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-2xl font-bold">Buy Menu</h2>
          <div className="flex items-center space-x-4">
            <div className="text-green-400 text-xl font-bold">
              ${money.toLocaleString()}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Categories Sidebar */}
          <div className="w-48 bg-gray-800 border-r border-gray-700">
            <div className="p-4">
              <h3 className="text-gray-300 text-sm font-bold mb-3">CATEGORIES</h3>
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {categoryNames[category as keyof typeof categoryNames]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {getItemsForCategory(selectedCategory).map(item => (
                <div
                  key={item.id}
                  className={`bg-gray-800 rounded-lg border-2 transition-all cursor-pointer ${
                    canAfford(item)
                      ? 'border-gray-600 hover:border-green-500'
                      : 'border-red-600 opacity-60'
                  } ${selectedItem?.id === item.id ? 'border-blue-500' : ''}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="p-4">
                    {/* Item Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl">{item.icon}</div>
                      <div className={`text-lg font-bold ${
                        canAfford(item) ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${item.price}
                      </div>
                    </div>

                    {/* Item Name */}
                    <h4 className="text-white font-bold text-sm mb-2">{item.name}</h4>

                    {/* Stats (for weapons) */}
                    {item.damage > 0 && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-gray-300">
                          <span>Damage</span>
                          <span>{item.damage}</span>
                        </div>
                        {renderStatBar(item.damage, 120)}
                        
                        <div className="flex justify-between text-gray-300">
                          <span>Fire Rate</span>
                          <span>{item.fireRate}</span>
                        </div>
                        {renderStatBar(item.fireRate, 900)}
                        
                        <div className="flex justify-between text-gray-300">
                          <span>Accuracy</span>
                          <span>{item.accuracy}%</span>
                        </div>
                        {renderStatBar(item.accuracy)}
                      </div>
                    )}

                    {/* Buy Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyItem(item);
                      }}
                      disabled={!canAfford(item)}
                      className={`w-full mt-3 py-2 rounded text-sm font-bold transition-colors ${
                        canAfford(item)
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford(item) ? 'BUY' : 'INSUFFICIENT FUNDS'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Item Details Sidebar */}
          {selectedItem && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">{selectedItem.icon}</div>
                <h3 className="text-white text-xl font-bold">{selectedItem.name}</h3>
                <div className="text-green-400 text-2xl font-bold">
                  ${selectedItem.price}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-gray-300 text-sm font-bold mb-2">DESCRIPTION</h4>
                  <p className="text-gray-400 text-sm">{selectedItem.description}</p>
                </div>

                {selectedItem.damage > 0 && (
                  <div>
                    <h4 className="text-gray-300 text-sm font-bold mb-2">STATISTICS</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Damage:</span>
                        <span className="text-white">{selectedItem.damage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fire Rate:</span>
                        <span className="text-white">{selectedItem.fireRate} RPM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Accuracy:</span>
                        <span className="text-white">{selectedItem.accuracy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Kill Reward:</span>
                        <span className="text-green-400">${selectedItem.killAward}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleBuyItem(selectedItem)}
                  disabled={!canAfford(selectedItem)}
                  className={`w-full py-3 rounded font-bold transition-colors ${
                    canAfford(selectedItem)
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canAfford(selectedItem) ? `BUY FOR $${selectedItem.price}` : 'INSUFFICIENT FUNDS'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-3 border-t border-gray-700">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>Press B to close • Click items to buy</div>
            <div>Money: <span className="text-green-400 font-bold">${money.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};