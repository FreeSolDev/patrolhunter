import { create } from "zustand";
import { GridSize, GridPosition } from "../types";

interface GridState {
  // Grid properties
  grid: boolean[][];
  gridSize: GridSize;
  obstacles: GridPosition[];
  
  // Actions
  initializeGrid: (size: GridSize, customObstacles?: GridPosition[]) => void;
  setTileWalkable: (position: GridPosition, walkable: boolean) => void;
  addObstacle: (position: GridPosition) => void;
  removeObstacle: (position: GridPosition) => void;
}

export const useGridStore = create<GridState>((set) => ({
  grid: [],
  gridSize: { width: 0, height: 0 },
  obstacles: [],
  
  initializeGrid: (size, customObstacles) => {
    const { width, height } = size;
    
    // Create the grid
    const grid: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        row.push(true); // All tiles are walkable by default
      }
      grid.push(row);
    }
    
    // Use provided obstacles or generate random ones
    let obstacles: GridPosition[] = [];
    
    if (customObstacles && customObstacles.length > 0) {
      obstacles = [...customObstacles];
    } else {
      // Generate random obstacles if none provided
      const numObstacles = Math.floor((width * height) * 0.1); // 10% of tiles are obstacles
      
      for (let i = 0; i < numObstacles; i++) {
        // Generate random position
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        
        // Don't place obstacles in the middle area (player spawn)
        const middleX = width / 2;
        const middleY = height / 2;
        const distToMiddle = Math.sqrt(Math.pow(x - middleX, 2) + Math.pow(y - middleY, 2));
        
        if (distToMiddle > 3) {
          obstacles.push({ x, y });
        }
      }
    }
    
    // Mark obstacle tiles as unwalkable
    obstacles.forEach(obstacle => {
      if (obstacle.y >= 0 && obstacle.y < height &&
          obstacle.x >= 0 && obstacle.x < width) {
        grid[obstacle.y][obstacle.x] = false;
      }
    });
    
    set({ grid, gridSize: size, obstacles });
  },
  
  setTileWalkable: (position, walkable) => set((state) => {
    const newGrid = [...state.grid];
    
    // Check if position is valid
    if (
      position.y >= 0 && position.y < newGrid.length &&
      position.x >= 0 && position.x < newGrid[0].length
    ) {
      newGrid[position.y][position.x] = walkable;
    }
    
    return { grid: newGrid };
  }),
  
  addObstacle: (position) => set((state) => {
    // Only add if not already an obstacle
    if (!state.obstacles.some(o => o.x === position.x && o.y === position.y)) {
      const newObstacles = [...state.obstacles, position];
      // Also make the tile unwalkable
      const newGrid = [...state.grid];
      newGrid[position.y][position.x] = false;
      
      return { obstacles: newObstacles, grid: newGrid };
    }
    return {};
  }),
  
  removeObstacle: (position) => set((state) => {
    const newObstacles = state.obstacles.filter(
      o => !(o.x === position.x && o.y === position.y)
    );
    
    // Make the tile walkable again
    const newGrid = [...state.grid];
    newGrid[position.y][position.x] = true;
    
    return { obstacles: newObstacles, grid: newGrid };
  })
}));
