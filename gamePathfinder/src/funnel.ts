import { GridPosition, IGrid } from './types';

/**
 * Funnel algorithm options
 */
export interface FunnelOptions {
  /**
   * Maximum number of iterations to prevent infinite loops
   * @default 1000
   */
  maxIterations?: number;
}

/**
 * Implementation of the funnel algorithm for path optimization
 * This algorithm is particularly effective at shortening paths
 * around obstacles while ensuring the path remains valid
 */
export function createFunnel(grid: IGrid, options: FunnelOptions = {}) {
  const maxIterations = options.maxIterations || 1000;
  
  /**
   * Optimize a path using the funnel algorithm
   * @param path The path to optimize
   * @returns The optimized path
   */
  function optimizePath(path: GridPosition[]): GridPosition[] {
    if (path.length <= 2) {
      return [...path]; // Not enough points to optimize
    }
    
    const result: GridPosition[] = [path[0]]; // Start with the first point
    let startIdx = 0;
    
    while (startIdx < path.length - 1) {
      const start = path[startIdx];
      let farthestVisible = startIdx + 1;
      
      // Find the farthest visible node
      for (let i = startIdx + 2; i < path.length; i++) {
        if (hasLineOfSight(start, path[i])) {
          farthestVisible = i;
        } else {
          break;
        }
      }
      
      // Add the farthest visible node
      result.push(path[farthestVisible]);
      startIdx = farthestVisible;
    }
    
    return result;
  }
  
  /**
   * Check if there is a clear line of sight between two points
   * @param start The starting point
   * @param end The ending point
   * @returns True if there is a clear line of sight
   */
  function hasLineOfSight(start: GridPosition, end: GridPosition): boolean {
    // Use Bresenham's line algorithm to check visibility
    const { x: x0, y: y0 } = start;
    const { x: x1, y: y1 } = end;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    let iterations = 0;
    
    while (!(x === x1 && y === y1) && iterations < maxIterations) {
      iterations++;
      
      // Skip the start and end points
      if (!(x === x0 && y === y0) && !(x === x1 && y === y1)) {
        // If any point in the line is not walkable, there is no line of sight
        if (!grid.isWalkable(x, y)) {
          return false;
        }
      }
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return true;
  }
  
  /**
   * Set a new grid for the funnel algorithm
   * @param newGrid The new grid
   */
  function setGrid(newGrid: IGrid): void {
    grid = newGrid;
  }
  
  return {
    optimizePath,
    hasLineOfSight,
    setGrid
  };
}