import { createPathfinder, Grid, GridPosition, PathResult } from '../src';

// Example of how to adapt the current game to use the new pathfinding library
// This is based on the existing usePathfinding.ts, useGridStore.ts, and AIController.ts

// First, we create an adapter that converts your existing grid store to our library's grid
class GridStoreAdapter {
  // This would be your Zustand store
  private gridStore: any;
  
  constructor(gridStore: any) {
    this.gridStore = gridStore;
  }
  
  // Convert the grid store to a pathfinder Grid
  toPathfinderGrid(): Grid {
    const { gridSize, tiles } = this.gridStore.getState();
    const grid = new Grid(gridSize.width, gridSize.height);
    
    // Iterate through the tiles and set walkable states
    for (const tileKey in tiles) {
      const [x, y] = tileKey.split(',').map(Number);
      const tile = tiles[tileKey];
      
      // Make sure we're handling the correct data format
      if (!isNaN(x) && !isNaN(y)) {
        grid.setWalkable(x, y, tile.walkable !== false);
      }
    }
    
    return grid;
  }
}

// Now, let's create a service that replaces the usePathfinding.ts functionality
class GamePathfindingService {
  private grid: Grid;
  private pathfinder: ReturnType<typeof createPathfinder>;
  private gridAdapter: GridStoreAdapter;
  private gridStore: any;
  
  // Collection of active paths for visualization
  private activePaths: Map<string, {
    path: GridPosition[];
    color: string;
  }> = new Map();
  
  constructor(gridStore: any) {
    this.gridStore = gridStore;
    this.gridAdapter = new GridStoreAdapter(gridStore);
    this.grid = this.gridAdapter.toPathfinderGrid();
    
    // Create the pathfinder with similar settings to what you had before
    this.pathfinder = createPathfinder(this.grid, {
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan'
    });
    
    // Set up a listener for grid changes
    this.setupGridChangeListener();
  }
  
  // Listen for grid changes and update the pathfinder
  private setupGridChangeListener() {
    // This depends on how your Zustand store notifies about changes
    this.gridStore.subscribe(
      (state: any) => state.gridSize,
      () => this.refreshGrid()
    );
    
    // Also subscribe to tile changes
    this.gridStore.subscribe(
      (state: any) => state.tiles,
      () => this.refreshGrid()
    );
  }
  
  // Refresh the grid
  private refreshGrid() {
    this.grid = this.gridAdapter.toPathfinderGrid();
    this.pathfinder.setGrid(this.grid);
  }
  
  // Find a path from start to goal
  findPath(
    entityId: string,
    start: GridPosition,
    goal: GridPosition,
    color: string = '#ff0000'
  ): PathResult {
    // Find the path
    const result = this.pathfinder.findPath(start.x, start.y, goal.x, goal.y, true);
    
    // Store the path for visualization
    if (result.found) {
      this.activePaths.set(entityId, {
        path: result.path,
        color
      });
    } else {
      // Remove the path if not found
      this.activePaths.delete(entityId);
    }
    
    return result;
  }
  
  // Check if a position is walkable
  isWalkable(x: number, y: number): boolean {
    return this.grid.isWalkable(x, y);
  }
  
  // Find a valid position near a point (useful for AI behaviors)
  findNearestWalkable(x: number, y: number, radius: number = 5): GridPosition | null {
    return this.grid.findNearestWalkable(x, y, radius);
  }
  
  // Get all active paths for visualization
  getActivePaths() {
    return Array.from(this.activePaths.entries()).map(([entityId, { path, color }]) => ({
      entityId,
      path,
      color
    }));
  }
  
  // Clear a specific path
  clearPath(entityId: string) {
    this.activePaths.delete(entityId);
  }
  
  // Clear all paths
  clearAllPaths() {
    this.activePaths.clear();
  }
}

