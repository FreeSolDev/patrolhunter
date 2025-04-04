import { GridPosition, IGrid, PathNode, PathResult, PathfinderOptions, PathfinderEvent, PathfinderEventListener } from './types';

/**
 * A* Pathfinding algorithm
 */
export class AStar {
  private grid: IGrid;
  private options: Required<PathfinderOptions>;
  private listeners: PathfinderEventListener[] = [];
  
  // Default options
  private static readonly DEFAULT_OPTIONS: Required<PathfinderOptions> = {
    allowDiagonals: true,
    cutCorners: false,
    diagonalWeight: 1.4,
    heuristic: 'manhattan',
    heuristicWeight: 1.0,
    maxIterations: 10000
  };
  
  /**
   * Creates a new AStar pathfinder
   * @param grid The grid to use for pathfinding
   * @param options Pathfinding options
   */
  constructor(grid: IGrid, options: PathfinderOptions = {}) {
    this.grid = grid;
    this.options = { ...AStar.DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Add an event listener
   * @param listener The listener to add
   */
  addEventListener(listener: PathfinderEventListener): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove an event listener
   * @param listener The listener to remove
   */
  removeEventListener(listener: PathfinderEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Emit an event
   * @param event The event to emit
   */
  private emit(event: PathfinderEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
  
  /**
   * Find a path from start to goal
   * @param start The starting position
   * @param goal The goal position
   * @returns Path result with the path and metadata
   */
  findPath(start: GridPosition, goal: GridPosition): PathResult {
    const startTime = performance.now();
    
    // Validate input
    if (!this.isValidPosition(start.x, start.y) || !this.isValidPosition(goal.x, goal.y)) {
      this.emit({ type: 'error', message: 'Invalid start or goal position' });
      return {
        path: [],
        found: false,
        explored: 0,
        time: 0,
        length: 0
      };
    }
    
    // Emit pathStart event
    this.emit({ type: 'pathStart', start, goal });
    
    // If start is the goal, return empty path
    if (start.x === goal.x && start.y === goal.y) {
      return {
        path: [{ x: start.x, y: start.y }],
        found: true,
        explored: 0,
        time: 0,
        length: 0
      };
    }
    
    // If start or goal is not walkable, return empty path
    if (!this.grid.isWalkable(start.x, start.y)) {
      this.emit({ type: 'error', message: 'Start position is not walkable' });
      return {
        path: [],
        found: false,
        explored: 0,
        time: 0,
        length: 0
      };
    }
    
    if (!this.grid.isWalkable(goal.x, goal.y)) {
      this.emit({ type: 'error', message: 'Goal position is not walkable' });
      return {
        path: [],
        found: false,
        explored: 0,
        time: 0,
        length: 0
      };
    }
    
    // Initialize open and closed lists
    const openList: PathNode[] = [];
    const closedList: PathNode[] = [];
    const nodeMap: Record<string, PathNode> = {};
    
    // Initial node
    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      f: 0,
      g: 0,
      h: 0,
      parent: null,
      closed: false,
      visited: false
    };
    
    // Add start node to open list
    openList.push(startNode);
    nodeMap[`${start.x},${start.y}`] = startNode;
    
    let iterations = 0;
    let nodesExplored = 0;
    
    // Main loop
    while (openList.length > 0 && iterations < this.options.maxIterations) {
      iterations++;
      
      // Sort open list by f value
      openList.sort((a, b) => a.f - b.f);
      
      // Get the node with the lowest f value
      const currentNode = openList.shift()!;
      currentNode.closed = true;
      closedList.push(currentNode);
      
      nodesExplored++;
      
      // If we've reached the goal, reconstruct the path
      if (currentNode.x === goal.x && currentNode.y === goal.y) {
        const path = this.reconstructPath(currentNode);
        const endTime = performance.now();
        
        // Emit pathFound event
        this.emit({ type: 'pathFound', path });
        
        return {
          path,
          found: true,
          explored: nodesExplored,
          time: endTime - startTime,
          length: path.length
        };
      }
      
      // Get neighbors
      const neighbors = this.getNeighbors(currentNode);
      
      for (const neighbor of neighbors) {
        // If the neighbor is in the closed list, skip
        if (neighbor.closed) {
          continue;
        }
        
        // Calculate g value (cost from start to this node)
        const isDiagonal = neighbor.x !== currentNode.x && neighbor.y !== currentNode.y;
        const movementCost = isDiagonal ? this.options.diagonalWeight : 1;
        const tentativeG = currentNode.g + movementCost;
        
        // Check if this is a better path
        if (!neighbor.visited || tentativeG < neighbor.g) {
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.g = tentativeG;
          neighbor.h = this.calculateHeuristic(neighbor, goal);
          neighbor.f = neighbor.g + neighbor.h * this.options.heuristicWeight;
          
          // Emit nodeVisited event
          this.emit({ type: 'nodeVisited', node: { x: neighbor.x, y: neighbor.y } });
          
          // Add to open list if not already in it
          if (!openList.includes(neighbor)) {
            openList.push(neighbor);
          }
        }
      }
    }
    
    // If we get here, no path was found
    const endTime = performance.now();
    
    // Emit pathNotFound event
    this.emit({ type: 'pathNotFound' });
    
    return {
      path: [],
      found: false,
      explored: nodesExplored,
      time: endTime - startTime,
      length: 0
    };
  }
  
  /**
   * Get the neighbors of a node
   * @param node The node to get neighbors for
   * @returns Array of neighbor nodes
   */
  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = [];
    const { x, y } = node;
    const { allowDiagonals, cutCorners } = this.options;
    const nodeMap: Record<string, PathNode> = {};
    
    // Check if a position is valid and walkable
    const isValidAndWalkable = (x: number, y: number): boolean => {
      return this.isValidPosition(x, y) && this.grid.isWalkable(x, y);
    };
    
    // Define directions
    const directions: { x: number; y: number; }[] = [];
    
    // Orthogonal directions
    directions.push({ x: 0, y: -1 }); // North
    directions.push({ x: 1, y: 0 });  // East
    directions.push({ x: 0, y: 1 });  // South
    directions.push({ x: -1, y: 0 }); // West
    
    // Diagonal directions
    if (allowDiagonals) {
      const diagonals = [
        { x: 1, y: -1 },  // Northeast
        { x: 1, y: 1 },   // Southeast
        { x: -1, y: 1 },  // Southwest
        { x: -1, y: -1 }  // Northwest
      ];
      
      if (cutCorners) {
        // Add all diagonals
        directions.push(...diagonals);
      } else {
        // Only add diagonals if adjacent tiles are walkable
        for (const diagonal of diagonals) {
          const nx = x + diagonal.x;
          const ny = y + diagonal.y;
          
          // Check if both adjacent tiles are walkable
          const isWalkableX = isValidAndWalkable(x + diagonal.x, y);
          const isWalkableY = isValidAndWalkable(x, y + diagonal.y);
          
          if (isWalkableX && isWalkableY) {
            directions.push(diagonal);
          }
        }
      }
    }
    
    // Create nodes for valid neighbors
    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      
      if (isValidAndWalkable(nx, ny)) {
        const key = `${nx},${ny}`;
        
        if (!nodeMap[key]) {
          const neighbor: PathNode = {
            x: nx,
            y: ny,
            f: 0,
            g: 0,
            h: 0,
            parent: null,
            closed: false,
            visited: false
          };
          
          nodeMap[key] = neighbor;
          neighbors.push(neighbor);
        }
      }
    }
    
    return neighbors;
  }
  
  /**
   * Calculate the heuristic value (estimated cost from a node to the goal)
   * @param node The node
   * @param goal The goal position
   * @returns The heuristic value
   */
  private calculateHeuristic(node: PathNode, goal: GridPosition): number {
    const dx = Math.abs(node.x - goal.x);
    const dy = Math.abs(node.y - goal.y);
    
    switch (this.options.heuristic) {
      case 'manhattan':
        return dx + dy;
      case 'euclidean':
        return Math.sqrt(dx * dx + dy * dy);
      case 'chebyshev':
        return Math.max(dx, dy);
      default:
        return dx + dy; // Default to manhattan
    }
  }
  
  /**
   * Reconstruct the path from the goal node to the start node
   * @param goalNode The goal node
   * @returns The path from start to goal
   */
  private reconstructPath(goalNode: PathNode): GridPosition[] {
    const path: GridPosition[] = [];
    let currentNode: PathNode | null = goalNode;
    
    while (currentNode) {
      path.unshift({ x: currentNode.x, y: currentNode.y });
      currentNode = currentNode.parent;
    }
    
    return path;
  }
  
  /**
   * Check if a position is within the grid bounds
   * @param x The x coordinate
   * @param y The y coordinate
   * @returns True if the position is valid
   */
  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.grid.getWidth() && y >= 0 && y < this.grid.getHeight();
  }
  
  /**
   * Set a new grid for the pathfinder
   * @param grid The new grid
   */
  setGrid(grid: IGrid): void {
    this.grid = grid;
  }
  
  /**
   * Update the pathfinder options
   * @param options The new options
   */
  setOptions(options: PathfinderOptions): void {
    this.options = { ...this.options, ...options };
  }
}