import { StateMachine } from "../StateMachine";
import { GuardState } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";
import { useAudio } from "../../stores/useAudio";
import { hasLineOfSight, distanceBetween } from "../../utils";

export class GuardBehavior implements StateMachine {
  private npc: NPC;
  private currentState: GuardState;
  private patrolPoints: GridPosition[] = [];
  private currentPatrolIndex: number = 0;
  private detectionRadius: number = 5;
  private visualRadius: number = 7; // How far the guard can see
  private attackRange: number = 1.5;
  private attackCooldown: number = 0;
  private attackCooldownMax: number = 2;
  private retreatDistance: number = 3;
  private coordinationTimer: number = 0;
  private coordinationInterval: number = 1.5;
  private lastKnownPlayerPosition: GridPosition | null = null;
  private timeWithoutVisual: number = 0;
  private maxTimeWithoutVisual: number = 4; // Time in seconds before giving up search
  
  constructor(npc: NPC) {
    this.npc = npc;
    this.currentState = GuardState.PATROL;
    this.initializePatrolPoints();
  }
  
  // Create patrol points around the guard's starting position
  private initializePatrolPoints(): void {
    const { width, height } = useGridStore.getState().gridSize;
    const startPos = this.npc.position;
    
    // Generate patrol points in a radius around the starting position
    const patrolRadius = 3 + Math.random() * 3;
    this.patrolPoints = [
      { x: startPos.x, y: startPos.y },
      { 
        x: Math.min(width - 1, Math.max(0, startPos.x + patrolRadius)), 
        y: startPos.y 
      },
      { 
        x: Math.min(width - 1, Math.max(0, startPos.x + patrolRadius / 2)), 
        y: Math.min(height - 1, Math.max(0, startPos.y + patrolRadius)) 
      },
      { 
        x: Math.min(width - 1, Math.max(0, startPos.x - patrolRadius)), 
        y: startPos.y 
      },
      { 
        x: Math.min(width - 1, Math.max(0, startPos.x - patrolRadius / 2)), 
        y: Math.min(height - 1, Math.max(0, startPos.y - patrolRadius)) 
      }
    ];
    
    // Randomize the starting patrol point
    this.currentPatrolIndex = Math.floor(Math.random() * this.patrolPoints.length);
  }
  
