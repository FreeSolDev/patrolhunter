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
  // Check if position is valid and not NaN or Infinity
  if (
    !pos || 
    !Number.isFinite(pos.x) || 
    !Number.isFinite(pos.y) ||
    Math.abs(pos.x) > 10000 ||  // Sanity check for extremely large values
    Math.abs(pos.y) > 10000
  ) {
    return false;
  }
  
  // Round positions to handle decimal values
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  
  try {
    // Check grid bounds
    if (
      !grid || 
      grid.length === 0 || 
      grid[0].length === 0 ||
      x < 0 || 
      x >= grid[0].length ||
      y < 0 || 
      y >= grid.length
    ) {
      return false;
    }
    
    // Explicitly check walkability
    // This ensures we're not accidentally considering an obstacle as walkable
    const isWalkable = grid[y][x] === true;
    
    return isWalkable;
  } catch (error) {
    console.error("Error in isValidPosition:", error);
    return false;
  }
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
  try {
    const neighbors: GridPosition[] = [];
    // Round positions to handle decimal values
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    
    // Verify current position is valid
    if (
      !grid || 
      grid.length === 0 || 
      grid[0].length === 0 ||
      x < 0 || 
      x >= grid[0].length ||
      y < 0 || 
      y >= grid.length
    ) {
      return []; // Return empty array if current position is invalid
    }
    
    // Define the possible movement directions
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
      
      // Skip neighbors outside grid bounds
      if (
        newX < 0 || newX >= grid[0].length ||
        newY < 0 || newY >= grid.length
      ) {
        continue;
      }
      
      // Skip unwalkable tiles - explicitly check for true
      if (grid[newY][newX] !== true) {
        continue;
      }
      
      // For diagonals, ensure we can move through corner (avoid cutting corners)
      if (Math.abs(dir.x) === 1 && Math.abs(dir.y) === 1) {
        // Check if both adjacent orthogonal cells are walkable
        const canMoveHorizontally = grid[y][newX] === true;
        const canMoveVertically = grid[newY][x] === true;
        
        if (!canMoveHorizontally || !canMoveVertically) {
          continue; // Skip this diagonal if we can't move through adjacent cells
        }
      }
      
      // This is a valid neighbor
      neighbors.push({ x: newX, y: newY });
    }
    
    return neighbors;
  } catch (error) {
    console.error("Error in getNeighbors:", error);
    return [];
  }
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
      console.log(`Pathfinding error for ${entityId}: Grid not initialized`);
      return [];
    }
    
    // Round and clamp positions to grid boundaries to avoid errors
    const roundedStart = {
      x: Math.min(grid[0].length - 1, Math.max(0, Math.round(start.x))),
      y: Math.min(grid.length - 1, Math.max(0, Math.round(start.y)))
    };
    
    const roundedGoal = {
      x: Math.min(grid[0].length - 1, Math.max(0, Math.round(goal.x))),
      y: Math.min(grid.length - 1, Math.max(0, Math.round(goal.y)))
    };
    
    // Check if positions are walkable
    if (!isValidPosition(roundedStart, grid)) {
      console.log(`Pathfinding error for ${entityId}: Start position at (${roundedStart.x}, ${roundedStart.y}) is not walkable`);
      // Return the path with just the goal if start is not walkable but goal is
      if (isValidPosition(roundedGoal, grid)) {
        console.log(`Returning direct path to walkable goal for ${entityId}`);
        return [roundedGoal];
      }
      return [];
    }
    
    if (!isValidPosition(roundedGoal, grid)) {
      console.log(`Pathfinding error for ${entityId}: Goal position at (${roundedGoal.x}, ${roundedGoal.y}) is not walkable`);
      return [roundedStart]; // Return current position if goal is not walkable
    }
    
    // Use the validated positions
    start = roundedStart;
    goal = roundedGoal;
    
    // If the start and goal are the same (using rounded values), return just the start
    if (Math.round(start.x) === Math.round(goal.x) && Math.round(start.y) === Math.round(goal.y)) return [start];
    
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
      
      // Check if we've reached the goal (using rounded values)
      if (Math.round(current.x) === Math.round(goal.x) && Math.round(current.y) === Math.round(goal.y)) {
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
