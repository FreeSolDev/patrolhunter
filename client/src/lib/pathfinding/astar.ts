import { GridPosition } from "../types";
import { PriorityQueue } from "./PriorityQueue";
import { useGridStore } from "../stores/useGridStore";
import { usePathfinding } from "../stores/usePathfinding";

// Helper to calculate Manhattan distance heuristic
const manhattanDistance = (a: GridPosition, b: GridPosition): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

// Helper to calculate Euclidean distance heuristic
const euclideanDistance = (a: GridPosition, b: GridPosition): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

// Helper to check if a position is valid within the grid
const isValidPosition = (pos: GridPosition, grid: boolean[][]): boolean => {
  return (
    pos &&
    grid &&
    grid.length > 0 &&
    grid[0].length > 0 &&
    pos.x >= 0 && 
    pos.x < grid[0].length &&
    pos.y >= 0 && 
    pos.y < grid.length &&
    grid[pos.y][pos.x] // Check if the tile is walkable
  );
};

// Reconstruct path from cameFrom map
const reconstructPath = (
  cameFrom: Map<string, GridPosition>,
  current: GridPosition
): GridPosition[] => {
  const path = [current];
  const posKey = (pos: GridPosition) => `${pos.x},${pos.y}`;
  let currentKey = posKey(current);
  
  while (cameFrom.has(currentKey)) {
    const prev = cameFrom.get(currentKey)!;
    path.unshift(prev);
    currentKey = posKey(prev);
  }
  
  return path;
};

// Helper to get valid neighbors for a position
const getNeighbors = (position: GridPosition, grid: boolean[][]): GridPosition[] => {
  const neighbors: GridPosition[] = [];
  const { x, y } = position;
  const directions = [
    { x: 0, y: -1 }, // North
    { x: 1, y: 0 },  // East
    { x: 0, y: 1 },  // South
    { x: -1, y: 0 }, // West
    // Include diagonals for smoother paths
    { x: 1, y: -1 }, // Northeast
    { x: 1, y: 1 },  // Southeast
    { x: -1, y: 1 }, // Southwest
    { x: -1, y: -1 } // Northwest
  ];
  
  for (const dir of directions) {
    const newX = x + dir.x;
    const newY = y + dir.y;
    
    // Check if the position is within bounds and walkable
    if (
      newX >= 0 && newX < grid[0].length &&
      newY >= 0 && newY < grid.length &&
      grid[newY][newX] // Walkable
    ) {
      // For diagonals, make sure both orthogonal neighbors are walkable
      if (Math.abs(dir.x) === 1 && Math.abs(dir.y) === 1) {
        // Check if both adjacent orthogonal cells are walkable
        const canMoveHorizontally = grid[y][newX];
        const canMoveVertically = grid[newY][x];
        
        if (!canMoveHorizontally || !canMoveVertically) {
          continue; // Skip this diagonal if we can't move through adjacent cells
        }
      }
      
      neighbors.push({ x: newX, y: newY });
    }
  }
  
  return neighbors;
};

// A* pathfinding algorithm implementation
export const findPath = (
  start: GridPosition,
  goal: GridPosition,
  entityId: string,
  color: string = "#FFFFFF"
): GridPosition[] => {
  try {
    const { grid } = useGridStore.getState();
    const { 
      setOpenSet, 
      setClosedSet, 
      addCurrentPath, 
      clearPathData 
    } = usePathfinding.getState();
    
    // Verify valid start and goal
    if (!grid || grid.length === 0) {
      console.log("Grid not initialized");
      return [];
    }
    
    if (!isValidPosition(start, grid)) {
      console.log(`Invalid start position: ${JSON.stringify(start)}`);
      return [];
    }
    
    if (!isValidPosition(goal, grid)) {
      console.log(`Invalid goal position: ${JSON.stringify(goal)}`);
      return [];
    }
    
    // If the start and goal are the same, return just the start
    if (start.x === goal.x && start.y === goal.y) return [start];
    
    // Initialize data structures
    const openSet = new PriorityQueue<GridPosition>();
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, GridPosition>();
    
    // Cost maps
    const gScore = new Map<string, number>(); // Cost from start to current node
    const fScore = new Map<string, number>(); // Estimated cost from start to goal through current node
    
    // Initialize start node
    const posKey = (pos: GridPosition) => `${pos.x},${pos.y}`;
    const startKey = posKey(start);
    
    gScore.set(startKey, 0);
    fScore.set(startKey, manhattanDistance(start, goal));
    openSet.enqueue(start, fScore.get(startKey) || Infinity);
    
    // Visualization sets
    const openSetVisual: GridPosition[] = [];
    const closedSetVisual: GridPosition[] = [];
    
    // Clear previous visualization data for this entity
    clearPathData(entityId);
    
    // Main A* loop
    while (!openSet.isEmpty()) {
      const current = openSet.dequeue()!;
      const currentKey = posKey(current);
      
      // Update visualization sets
      openSetVisual.push({ ...current });
      setOpenSet(openSetVisual);
      
      // Check if we've reached the goal
      if (current.x === goal.x && current.y === goal.y) {
        // Reconstruct the path
        const path = reconstructPath(cameFrom, current);
        
        // Add this path to the visualization
        addCurrentPath({
          entityId,
          path,
          color
        });
        
        // Update final visualization state
        setClosedSet(closedSetVisual);
        
        return path;
      }
      
      // Move current node from open set to closed set
      closedSet.add(currentKey);
      closedSetVisual.push({ ...current });
      
      // Get all walkable neighbors
      const neighbors = getNeighbors(current, grid);
      
      for (const neighbor of neighbors) {
        const neighborKey = posKey(neighbor);
        
        // Skip if already evaluated
        if (closedSet.has(neighborKey)) continue;
        
        // Calculate tentative gScore (cost to reach neighbor)
        // Use 1.4 for diagonal movement cost instead of 1.0
        const isDiagonal = 
          Math.abs(neighbor.x - current.x) === 1 && 
          Math.abs(neighbor.y - current.y) === 1;
        
        const moveCost = isDiagonal ? 1.4 : 1.0;
        const tentativeGScore = (gScore.get(currentKey) || Infinity) + moveCost;
        
        // Check if the node is not in open set or if we found a better path
        const inOpenSet = openSet.contains(neighborKey);
        if (!inOpenSet || tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
          // Update path and scores
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + manhattanDistance(neighbor, goal));
          
          // Add to open set if not already there
          if (!inOpenSet) {
            openSet.enqueue(neighbor, fScore.get(neighborKey) || Infinity);
            openSetVisual.push({ ...neighbor });
          }
          
          // Reconstruct current path for visualization
          if (inOpenSet) {
            const currentVisPath = reconstructPath(cameFrom, neighbor);
            addCurrentPath({
              entityId,
              path: currentVisPath,
              color
            });
          }
        }
      }
      
      // Update visualization after each step
      setOpenSet([...openSetVisual]);
      setClosedSet([...closedSetVisual]);
    }
    
    // No path found
    return [];
  } catch (error) {
    console.error("Error finding path:", error);
    return [];
  }
};
