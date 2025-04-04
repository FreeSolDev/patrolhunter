import { createPathfinder, Grid, GridPosition, PathResult } from '../src';

/**
 * This adapter integrates the pathfinder with your existing game code
 * It adapts your grid store to the pathfinder's grid format
 */

class GridStoreAdapter {
  private gridStore: any;
  
  constructor(gridStore: any) {
    this.gridStore = gridStore;
  }
  
  /**
   * Convert your grid store to a pathfinder Grid
   */
  toPathfinderGrid(): Grid {
    const width = this.gridStore.gridWidth;
    const height = this.gridStore.gridHeight;
    const grid = new Grid(width, height);
    
    // Iterate through your grid and set walkable status in pathfinder grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.gridStore.getTile(x, y);
        // Assuming your tiles have a 'walkable' property
        grid.setWalkable(x, y, tile?.walkable ?? false);
      }
    }
    
    return grid;
  }
}

class GamePathfindingService {
  private grid: Grid;
  private pathfinder: ReturnType<typeof createPathfinder>;
  private gridAdapter: GridStoreAdapter;
  private gridStore: any;
  
  // Store active entity paths for management
  private activePaths: Map<string, {
    path: GridPosition[];
    targetPosition: GridPosition;
  }> = new Map();
  
  constructor(gridStore: any) {
    this.gridStore = gridStore;
    this.gridAdapter = new GridStoreAdapter(gridStore);
    this.grid = this.gridAdapter.toPathfinderGrid();
    
    this.pathfinder = createPathfinder(this.grid, undefined, {
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan'
    });
    
    this.setupGridChangeListener();
  }
  
  /**
   * Listen for grid changes and update pathfinder grid
   */
  private setupGridChangeListener() {
    // This would use your actual event system
    if (this.gridStore.subscribe) {
      this.gridStore.subscribe(() => {
        this.refreshGrid();
      });
    }
  }
  
  /**
   * Refresh the pathfinder grid when your game grid changes
   */
  private refreshGrid() {
    this.grid = this.gridAdapter.toPathfinderGrid();
    this.pathfinder.setGrid(this.grid);
    
    // Recalculate active paths after grid change
    for (const [entityId, pathData] of this.activePaths.entries()) {
      // Get current entity position from your game state
      const entity = this.gridStore.getEntity(entityId);
      if (entity) {
        const result = this.findPath(
          { x: Math.floor(entity.x), y: Math.floor(entity.y) },
          pathData.targetPosition,
          entityId
        );
        
        // Update the entity's path in your game
        if (result.found) {
          entity.setPath(result.path);
        }
      }
    }
  }
  
  /**
   * Find a path for an entity
   */
  findPath(
    start: GridPosition,
    goal: GridPosition,
    entityId?: string
  ): PathResult {
    // Check if positions are valid
    if (!this.isWalkable(goal.x, goal.y)) {
      // Try to find a nearby walkable position
      const alternateGoal = this.findNearestWalkable(goal.x, goal.y);
      if (alternateGoal) {
        console.log(`Target position (${goal.x}, ${goal.y}) is unwalkable! Finding alternate target.`);
        console.log(`Adjusted target to (${alternateGoal.x}, ${alternateGoal.y})`);
        goal = alternateGoal;
      }
    }
    
    // Find path
    const result = this.pathfinder.findPath(
      start.x, start.y,
      goal.x, goal.y,
      true  // Use smoothing
    );
    
    // Store path if entity ID is provided
    if (entityId && result.found) {
      this.activePaths.set(entityId, {
        path: result.path,
        targetPosition: goal
      });
    }
    
    return result;
  }
  
  /**
   * Check if a position is walkable
   */
  isWalkable(x: number, y: number): boolean {
    return this.grid.isWalkable(x, y);
  }
  
  /**
   * Find the nearest walkable position to coordinates
   */
  findNearestWalkable(x: number, y: number, radius: number = 5): GridPosition | null {
    // Check the original position first
    if (this.isWalkable(x, y)) {
      return { x, y };
    }
    
    // Search in expanding radius
    for (let r = 1; r <= radius; r++) {
      // Check all positions at the current radius
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          // Only check positions at the current radius (not inside it)
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (this.isWalkable(newX, newY)) {
              return { x: newX, y: newY };
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get all active paths
   */
  getActivePaths() {
    return this.activePaths;
  }
  
  /**
   * Clear a specific entity's path
   */
  clearPath(entityId: string) {
    this.activePaths.delete(entityId);
  }
  
  /**
   * Clear all paths
   */
  clearAllPaths() {
    this.activePaths.clear();
  }
}

/**
 * Factory function to create a custom hook for your game
 */
function createUsePathfinding(gridStore: any) {
  const pathfindingService = new GamePathfindingService(gridStore);
  
  // Return a function that matches your existing hook interface
  return () => {
    return {
      findPath: (start: GridPosition, goal: GridPosition, entityId?: string) => {
        return pathfindingService.findPath(start, goal, entityId);
      },
      
      clearPath: (entityId: string) => {
        pathfindingService.clearPath(entityId);
      },
      
      clearAllPaths: () => {
        pathfindingService.clearAllPaths();
      },
      
      isWalkable: (x: number, y: number) => {
        return pathfindingService.isWalkable(x, y);
      },
      
      findNearestWalkable: (x: number, y: number, radius?: number) => {
        return pathfindingService.findNearestWalkable(x, y, radius);
      }
    };
  };
}

/**
 * Example of updating an AI controller with the pathfinding service
 */
function updateAIControllerExample(
  entity: any,
  targetPosition: { x: number, y: number },
  pathfindingService: GamePathfindingService
) {
  // Get current entity position
  const start = { x: Math.floor(entity.x), y: Math.floor(entity.y) };
  
  // Find path to target
  const result = pathfindingService.findPath(start, targetPosition, entity.id);
  
  if (result.found) {
    // Update entity with path
    entity.currentPath = result.path;
    entity.currentPathIndex = 0;
    entity.isFollowingPath = true;
  } else {
    console.log(`No path found for entity ${entity.id} to (${targetPosition.x}, ${targetPosition.y})`);
    entity.isFollowingPath = false;
  }
}

/**
 * Example of rendering paths in your game
 */
function renderPathsExample(
  context: CanvasRenderingContext2D,
  camera: { x: number, y: number, zoom: number },
  tileSize: number,
  pathfindingService: GamePathfindingService
) {
  // Set path drawing style
  context.strokeStyle = 'rgba(0, 255, 0, 0.5)';
  context.lineWidth = 2;
  
  // Get all active paths
  const activePaths = pathfindingService.getActivePaths();
  
  // Render each path
  for (const [entityId, pathData] of activePaths) {
    const { path } = pathData;
    
    if (path.length > 1) {
      context.beginPath();
      
      // Move to first point
      const startX = (path[0].x * tileSize - camera.x) * camera.zoom;
      const startY = (path[0].y * tileSize - camera.y) * camera.zoom;
      context.moveTo(startX, startY);
      
      // Draw line to each subsequent point
      for (let i = 1; i < path.length; i++) {
        const x = (path[i].x * tileSize - camera.x) * camera.zoom;
        const y = (path[i].y * tileSize - camera.y) * camera.zoom;
        context.lineTo(x, y);
      }
      
      context.stroke();
      
      // Draw points at each path position
      context.fillStyle = 'rgba(255, 255, 0, 0.7)';
      for (const point of path) {
        const x = (point.x * tileSize - camera.x) * camera.zoom;
        const y = (point.y * tileSize - camera.y) * camera.zoom;
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}