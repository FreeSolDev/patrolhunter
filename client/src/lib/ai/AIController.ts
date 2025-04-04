import { GridPosition, NPC } from "../types";
import { findPath } from "../pathfinding/astar";
import { StateMachine } from "./StateMachine";
import { AIType } from "./AITypes";
import { GuardBehavior } from "./behaviors/GuardBehavior";
import { HunterBehavior } from "./behaviors/HunterBehavior";
import { SurvivorBehavior } from "./behaviors/SurvivorBehavior";
import { PreserverBehavior } from "./behaviors/PreserverBehavior";
import { MerchantBehavior } from "./behaviors/MerchantBehavior";
import { useGridStore } from "../stores/useGridStore";

// AI controller that manages behavior state machine for each NPC
export class AIController {
  private npc: NPC;
  private stateMachine: StateMachine;
  private pathUpdateTime: number = 0;
  private pathUpdateInterval: number = 0.5; // Time in seconds between path updates
  private currentPath: GridPosition[] = [];
  private pathIndex: number = 0;
  
  constructor(npc: NPC) {
    this.npc = npc;
    this.stateMachine = this.createStateMachine();
  }
  
  // Create the appropriate state machine based on NPC type
  private createStateMachine(): StateMachine {
    switch (this.npc.type) {
      case AIType.GUARD:
        return new GuardBehavior(this.npc);
        
      case AIType.HUNTER:
        return new HunterBehavior(this.npc);
        
      case AIType.SURVIVOR:
        return new SurvivorBehavior(this.npc);
        
      case AIType.PRESERVER:
        return new PreserverBehavior(this.npc);
        
      case AIType.MERCHANT:
        return new MerchantBehavior(this.npc);
        
      default:
        // Default to survivor behavior if unknown
        return new SurvivorBehavior(this.npc);
    }
  }
  
  // Update the AI state and position
  update(deltaTime: number): void {
    // Update state machine first to potentially change target/destination
    this.stateMachine.update(deltaTime);
    
    // Check if we need to update our path
    this.pathUpdateTime += deltaTime;
    if (this.pathUpdateTime >= this.pathUpdateInterval) {
      this.updatePath();
      this.pathUpdateTime = 0;
    }
    
    // Move along the current path if we have one
    this.followPath(deltaTime);
  }
  
