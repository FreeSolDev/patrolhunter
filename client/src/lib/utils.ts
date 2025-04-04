import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GridPosition } from "./types";
import { useGridStore } from "./stores/useGridStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getLocalStorage = (key: string): any =>
  JSON.parse(window.localStorage.getItem(key) || "null");
const setLocalStorage = (key: string, value: any): void =>
  window.localStorage.setItem(key, JSON.stringify(value));

/**
 * Check if there's a clear line of sight between two positions
 * @param start Starting position
 * @param end Ending position
 * @returns true if there's a clear line of sight, false if view is obstructed
 */
export function hasLineOfSight(start: GridPosition, end: GridPosition): boolean {
  const { grid, obstacles } = useGridStore.getState();
  
  if (!grid || grid.length === 0) return false;
  
  // Convert to rounded integer coordinates for grid checking
  const startX = Math.round(start.x);
  const startY = Math.round(start.y);
  const endX = Math.round(end.x);
  const endY = Math.round(end.y);
  
  // If start or end is outside the grid, return false
  if (
    startX < 0 || startX >= grid[0].length ||
    startY < 0 || startY >= grid.length ||
    endX < 0 || endX >= grid[0].length ||
    endY < 0 || endY >= grid.length
  ) {
    return false;
  }
  
  // If either the start or end position is not walkable, return false
  if (!grid[startY][startX] || !grid[endY][endX]) {
    return false;
  }
  
  // Use Bresenham's line algorithm to trace the line of sight
  let x0 = startX;
  let y0 = startY;
  let x1 = endX;
  let y1 = endY;
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  while (true) {
    // If we're checking the starting or ending point, skip the check
    if ((x0 !== startX || y0 !== startY) && (x0 !== endX || y0 !== endY)) {
      // Check if current position is walkable
      if (x0 >= 0 && x0 < grid[0].length && y0 >= 0 && y0 < grid.length) {
        // If it's not walkable (obstacle), there's no line of sight
        if (!grid[y0][x0]) {
          return false;
        }
        
        // Additional check for obstacles
        const hasObstacle = obstacles.some(obs => 
          Math.round(obs.x) === x0 && Math.round(obs.y) === y0
        );
        
        if (hasObstacle) {
          return false;
        }
      } else {
        // If outside grid, no line of sight
        return false;
      }
    }
    
    // If we've reached the end, we have a clear line of sight
    if (x0 === x1 && y0 === y1) break;
    
    // Calculate next point in the line
    const e2 = 2 * err;
    if (e2 > -dy) {
      if (x0 === x1) break;
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      if (y0 === y1) break;
      err += dx;
      y0 += sy;
    }
  }
  
  // If we've reached here, there's a clear line of sight
  return true;
}

/**
 * Calculate the distance between two grid positions
 * @param a First position
 * @param b Second position
 * @returns Euclidean distance between positions
 */
export function distanceBetween(a: GridPosition, b: GridPosition): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export { getLocalStorage, setLocalStorage };
