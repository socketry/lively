import React, { useState, useEffect, useCallback } from 'react';
import { HealthArmorHUD } from './HealthArmorHUD';
import { AmmoWeaponHUD } from './AmmoWeaponHUD';
import { ScoreTimerHUD } from './ScoreTimerHUD';
import { KillFeedHUD } from './KillFeedHUD';
import { MiniMapHUD } from './MiniMapHUD';
import { CrosshairHUD } from './CrosshairHUD';
import { WeaponInventoryHUD } from './WeaponInventoryHUD';
import { BuyMenuHUD } from './BuyMenuHUD';
import { ScoreboardHUD } from './ScoreboardHUD';
import { RadioMenuHUD } from './RadioMenuHUD';
import { NotificationsHUD } from './NotificationsHUD';
import { DeathScreenHUD } from './DeathScreenHUD';
import { RoundEndHUD } from './RoundEndHUD';

// Types from GameCore
interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  health: number;
  armor: number;
  money: number;
  kills: number;
  deaths: number;
  assists: number;
  currentWeapon: string;
  weapons: string[];
  ammo: Map<string, number>;
  isAlive: boolean;
  position: { x: number; y: number };
}

interface GameState {
  roundTime: number;
  bombPlanted: boolean;
  bombTimer?: number;
  ctScore: number;
  tScore: number;
  roundPhase: 'warmup' | 'freeze' | 'live' | 'post';
  mvpPlayer?: string;
}

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

