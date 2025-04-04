import { StateMachine } from "../StateMachine";
import { GuardState } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";
import { useAudio } from "../../stores/useAudio";

export class GuardBehavior implements StateMachine {
  private npc: NPC;
  private currentState: GuardState;
  private patrolPoints: GridPosition[] = [];
  private currentPatrolIndex: number = 0;
  private detectionRadius: number = 5;
  private attackRange: number = 1.5;
  private attackCooldown: number = 0;
  private attackCooldownMax: number = 2;
  private retreatDistance: number = 3;
  private coordinationTimer: number = 0;
  private coordinationInterval: number = 1.5;
  
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
    
    // Always check for player proximity, regardless of current state
    const distanceToPlayer = player ? 
      Math.sqrt(
        Math.pow(this.npc.position.x - player.position.x, 2) +
        Math.pow(this.npc.position.y - player.position.y, 2)
      ) : Infinity;
    
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
        
        // If player is in monster form and within detection radius, switch to attack
        if (player && player.isMonster && distanceToPlayer < this.detectionRadius) {
          this.currentState = GuardState.ATTACK;
        }
        break;
        
      case GuardState.INVESTIGATE:
        // If player is visible and in monster form, attack
        if (player && player.isMonster && distanceToPlayer < this.detectionRadius) {
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
          this.coordinateWithOtherGuards(npcs);
          this.coordinationTimer = 0;
        }
        
        // If player is no longer in monster form, go back to patrol
        if (!player.isMonster) {
          this.currentState = GuardState.PATROL;
          break;
        }
        
        // Set player position as target
        this.npc.targetPosition = { ...player.position };
        
        // If we're close enough to attack and cooldown is over, perform attack
        if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
          this.attackPlayer();
          this.currentState = GuardState.RETREAT;
        }
        break;
        
      case GuardState.RETREAT:
        if (!player) {
          this.currentState = GuardState.PATROL;
          break;
        }
        
        // Calculate retreat direction (away from player)
        const retreatX = this.npc.position.x + (this.npc.position.x - player.position.x) * 0.5;
        const retreatY = this.npc.position.y + (this.npc.position.y - player.position.y) * 0.5;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        this.npc.targetPosition = {
          x: Math.min(width - 1, Math.max(0, retreatX)),
          y: Math.min(height - 1, Math.max(0, retreatY))
        };
        
        // If we've retreated enough or the player is not in monster form, go back to patrol
        if (distanceToPlayer > this.retreatDistance || !player.isMonster) {
          this.currentState = GuardState.PATROL;
        }
        break;
        
      case GuardState.COORDINATE:
        // Coordinate with other guards, then return to previous behavior
        this.coordinateWithOtherGuards(npcs);
        this.currentState = GuardState.ATTACK;
        break;
    }
  }
  
  // Find other guards in the same group and coordinate attacks
  private coordinateWithOtherGuards(npcs: NPC[]): void {
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
        
        // Calculate positions around the player for flanking
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
        
        // Assign flanking positions to guards
        guardsInGroup.forEach((guard, index) => {
          const targetIndex = index % targetPositions.length;
          const { updateNPCTarget } = useEntityStore.getState();
          updateNPCTarget(guard.id, targetPositions[targetIndex]);
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
