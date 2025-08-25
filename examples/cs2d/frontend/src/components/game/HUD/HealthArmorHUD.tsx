import React from 'react';

interface HealthArmorHUDProps {
  health: number;
  armor: number;
  money: number;
}

export const HealthArmorHUD: React.FC<HealthArmorHUDProps> = ({
  health,
  armor,
  money
}) => {
  const healthPercentage = Math.max(0, Math.min(100, health));
  const armorPercentage = Math.max(0, Math.min(100, armor));
  const isLowHealth = health <= 25;

  return (
    <div className="space-y-2">
      {/* Money Display */}
      <div className="bg-black bg-opacity-80 rounded px-3 py-1 flex items-center">
        <span className="text-green-400 text-lg font-bold">$</span>
        <span className="text-white text-lg ml-1">{money.toLocaleString()}</span>
      </div>

      {/* Health Display */}
      <div className="bg-black bg-opacity-80 rounded p-3 min-w-[200px]">
        <div className="flex items-center mb-2">
          {/* Health Icon */}
          <div className="w-6 h-6 mr-3 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-4 h-1 ${isLowHealth ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`} />
              <div className={`w-1 h-4 absolute ${isLowHealth ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
          </div>
          
          {/* Health Number */}
          <span className={`text-2xl font-bold ${
            health > 75 ? 'text-green-400' :
            health > 50 ? 'text-yellow-400' :
            health > 25 ? 'text-orange-400' : 'text-red-500'
          } ${isLowHealth ? 'animate-pulse' : ''}`}>
            {Math.ceil(health)}
          </span>
        </div>

        {/* Health Bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              health > 75 ? 'bg-green-500' :
              health > 50 ? 'bg-yellow-500' :
              health > 25 ? 'bg-orange-500' : 'bg-red-500'
            } ${isLowHealth ? 'animate-pulse' : ''}`}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>

        {/* Low Health Warning */}
        {isLowHealth && (
          <div className="text-red-500 text-xs text-center mt-1 animate-pulse font-bold">
            LOW HEALTH
          </div>
        )}
      </div>

      {/* Armor Display */}
      {armor > 0 && (
        <div className="bg-black bg-opacity-80 rounded p-3 min-w-[200px]">
          <div className="flex items-center mb-2">
            {/* Armor Icon */}
            <div className="w-6 h-6 mr-3 relative">
              <div className="absolute inset-0 bg-blue-500 rounded" 
                style={{
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
                }}
              />
            </div>
            
            {/* Armor Number */}
            <span className="text-2xl font-bold text-blue-400">
              {Math.ceil(armor)}
            </span>
          </div>

          {/* Armor Bar */}
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${armorPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Effects */}
      <div className="flex space-x-1">
        {isLowHealth && (
          <div className="bg-red-900 bg-opacity-80 rounded px-2 py-1 text-red-300 text-xs animate-pulse">
            WOUNDED
          </div>
        )}
        {armor > 0 && (
          <div className="bg-blue-900 bg-opacity-80 rounded px-2 py-1 text-blue-300 text-xs">
            KEVLAR
          </div>
        )}
      </div>
    </div>
  );
};