// Now, let's create a hook that will replace usePathfinding.ts
function createUsePathfinding(gridStore: any) {
  // Create a singleton instance of the pathfinding service
  const pathfindingService = new GamePathfindingService(gridStore);
  
  // Return a hook-like function that provides the same interface as before
  return () => {
    return {
      findPath: pathfindingService.findPath.bind(pathfindingService),
      isWalkable: pathfindingService.isWalkable.bind(pathfindingService),
      findNearestWalkable: pathfindingService.findNearestWalkable.bind(pathfindingService),
      getActivePaths: pathfindingService.getActivePaths.bind(pathfindingService),
      clearPath: pathfindingService.clearPath.bind(pathfindingService),
      clearAllPaths: pathfindingService.clearAllPaths.bind(pathfindingService)
    };
  };
}

// Example of how to use this with your AI controller
function updateAIControllerExample(
  npc: any,
  pathfinding: ReturnType<ReturnType<typeof createUsePathfinding>>,
  deltaTime: number
) {
  // This mimics what you do in AIController.ts
  
  // Update path if needed
  if (npc.needsNewPath) {
    const startPos = { x: npc.position.x, y: npc.position.y };
    const goalPos = { x: npc.targetPosition.x, y: npc.targetPosition.y };
    
    // Use the new pathfinding service
    const result = pathfinding.findPath(npc.id, startPos, goalPos, '#0000ff');
    
    if (result.found) {
      npc.currentPath = result.path;
      npc.currentPathIndex = 0;
    } else {
      // Try to find a valid position nearby if original goal is unreachable
      const nearbyPos = pathfinding.findNearestWalkable(goalPos.x, goalPos.y, 5);
      
      if (nearbyPos) {
        const alternativeResult = pathfinding.findPath(
          npc.id,
          startPos,
          nearbyPos,
          '#0000ff'
        );
        
        if (alternativeResult.found) {
          npc.currentPath = alternativeResult.path;
          npc.currentPathIndex = 0;
        } else {
          console.warn(`No path found for NPC ${npc.id}`);
        }
      }
    }
    
    npc.needsNewPath = false;
  }
  
  // Follow the path if we have one
  if (npc.currentPath && npc.currentPath.length > 0 && npc.currentPathIndex < npc.currentPath.length) {
    const nextPoint = npc.currentPath[npc.currentPathIndex];
    
    // Calculate distance to next point
    const dx = nextPoint.x - npc.position.x;
    const dy = nextPoint.y - npc.position.y;
    const distanceToNext = Math.sqrt(dx * dx + dy * dy);
    
    // Move towards the next point
    if (distanceToNext > 0.1) {
      const moveSpeed = npc.speed * deltaTime;
      const moveRatio = Math.min(moveSpeed / distanceToNext, 1);
      
      const newX = npc.position.x + dx * moveRatio;
      const newY = npc.position.y + dy * moveRatio;
      
      // Validate the new position
      if (pathfinding.isWalkable(Math.round(newX), Math.round(newY))) {
        npc.position.x = newX;
        npc.position.y = newY;
        
        // Update pixel position for rendering
        npc.pixelPosition = {
          x: newX * 32, // Assuming 32 is your tile size
          y: newY * 32
        };
      }
    } else {
      // Reached this point, move to the next one
      npc.currentPathIndex++;
    }
  }
}

// Example of how to render paths
function renderPathsExample(
  context: CanvasRenderingContext2D,
  pathfinding: ReturnType<ReturnType<typeof createUsePathfinding>>,
  tileSize: number,
  cameraOffset: { x: number, y: number }
) {
  const paths = pathfinding.getActivePaths();
  
  for (const { path, color } of paths) {
    if (path.length > 1) {
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      
      // Adjust for camera offset
      const firstPoint = path[0];
      context.moveTo(
        firstPoint.x * tileSize - cameraOffset.x,
        firstPoint.y * tileSize - cameraOffset.y
      );
      
      for (let i = 1; i < path.length; i++) {
        const point = path[i];
        context.lineTo(
          point.x * tileSize - cameraOffset.x,
          point.y * tileSize - cameraOffset.y
        );
      }
      
      context.stroke();
    }
  }
}