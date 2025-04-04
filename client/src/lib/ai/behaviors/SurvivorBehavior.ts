import { StateMachine } from "../StateMachine";
import { SurvivorState } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";

export class SurvivorBehavior implements StateMachine {
  private npc: NPC;
  private currentState: SurvivorState;
  private wanderPoints: GridPosition[] = [];
  private currentWanderIndex: number = 0;
  private detectionRadius: number = 7; // Larger detection radius to spot danger early
  private safeDistance: number = 8;
  private wanderTimer: number = 0;
  private wanderInterval: number = 5;
  private hideTimer: number = 0;
  private hideTimeMax: number = 3;
  
  constructor(npc: NPC) {
    this.npc = npc;
    this.currentState = SurvivorState.WANDER;
    this.initializeWanderPoints();
  }
  
  // Create wander points for the survivor
  private initializeWanderPoints(): void {
    const { width, height } = useGridStore.getState().gridSize;
    const startPos = this.npc.position;
    
    // Generate wander points in a radius around the starting position
    const wanderRadius = 4;
    this.wanderPoints = [
      { x: startPos.x, y: startPos.y },
      { 
        x: Math.min(width - 1, Math.max(0, startPos.x + wanderRadius)), 
        y: startPos.y 
      },
      { 
        x: startPos.x, 
        y: Math.min(height - 1, Math.max(0, startPos.y + wanderRadius)) 
      },
      { 
        x: Math.min(width - 1, Math.max(0, startPos.x - wanderRadius)), 
        y: startPos.y 
      },
      { 
        x: startPos.x, 
        y: Math.min(height - 1, Math.max(0, startPos.y - wanderRadius)) 
      }
    ];
    
    // Randomize the starting wander point
    this.currentWanderIndex = Math.floor(Math.random() * this.wanderPoints.length);
  }
  
  update(deltaTime: number): void {
    this.wanderTimer += deltaTime;
    
    const player = useEntityStore.getState().player;
    
    // Check if player is in monster form and nearby (dangerous)
    const isPlayerDangerous = player?.isMonster || false;
    const distanceToPlayer = player ? 
      Math.sqrt(
        Math.pow(this.npc.position.x - player.position.x, 2) +
        Math.pow(this.npc.position.y - player.position.y, 2)
      ) : Infinity;
    
    // Process the current state
    switch (this.currentState) {
      case SurvivorState.WANDER:
        // Set next wander point as target
        this.npc.targetPosition = this.wanderPoints[this.currentWanderIndex];
        
        // Check if we're close to the target wander point
        const distToWanderPoint = this.distanceTo(this.npc.targetPosition);
        if (distToWanderPoint < 0.5 || this.wanderTimer >= this.wanderInterval) {
          // Move to a random wander point
          this.currentWanderIndex = Math.floor(Math.random() * this.wanderPoints.length);
          this.wanderTimer = 0;
        }
        
        // If player is in monster form and within detection radius, flee
        if (isPlayerDangerous && distanceToPlayer < this.detectionRadius) {
          this.currentState = SurvivorState.FLEE;
        }
        break;
        
      case SurvivorState.FLEE:
        if (!player) {
          this.currentState = SurvivorState.WANDER;
          break;
        }
        
        // Calculate flee direction (away from player)
        const fleeX = this.npc.position.x + (this.npc.position.x - player.position.x) * 1.5;
        const fleeY = this.npc.position.y + (this.npc.position.y - player.position.y) * 1.5;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        const clampedX = Math.min(width - 1, Math.max(0, fleeX));
        const clampedY = Math.min(height - 1, Math.max(0, fleeY));
        
        this.npc.targetPosition = { x: clampedX, y: clampedY };
        
        // If we've fled far enough, find a place to hide
        if (distanceToPlayer > this.safeDistance) {
          this.findHidingSpot();
          this.currentState = SurvivorState.HIDE;
          this.hideTimer = this.hideTimeMax;
        }
        break;
        
      case SurvivorState.HIDE:
        // While hiding, just count down the timer
        this.hideTimer -= deltaTime;
        
        // If player is close and dangerous, flee again
        if (isPlayerDangerous && distanceToPlayer < this.detectionRadius) {
          this.currentState = SurvivorState.FLEE;
        } 
        // If timer expires, seek safety
        else if (this.hideTimer <= 0) {
          this.currentState = SurvivorState.SEEK_SAFETY;
        }
        break;
        
      case SurvivorState.SEEK_SAFETY:
        // Find a new safe location far from the player
        if (player) {
          this.findSafeLocation(player.position);
        } else {
          // If no player information, just go back to wandering
          this.currentState = SurvivorState.WANDER;
        }
        
        // If we've reached the safe spot, go back to wandering
        if (this.distanceTo(this.npc.targetPosition) < 0.5) {
          this.currentState = SurvivorState.WANDER;
        }
        
        // If danger is detected again, flee
        if (isPlayerDangerous && distanceToPlayer < this.detectionRadius) {
          this.currentState = SurvivorState.FLEE;
        }
        break;
    }
  }
  
