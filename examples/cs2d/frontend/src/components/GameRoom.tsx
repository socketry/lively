import React, { useState, useEffect } from 'react';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't' | 'spectator';
  isReady: boolean;
  isHost: boolean;
  ping: number;
}

export const GameRoom: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player1', team: 'ct', isReady: true, isHost: true, ping: 32 },
    { id: '2', name: 'Player2', team: 't', isReady: false, isHost: false, ping: 45 },
  ]);
  const [isReady, setIsReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<{text: string, sender: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const roomId = window.location.pathname.split('/').pop();

  const sendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { text: chatInput, sender: 'You' }]);
      setChatInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" data-testid="room-name">Room: Test Room</h2>
            <p className="text-gray-400 text-sm">Room ID: {roomId}</p>
          </div>
          <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors">
            Leave Room
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* Left Panel - Players */}
        <div className="col-span-2 space-y-4">
          {/* CT Team */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-blue-400 font-bold mb-3">Counter-Terrorists</h3>
            <div className="space-y-2">
              {players.filter(p => p.team === 'ct').map(player => (
                <div key={player.id} className="bg-gray-700 rounded p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {player.isHost && <span className="text-yellow-500">👑</span>}
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">{player.ping}ms</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      player.isReady ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* T Team */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-orange-400 font-bold mb-3">Terrorists</h3>
            <div className="space-y-2">
              {players.filter(p => p.team === 't').map(player => (
                <div key={player.id} className="bg-gray-700 rounded p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {player.isHost && <span className="text-yellow-500">👑</span>}
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">{player.ping}ms</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      player.isReady ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room Settings */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-3">Room Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Game Mode:</span>
                <span className="ml-2" data-testid="game-mode">Deathmatch</span>
              </div>
              <div>
                <span className="text-gray-400">Map:</span>
                <span className="ml-2" data-testid="selected-map">de_dust2</span>
              </div>
              <div>
                <span className="text-gray-400">Max Players:</span>
                <span className="ml-2" data-testid="player-count">2/10</span>
              </div>
              <div>
                <span className="text-gray-400">Time Limit:</span>
                <span className="ml-2">10 minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => setIsReady(!isReady)}
              className={`flex-1 py-3 rounded font-semibold transition-colors ${
                isReady 
                  ? 'bg-gray-600 hover:bg-gray-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              data-testid="ready-btn"
            >
              {isReady ? 'Cancel Ready' : 'Ready'}
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded font-semibold transition-colors">
              Change Team
            </button>
            <button 
              className="flex-1 bg-orange-600 hover:bg-orange-700 py-3 rounded font-semibold transition-colors disabled:opacity-50"
              data-testid="start-game-btn"
              disabled={!players.every(p => p.isReady || p.isHost)}
            >
              Start Game
            </button>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-[600px]">
          <h3 className="font-bold mb-3">Room Chat</h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 mb-4" data-testid="room-chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold text-orange-400">{msg.sender}:</span>
                <span className="ml-2 text-gray-300">{msg.text}</span>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="text-gray-500 text-center mt-8">No messages yet</div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};