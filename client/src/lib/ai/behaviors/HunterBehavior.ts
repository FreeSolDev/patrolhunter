import { StateMachine } from "../StateMachine";
import { HunterState } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";
import { useAudio } from "../../stores/useAudio";

export class HunterBehavior implements StateMachine {
  private npc: NPC;
  private currentState: HunterState;
  private huntPoints: GridPosition[] = [];
  private currentHuntIndex: number = 0;
  private detectionRadius: number = 6;
  private attackRange: number = 1.5;
  private attackCooldown: number = 0;
  private attackCooldownMax: number = 2;
  private retreatCooldown: number = 0;
  private retreatCooldownMax: number = 3;
  private waitTime: number = 0;
  private waitTimeMax: number = 2;
  
  constructor(npc: NPC) {
    this.npc = npc;
    this.currentState = HunterState.HUNT;
    this.initializeHuntPoints();
  }
  
  // Create hunt points for the hunter to patrol
  private initializeHuntPoints(): void {
    const { width, height } = useGridStore.getState().gridSize;
    
    // Create strategic hunting points across the map
    this.huntPoints = [
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25) },
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.25) },
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.75) },
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.75) },
      { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) }
    ];
    
    // Randomize the starting hunt point
    this.currentHuntIndex = Math.floor(Math.random() * this.huntPoints.length);
  }
  
  update(deltaTime: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    this.retreatCooldown = Math.max(0, this.retreatCooldown - deltaTime);
    
    const player = useEntityStore.getState().player;
    
    // Always check for player proximity
    const distanceToPlayer = player ? 
      Math.sqrt(
        Math.pow(this.npc.position.x - player.position.x, 2) +
        Math.pow(this.npc.position.y - player.position.y, 2)
      ) : Infinity;
    
    // Process the current state
    switch (this.currentState) {
      case HunterState.HUNT:
        // Set next hunt point as target
        this.npc.targetPosition = this.huntPoints[this.currentHuntIndex];
        
        // Check if we're close to the target hunt point
        const distToHuntPoint = this.distanceTo(this.npc.targetPosition);
        if (distToHuntPoint < 0.5) {
          // Move to the next hunt point
          this.currentHuntIndex = (this.currentHuntIndex + 1) % this.huntPoints.length;
        }
        
        // If player is detected, attack or engage based on form
        if (player && distanceToPlayer < this.detectionRadius) {
          if (player.isMonster) {
            this.currentState = HunterState.ATTACK_MONSTER;
          } else {
            this.currentState = HunterState.ATTACK_HUMAN;
          }
        }
        break;
        
      case HunterState.ATTACK_HUMAN:
        if (!player) {
          this.currentState = HunterState.HUNT;
          break;
        }
        
        // If player transforms to monster, switch attack mode
        if (player.isMonster) {
          this.currentState = HunterState.ATTACK_MONSTER;
          break;
        }
        
        // Set player position as target
        this.npc.targetPosition = { ...player.position };
        
        // If we're close enough to attack and cooldown is over, perform attack
        if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
          this.attackPlayer();
          
          // After attacking in human form, retreat
          this.retreatCooldown = this.retreatCooldownMax;
          this.currentState = HunterState.RETREAT;
        }
        break;
        
      case HunterState.ATTACK_MONSTER:
        if (!player) {
          this.currentState = HunterState.HUNT;
          break;
        }
        
        // If player transforms to human, switch attack mode
        if (!player.isMonster) {
          this.currentState = HunterState.ATTACK_HUMAN;
          break;
        }
        
        // Set player position as target
        this.npc.targetPosition = { ...player.position };
        
        // If we're close enough to attack and cooldown is over, perform attack
        if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
          this.attackPlayer();
          
          // For monster form, we don't retreat - more aggressive
          // Just reset attack cooldown and continue pursuing
        }
        break;
        
      case HunterState.RETREAT:
        if (!player) {
          this.currentState = HunterState.HUNT;
          break;
        }
        
        // Calculate retreat direction (away from player)
        const retreatX = this.npc.position.x + (this.npc.position.x - player.position.x) * 0.7;
        const retreatY = this.npc.position.y + (this.npc.position.y - player.position.y) * 0.7;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        this.npc.targetPosition = {
          x: Math.min(width - 1, Math.max(0, retreatX)),
          y: Math.min(height - 1, Math.max(0, retreatY))
        };
        
        // If we've retreated enough or retreat cooldown is over, wait
        if (distanceToPlayer > this.detectionRadius || this.retreatCooldown <= 0) {
          this.currentState = HunterState.WAIT;
          this.waitTime = this.waitTimeMax;
        }
        break;
        
      case HunterState.WAIT:
        // Stay in place and wait
        this.waitTime -= deltaTime;
        
        // After waiting, resume hunting
        if (this.waitTime <= 0) {
          this.currentState = HunterState.HUNT;
        }
        
        // But if player is in monster form and nearby, immediately attack
        if (player && player.isMonster && distanceToPlayer < this.detectionRadius) {
          this.currentState = HunterState.ATTACK_MONSTER;
        }
        break;
    }
  }
  
  // Attack the player
  private attackPlayer(): void {
    this.attackCooldown = this.attackCooldownMax;
    
    // In a real game, this would apply damage to the player
    console.log(`Hunter ${this.npc.id} is attacking player!`);
    
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
