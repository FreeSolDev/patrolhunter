import { IGrid, GridPosition } from './types';

/**
 * A simple grid implementation
 */
export class Grid implements IGrid {
  private width: number;
  private height: number;
  private data: boolean[][];
  
  /**
   * Creates a new grid
   * @param width The width of the grid
   * @param height The height of the grid
   * @param data Optional 2D array representing the grid (true = walkable, false = obstacle)
   */
  constructor(width: number, height: number, data?: boolean[][]) {
    this.width = width;
    this.height = height;
    
    if (data) {
      // Validate data dimensions
      if (data.length !== height || data[0].length !== width) {
        throw new Error('Data dimensions do not match width and height');
      }
      this.data = data;
    } else {
      // Initialize empty grid (all walkable)
      this.data = Array(height).fill(0).map(() => Array(width).fill(true));
    }
  }
  
  /**
   * Returns the width of the grid
   */
  getWidth(): number {
    return this.width;
  }
  
  /**
   * Returns the height of the grid
   */
  getHeight(): number {
    return this.height;
  }
  
  /**
   * Returns whether a position is walkable
   * @param x The x coordinate
   * @param y The y coordinate
   */
  isWalkable(x: number, y: number): boolean {
    // Check if position is within bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    
    return this.data[y][x];
  }
  
  /**
   * Sets whether a position is walkable
   * @param x The x coordinate
   * @param y The y coordinate
   * @param walkable Whether the position is walkable
   */
  setWalkable(x: number, y: number, walkable: boolean): void {
    // Check if position is within bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new Error(`Position (${x}, ${y}) is out of bounds`);
    }
    
    this.data[y][x] = walkable;
  }
  
  /**
   * Returns the raw grid data
   */
  getData(): boolean[][] {
    return this.data;
  }
  
  /**
   * Creates a new grid from a 2D array
   * @param data 2D array where true = walkable, false = obstacle
   */
  static fromArray(data: boolean[][]): Grid {
    if (data.length === 0 || data[0].length === 0) {
      throw new Error('Data cannot be empty');
    }
    
    const height = data.length;
    const width = data[0].length;
    
    return new Grid(width, height, data);
  }
  
  /**
   * Creates a new grid from a string representation
   * @param str String where '.' = walkable, '#' = obstacle, and lines are separated by newlines
   */
  static fromString(str: string): Grid {
    const lines = str.trim().split('\n');
    const height = lines.length;
    
    if (height === 0) {
      throw new Error('String cannot be empty');
    }
    
    const width = lines[0].length;
    const data: boolean[][] = [];
    
    for (const line of lines) {
      if (line.length !== width) {
        throw new Error('All lines must have the same length');
      }
      
      const row: boolean[] = [];
      for (const char of line) {
        row.push(char === '.' || char !== '#');
      }
      
      data.push(row);
    }
    
    return new Grid(width, height, data);
  }
  
  /**
   * Returns a string representation of the grid
   */
  toString(): string {
    return this.data.map(row => 
      row.map(cell => cell ? '.' : '#').join('')
    ).join('\n');
  }
  
  /**
   * Finds the nearest walkable position to the given position
   * @param x The x coordinate
   * @param y The y coordinate
   * @param maxRadius The maximum search radius
   * @returns The nearest walkable position, or null if none found
   */
  findNearestWalkable(x: number, y: number, maxRadius: number = 5): GridPosition | null {
    // If the position is already walkable, return it
    if (this.isWalkable(x, y)) {
      return { x, y };
    }
    
    // Search in expanding radius
    for (let radius = 1; radius <= maxRadius; radius++) {
      // Check all positions at the current radius
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check positions at the current radius (not inside it)
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.isWalkable(nx, ny)) {
              return { x: nx, y: ny };
            }
          }
        }
      }
    }
    
    return null;
  }
}