  // Update the current path based on NPC target
  private updatePath(): void {
    const target = this.npc.targetPosition;
    if (!target) return;
    
    // Get the actual grid dimensions
    const { grid, gridSize } = useGridStore.getState();
    const TILE_SIZE = 30; // Same as in Game.tsx
    
    // Use actual grid size or fallback to fixed values if not available
    const width = gridSize?.width || 60; 
    const height = gridSize?.height || 60;
    
    // Check if the grid is properly initialized
    if (!grid || grid.length === 0) {
      console.log("Grid not initialized, cannot calculate path");
      return;
    }
    
    // Validate coordinates to ensure they're in bounds and valid
    if (
      !Number.isFinite(this.npc.position.x) || 
      !Number.isFinite(this.npc.position.y) || 
      !Number.isFinite(target.x) || 
      !Number.isFinite(target.y)
    ) {
      console.log(`Invalid positions for path: NPC ${this.npc.id} at (${this.npc.position.x}, ${this.npc.position.y}), Target at (${target.x}, ${target.y})`);
      
      // Find a safe walkable position
      const safePos = this.findSafePosition();
      
      // Reset NPC to a safe position if position is invalid
      this.npc.position = safePos;
      this.npc.pixelPosition = { x: safePos.x * TILE_SIZE, y: safePos.y * TILE_SIZE };
      return;
    }
    
    // Don't recalculate if we're already at the target
    if (
      Math.round(this.npc.position.x) === Math.round(target.x) &&
      Math.round(this.npc.position.y) === Math.round(target.y)
    ) return;
    
    // Check if target is in an unwalkable tile
    const targetX = Math.round(target.x);
    const targetY = Math.round(target.y);
    
    if (
      targetX >= 0 && targetX < width && 
      targetY >= 0 && targetY < height &&
      grid[targetY][targetX] === false // If target is unwalkable
    ) {
      console.log(`Target position (${targetX}, ${targetY}) for NPC ${this.npc.id} is unwalkable! Finding alternate target.`);
      
      // Find the nearest walkable position to the target
      const nearTarget = this.findNearestWalkablePosition(targetX, targetY);
      
      if (nearTarget) {
        // Update the target to a valid position
        this.npc.targetPosition = nearTarget;
        console.log(`Adjusted target to (${nearTarget.x}, ${nearTarget.y})`);
        
        // Use the new target for pathfinding
        target.x = nearTarget.x;
        target.y = nearTarget.y;
      } else {
        // If can't find a walkable position near the target, abandon this target
        console.log(`Cannot find walkable position near target, abandoning target`);
        return;
      }
    }
    
    // Set path color based on NPC type for visualization
    let pathColor: string;
    switch (this.npc.type) {
      case AIType.GUARD:
        pathColor = "#00AA55"; // Green
        break;
      case AIType.HUNTER:
        pathColor = "#FF5500"; // Orange
        break;
      case AIType.SURVIVOR:
        pathColor = "#AAAAFF"; // Light blue
        break;
      case AIType.PRESERVER:
        pathColor = "#FF00FF"; // Magenta
        break;
      case AIType.MERCHANT:
        pathColor = "#FFDD00"; // Gold/Yellow
        break;
      default:
        pathColor = "#FFFFFF"; // White
    }
    
    // Make sure positions are in bounds
    const start: GridPosition = { 
      x: Math.min(width - 1, Math.max(0, Math.round(this.npc.position.x))), 
      y: Math.min(height - 1, Math.max(0, Math.round(this.npc.position.y)))
    };
    
    const goal: GridPosition = { 
      x: Math.min(width - 1, Math.max(0, Math.round(target.x))), 
      y: Math.min(height - 1, Math.max(0, Math.round(target.y)))
    };
    
    // Verify both start and goal are walkable
    if (grid[start.y][start.x] === false) {
      console.log(`Start position (${start.x}, ${start.y}) is unwalkable!`);
      const safePos = this.findNearestWalkablePosition(start.x, start.y);
      if (safePos) {
        this.npc.position = safePos;
        this.npc.pixelPosition = { x: safePos.x * TILE_SIZE, y: safePos.y * TILE_SIZE };
        console.log(`Moved NPC to walkable position (${safePos.x}, ${safePos.y})`);
        start.x = safePos.x;
        start.y = safePos.y;
      } else {
        return; // Can't find a walkable start position
      }
    }
    
    if (grid[goal.y][goal.x] === false) {
      console.log(`Goal position (${goal.x}, ${goal.y}) is unwalkable!`);
      const safeGoal = this.findNearestWalkablePosition(goal.x, goal.y);
      if (safeGoal) {
        this.npc.targetPosition = safeGoal;
        console.log(`Adjusted target to walkable position (${safeGoal.x}, ${safeGoal.y})`);
        goal.x = safeGoal.x;
        goal.y = safeGoal.y;
      } else {
        return; // Can't find a walkable goal position
      }
    }
    
    try {
      this.currentPath = findPath(start, goal, this.npc.id, pathColor);
      this.pathIndex = 0;
      
      // Log if no path found
      if (this.currentPath.length === 0) {
        console.log(`No path found from (${start.x}, ${start.y}) to (${goal.x}, ${goal.y}) for NPC ${this.npc.id}`);
      }
    } catch (error) {
      console.error(`Error finding path for NPC ${this.npc.id}:`, error);
    }
  }
  
