import { StateMachine } from "../StateMachine";
import { PreserverState } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";
import { useAudio } from "../../stores/useAudio";
import { hasLineOfSight, distanceBetween } from "../../utils";

export class PreserverBehavior implements StateMachine {
  private npc: NPC;
  private currentState: PreserverState;
  private patrolPoints: GridPosition[] = [];
  private currentPatrolIndex: number = 0;
  private detectionRadius: number = 8; // Longer detection range
  private visualRadius: number = 10; // Better visual range
  private attackRange: number = 1.5;
  private attackCooldown: number = 0;
  private attackCooldownMax: number = 1.5; // Fast attack cooldown
  private retreatTime: number = 0;
  private retreatTimeMax: number = 1.5; // Short retreat time
  private repositionTime: number = 0;
  private repositionTimeMax: number = 1;
  private lastKnownPlayerPosition: GridPosition | null = null;
  private timeWithoutVisual: number = 0;
  private maxTimeWithoutVisual: number = 3;
  private idealAttackDistance: number = 5; // Distance to maintain while circling target
  
  constructor(npc: NPC) {
    this.npc = npc;
    this.currentState = PreserverState.PATROL;
    this.initializePatrolPoints();
  }
  
  // Create patrol points covering a wider area
  private initializePatrolPoints(): void {
    const { width, height } = useGridStore.getState().gridSize;
    
    // Create a patrol pattern that covers key areas
    const patrolRadius = Math.min(width, height) / 3;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create a circular patrol pattern
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * patrolRadius;
      const y = centerY + Math.sin(angle) * patrolRadius;
      
      this.patrolPoints.push({
        x: Math.min(width - 1, Math.max(0, x)),
        y: Math.min(height - 1, Math.max(0, y))
      });
    }
    
    // Add some random variation to patrol points
    this.patrolPoints.forEach((point, i) => {
      if (i % 2 === 0) {
        const offsetX = (Math.random() - 0.5) * patrolRadius * 0.5;
        const offsetY = (Math.random() - 0.5) * patrolRadius * 0.5;
        point.x = Math.min(width - 1, Math.max(0, point.x + offsetX));
        point.y = Math.min(height - 1, Math.max(0, point.y + offsetY));
      }
    });
    
