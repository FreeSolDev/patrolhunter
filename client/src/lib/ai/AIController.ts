import { GridPosition, NPC } from "../types";
import { findPath } from "../pathfinding/astar";
import { StateMachine } from "./StateMachine";
import { AIType } from "./AITypes";
import { GuardBehavior } from "./behaviors/GuardBehavior";
import { HunterBehavior } from "./behaviors/HunterBehavior";
import { SurvivorBehavior } from "./behaviors/SurvivorBehavior";
import { PreserverBehavior } from "./behaviors/PreserverBehavior";
import { MerchantBehavior } from "./behaviors/MerchantBehavior";

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
    
    // Validate coordinates to ensure they're in bounds and valid
    if (
      !Number.isFinite(this.npc.position.x) || 
      !Number.isFinite(this.npc.position.y) || 
      !Number.isFinite(target.x) || 
      !Number.isFinite(target.y)
    ) {
      console.log(`Invalid positions for path: NPC at (${this.npc.position.x}, ${this.npc.position.y}), Target at (${target.x}, ${target.y})`);
      
      // Reset NPC to center of the map if position is invalid
      const { width, height } = { width: 60, height: 60 }; // Fallback values
      this.npc.position = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
      this.npc.pixelPosition = { x: this.npc.position.x * 30, y: this.npc.position.y * 30 };
      return;
    }
    
    // Don't recalculate if we're already at the target
    if (
      Math.round(this.npc.position.x) === Math.round(target.x) &&
      Math.round(this.npc.position.y) === Math.round(target.y)
    ) return;
    
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
    
    // Find a new path to the target using validated positions
    // Make sure positions are in bounds
    const { width, height } = { width: 60, height: 60 }; // Using fixed values as a fallback
    
    const start: GridPosition = { 
      x: Math.min(width - 1, Math.max(0, Math.round(this.npc.position.x))), 
      y: Math.min(height - 1, Math.max(0, Math.round(this.npc.position.y)))
    };
    
    const goal: GridPosition = { 
      x: Math.min(width - 1, Math.max(0, Math.round(target.x))), 
      y: Math.min(height - 1, Math.max(0, Math.round(target.y)))
    };
    
    try {
      this.currentPath = findPath(start, goal, this.npc.id, pathColor);
      this.pathIndex = 0;
    } catch (error) {
      console.error(`Error finding path for NPC ${this.npc.id}:`, error);
    }
  }
  
  // Follow the current path
  private followPath(deltaTime: number): void {
    // Grid dimensions (fixed values as a fallback)
    const GRID_WIDTH = 60;
    const GRID_HEIGHT = 60;
    const TILE_SIZE = 30; // Same as in Game.tsx
    
    // Validate NPC position
    if (
      !Number.isFinite(this.npc.position.x) || 
      !Number.isFinite(this.npc.position.y) ||
      !Number.isFinite(this.npc.pixelPosition.x) || 
      !Number.isFinite(this.npc.pixelPosition.y)
    ) {
      // Reset to a safe position
      console.log(`Fixing invalid NPC position for ${this.npc.id}`);
      this.npc.position = { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) };
      this.npc.pixelPosition = { x: this.npc.position.x * TILE_SIZE, y: this.npc.position.y * TILE_SIZE };
      this.currentPath = [];
      this.npc.isMoving = false;
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
      
      // Move towards next position at NPC's movement speed
      const newPixelX = this.npc.pixelPosition.x + normalizedDirX * pixelSpeed * deltaTime;
      const newPixelY = this.npc.pixelPosition.y + normalizedDirY * pixelSpeed * deltaTime;
      
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
  
  // Get the current state name for UI display
  getCurrentState(): string {
    return this.stateMachine.getCurrentState();
  }
}