  // Find a hiding spot near objects or walls
  private findHidingSpot(): void {
    const { grid, obstacles } = useGridStore.getState();
    if (!grid || grid.length === 0) return;
    
    // If there are obstacles, try to hide behind them
    if (obstacles.length > 0) {
      // Find the nearest obstacle
      let nearestObstacle = obstacles[0];
      let minDistance = Infinity;
      
      for (const obstacle of obstacles) {
        const distance = this.distanceTo(obstacle);
        if (distance < minDistance) {
          minDistance = distance;
          nearestObstacle = obstacle;
        }
      }
      
      // Set target position behind the obstacle relative to player
      const player = useEntityStore.getState().player;
      if (player) {
        const obstacleToPosX = nearestObstacle.x - player.position.x;
        const obstacleToPosY = nearestObstacle.y - player.position.y;
        
        // Position behind the obstacle
        const hidePosX = nearestObstacle.x + Math.sign(obstacleToPosX) * 1.5;
        const hidePosY = nearestObstacle.y + Math.sign(obstacleToPosY) * 1.5;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        this.npc.targetPosition = {
          x: Math.min(width - 1, Math.max(0, hidePosX)),
          y: Math.min(height - 1, Math.max(0, hidePosY))
        };
      } else {
        // If no player, just move to the obstacle
        this.npc.targetPosition = { ...nearestObstacle };
      }
    } 
    // If no obstacles, move to a corner
    else {
      const { width, height } = useGridStore.getState().gridSize;
      const corners = [
        { x: 1, y: 1 },
        { x: width - 2, y: 1 },
        { x: 1, y: height - 2 },
        { x: width - 2, y: height - 2 }
      ];
      
      // Find the farthest corner from the player
      const player = useEntityStore.getState().player;
      let farthestCorner = corners[0];
      let maxDistance = -Infinity;
      
      for (const corner of corners) {
        let distance;
        
        if (player) {
          // Distance from corner to player
          distance = Math.sqrt(
            Math.pow(corner.x - player.position.x, 2) +
            Math.pow(corner.y - player.position.y, 2)
          );
        } else {
          // Without player, use distance from current position
          distance = Math.sqrt(
            Math.pow(corner.x - this.npc.position.x, 2) +
            Math.pow(corner.y - this.npc.position.y, 2)
          );
        }
        
        if (distance > maxDistance) {
          maxDistance = distance;
          farthestCorner = corner;
        }
      }
      
      this.npc.targetPosition = farthestCorner;
    }
  }
  
  // Find a safe location away from the player
  private findSafeLocation(playerPos: GridPosition): void {
    const { width, height } = useGridStore.getState().gridSize;
    
    // Find the farthest quadrant from the player
    const quadrants = [
      { x: width * 0.25, y: height * 0.25 }, // Top-left
      { x: width * 0.75, y: height * 0.25 }, // Top-right
      { x: width * 0.25, y: height * 0.75 }, // Bottom-left
      { x: width * 0.75, y: height * 0.75 }  // Bottom-right
    ];
    
    let farthestQuadrant = quadrants[0];
    let maxDistance = -Infinity;
    
    for (const quadrant of quadrants) {
      const distance = Math.sqrt(
        Math.pow(quadrant.x - playerPos.x, 2) +
        Math.pow(quadrant.y - playerPos.y, 2)
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestQuadrant = quadrant;
      }
    }
    
    // Set target to the center of the farthest quadrant
    this.npc.targetPosition = {
      x: Math.round(farthestQuadrant.x),
      y: Math.round(farthestQuadrant.y)
    };
  }
  
  // Calculate distance to a position
  private distanceTo(position: GridPosition): number {
    return Math.sqrt(
      Math.pow(this.npc.position.x - position.x, 2) +
      Math.pow(this.npc.position.y - position.y, 2)
    );
  }
  
  // Get the current state name
  getCurrentState(): string {
    return this.currentState;
  }
}
