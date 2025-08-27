import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { PixelInput } from './PixelInput';

interface Player {
  id: string;
  name: string;
  team: 'ct' | 't' | 'spectator';
  isReady: boolean;
  isHost: boolean;
  ping: number;
  kills: number;
  deaths: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  type: 'chat' | 'system';
}

export const PixelWaitingRoom: React.FC = () => {
  const navigate = useNavigate();
  const { id: roomId } = useParams();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'PLAYER1', team: 'ct', isReady: true, isHost: true, ping: 32, kills: 0, deaths: 0 },
    { id: '2', name: 'SNIPER_PRO', team: 't', isReady: false, isHost: false, ping: 45, kills: 0, deaths: 0 },
    { id: '3', name: 'NEWBIE123', team: 'ct', isReady: true, isHost: false, ping: 28, kills: 0, deaths: 0 },
  ]);
  const [isReady, setIsReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'SYSTEM', text: 'WELCOME TO THE ROOM!', timestamp: new Date(), type: 'system' },
    { id: '2', sender: 'PLAYER1', text: 'LETS GO GUYS!', timestamp: new Date(), type: 'chat' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [gameStarting, setGameStarting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const roomName = '🔫 DUST2 CLASSIC';
  const gameMode = 'DEATHMATCH';
  const mapName = 'DE_DUST2';

  // 模拟倒计时
  useEffect(() => {
    let timer: number | undefined;
    if (gameStarting && countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (gameStarting && countdown === 0) {
      navigate(`/pixel/game/${roomId}`);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [gameStarting, countdown, navigate, roomId]);

  const sendMessage = () => {
    if (chatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'YOU',
        text: chatInput.toUpperCase(),
        timestamp: new Date(),
        type: 'chat'
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatInput('');
    }
  };

  const toggleReady = () => {
    setIsReady(!isReady);
    // 模拟更新玩家状态
    const updatedPlayers = players.map(p => 
      p.id === '1' ? { ...p, isReady: !isReady } : p
    );
    setPlayers(updatedPlayers);
  };

  const switchTeam = (team: 'ct' | 't') => {
    const updatedPlayers = players.map(p => 
      p.id === '1' ? { ...p, team } : p
    );
    setPlayers(updatedPlayers);
  };

  const startGame = () => {
    setGameStarting(true);
    setCountdown(5);
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'SYSTEM',
      text: 'GAME STARTING IN 5 SECONDS...',
      timestamp: new Date(),
      type: 'system'
    };
    setChatMessages([...chatMessages, systemMessage]);
  };

  const ctPlayers = players.filter(p => p.team === 'ct');
  const tPlayers = players.filter(p => p.team === 't');
  const spectators = players.filter(p => p.team === 'spectator');
  const allReady = players.every(p => p.isReady);
  const currentPlayer = players.find(p => p.id === '1');

  return (
    <div className="min-h-screen bg-black" style={{ imageRendering: 'pixelated' }}>
      {/* 像素背景 */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* 头部 */}
      <header className="relative z-10 border-b-4 border-gray-600 bg-gray-900">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-pixel text-xl text-white" data-testid="pixel-room-name" style={{ textShadow: '2px 2px 0px #000', letterSpacing: '2px' }}>
                {roomName}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className="font-pixel text-gray-400 text-xs" style={{ letterSpacing: '1px' }}>ROOM: {roomId}</span>
                <span className="font-pixel text-blue-400 text-xs" style={{ letterSpacing: '1px' }}>MODE: {gameMode}</span>
                <span className="font-pixel text-yellow-400 text-xs" style={{ letterSpacing: '1px' }}>MAP: {mapName}</span>
              </div>
            </div>
            <PixelButton
              onClick={() => navigate('/pixel')}
              variant="danger"
              testId="leave-room-btn"
            >
              LEAVE ROOM
            </PixelButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧 - 玩家列表 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 反恐精英队伍 */}
          <PixelPanel title="COUNTER-TERRORISTS" className="w-full">
            <div className="space-y-2">
              {ctPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 bg-blue-900/30 border border-blue-700"
                  data-testid={`ct-player-${player.id}`}
                >
                  <div className="flex items-center space-x-3">
                    {player.isHost && <span className="pixel-text pixel-text-warning">👑</span>}
                    <span className="pixel-text pixel-text-light">{player.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="pixel-text pixel-text-muted">{player.ping}MS</span>
                    <span className={`pixel-text px-2 py-1 border ${
                      player.isReady ? 'pixel-text-success border-green-500' : 'pixel-text-danger border-red-500'
                    }`}>
                      {player.isReady ? 'READY' : 'NOT READY'}
                    </span>
                  </div>
                </div>
              ))}
              {currentPlayer?.team !== 'ct' && (
                <PixelButton
                  onClick={() => switchTeam('ct')}
                  variant="secondary"
                  size="sm"
                  testId="join-ct-btn"
                >
                  JOIN CT
                </PixelButton>
              )}
            </div>
          </PixelPanel>

          {/* 恐怖分子队伍 */}
          <PixelPanel title="TERRORISTS" className="w-full">
            <div className="space-y-2">
              {tPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 bg-red-900/30 border border-red-700"
                  data-testid={`t-player-${player.id}`}
                >
                  <div className="flex items-center space-x-3">
                    {player.isHost && <span className="pixel-text pixel-text-warning">👑</span>}
                    <span className="pixel-text pixel-text-light">{player.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="pixel-text pixel-text-muted">{player.ping}MS</span>
                    <span className={`pixel-text px-2 py-1 border ${
                      player.isReady ? 'pixel-text-success border-green-500' : 'pixel-text-danger border-red-500'
                    }`}>
                      {player.isReady ? 'READY' : 'NOT READY'}
                    </span>
                  </div>
                </div>
              ))}
              {currentPlayer?.team !== 't' && (
                <PixelButton
                  onClick={() => switchTeam('t')}
                  variant="secondary"
                  size="sm"
                  testId="join-t-btn"
                >
                  JOIN T
                </PixelButton>
              )}
            </div>
          </PixelPanel>

          {/* 游戏设置 */}
          <PixelPanel title="GAME SETTINGS" className="w-full">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="pixel-text pixel-text-muted">TIME LIMIT:</span>
                <span className="pixel-text pixel-text-light ml-2" data-testid="time-limit">10 MIN</span>
              </div>
              <div>
                <span className="pixel-text pixel-text-muted">KILL LIMIT:</span>
                <span className="pixel-text pixel-text-light ml-2" data-testid="kill-limit">30 KILLS</span>
              </div>
              <div>
                <span className="pixel-text pixel-text-muted">FRIENDLY FIRE:</span>
                <span className="pixel-text pixel-text-danger ml-2">OFF</span>
              </div>
              <div>
                <span className="pixel-text pixel-text-muted">SPECTATORS:</span>
                <span className="pixel-text pixel-text-light ml-2">{spectators.length}</span>
              </div>
            </div>
          </PixelPanel>

          {/* 控制按钮 */}
          <PixelPanel className="w-full">
            <div className="flex flex-wrap gap-4">
              <PixelButton
                onClick={toggleReady}
                variant={isReady ? 'danger' : 'success'}
                testId="ready-toggle-btn"
              >
                {isReady ? 'NOT READY' : 'READY'}
              </PixelButton>
              
              {currentPlayer?.isHost && (
                <PixelButton
                  onClick={startGame}
                  variant="warning"
                  disabled={!allReady || gameStarting}
                  testId="start-game-btn"
                >
                  {gameStarting ? `STARTING... ${countdown}` : 'START GAME'}
                </PixelButton>
              )}
              
              <PixelButton
                onClick={() => navigate(`/pixel/game/${roomId}`)}
                variant="secondary"
                testId="spectate-btn"
              >
                SPECTATE
              </PixelButton>
            </div>
          </PixelPanel>
        </div>

        {/* 右侧 - 聊天 */}
        <div className="space-y-4">
          <PixelPanel title="CHAT" className="w-full h-96">
            <div className="flex flex-col h-full">
              {/* 聊天消息 */}
              <div className="flex-1 overflow-y-auto space-y-1 mb-4" data-testid="chat-messages">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="pixel-text">
                    <span className={msg.type === 'system' ? 'pixel-text-warning' : 'pixel-text-secondary'}>
                      {msg.sender}:
                    </span>
                    <span className="pixel-text-light ml-2">{msg.text}</span>
                  </div>
                ))}
              </div>

              {/* 聊天输入 */}
              <div className="flex space-x-2">
                <PixelInput
                  value={chatInput}
                  onChange={setChatInput}
                  placeholder="TYPE MESSAGE..."
                  className="flex-1"
                  testId="chat-input"
                  maxLength={100}
                />
                <PixelButton
                  onClick={sendMessage}
                  variant="success"
                  size="sm"
                  testId="send-message-btn"
                >
                  SEND
                </PixelButton>
              </div>
            </div>
          </PixelPanel>

          {/* 地图预览 */}
          <PixelPanel title="MAP PREVIEW" className="w-full">
            <div className="h-32 bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
              <div className="pixel-text pixel-text-muted text-center">
                MAP: {mapName}
                <br />
                PREVIEW LOADING...
              </div>
            </div>
          </PixelPanel>

          {/* 服务器信息 */}
          <PixelPanel title="SERVER INFO" className="w-full">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="pixel-text pixel-text-muted">REGION:</span>
                <span className="pixel-text pixel-text-light">US-WEST</span>
              </div>
              <div className="flex justify-between">
                <span className="pixel-text pixel-text-muted">TICKRATE:</span>
                <span className="pixel-text pixel-text-success">128</span>
              </div>
              <div className="flex justify-between">
                <span className="pixel-text pixel-text-muted">VAC:</span>
                <span className="pixel-text pixel-text-success">ENABLED</span>
              </div>
            </div>
          </PixelPanel>
        </div>
      </div>

      {/* 游戏开始覆盖层 */}
      {gameStarting && (
        <div className="pixel-overlay">
          <PixelPanel className="pixel-modal w-96 text-center" glow>
            <div className="space-y-4">
              <div className="pixel-title text-2xl pixel-text-warning">
                GAME STARTING
              </div>
              <div className="pixel-title text-6xl pixel-text-danger pixel-blink">
                {countdown}
              </div>
              <div className="pixel-text pixel-text-light">
                PREPARE FOR BATTLE!
              </div>
            </div>
          </PixelPanel>
        </div>
      )}
    </div>
  );
};
