import React, { useRef, useState, useEffect } from 'react';
import { usePathfinding } from '../../lib/stores/usePathfinding';
import { useGridStore } from '../../lib/stores/useGridStore';
import { GridPosition } from '../../lib/types';

const COLORS = {
  BACKGROUND: 'rgba(0, 0, 0, 0.7)',
  TEXT: '#ffffff',
  OPEN_SET: '#00ff00',
  CLOSED_SET: '#ff0000',
  PATH: '#00ffff',
  HEATMAP_LOW: 'rgba(0, 255, 0, 0.3)',
  HEATMAP_MED: 'rgba(255, 255, 0, 0.3)',
  HEATMAP_HIGH: 'rgba(255, 0, 0, 0.3)',
};

const styles = {
  container: {
    position: 'absolute' as 'absolute',
    bottom: '10px',
    left: '10px',
    backgroundColor: COLORS.BACKGROUND,
    color: COLORS.TEXT,
    padding: '10px',
    borderRadius: '5px',
    fontFamily: 'monospace',
    fontSize: '12px',
    maxWidth: '300px',
    zIndex: 100,
  },
  header: {
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: 'bold' as 'bold',
  },
  row: {
    display: 'flex' as 'flex',
    justifyContent: 'space-between' as 'space-between',
    marginBottom: '5px',
  },
  canvas: {
    border: '1px solid #444',
    marginTop: '10px',
  },
  heatmapCanvas: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none' as 'none',
    zIndex: 5,
  },
};

interface PathfindingStats {
  pathsCalculated: number;
  averagePathLength: number;
  longestPath: number;
  shortestPath: number;
  failedPaths: number;
  lastCalculationTime: number;
  recentPaths: Array<{
    entityId: string;
    pathLength: number;
    calculationTime: number;
  }>;
}

