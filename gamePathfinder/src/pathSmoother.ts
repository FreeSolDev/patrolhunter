import { GridPosition, IGrid } from './types';

/**
 * Utility class for smoothing and optimizing paths
 */
export class PathSmoother {
  private grid: IGrid;
  
  /**
   * Creates a new PathSmoother
   * @param grid The grid to use for smoothing
   */
  constructor(grid: IGrid) {
    this.grid = grid;
  }
  
  /**
   * Smooth a path by removing unnecessary points
   * @param path The path to smooth
   * @returns The smoothed path
   */
  smoothPath(path: GridPosition[]): GridPosition[] {
    if (path.length <= 2) {
      return [...path]; // Not enough points to smooth
    }
    
    const result: GridPosition[] = [path[0]]; // Start with the first point
    let current = 0;
    
    while (current < path.length - 1) {
      // Try to find the furthest point we can reach directly from current
      let furthest = current + 1;
      
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i])) {
          furthest = i;
        } else {
          break; // Can't see any further
        }
      }
      
      // Add the furthest point we can directly reach
      result.push(path[furthest]);
      current = furthest;
    }
    
    return result;
  }
  
  /**
   * Check if there is a clear line of sight between two points
   * @param start The starting point
   * @param end The ending point
   * @returns True if there is a clear line of sight
   */
  private hasLineOfSight(start: GridPosition, end: GridPosition): boolean {
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
    
    while (!(x === x1 && y === y1)) {
      // Skip the start and end points
      if (!(x === x0 && y === y0) && !(x === x1 && y === y1)) {
        // If any point in the line is not walkable, there is no line of sight
        if (!this.grid.isWalkable(x, y)) {
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
   * Interpolate additional points along a path for smoother movement
   * @param path The path to interpolate
   * @param stepSize The distance between interpolated points
   * @returns The path with interpolated points
   */
  interpolatePath(path: GridPosition[], stepSize: number = 0.5): GridPosition[] {
    if (path.length <= 1) {
      return [...path]; // Not enough points to interpolate
    }
    
    const result: GridPosition[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      
      // Add the current point
      result.push({ x: current.x, y: current.y });
      
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > stepSize) {
        // Calculate how many steps we need
        const steps = Math.floor(distance / stepSize);
        
        for (let j = 1; j < steps; j++) {
          const t = j / steps;
          result.push({
            x: current.x + dx * t,
            y: current.y + dy * t
          });
        }
      }
    }
    
    // Add the last point
    result.push({ x: path[path.length - 1].x, y: path[path.length - 1].y });
    
    return result;
  }
  
  /**
   * Set a new grid for the smoother
   * @param grid The new grid
   */
  setGrid(grid: IGrid): void {
    this.grid = grid;
  }
}