import { GridPosition, NPC } from "../types";
import { findPath } from "../pathfinding/astar";
import { StateMachine } from "./StateMachine";
import { AIType } from "./AITypes";
import { GuardBehavior } from "./behaviors/GuardBehavior";
import { HunterBehavior } from "./behaviors/HunterBehavior";
import { SurvivorBehavior } from "./behaviors/SurvivorBehavior";

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
    
    // Don't recalculate if we're already at the target
    if (
      this.npc.position.x === target.x &&
      this.npc.position.y === target.y
    ) return;
    
    // Set path color based on NPC type for visualization
    let pathColor: string;
    switch (this.npc.type) {
      case AIType.GUARD:
        pathColor = "#00AA55";
        break;
      case AIType.HUNTER:
        pathColor = "#FF5500";
        break;
      case AIType.SURVIVOR:
        pathColor = "#AAAAFF";
        break;
      default:
        pathColor = "#FFFFFF";
    }
    
    // Find a new path to the target
    const start: GridPosition = { 
      x: Math.round(this.npc.position.x), 
      y: Math.round(this.npc.position.y) 
    };
    const goal: GridPosition = { x: target.x, y: target.y };
    
    try {
      this.currentPath = findPath(start, goal, this.npc.id, pathColor);
      this.pathIndex = 0;
    } catch (error) {
      console.error("Error finding path:", error);
    }
  }
  
  // Follow the current path
  private followPath(deltaTime: number): void {
    if (this.currentPath.length <= 1 || this.pathIndex >= this.currentPath.length) {
      this.npc.isMoving = false;
      return;
    }
    
    this.npc.isMoving = true;
    this.npc.currentPathIndex = this.pathIndex;
    
    // Calculate pixel positions for smooth movement
    const TILE_SIZE = 30; // Same as in Game.tsx
    
    // Get the next position to move towards in grid coordinates
    const nextPosition = this.currentPath[this.pathIndex];
    
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
      this.npc.pixelPosition.x += normalizedDirX * pixelSpeed * deltaTime;
      this.npc.pixelPosition.y += normalizedDirY * pixelSpeed * deltaTime;
      
      // Update grid position based on pixel position
      this.npc.position.x = this.npc.pixelPosition.x / TILE_SIZE;
      this.npc.position.y = this.npc.pixelPosition.y / TILE_SIZE;
    }
  }
  
  // Get the current state name for UI display
  getCurrentState(): string {
    return this.stateMachine.getCurrentState();
  }
}