  update(deltaTime: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    this.coordinationTimer += deltaTime;
    
    const player = useEntityStore.getState().player;
    const { npcs } = useEntityStore.getState();
    
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
    
    // Create a boolean for coordination (non-null)
    const canSeePlayer: boolean = hasVisualOnPlayer ? true : false;
    
    // Process the current state
    switch (this.currentState) {
      case GuardState.PATROL:
        // Set next patrol point as target
        this.npc.targetPosition = this.patrolPoints[this.currentPatrolIndex];
        
        // Check if we're close to the target patrol point
        const distToPatrolPoint = this.distanceTo(this.npc.targetPosition);
        if (distToPatrolPoint < 0.5) {
          // Move to the next patrol point
          this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        
        // If player is in monster form and visible, switch to attack
        if (player && player.isMonster && hasVisualOnPlayer && distanceToPlayer < this.detectionRadius) {
          this.currentState = GuardState.ATTACK;
        }
        break;
        
      case GuardState.INVESTIGATE:
        // If player is visible and in monster form, attack
        if (player && player.isMonster && hasVisualOnPlayer && distanceToPlayer < this.detectionRadius) {
          this.currentState = GuardState.ATTACK;
        } 
        // If we're at investigation point, return to patrol
        else if (this.distanceTo(this.npc.targetPosition) < 0.5) {
          this.currentState = GuardState.PATROL;
        }
        break;
        
      case GuardState.ATTACK:
        if (!player) {
          this.currentState = GuardState.PATROL;
          break;
        }
        
        // Try to coordinate with nearby guards of the same group
        if (this.coordinationTimer >= this.coordinationInterval) {
          this.coordinateWithOtherGuards(npcs, canSeePlayer);
          this.coordinationTimer = 0;
        }
        
        // If player is no longer in monster form, go back to patrol
        if (!player.isMonster) {
          this.currentState = GuardState.PATROL;
          break;
        }
        
        // If we have line of sight, update target to current player position
        if (hasVisualOnPlayer) {
          this.npc.targetPosition = { ...player.position };
        } 
        // If we've lost sight but recently saw the player, go to last known position
        else if (this.lastKnownPlayerPosition && this.timeWithoutVisual < this.maxTimeWithoutVisual) {
          this.npc.targetPosition = { ...this.lastKnownPlayerPosition };
          
          // If we reach the last known position and still don't see the player, investigate around
          if (this.distanceTo(this.lastKnownPlayerPosition) < 0.5) {
            this.currentState = GuardState.INVESTIGATE;
            // Choose a random direction to investigate from last known position
            const angle = Math.random() * Math.PI * 2;
            const { width, height } = useGridStore.getState().gridSize;
            this.npc.targetPosition = {
              x: Math.min(width - 1, Math.max(0, this.lastKnownPlayerPosition.x + Math.cos(angle) * 2)),
              y: Math.min(height - 1, Math.max(0, this.lastKnownPlayerPosition.y + Math.sin(angle) * 2))
            };
          }
        } 
        // If we've lost track of player for too long, go back to patrolling
        else if (this.timeWithoutVisual >= this.maxTimeWithoutVisual) {
          this.currentState = GuardState.PATROL;
          this.lastKnownPlayerPosition = null;
          break;
        }
        
        // If we're close enough to attack and cooldown is over, perform attack
        if (hasVisualOnPlayer && distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
          this.attackPlayer();
          this.currentState = GuardState.RETREAT;
        }
        break;
        
      case GuardState.RETREAT:
        if (!player) {
          this.currentState = GuardState.PATROL;
          break;
        }
        
        // Always retreat away from player's last known position
        const retreatFromPos = hasVisualOnPlayer ? 
                            player.position : 
                            (this.lastKnownPlayerPosition || player.position);
        
        // Calculate retreat direction (away from player)
        const retreatX = this.npc.position.x + (this.npc.position.x - retreatFromPos.x) * 0.5;
        const retreatY = this.npc.position.y + (this.npc.position.y - retreatFromPos.y) * 0.5;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        this.npc.targetPosition = {
          x: Math.min(width - 1, Math.max(0, retreatX)),
          y: Math.min(height - 1, Math.max(0, retreatY))
        };
        
        // If we've retreated enough, lost visual, or the player is not in monster form, go back to patrol
        if (
          !hasVisualOnPlayer || 
          distanceToPlayer > this.retreatDistance || 
          !player.isMonster
        ) {
          // If we still know player is a monster and around somewhere, go to coordinate
          if (player.isMonster && this.lastKnownPlayerPosition && this.timeWithoutVisual < this.maxTimeWithoutVisual) {
            this.currentState = GuardState.COORDINATE;
          } else {
            this.currentState = GuardState.PATROL;
          }
        }
        break;
        
      case GuardState.COORDINATE:
        // Coordinate with other guards, then return to previous behavior
        this.coordinateWithOtherGuards(npcs, canSeePlayer);
        
        // If we have visual, attack; otherwise investigate
        if (hasVisualOnPlayer && player && player.isMonster) {
          this.currentState = GuardState.ATTACK;
        } else {
          this.currentState = GuardState.INVESTIGATE;
        }
        break;
    }
  }
  
  // Find other guards in the same group and coordinate attacks
  private coordinateWithOtherGuards(npcs: NPC[], canSeePlayer: boolean = false): void {
    if (!this.npc.groupId) return;
    
    const player = useEntityStore.getState().player;
    if (!player) return;
    
    // Find other guards in the same group
    const guardsInGroup = npcs.filter(
      npc => npc.groupId === this.npc.groupId && npc.id !== this.npc.id
    );
    
    if (guardsInGroup.length > 0) {
      // Signal other guards to attack if player is in monster form
      if (player.isMonster) {
        // Find guards to flank from different angles
        const targetPositions: GridPosition[] = [];
        
        // Use different strategies based on whether the player is visible
        if (canSeePlayer) {
          // Direct flanking when player is visible - surround from all sides
          const flankDistance = 2;
          const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
          
          for (let i = 0; i < angles.length; i++) {
            const x = player.position.x + Math.cos(angles[i]) * flankDistance;
            const y = player.position.y + Math.sin(angles[i]) * flankDistance;
            
            const { width, height } = useGridStore.getState().gridSize;
            targetPositions.push({
              x: Math.min(width - 1, Math.max(0, x)),
              y: Math.min(height - 1, Math.max(0, y))
            });
          }
        } else if (this.lastKnownPlayerPosition) {
          // Search pattern when player is not visible but was recently seen
          // Guards spread out in a wider search pattern around last known position
          const searchRadius = 4;
          const numPoints = Math.min(guardsInGroup.length + 1, 6); // +1 includes this guard
          
          for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const x = this.lastKnownPlayerPosition.x + Math.cos(angle) * searchRadius;
            const y = this.lastKnownPlayerPosition.y + Math.sin(angle) * searchRadius;
            
            const { width, height } = useGridStore.getState().gridSize;
            targetPositions.push({
              x: Math.min(width - 1, Math.max(0, x)),
              y: Math.min(height - 1, Math.max(0, y))
            });
          }
        }
        
        // Assign positions to guards
        guardsInGroup.forEach((guard, index) => {
          if (targetPositions.length > 0) {
            const targetIndex = index % targetPositions.length;
            const { updateNPCTarget } = useEntityStore.getState();
            updateNPCTarget(guard.id, targetPositions[targetIndex]);
          }
        });
      }
    }
  }
  
  // Attack the player
  private attackPlayer(): void {
    this.attackCooldown = this.attackCooldownMax;
    
    // In a real game, this would apply damage to the player
    console.log(`Guard ${this.npc.id} is attacking player!`);
    
    // Play hit sound effect
    const { playHit } = useAudio.getState();
    playHit();
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