  // Follow the current path
  private followPath(deltaTime: number): void {
    // Get the grid data and dimensions
    const { grid, gridSize } = useGridStore.getState();
    const TILE_SIZE = 30; // Same as in Game.tsx
    
    // Use actual grid dimensions or fallback to fixed values
    const GRID_WIDTH = gridSize?.width || 60;
    const GRID_HEIGHT = gridSize?.height || 60;
    
    // Safety check: if grid isn't initialized, we can't do pathfinding
    if (!grid || grid.length === 0) {
      return;
    }
    
    // Validate NPC position
    if (
      !Number.isFinite(this.npc.position.x) || 
      !Number.isFinite(this.npc.position.y) ||
      !Number.isFinite(this.npc.pixelPosition.x) || 
      !Number.isFinite(this.npc.pixelPosition.y)
    ) {
      // Reset to a safe position
      console.log(`Fixing invalid NPC position for ${this.npc.id}`);
      
      // Find a safe walkable position in the center area
      let safePos = this.findSafePosition();
      
      this.npc.position = safePos;
      this.npc.pixelPosition = { 
        x: this.npc.position.x * TILE_SIZE, 
        y: this.npc.position.y * TILE_SIZE 
      };
      this.currentPath = [];
      this.npc.isMoving = false;
      return;
    }
    
    // Check if current position is unwalkable (NPC is stuck in an obstacle)
    const currentX = Math.round(this.npc.position.x);
    const currentY = Math.round(this.npc.position.y);
    
    if (
      currentX >= 0 && currentX < grid[0].length &&
      currentY >= 0 && currentY < grid.length &&
      grid[currentY][currentX] === false // If current position is unwalkable
    ) {
      console.log(`NPC ${this.npc.id} is stuck in an unwalkable tile! Repositioning...`);
      
      // Find nearest walkable position and teleport there
      let nearestWalkable = this.findNearestWalkablePosition(currentX, currentY);
      
      if (nearestWalkable) {
        this.npc.position = nearestWalkable;
        this.npc.pixelPosition = { 
          x: nearestWalkable.x * TILE_SIZE, 
          y: nearestWalkable.y * TILE_SIZE 
        };
        this.currentPath = [];
        this.pathIndex = 0;
        this.updatePath(); // Force path recalculation
      }
      return;
    }
    
    // Check if we have a valid path to follow
    if (this.currentPath.length <= 1 || this.pathIndex >= this.currentPath.length) {
      this.npc.isMoving = false;
      return;
    }
    
    this.npc.isMoving = true;
    this.npc.currentPathIndex = this.pathIndex;
    
    // Get the next position to move towards in grid coordinates
    const nextPosition = this.currentPath[this.pathIndex];
    
    // Validate next position
    if (!nextPosition || !Number.isFinite(nextPosition.x) || !Number.isFinite(nextPosition.y)) {
      console.log(`Invalid next position in path for NPC ${this.npc.id}`);
      // Skip this path segment
      this.pathIndex++;
      return;
    }
    
    // Check if the next position is actually walkable
    const nextX = Math.round(nextPosition.x);
    const nextY = Math.round(nextPosition.y);
    
    if (
      nextX < 0 || nextX >= grid[0].length ||
      nextY < 0 || nextY >= grid.length ||
      grid[nextY][nextX] === false // Explicitly check if unwalkable
    ) {
      console.log(`Next position (${nextX}, ${nextY}) in path is unwalkable for NPC ${this.npc.id}! Recalculating...`);
      
      // Skip this point in the path and recalculate
      this.pathIndex++;
      this.updatePath();
      return;
    }
    
    // Convert grid position to pixel position
    const nextPixelX = nextPosition.x * TILE_SIZE;
    const nextPixelY = nextPosition.y * TILE_SIZE;
    
    // Calculate direction to next position in pixels
    const dirX = nextPixelX - this.npc.pixelPosition.x;
    const dirY = nextPixelY - this.npc.pixelPosition.y;
    
    // Calculate distance to next position in pixels
    const distToNext = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Check if we've reached the next position (within a small threshold)
    if (distToNext < 2) {
      // Update the grid position to match exactly
      this.npc.position.x = nextPosition.x;
      this.npc.position.y = nextPosition.y;
      
      // Update the pixel position to match exactly
      this.npc.pixelPosition.x = nextPixelX;
      this.npc.pixelPosition.y = nextPixelY;
      
      // Move to next path node
      this.pathIndex++;
      
      // If we've reached the end of the path, stop
      if (this.pathIndex >= this.currentPath.length) {
        this.npc.isMoving = false;
        return;
      }
    } else {
      // Normalize direction
      const normalizedDirX = dirX / distToNext;
      const normalizedDirY = dirY / distToNext;
      
      // Pixel speed (pixels per second)
      const pixelSpeed = this.npc.speed * TILE_SIZE;
      
      // Calculate new position
      const newPixelX = this.npc.pixelPosition.x + normalizedDirX * pixelSpeed * deltaTime;
      const newPixelY = this.npc.pixelPosition.y + normalizedDirY * pixelSpeed * deltaTime;
      
      // Convert to grid coordinates to check walkability
      const newGridX = newPixelX / TILE_SIZE;
      const newGridY = newPixelY / TILE_SIZE;
      const roundedGridX = Math.round(newGridX);
      const roundedGridY = Math.round(newGridY);
      
      // Check if the new position would be walkable
      if (
        roundedGridX >= 0 && roundedGridX < grid[0].length &&
        roundedGridY >= 0 && roundedGridY < grid.length &&
        grid[roundedGridY][roundedGridX] === false // If unwalkable
      ) {
        // We're about to move into an unwalkable tile - don't update position
        console.log(`Preventing NPC ${this.npc.id} from moving into unwalkable tile at (${roundedGridX}, ${roundedGridY})`);
        
        // Reset path and recalculate
        this.updatePath();
        return;
      }
      
      // Ensure we're staying within valid grid bounds in pixel space
      const maxPixelX = (GRID_WIDTH - 1) * TILE_SIZE;
      const maxPixelY = (GRID_HEIGHT - 1) * TILE_SIZE;
      
      this.npc.pixelPosition.x = Math.min(maxPixelX, Math.max(0, newPixelX));
      this.npc.pixelPosition.y = Math.min(maxPixelY, Math.max(0, newPixelY));
      
      // Update grid position based on pixel position, ensuring it's within bounds
      this.npc.position.x = Math.min(GRID_WIDTH - 1, Math.max(0, this.npc.pixelPosition.x / TILE_SIZE));
      this.npc.position.y = Math.min(GRID_HEIGHT - 1, Math.max(0, this.npc.pixelPosition.y / TILE_SIZE));
    }
  }
  
