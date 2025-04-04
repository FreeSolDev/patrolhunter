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
      return;
    }
    
    // Get the next position to move towards
    const nextPosition = this.currentPath[this.pathIndex];
    
    // Calculate direction to next position
    const dirX = nextPosition.x - this.npc.position.x;
    const dirY = nextPosition.y - this.npc.position.y;
    
    // Calculate distance to next position
    const distToNext = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Check if we've reached the next position
    if (distToNext < 0.1) {
      this.pathIndex++;
      
      // If we've reached the end of the path, stop
      if (this.pathIndex >= this.currentPath.length) {
        return;
      }
    }
    
    // Normalize direction
    const normalizedDirX = dirX / distToNext;
    const normalizedDirY = dirY / distToNext;
    
    // Move towards next position at NPC's movement speed
    this.npc.position.x += normalizedDirX * this.npc.speed * deltaTime;
    this.npc.position.y += normalizedDirY * this.npc.speed * deltaTime;
  }
  
  // Get the current state name for UI display
  getCurrentState(): string {
    return this.stateMachine.getCurrentState();
  }
}
