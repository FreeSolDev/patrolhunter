import { createPathfinder, Grid, GridPosition, PathResult } from '../src';

// Example of how to integrate the pathfinder with a game
// This is just an example and should be adapted to your game's architecture

// 1. Define your game-specific grid adapter
class GameGridAdapter {
  private gameGrid: any; // Your game's grid representation
  private width: number;
  private height: number;
  
  constructor(gameGrid: any) {
    this.gameGrid = gameGrid;
    this.width = gameGrid.width;
    this.height = gameGrid.height;
  }
  
  // Convert your game grid to a pathfinder Grid
  toPathfinderGrid(): Grid {
    const grid = new Grid(this.width, this.height);
    
    // Iterate through your game grid and set walkable values
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // This should match your game's logic for determining walkable tiles
        const isWalkable = !this.gameGrid.isSolid(x, y);
        grid.setWalkable(x, y, isWalkable);
      }
    }
    
    return grid;
  }
}

// 2. Create a pathfinding service for your game
class GamePathfindingService {
  private grid: Grid;
  private pathfinder: ReturnType<typeof createPathfinder>;
  private gameGridAdapter: GameGridAdapter;
  
  constructor(gameGrid: any) {
    this.gameGridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gameGridAdapter.toPathfinderGrid();
    this.pathfinder = createPathfinder(this.grid, {
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan'
    });
  }
  
  // Find a path for an entity
  findPath(startX: number, startY: number, goalX: number, goalY: number): PathResult {
    return this.pathfinder.findPath(startX, startY, goalX, goalY, true);
  }
  
  // Update the grid when your game's terrain changes
  updateGrid(gameGrid: any): void {
    this.gameGridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gameGridAdapter.toPathfinderGrid();
    this.pathfinder.setGrid(this.grid);
  }
  
  // Helper methods specific to your game
  findValidPositionNear(x: number, y: number, radius: number = 5): GridPosition | null {
    // Use the grid's method to find a walkable position
    return this.grid.findNearestWalkable(x, y, radius);
  }
}

// 3. Integration with game logic
// This is a simplified example - adapt to your game architecture
function setupGamePathfinding(gameState: any) {
  // Create the pathfinding service
  const pathfindingService = new GamePathfindingService(gameState.grid);
  
  // Update service when grid changes
  gameState.onGridUpdate(() => {
    pathfindingService.updateGrid(gameState.grid);
  });
  
  // Make the pathfinder available to AI entities
  gameState.npcs.forEach((npc: any) => {
    npc.pathfinding = {
      findPath: (targetX: number, targetY: number) => {
        const { x, y } = npc.position;
        return pathfindingService.findPath(x, y, targetX, targetY);
      },
      findValidPositionNear: (x: number, y: number, radius: number) => {
        return pathfindingService.findValidPositionNear(x, y, radius);
      }
    };
  });
  
  return pathfindingService;
}

// 4. Example usage in a game update loop
function gameUpdateLoop(deltaTime: number, gameState: any, pathfindingService: GamePathfindingService) {
  // Update each NPC
  gameState.npcs.forEach((npc: any) => {
    // Check if NPC needs a new path
    if (npc.needsNewPath) {
      const target = npc.target;
      const path = npc.pathfinding.findPath(target.x, target.y);
      
      if (path.found) {
        npc.currentPath = path.path;
        npc.currentPathIndex = 0;
      } else {
        // No path found, maybe find an alternative target
        const alternativePos = npc.pathfinding.findValidPositionNear(target.x, target.y);
        if (alternativePos) {
          const altPath = npc.pathfinding.findPath(alternativePos.x, alternativePos.y);
          if (altPath.found) {
            npc.currentPath = altPath.path;
            npc.currentPathIndex = 0;
          }
        }
      }
      
      npc.needsNewPath = false;
    }
    
    // Follow current path if there is one
    if (npc.currentPath && npc.currentPath.length > 0) {
      // Simple path following logic
      if (npc.currentPathIndex < npc.currentPath.length) {
        const nextPoint = npc.currentPath[npc.currentPathIndex];
        
        // Move towards the next point
        const dx = nextPoint.x - npc.position.x;
        const dy = nextPoint.y - npc.position.y;
        const distanceToNextPoint = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceToNextPoint < 0.1) {
          // Reached the point, move to next
          npc.currentPathIndex++;
        } else {
          // Move towards the point
          const speed = npc.speed * deltaTime;
          const moveRatio = speed / distanceToNextPoint;
          
          npc.position.x += dx * moveRatio;
          npc.position.y += dy * moveRatio;
        }
      }
    }
  });
}