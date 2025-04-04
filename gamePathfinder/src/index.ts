// Export all types
export * from './types';

// Export core classes
export { AStar } from './astar';
export { Grid } from './grid';
export { PathSmoother } from './pathSmoother';

// Export helper functions and utilities
export { createDebugVisualizer } from './debug';
export { createFunnel } from './funnel';
export { createPathManager } from './pathManager';

/**
 * A factory function to create a pathfinder with all components set up
 */
import { IGrid, PathfinderOptions } from './types';
import { AStar } from './astar';
import { Grid } from './grid';
import { PathSmoother } from './pathSmoother';

/**
 * Create a complete pathfinder system with all components
 * @param gridOrWidth Grid instance or width of the grid
 * @param height Height of the grid (if width was provided)
 * @param options Pathfinding options
 * @returns An object containing all pathfinder components
 */
export function createPathfinder(
  gridOrWidth: IGrid | number,
  height?: number,
  options?: PathfinderOptions
) {
  let grid: IGrid;
  
  if (typeof gridOrWidth === 'number') {
    if (height === undefined) {
      throw new Error('Height must be provided when width is a number');
    }
    grid = new Grid(gridOrWidth, height);
  } else {
    grid = gridOrWidth;
  }
  
  const pathfinder = new AStar(grid, options);
  const smoother = new PathSmoother(grid);
  
  return {
    pathfinder,
    grid,
    smoother,
    
    /**
     * Find a path from start to goal
     * @param startX Starting X position
     * @param startY Starting Y position
     * @param goalX Goal X position
     * @param goalY Goal Y position
     * @param smooth Whether to smooth the path
     * @returns The found path and metadata
     */
    findPath(startX: number, startY: number, goalX: number, goalY: number, smooth = false) {
      const result = pathfinder.findPath(
        { x: startX, y: startY },
        { x: goalX, y: goalY }
      );
      
      if (smooth && result.found && result.path.length > 2) {
        result.path = smoother.smoothPath(result.path);
      }
      
      return result;
    },
    
    /**
     * Set a new grid for all components
     * @param newGrid The new grid
     */
    setGrid(newGrid: IGrid) {
      grid = newGrid;
      pathfinder.setGrid(newGrid);
      smoother.setGrid(newGrid);
    }
  };
}