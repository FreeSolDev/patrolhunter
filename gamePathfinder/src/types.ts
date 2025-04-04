/**
 * Represents a position on a 2D grid
 */
export interface GridPosition {
  x: number;
  y: number;
}

/**
 * Configuration options for the pathfinder
 */
export interface PathfinderOptions {
  /**
   * Whether to allow diagonal movement
   * @default true
   */
  allowDiagonals?: boolean;
  
  /**
   * Whether to cut corners when moving diagonally
   * This is only used if allowDiagonals is true
   * @default false
   */
  cutCorners?: boolean;
  
  /**
   * The weight of diagonal movement compared to orthogonal movement
   * @default 1.4
   */
  diagonalWeight?: number;
  
  /**
   * The heuristic function to use
   * @default 'manhattan'
   */
  heuristic?: 'manhattan' | 'euclidean' | 'chebyshev';
  
  /**
   * The weight of the heuristic function
   * Higher values prioritize moving toward the goal more (greedy search)
   * Lower values prioritize exploring more paths
   * @default 1.0
   */
  heuristicWeight?: number;
  
  /**
   * The maximum number of iterations before giving up
   * @default 10000
   */
  maxIterations?: number;
}

/**
 * The grid interface that the pathfinder expects
 */
export interface IGrid {
  /**
   * Returns whether a node is walkable
   * @param x The x coordinate
   * @param y The y coordinate
   */
  isWalkable(x: number, y: number): boolean;
  
  /**
   * Returns the width of the grid
   */
  getWidth(): number;
  
  /**
   * Returns the height of the grid
   */
  getHeight(): number;
}

/**
 * Interface for path node for internal use
 */
export interface PathNode {
  x: number;
  y: number;
  f: number; // Total cost (g + h)
  g: number; // Cost from start to this node
  h: number; // Heuristic (estimated cost from this node to goal)
  parent: PathNode | null;
  closed: boolean;
  visited: boolean;
}

/**
 * Path result including path and metadata
 */
export interface PathResult {
  /**
   * The found path as an array of grid positions
   */
  path: GridPosition[];
  
  /**
   * Whether a path was found
   */
  found: boolean;
  
  /**
   * Number of nodes explored during the search
   */
  explored: number;
  
  /**
   * Execution time in milliseconds
   */
  time: number;
  
  /**
   * Length of the path in grid units
   */
  length: number;
}

/**
 * Events that the pathfinder can emit
 */
export type PathfinderEvent = 
  | { type: 'pathStart', start: GridPosition, goal: GridPosition }
  | { type: 'pathFound', path: GridPosition[] }
  | { type: 'nodeVisited', node: GridPosition }
  | { type: 'pathNotFound' }
  | { type: 'error', message: string };

/**
 * Event listener type
 */
export type PathfinderEventListener = (event: PathfinderEvent) => void;