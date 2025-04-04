import { 
  createPathfinder, 
  Grid, 
  GridPosition, 
  PathResult, 
  EntityType, 
  createEntityController 
} from '../src';

/**
 * This example shows how to integrate the pathfinding system with an existing game
 * by creating adapter classes that convert between game and pathfinder formats
 */

/**
 * Adapter that converts your game's grid representation to the pathfinder's Grid
 */
class GameGridAdapter {
  private gameGrid: any; // Your game's grid representation
  private width: number;
  private height: number;
  
  constructor(gameGrid: any) {
    this.gameGrid = gameGrid;
    this.width = gameGrid.width;
    this.height = gameGrid.height;
  }
  
  /**
   * Convert the game grid to a pathfinder Grid
   */
  toPathfinderGrid(): Grid {
    const grid = new Grid(this.width, this.height);
    
    // Iterate through the game grid and set walkable status in the pathfinder grid
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Example: Assuming your game has a isObstacle(x, y) method
        const isWalkable = !this.gameGrid.isObstacle(x, y);
        grid.setWalkable(x, y, isWalkable);
      }
    }
    
    return grid;
  }
}

/**
 * Service that handles pathfinding operations for your game
 */
class GamePathfindingService {
  private grid: Grid;
  private pathfinder: ReturnType<typeof createPathfinder>;
  private gameGridAdapter: GameGridAdapter;
  
  constructor(gameGrid: any) {
    this.gameGridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gameGridAdapter.toPathfinderGrid();
    
    // Create a pathfinder with custom options
    this.pathfinder = createPathfinder(this.grid, undefined, {
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan'
    });
  }
  
  /**
   * Find a path between two points on the grid
   */
  findPath(startX: number, startY: number, goalX: number, goalY: number): PathResult {
    return this.pathfinder.findPath(startX, startY, goalX, goalY, true); // Use path smoothing
  }
  
  /**
   * Update the internal grid when game grid changes
   */
  updateGrid(gameGrid: any): void {
    this.gameGridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gameGridAdapter.toPathfinderGrid();
    this.pathfinder.setGrid(this.grid);
  }
  
  /**
   * Find a valid position near a potentially invalid one
   */
  findValidPositionNear(x: number, y: number, radius: number = 5): GridPosition | null {
    // Check the original position first
    if (this.grid.isWalkable(x, y)) {
      return { x, y };
    }
    
    // Search in expanding squares
    for (let r = 1; r <= radius; r++) {
      // Check all positions at the current radius
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          // Only check positions at the current radius (not inside it)
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (this.grid.isWalkable(newX, newY)) {
              return { x: newX, y: newY };
            }
          }
        }
      }
    }
    
    return null;
  }
}

/**
 * Setup function - shows how to set up pathfinding in your game's initialization
 */
function setupGamePathfinding(gameState: any) {
  // Create the pathfinding service
  const pathfindingService = new GamePathfindingService(gameState.grid);
  
  // Setup entity controller with your game's AI behaviors
  const entityController = createEntityController({
    grid: pathfindingService.findPath(0, 0, 0, 0).grid, // Get grid reference
    pathfinder: pathfindingService.findPath(0, 0, 0, 0).pathfinder, // Get pathfinder reference
    behaviors: {
      // Define your entity behaviors here (similar to entityBehaviorExample.ts)
      [EntityType.GUARD]: {
        initialState: 'patrolling',
        // ... behavior definition
        states: {
          // ... state definitions
        }
      },
      // ... other behaviors
    }
  });
  
  // Example: Register for game grid change events
  gameState.onGridChanged((newGrid: any) => {
    pathfindingService.updateGrid(newGrid);
  });
  
  // Return the services for use in the game
  return {
    pathfindingService,
    entityController
  };
}

/**
 * Example game update loop that uses the pathfinding system
 */
function gameUpdateLoop(deltaTime: number, gameState: any, pathfindingService: GamePathfindingService) {
  // Update all NPCs
  for (const npc of gameState.npcs) {
    if (npc.needsPath) {
      // Calculate path to target
      const path = pathfindingService.findPath(
        npc.position.x, npc.position.y,
        npc.targetPosition.x, npc.targetPosition.y
      );
      
      if (path.found) {
        npc.setPath(path.path);
      } else {
        // Target position is unreachable, find nearest valid position
        const alternateTarget = pathfindingService.findValidPositionNear(
          npc.targetPosition.x, npc.targetPosition.y
        );
        
        if (alternateTarget) {
          console.log(`Target position (${npc.targetPosition.x}, ${npc.targetPosition.y}) for NPC ${npc.id} is unwalkable! Finding alternate target.`);
          console.log(`Adjusted target to (${alternateTarget.x}, ${alternateTarget.y})`);
          
          npc.targetPosition = alternateTarget;
          const newPath = pathfindingService.findPath(
            npc.position.x, npc.position.y,
            alternateTarget.x, alternateTarget.y
          );
          
          if (newPath.found) {
            npc.setPath(newPath.path);
          }
        }
      }
    }
    
    // Update NPC movement along path
    npc.update(deltaTime);
  }
  
  // Update player
  if (gameState.player.isMoving) {
    // Check for obstacles in player's path
    const nextX = Math.floor(gameState.player.position.x + gameState.player.velocity.x * deltaTime);
    const nextY = Math.floor(gameState.player.position.y + gameState.player.velocity.y * deltaTime);
    
    if (!gameState.grid.isObstacle(nextX, nextY)) {
      gameState.player.position.x += gameState.player.velocity.x * deltaTime;
      gameState.player.position.y += gameState.player.velocity.y * deltaTime;
    } else {
      // Player hit an obstacle, stop movement
      gameState.player.velocity.x = 0;
      gameState.player.velocity.y = 0;
    }
  }
}