    // Randomize the starting patrol point
    this.currentPatrolIndex = Math.floor(Math.random() * this.patrolPoints.length);
  }
  
  update(deltaTime: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    this.retreatTime = Math.max(0, this.retreatTime - deltaTime);
    this.repositionTime = Math.max(0, this.repositionTime - deltaTime);
    
    const player = useEntityStore.getState().player;
    
    // Calculate distance to player
    const distanceToPlayer = player ? 
      distanceBetween(this.npc.position, player.position) : Infinity;
    
    // Check line of sight to player
    const hasVisualOnPlayer = player && 
                            distanceToPlayer < this.visualRadius && 
                            hasLineOfSight(this.npc.position, player.position);
    
    // Update time without visual if needed
    if (hasVisualOnPlayer) {
      this.timeWithoutVisual = 0;
      this.lastKnownPlayerPosition = { ...player.position };
    } else if (this.lastKnownPlayerPosition) {
      this.timeWithoutVisual += deltaTime;
    }
    
    // Process the current state
    switch (this.currentState) {
      case PreserverState.PATROL:
        // Set next patrol point as target
        this.npc.targetPosition = this.patrolPoints[this.currentPatrolIndex];
        
        // Check if we're close to the target patrol point
        const distToPatrolPoint = this.distanceTo(this.npc.targetPosition);
        if (distToPatrolPoint < 0.5) {
          // Move to the next patrol point
          this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        
        // If player is detected and visible, approach
        if (player && hasVisualOnPlayer && distanceToPlayer < this.detectionRadius) {
          this.currentState = PreserverState.APPROACH;
        }
        break;
        
      case PreserverState.APPROACH:
        if (!player) {
          this.currentState = PreserverState.PATROL;
          break;
        }
        
        // If we lost sight of the player for too long, go back to patrol
        if (!hasVisualOnPlayer && this.timeWithoutVisual >= this.maxTimeWithoutVisual) {
          this.currentState = PreserverState.PATROL;
          this.lastKnownPlayerPosition = null;
          break;
        }
        
        // Calculate approach position (not too close to player)
        if (hasVisualOnPlayer) {
          // Find a position that's at the ideal attack distance
          const angleToPlayer = Math.atan2(
            player.position.y - this.npc.position.y,
            player.position.x - this.npc.position.x
          );
          
          // Approach from a slight angle
          const approachAngle = angleToPlayer + (Math.random() - 0.5) * 0.5;
          const approachDistance = Math.max(this.attackRange, distanceToPlayer * 0.8);
          
          const targetX = player.position.x - Math.cos(approachAngle) * approachDistance;
          const targetY = player.position.y - Math.sin(approachAngle) * approachDistance;
          
          const { width, height } = useGridStore.getState().gridSize;
          this.npc.targetPosition = {
            x: Math.min(width - 1, Math.max(0, targetX)),
            y: Math.min(height - 1, Math.max(0, targetY))
          };
          
          // If we're close enough to the approach position, attack
          if (distanceToPlayer <= this.attackRange + 1) {
            this.currentState = PreserverState.ATTACK;
          }
        } 
        // If we've lost sight, go to last known position
        else if (this.lastKnownPlayerPosition) {
          this.npc.targetPosition = { ...this.lastKnownPlayerPosition };
        }
        break;
        
      case PreserverState.ATTACK:
        if (!player) {
          this.currentState = PreserverState.PATROL;
          break;
        }
        
        // Set player position as direct target during attack
        if (hasVisualOnPlayer) {
          this.npc.targetPosition = { ...player.position };
        } else {
          // If we lost visual during attack, retreat
          this.currentState = PreserverState.RETREAT;
          this.retreatTime = this.retreatTimeMax;
          break;
        }
        
        // If we're close enough to attack and cooldown is over, perform attack
        if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
          this.attackPlayer();
          this.currentState = PreserverState.RETREAT;
          this.retreatTime = this.retreatTimeMax;
        }
        break;
        
      case PreserverState.RETREAT:
        if (!player) {
          this.currentState = PreserverState.PATROL;
          break;
        }
        
        // Calculate retreat direction (away from player's position)
        const retreatFromPos = hasVisualOnPlayer ? 
                             player.position : 
                             (this.lastKnownPlayerPosition || player.position);
        
        // Retreat to a position that's further than the ideal attack distance
        const angleFromPlayer = Math.atan2(
          this.npc.position.y - retreatFromPos.y,
          this.npc.position.x - retreatFromPos.x
        );
        
        const retreatDistance = this.idealAttackDistance * 1.5;
        const targetX = retreatFromPos.x + Math.cos(angleFromPlayer) * retreatDistance;
        const targetY = retreatFromPos.y + Math.sin(angleFromPlayer) * retreatDistance;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        this.npc.targetPosition = {
          x: Math.min(width - 1, Math.max(0, targetX)),
          y: Math.min(height - 1, Math.max(0, targetY))
        };
        
        // Once we've retreated for enough time, reposition for next attack
        if (this.retreatTime <= 0) {
          this.currentState = PreserverState.REPOSITION;
          this.repositionTime = this.repositionTimeMax;
        }
        break;
        
      case PreserverState.REPOSITION:
        if (!player) {
          this.currentState = PreserverState.PATROL;
          break;
        }
        
        // If we've lost sight of the player for too long, return to patrol
        if (!hasVisualOnPlayer && this.timeWithoutVisual >= this.maxTimeWithoutVisual) {
          this.currentState = PreserverState.PATROL;
          this.lastKnownPlayerPosition = null;
          break;
        }
        
        // Calculate a new attack position by orbiting around the player
        if (hasVisualOnPlayer) {
          // Orbit around player at ideal attack distance
          const currentAngle = Math.atan2(
            this.npc.position.y - player.position.y,
            this.npc.position.x - player.position.x
          );
          
          // Choose a new angle that's about 90 degrees from current position
          const orbitAngleChange = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * Math.PI / 4);
          const newAngle = currentAngle + orbitAngleChange;
          
          const targetX = player.position.x + Math.cos(newAngle) * this.idealAttackDistance;
          const targetY = player.position.y + Math.sin(newAngle) * this.idealAttackDistance;
          
          // Clamp to grid boundaries
          const { width, height } = useGridStore.getState().gridSize;
          this.npc.targetPosition = {
            x: Math.min(width - 1, Math.max(0, targetX)),
            y: Math.min(height - 1, Math.max(0, targetY))
          };
        } else if (this.lastKnownPlayerPosition) {
          // Circle around last known position
          const currentAngle = Math.atan2(
            this.npc.position.y - this.lastKnownPlayerPosition.y,
            this.npc.position.x - this.lastKnownPlayerPosition.x
          );
          
          const newAngle = currentAngle + Math.PI / 2;
          const targetX = this.lastKnownPlayerPosition.x + Math.cos(newAngle) * this.idealAttackDistance;
          const targetY = this.lastKnownPlayerPosition.y + Math.sin(newAngle) * this.idealAttackDistance;
          
          // Clamp to grid boundaries
          const { width, height } = useGridStore.getState().gridSize;
          this.npc.targetPosition = {
            x: Math.min(width - 1, Math.max(0, targetX)),
            y: Math.min(height - 1, Math.max(0, targetY))
          };
        }
        
        // After repositioning time is up, approach for another attack
        if (this.repositionTime <= 0) {
          this.currentState = PreserverState.APPROACH;
        }
        break;
    }
  }
  
  // Attack the player
  private attackPlayer(): void {
    this.attackCooldown = this.attackCooldownMax;
    
    // Play hit sound effect
    const { playHit } = useAudio.getState();
    playHit();
    
    // In a real game, this would apply damage to the player
    console.log(`Preserver ${this.npc.id} is attacking player!`);
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