  /**
   * Find a safe walkable position for the NPC
   */
  private findSafePosition(): GridPosition {
    const { grid, gridSize } = useGridStore.getState();
    const centerX = Math.floor(gridSize.width / 2);
    const centerY = Math.floor(gridSize.height / 2);
    
    // First try the center
    if (grid && grid.length > 0 && grid[centerY][centerX] === true) {
      return { x: centerX, y: centerY };
    }
    
    // Search in expanding circles from center
    for (let radius = 1; radius < 10; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check positions on the perimeter of the circle
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const x = centerX + dx;
          const y = centerY + dy;
          
          // Check if position is valid and walkable
          if (
            x >= 0 && x < gridSize.width && 
            y >= 0 && y < gridSize.height && 
            grid[y][x] === true
          ) {
            return { x, y };
          }
        }
      }
    }
    
    // Fallback to a hard-coded position if nothing is found
    return { x: 1, y: 1 };
  }
  
  /**
   * Find the nearest walkable position from a given point
   */
  private findNearestWalkablePosition(x: number, y: number): GridPosition | null {
    const { grid, gridSize } = useGridStore.getState();
    
    // Search in expanding circles
    for (let radius = 1; radius < 15; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check positions on the perimeter of the circle
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const testX = x + dx;
          const testY = y + dy;
          
          // Check if position is valid and walkable
          if (
            testX >= 0 && testX < gridSize.width && 
            testY >= 0 && testY < gridSize.height && 
            grid[testY][testX] === true
          ) {
            return { x: testX, y: testY };
          }
        }
      }
    }
    
    // If we can't find anything nearby, try the center of the map
    const centerX = Math.floor(gridSize.width / 2);
    const centerY = Math.floor(gridSize.height / 2);
    
    if (grid[centerY][centerX] === true) {
      return { x: centerX, y: centerY };
    }
    
    // If all else fails, return null
    return null;
  }
  
  // Get the current state name for UI display
  getCurrentState(): string {
    return this.stateMachine.getCurrentState();
  }
}
