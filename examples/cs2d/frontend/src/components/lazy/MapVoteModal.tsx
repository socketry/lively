import React, { memo, useState, useCallback } from 'react';
import { useRenderPerformance } from '@/hooks/usePerformance';

interface MapVote {
  map: string;
  votes: number;
  voters: string[];
}

interface MapVoteModalProps {
  currentMap: string;
  isHost: boolean;
  onClose: () => void;
  onMapSelect: (map: string) => void;
}

const availableMaps = [
  { id: 'de_dust2', name: 'Dust 2', image: '🏜️', description: 'Classic desert map' },
  { id: 'de_inferno', name: 'Inferno', image: '🏘️', description: 'Italian village setting' },
  { id: 'de_mirage', name: 'Mirage', image: '🕌', description: 'Middle Eastern town' },
  { id: 'de_cache', name: 'Cache', image: '🏭', description: 'Industrial complex' },
  { id: 'de_overpass', name: 'Overpass', image: '🌉', description: 'Urban overpass' },
  { id: 'cs_office', name: 'Office', image: '🏢', description: 'Corporate office building' },
  { id: 'cs_italy', name: 'Italy', image: '🇮🇹', description: 'Italian coastal town' },
  { id: 'aim_map', name: 'Aim Map', image: '🎯', description: 'Training and practice' }
];

export const MapVoteModal = memo<MapVoteModalProps>(({
  currentMap,
  isHost,
  onClose,
  onMapSelect
}) => {
  useRenderPerformance('MapVoteModal');
  
  const [votes, setVotes] = useState<MapVote[]>(
    availableMaps.map(map => ({
      map: map.id,
      votes: map.id === currentMap ? 1 : Math.floor(Math.random() * 3),
      voters: map.id === currentMap ? ['Host'] : []
    }))
  );
  
  const [selectedMap, setSelectedMap] = useState<string>(currentMap);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = useCallback((mapId: string) => {
    if (hasVoted && !isHost) return;
    
    setVotes(prev => prev.map(vote => ({
      ...vote,
      votes: vote.map === mapId ? vote.votes + 1 : vote.votes,
      voters: vote.map === mapId ? [...vote.voters, 'You'] : vote.voters
    })));
    
    setSelectedMap(mapId);
    setHasVoted(true);
  }, [hasVoted, isHost]);

  const handleConfirmSelection = useCallback(() => {
    if (isHost) {
      onMapSelect(selectedMap);
      onClose();
    }
  }, [isHost, selectedMap, onMapSelect, onClose]);

  const sortedMaps = [...votes].sort((a, b) => b.votes - a.votes);
  const winningMap = sortedMaps[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">🗺️ Map Vote</h2>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
            aria-label="Close map vote"
          >
            ✕
          </button>
        </div>
        
        {/* Current Status */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80">Current Map:</div>
              <div className="text-white font-semibold text-lg">
                {availableMaps.find(m => m.id === currentMap)?.name || currentMap}
              </div>
            </div>
            {winningMap && (
              <div>
                <div className="text-white/80">Leading Vote:</div>
                <div className="text-white font-semibold text-lg">
                  {availableMaps.find(m => m.id === winningMap.map)?.name} ({winningMap.votes} votes)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {availableMaps.map(map => {
            const voteData = votes.find(v => v.map === map.id);
            const isSelected = selectedMap === map.id;
            const isCurrent = currentMap === map.id;
            
            return (
              <button
                key={map.id}
                onClick={() => handleVote(map.id)}
                disabled={hasVoted && !isHost && !isCurrent}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/20'
                    : isCurrent
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-4xl mb-2">{map.image}</div>
                <div className="text-white font-semibold mb-1">{map.name}</div>
                <div className="text-white/60 text-sm mb-2">{map.description}</div>
                <div className="flex items-center justify-between">
                  <div className="text-white/80 text-sm">
                    {voteData?.votes || 0} votes
                  </div>
                  {isCurrent && (
                    <div className="text-green-400 text-xs">CURRENT</div>
                  )}
                  {isSelected && !isCurrent && (
                    <div className="text-purple-400 text-xs">SELECTED</div>
                  )}
                </div>
                
                {/* Vote Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, ((voteData?.votes || 0) / Math.max(1, Math.max(...votes.map(v => v.votes)))) * 100)}%`
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Voting Status */}
        {hasVoted && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="text-green-400 text-sm">
              ✅ Your vote has been recorded for {availableMaps.find(m => m.id === selectedMap)?.name}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-6 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
          >
            Cancel
          </button>
          
          {isHost ? (
            <button 
              onClick={handleConfirmSelection}
              disabled={!selectedMap}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Change Map to {availableMaps.find(m => m.id === selectedMap)?.name}
            </button>
          ) : (
            <div className="px-6 py-2 text-white/60">
              Only the host can change the map
            </div>
          )}
        </div>

        {/* Vote Results Summary */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <h3 className="text-white font-semibold mb-3">Vote Results</h3>
          <div className="space-y-2">
            {sortedMaps.slice(0, 3).map((vote, index) => {
              const map = availableMaps.find(m => m.id === vote.map);
              if (!map) return null;
              
              return (
                <div key={vote.map} className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{map.image}</div>
                    <div>
                      <div className="text-white font-medium">{map.name}</div>
                      <div className="text-white/60 text-sm">{vote.votes} votes</div>
                    </div>
                  </div>
                  <div className="text-white/40 text-sm">
                    #{index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

MapVoteModal.displayName = 'MapVoteModal';