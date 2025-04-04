import { useEffect, useState } from 'react';
import { useEntityStore } from '../lib/stores/useEntityStore';
import { usePerformanceStore } from '../lib/stores/usePerformanceStore';
import { AIType } from '../lib/ai/AITypes';
import PerformanceMetricsUI from './debug/PerformanceMetricsUI';
import PathfindingDebug from './debug/PathfindingDebug';
import AIDecisionTreeVisualizer from './debug/AIDecisionTreeVisualizer';

interface GameUIProps {
  debugMode?: boolean;
}

const GameUI = ({ debugMode = false }: GameUIProps) => {
  const { player, npcs } = useEntityStore();
  const { visualizationOptions, toggleMetricsDisplay } = usePerformanceStore();
  const [stats, setStats] = useState({
    guards: 0,
    hunters: 0,
    survivors: 0,
    preservers: 0,
    merchants: 0
  });

  // Update stats
  useEffect(() => {
    const guardCount = npcs.filter(npc => npc.type === AIType.GUARD).length;
    const hunterCount = npcs.filter(npc => npc.type === AIType.HUNTER).length;
    const survivorCount = npcs.filter(npc => npc.type === AIType.SURVIVOR).length;
    const preserverCount = npcs.filter(npc => npc.type === AIType.PRESERVER).length;
    const merchantCount = npcs.filter(npc => npc.type === AIType.MERCHANT).length;
    
    setStats({
      guards: guardCount,
      hunters: hunterCount,
      survivors: survivorCount,
      preservers: preserverCount,
      merchants: merchantCount
    });
  }, [npcs]);
  
  // Toggle performance metrics display when debug mode changes
  useEffect(() => {
    if (debugMode) {
      toggleMetricsDisplay();
    }
  }, [debugMode, toggleMetricsDisplay]);

  const [showDecisionTree, setShowDecisionTree] = useState(false);

  // Close decision tree handler
  const handleCloseDecisionTree = () => {
    setShowDecisionTree(false);
  };

  return (
    <>
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
            <p>Preservers: {stats.preservers}</p>
            <p>Merchants: {stats.merchants}</p>
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
          
          {/* Debug performance button */}
          {debugMode && (
            <button
              className="mt-2 p-2 bg-blue-600 text-white rounded w-full hover:bg-blue-700"
              onClick={toggleMetricsDisplay}
            >
              Toggle Performance Metrics
            </button>
          )}
        </div>
      </div>
      
      {/* Show performance metrics UI when debugMode is true */}
      {debugMode && visualizationOptions.showMetrics && <PerformanceMetricsUI />}
      
      {/* Show pathfinding debug UI when debugMode is true */}
      {debugMode && visualizationOptions.showPathfinding && <PathfindingDebug />}
      
      {/* Show AI decision tree visualizer when enabled */}
      {debugMode && 
       visualizationOptions.showDecisionTree && 
       visualizationOptions.selectedEntityId && 
       showDecisionTree && (
        <AIDecisionTreeVisualizer onClose={handleCloseDecisionTree} />
      )}
    </>
  );
};

export default GameUI;
