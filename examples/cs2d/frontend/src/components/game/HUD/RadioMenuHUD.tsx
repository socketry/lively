import React, { useEffect, useState } from 'react';

interface RadioMenuHUDProps {
  menuType: 'z' | 'x' | 'c';
  onCommand: (command: string) => void;
  onClose: () => void;
}

const radioMenus = {
  z: {
    title: 'Radio Commands 1',
    commands: [
      { key: '1', text: 'Cover me!', command: 'coverme' },
      { key: '2', text: 'You take the point.', command: 'takepoint' },
      { key: '3', text: 'Hold this position.', command: 'holdpos' },
      { key: '4', text: 'Regroup team.', command: 'regroup' },
      { key: '5', text: 'Follow me.', command: 'followme' },
      { key: '6', text: 'Taking fire!', command: 'takingfire' },
      { key: '7', text: 'Go go go!', command: 'gogogo' },
      { key: '8', text: 'Team, fall back!', command: 'fallback' },
      { key: '9', text: 'Stick together team.', command: 'sticktog' },
      { key: '0', text: 'Get in position and wait.', command: 'getinpos' }
    ]
  },
  x: {
    title: 'Radio Commands 2', 
    commands: [
      { key: '1', text: 'Go A!', command: 'go_a' },
      { key: '2', text: 'Go B!', command: 'go_b' },
      { key: '3', text: 'Need backup!', command: 'backup' },
      { key: '4', text: 'Roger that.', command: 'roger' },
      { key: '5', text: 'Enemy spotted!', command: 'enemyspot' },
      { key: '6', text: 'Enemy down!', command: 'enemydown' },
      { key: '7', text: 'Sector clear.', command: 'clear' },
      { key: '8', text: 'In position.', command: 'inposition' },
      { key: '9', text: 'Reporting in.', command: 'reportin' },
      { key: '0', text: 'Get out of there!', command: 'getout' }
    ]
  },
  c: {
    title: 'Radio Commands 3',
    commands: [
      { key: '1', text: 'Affirmative.', command: 'affirmative' },
      { key: '2', text: 'Negative.', command: 'negative' },
      { key: '3', text: 'Bomb spotted!', command: 'bombspot' },
      { key: '4', text: 'Defusing the bomb!', command: 'defusing' },
      { key: '5', text: 'Planting the bomb!', command: 'planting' },
      { key: '6', text: 'Nice shot!', command: 'niceshot' },
      { key: '7', text: 'Well done!', command: 'welldone' },
      { key: '8', text: 'Sorry!', command: 'sorry' },
      { key: '9', text: 'Thanks!', command: 'thanks' },
      { key: '0', text: 'Cheer!', command: 'cheer' }
    ]
  }
};

export const RadioMenuHUD: React.FC<RadioMenuHUDProps> = ({
  menuType,
  onCommand,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menu = radioMenus[menuType];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      // Number keys 1-0
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(key)) {
        const command = menu.commands.find(cmd => cmd.key === key);
        if (command) {
          onCommand(command.command);
          onClose();
        }
      }
      
      // Arrow keys for selection
      if (key === 'ArrowUp') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key === 'ArrowDown') {
        setSelectedIndex(prev => Math.min(menu.commands.length - 1, prev + 1));
      }
      
      // Enter to select
      if (key === 'Enter') {
        const command = menu.commands[selectedIndex];
        if (command) {
          onCommand(command.command);
          onClose();
        }
      }
      
      // Escape to close
      if (key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, menu, onCommand, onClose]);

  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center pointer-events-auto">
      <div className="bg-gray-900 rounded-lg border-2 border-gray-600 shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-600">
          <h3 className="text-white text-lg font-bold text-center">
            {menu.title}
          </h3>
          <div className="text-gray-400 text-xs text-center mt-1">
            Press number key or use arrow keys + Enter
          </div>
        </div>

        {/* Commands List */}
        <div className="p-2 max-h-96 overflow-y-auto">
          {menu.commands.map((command, index) => (
            <div
              key={command.key}
              className={`
                flex items-center justify-between p-3 rounded transition-all cursor-pointer
                ${selectedIndex === index ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}
              `}
              onClick={() => {
                onCommand(command.command);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center space-x-3">
                <span className={`
                  w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs font-bold
                  ${selectedIndex === index ? 'bg-blue-800 text-blue-200' : 'text-gray-300'}
                `}>
                  {command.key}
                </span>
                <span className="text-sm font-medium">{command.text}</span>
              </div>

              {/* Voice Icon */}
              <div className="text-lg">
                🎤
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-4 py-2 border-t border-gray-600">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <div>Auto-closes in 3 seconds</div>
            <div className="flex space-x-4">
              <span>Z/X/C = Menus</span>
              <span>ESC = Close</span>
            </div>
          </div>
        </div>

        {/* Quick Access Keys */}
        <div className="absolute -top-12 left-0 right-0 flex justify-center space-x-2">
          {['z', 'x', 'c'].map(key => (
            <div
              key={key}
              className={`
                w-8 h-8 rounded bg-gray-800 border flex items-center justify-center text-xs font-bold
                ${menuType === key ? 'border-blue-500 bg-blue-800 text-white' : 'border-gray-600 text-gray-400'}
              `}
            >
              {key.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Team Communication Indicator */}
        <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 bg-blue-900 bg-opacity-90 rounded-r-lg p-2 text-xs text-blue-200">
          <div className="writing-mode-vertical text-center">
            TEAM<br/>RADIO
          </div>
        </div>
      </div>
    </div>
  );
};