export interface GameHUDProps {
  player: Player;
  gameState: GameState;
  allPlayers: Player[];
  killFeed: KillFeedEntry[];
  onWeaponSwitch: (weaponIndex: number) => void;
  onBuyItem: (item: string) => void;
  onRadioCommand: (command: string) => void;
  fps?: number;
  ping?: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  gameState,
  allPlayers,
  killFeed,
  onWeaponSwitch,
  onBuyItem,
  onRadioCommand,
  fps = 0,
  ping = 0
}) => {
  // HUD State
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showRadioMenu, setShowRadioMenu] = useState(false);
  const [radioMenuType, setRadioMenuType] = useState<'z' | 'x' | 'c'>('z');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    timestamp: number;
  }>>([]);

  // Key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'b':
          if (gameState.roundPhase === 'freeze') {
            setShowBuyMenu(prev => !prev);
          }
          break;
        case 'tab':
          e.preventDefault();
          setShowScoreboard(true);
          break;
        case 'z':
          setRadioMenuType('z');
          setShowRadioMenu(true);
          break;
        case 'x':
          setRadioMenuType('x');
          setShowRadioMenu(true);
          break;
        case 'c':
          setRadioMenuType('c');
          setShowRadioMenu(true);
          break;
        case 'escape':
          setShowBuyMenu(false);
          setShowRadioMenu(false);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          if (!showBuyMenu && !showRadioMenu) {
            const weaponIndex = parseInt(e.key) - 1;
            onWeaponSwitch(weaponIndex);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'tab') {
        e.preventDefault();
        setShowScoreboard(false);
      }
      if (['z', 'x', 'c'].includes(e.key.toLowerCase())) {
        setTimeout(() => setShowRadioMenu(false), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.roundPhase, showBuyMenu, showRadioMenu, onWeaponSwitch]);

  // Notification system
  const addNotification = useCallback((message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, notification]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  // Monitor game state for notifications
  useEffect(() => {
    if (gameState.bombPlanted) {
      addNotification('💣 BOMB HAS BEEN PLANTED', 'warning');
    }
  }, [gameState.bombPlanted, addNotification]);

  // Get current weapon ammo
  const currentAmmo = player.ammo.get(player.currentWeapon) || 0;
  const reserveAmmo = player.ammo.get(`${player.currentWeapon}_reserve`) || 0;

  // Check if player is dead
  const isPlayerDead = !player.isAlive;

  // Check if round ended
  const isRoundEnd = gameState.roundPhase === 'post';

  return (
    <div className="absolute inset-0 pointer-events-none font-mono select-none">
      {/* Top Center - Score & Timer */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <ScoreTimerHUD
          ctScore={gameState.ctScore}
          tScore={gameState.tScore}
          roundTime={gameState.roundTime}
          bombTimer={gameState.bombTimer}
          bombPlanted={gameState.bombPlanted}
          roundPhase={gameState.roundPhase}
        />
      </div>

      {/* Top Left - Mini Map */}
      <div className="absolute top-4 left-4">
        <MiniMapHUD
          player={player}
          allPlayers={allPlayers}
          gameState={gameState}
        />
      </div>

      {/* Top Right - Kill Feed */}
      <div className="absolute top-4 right-4">
        <KillFeedHUD killFeed={killFeed} />
      </div>

      {/* Bottom Left - Health & Armor */}
      <div className="absolute bottom-4 left-4">
        <HealthArmorHUD
          health={player.health}
          armor={player.armor}
          money={player.money}
        />
      </div>

      {/* Bottom Right - Ammo & Weapon */}
      <div className="absolute bottom-4 right-4">
        <AmmoWeaponHUD
          currentWeapon={player.currentWeapon}
          currentAmmo={currentAmmo}
          reserveAmmo={reserveAmmo}
          isReloading={false} // TODO: Get from weapon system
          reloadProgress={0} // TODO: Get from weapon system
        />
      </div>

      {/* Bottom Center - Weapon Inventory */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <WeaponInventoryHUD
          weapons={player.weapons}
          currentWeapon={player.currentWeapon}
          ammo={player.ammo}
          onWeaponSelect={onWeaponSwitch}
        />
      </div>

      {/* Center - Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <CrosshairHUD
          isMoving={false} // TODO: Get from player state
          isScoped={false} // TODO: Get from weapon system
          isDucking={false} // TODO: Get from player state
        />
      </div>

      {/* Notifications */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
        <NotificationsHUD notifications={notifications} />
      </div>

      {/* Overlays - These are pointer-events-auto */}
      {showBuyMenu && gameState.roundPhase === 'freeze' && (
        <div className="absolute inset-0 pointer-events-auto">
          <BuyMenuHUD
            money={player.money}
            team={player.team}
            onBuyItem={onBuyItem}
            onClose={() => setShowBuyMenu(false)}
          />
        </div>
      )}

      {showScoreboard && (
        <div className="absolute inset-0 pointer-events-auto">
          <ScoreboardHUD
            players={allPlayers}
            ctScore={gameState.ctScore}
            tScore={gameState.tScore}
            localPlayerId={player.id}
            mvpPlayer={gameState.mvpPlayer}
            ping={ping}
          />
        </div>
      )}

      {showRadioMenu && (
        <div className="absolute inset-0 pointer-events-auto">
          <RadioMenuHUD
            menuType={radioMenuType}
            onCommand={onRadioCommand}
            onClose={() => setShowRadioMenu(false)}
          />
        </div>
      )}

      {isPlayerDead && (
        <div className="absolute inset-0 pointer-events-auto">
          <DeathScreenHUD
            killer="Enemy Player" // TODO: Get from death data
            weapon="ak47" // TODO: Get from death data
            killerHealth={75} // TODO: Get from death data
            spectateTargets={allPlayers.filter(p => p.isAlive && p.team === player.team)}
          />
        </div>
      )}

      {isRoundEnd && (
        <div className="absolute inset-0 pointer-events-auto">
          <RoundEndHUD
            winner={gameState.ctScore > gameState.tScore ? 'ct' : 't'}
            mvpPlayer={gameState.mvpPlayer}
            teamStats={{
              ct: allPlayers.filter(p => p.team === 'ct'),
              t: allPlayers.filter(p => p.team === 't')
            }}
            nextRoundIn={5} // TODO: Get from game state
          />
        </div>
      )}

      {/* Debug Info (bottom right corner) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-green-400 p-2 text-xs">
          <div>FPS: {fps}</div>
          <div>Ping: {ping}ms</div>
          <div>Players: {allPlayers.length}</div>
          <div>Phase: {gameState.roundPhase}</div>
        </div>
      )}
    </div>
  );
};