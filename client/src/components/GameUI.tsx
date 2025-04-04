import { useEffect, useState } from 'react';
import { useEntityStore } from '../lib/stores/useEntityStore';
import { AIType } from '../lib/ai/AITypes';

interface GameUIProps {
  debugMode?: boolean;
}

const GameUI = ({ debugMode = false }: GameUIProps) => {
  const { player, npcs } = useEntityStore();
  const [stats, setStats] = useState({
    guards: 0,
    hunters: 0,
    survivors: 0
  });

  // Update stats
  useEffect(() => {
    const guardCount = npcs.filter(npc => npc.type === AIType.GUARD).length;
    const hunterCount = npcs.filter(npc => npc.type === AIType.HUNTER).length;
    const survivorCount = npcs.filter(npc => npc.type === AIType.SURVIVOR).length;
    
    setStats({
      guards: guardCount,
      hunters: hunterCount,
      survivors: survivorCount
    });
  }, [npcs]);

  return (
    <div className="absolute top-0 left-0 p-4 text-white z-10">
      <div className="bg-black bg-opacity-70 p-4 rounded-lg max-w-xs">
        <h2 className="text-xl mb-2">Game Info</h2>
        
        {/* Player Status */}
        <div className="mb-2">
          <h3 className="font-bold">Player</h3>
          <p>Form: {player?.isMonster ? 'Monster' : 'Human'}</p>
          <p>Position: X:{player?.position.x.toFixed(1)} Y:{player?.position.y.toFixed(1)}</p>
        </div>
        
        {/* Entity counts */}
        <div className="mb-2">
          <h3 className="font-bold">Entities</h3>
          <p>Guards: {stats.guards}</p>
          <p>Hunters: {stats.hunters}</p>
          <p>Survivors: {stats.survivors}</p>
        </div>
        
        {/* Controls */}
        <div className="mt-4">
          <h3 className="font-bold">Controls</h3>
          <div className="md:block hidden">
            <p>WASD/Arrows: Move</p>
            <p>T: Transform (Human/Monster)</p>
            <p>B: Toggle Debug Mode</p>
          </div>
          <div className="md:hidden">
            <p>D-Pad: Move</p>
            <p>Transform Button: Change form</p>
            <p>Debug Button: Toggle visualization</p>
          </div>
        </div>
        
        {/* Debug mode status */}
        <div className="mt-2 p-2 bg-gray-700 rounded">
          Debug Mode: <span className={debugMode ? "text-green-400" : "text-red-400"}>
            {debugMode ? "ON" : "OFF"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameUI;