const PathfindingDebug: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const { openSet, closedSet, currentPaths } = usePathfinding();
  const { grid, gridSize } = useGridStore();
  
  const [stats, setStats] = useState<PathfindingStats>({
    pathsCalculated: 0,
    averagePathLength: 0,
    longestPath: 0,
    shortestPath: 0,
    failedPaths: 0,
    lastCalculationTime: 0,
    recentPaths: [],
  });
  
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Update stats when paths change
  useEffect(() => {
    // Simple simulation of stats for now
    const pathLengths = currentPaths.map(path => path.path.length);
    const totalPaths = pathLengths.length;
    
    if (totalPaths === 0) return;
    
    const totalLength = pathLengths.reduce((a, b) => a + b, 0);
    const avgLength = totalLength / totalPaths;
    const maxLength = Math.max(...pathLengths);
    const minLength = Math.min(...pathLengths);
    
    // Generate some synthetic recent paths data
    const recentPaths = currentPaths.map(path => ({
      entityId: path.entityId,
      pathLength: path.path.length,
      calculationTime: Math.random() * 5, // simulate calculation time between 0-5ms
    }));
    
    setStats({
      pathsCalculated: stats.pathsCalculated + 1,
      averagePathLength: avgLength,
      longestPath: maxLength,
      shortestPath: minLength,
      failedPaths: stats.failedPaths + (Math.random() > 0.8 ? 1 : 0), // Simulate occasional failures
      lastCalculationTime: recentPaths.length > 0 
        ? recentPaths[recentPaths.length - 1].calculationTime 
        : stats.lastCalculationTime,
      recentPaths: recentPaths.slice(-5), // Keep only the 5 most recent
    });
  }, [currentPaths]);
  
  // Draw minimap visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid || grid.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size based on grid dimensions (scaled down)
    const cellSize = 5; // smaller cells for the minimap
    canvas.width = gridSize.width * cellSize;
    canvas.height = gridSize.height * cellSize;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        const cellX = x * cellSize;
        const cellY = y * cellSize;
        
        // Draw cell based on walkability
        const isWalkable = grid[y][x];
        ctx.fillStyle = isWalkable ? '#333' : '#000';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        
        // Check if cell is in open or closed set
        const isInOpenSet = openSet.some(pos => pos.x === x && pos.y === y);
        const isInClosedSet = closedSet.some(pos => pos.x === x && pos.y === y);
        
        if (isInOpenSet) {
          ctx.fillStyle = COLORS.OPEN_SET;
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        } else if (isInClosedSet) {
          ctx.fillStyle = COLORS.CLOSED_SET;
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        }
      }
    }
    
    // Draw paths
    currentPaths.forEach(pathData => {
      ctx.strokeStyle = pathData.color;
      ctx.lineWidth = 2;
      
      if (pathData.path.length > 1) {
        ctx.beginPath();
        const start = pathData.path[0];
        ctx.moveTo(
          start.x * cellSize + cellSize / 2,
          start.y * cellSize + cellSize / 2
        );
        
        for (let i = 1; i < pathData.path.length; i++) {
          const pos = pathData.path[i];
          ctx.lineTo(
            pos.x * cellSize + cellSize / 2,
            pos.y * cellSize + cellSize / 2
          );
        }
        
        ctx.stroke();
      }
    });
    
  }, [grid, gridSize, openSet, closedSet, currentPaths]);
  
  // Generate and draw heatmap
  useEffect(() => {
    if (!showHeatmap) return;
    
    const canvas = heatmapCanvasRef.current;
    if (!canvas || !grid || grid.length === 0) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generate heatmap data (this would normally come from actual path usage data)
    const heatmapData: Record<string, number> = {};
    
    // Populate with paths data
    currentPaths.forEach(pathData => {
      pathData.path.forEach(pos => {
        const key = `${pos.x},${pos.y}`;
        heatmapData[key] = (heatmapData[key] || 0) + 1;
      });
    });
    
    // Find max intensity for normalization
    const maxIntensity = Object.values(heatmapData).reduce(
      (max, value) => Math.max(max, value), 0
    );
    
    // Draw heatmap
    if (maxIntensity > 0) {
      for (const key in heatmapData) {
        const [x, y] = key.split(',').map(Number);
        const intensity = heatmapData[key] / maxIntensity;
        
        // Get color based on intensity
        let color;
        if (intensity < 0.3) {
          color = COLORS.HEATMAP_LOW;
        } else if (intensity < 0.7) {
          color = COLORS.HEATMAP_MED;
        } else {
          color = COLORS.HEATMAP_HIGH;
        }
        
        // Draw heat cell (this would need proper conversion from grid to screen coordinates)
        ctx.fillStyle = color;
        // Placeholder coordinates - these would need to be properly calculated based on the game's view
        ctx.fillRect(
          x * 20 + 100, // Placeholder calculation
          y * 20 + 100, // Placeholder calculation
          20,
          20
        );
      }
    }
    
  }, [showHeatmap, grid, currentPaths]);
  
  // Get some stats about the current pathfinding state
  const getPathStats = () => {
    return {
      totalPaths: currentPaths.length,
      openSetSize: openSet.length,
      closedSetSize: closedSet.length,
    };
  };
  
  const pathStats = getPathStats();
  
  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>Pathfinding Debug</div>
        
        <div style={styles.row}>
          <span>Active Paths:</span>
          <span>{pathStats.totalPaths}</span>
        </div>
        
        <div style={styles.row}>
          <span>Open Set Size:</span>
          <span>{pathStats.openSetSize}</span>
        </div>
        
        <div style={styles.row}>
          <span>Closed Set Size:</span>
          <span>{pathStats.closedSetSize}</span>
        </div>
        
        <div style={styles.row}>
          <span>Paths Calculated:</span>
          <span>{stats.pathsCalculated}</span>
        </div>
        
        <div style={styles.row}>
          <span>Average Path Length:</span>
          <span>{stats.averagePathLength.toFixed(1)}</span>
        </div>
        
        <div style={styles.row}>
          <span>Last Calculation Time:</span>
          <span>{stats.lastCalculationTime.toFixed(2)}ms</span>
        </div>
        
        <div style={{marginTop: '10px'}}>
          <label>
            <input 
              type="checkbox" 
              checked={showHeatmap}
              onChange={() => setShowHeatmap(!showHeatmap)}
            />
            {' Show Heatmap'}
          </label>
        </div>
        
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>
      
      {showHeatmap && (
        <canvas ref={heatmapCanvasRef} style={styles.heatmapCanvas} />
      )}
    </>
  );
};

export default PathfindingDebug;