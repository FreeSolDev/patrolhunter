import { StateMachine } from "../StateMachine";
import { MerchantState, AIType } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";
import { hasLineOfSight, distanceBetween } from "../../utils";

/**
 * Merchant behavior implementation
 * - Travels between various hotspots on the map
 * - Wanders within a hotspot area before moving to the next
 * - Can alert nearby guards when it detects a threat (monster player)
 * - Flees from danger for self-preservation
 */
export class MerchantBehavior implements StateMachine {
  private npc: NPC;
  private currentState: MerchantState;
  
  // Trading hotspots - locations where the merchant will stay and trade
  private hotspots: GridPosition[] = [];
  private currentHotspotIndex: number = 0;
  
  // Timers for state transitions
  private tradeTime: number = 0;
  private tradeTimeMax: number = 20; // Seconds to spend at a hotspot
  private wanderTime: number = 0;
  private wanderTimeMax: number = 3; // Seconds to wander before choosing a new spot
  private wanderRadius: number = 3; // Max distance to wander from hotspot center
  
  // Threat detection
  private detectionRadius: number = 7; // Distance at which merchant can detect danger
  private fearRadius: number = 5; // Distance that causes immediate fear reaction
  private lastKnownThreatPosition: GridPosition | null = null;
  private timeWithoutVisual: number = 0;
  private maxTimeWithoutVisual: number = 4; // Time before forgetting a threat
  
  // Guard coordination
  private hasAlertedGuards: boolean = false;
  private alertCooldown: number = 0;
  private alertCooldownMax: number = 10; // Cooldown before alerting guards again
  
  constructor(npc: NPC) {
    this.npc = npc;
    this.currentState = MerchantState.TRAVEL;
    this.initializeHotspots();
    this.setInitialDestination();
  }
  
  /**
   * Initialize the trading hotspots on the map
   */
  private initializeHotspots(): void {
    const { width, height } = useGridStore.getState().gridSize;
    
    // Create hotspots at interesting locations around the map
    this.hotspots = [
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25) }, // Top-left quadrant
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.25) }, // Top-right quadrant
      { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },   // Center
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.75) }, // Bottom-left quadrant
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.75) }  // Bottom-right quadrant
    ];
    
    // Randomize starting hotspot
    this.currentHotspotIndex = Math.floor(Math.random() * this.hotspots.length);
  }
  
  /**
   * Set the initial destination for the merchant
   */
  private setInitialDestination(): void {
    this.npc.targetPosition = { ...this.hotspots[this.currentHotspotIndex] };
  }
  
  /**
   * Update the merchant behavior state
   */
  update(deltaTime: number): void {
    // Update timers
    this.tradeTime = Math.max(0, this.tradeTime - deltaTime);
    this.wanderTime = Math.max(0, this.wanderTime - deltaTime);
    this.alertCooldown = Math.max(0, this.alertCooldown - deltaTime);
    
    // Get player entity
    const player = useEntityStore.getState().player;
    
    // Calculate distance to player if exists
    const distanceToPlayer = player ? 
      distanceBetween(this.npc.position, player.position) : Infinity;
    
    // Check for threat (player in monster form)
    const playerIsThreat = player && player.isMonster;
    
    // Check line of sight to player
    const hasVisualOnPlayer = player && 
                             distanceToPlayer < this.detectionRadius && 
                             hasLineOfSight(this.npc.position, player.position);
    
    // Update threat tracking
    if (hasVisualOnPlayer && playerIsThreat) {
      this.timeWithoutVisual = 0;
      this.lastKnownThreatPosition = { ...player.position };
    } else if (this.lastKnownThreatPosition) {
      this.timeWithoutVisual += deltaTime;
      
      // Forget threat after some time without visual
      if (this.timeWithoutVisual >= this.maxTimeWithoutVisual) {
        this.lastKnownThreatPosition = null;
      }
    }
    
    // Handle immediate danger - player in monster form is close
    if (playerIsThreat && distanceToPlayer <= this.fearRadius && hasVisualOnPlayer) {
      // If currently alerting guards, continue doing that
      if (this.currentState !== MerchantState.ALERT_GUARDS) {
        // If no guards are nearby or already alerted, flee
        if (this.findNearestGuard() === null || this.hasAlertedGuards) {
          this.currentState = MerchantState.FLEE;
        } else if (!this.hasAlertedGuards) {
          this.currentState = MerchantState.ALERT_GUARDS;
        }
      }
    }
    
    // Process based on current state
    switch (this.currentState) {
      case MerchantState.TRAVEL:
        // Set destination to current hotspot
        this.npc.targetPosition = { ...this.hotspots[this.currentHotspotIndex] };
        
        // Check if we've reached the current hotspot
        const distToHotspot = this.distanceTo(this.npc.targetPosition);
        if (distToHotspot < 0.5) {
          // Start trading at this hotspot
          this.currentState = MerchantState.TRADE;
          this.tradeTime = this.tradeTimeMax;
        }
        
        // If we detect threat but it's not immediate danger, alert guards
        if (playerIsThreat && hasVisualOnPlayer && !this.hasAlertedGuards && this.alertCooldown <= 0) {
          const nearestGuard = this.findNearestGuard();
          if (nearestGuard !== null) {
            this.currentState = MerchantState.ALERT_GUARDS;
          }
        }
        break;
        
      case MerchantState.TRADE:
        // Stay at hotspot for a duration, then start wandering
        if (this.tradeTime <= 0) {
          this.currentState = MerchantState.WANDER;
          this.wanderTime = this.wanderTimeMax;
          this.setWanderTarget();
        }
        
        // If threat detected, react appropriately
        if (playerIsThreat && hasVisualOnPlayer) {
          // If close, handle immediate danger
          if (distanceToPlayer <= this.fearRadius) {
            const nearestGuard = this.findNearestGuard();
            if (nearestGuard !== null && !this.hasAlertedGuards && this.alertCooldown <= 0) {
              this.currentState = MerchantState.ALERT_GUARDS;
            } else {
              this.currentState = MerchantState.FLEE;
            }
          }
        }
        break;
        
      case MerchantState.WANDER:
        // When wander time expires, select a new wander target or move to next hotspot
        if (this.wanderTime <= 0) {
          // Randomly decide to keep wandering or move to next hotspot
          if (Math.random() < 0.3 || this.tradeTime > 0) {
            // Continue wandering at current hotspot
            this.wanderTime = this.wanderTimeMax;
            this.setWanderTarget();
          } else {
            // Move to next hotspot
            this.currentHotspotIndex = (this.currentHotspotIndex + 1) % this.hotspots.length;
            this.currentState = MerchantState.TRAVEL;
          }
        }
        
        // Check if we've reached the wander target
        const distToWanderTarget = this.distanceTo(this.npc.targetPosition);
        if (distToWanderTarget < 0.5) {
          // Set new wander target
          this.setWanderTarget();
          this.wanderTime = this.wanderTimeMax;
        }
        
        // If threat detected, react appropriately
        if (playerIsThreat && hasVisualOnPlayer) {
          // If close, prioritize safety
          if (distanceToPlayer <= this.fearRadius) {
            const nearestGuard = this.findNearestGuard();
            if (nearestGuard !== null && !this.hasAlertedGuards && this.alertCooldown <= 0) {
              this.currentState = MerchantState.ALERT_GUARDS;
            } else {
              this.currentState = MerchantState.FLEE;
            }
          }
        }
        break;
        
      case MerchantState.ALERT_GUARDS:
        // Find the nearest guard to alert
        const nearestGuard = this.findNearestGuard();
        
        if (nearestGuard === null) {
          // No guards to alert, flee instead
          this.currentState = MerchantState.FLEE;
          break;
        }
        
        // Set target position to the guard's position
        this.npc.targetPosition = { ...nearestGuard.position };
        
        // Check if we've reached the guard
        const distToGuard = this.distanceTo(this.npc.targetPosition);
        if (distToGuard < 1.5) {
          // Alert the guard (this would trigger the guard's behavior in a real implementation)
          console.log(`Merchant ${this.npc.id} is alerting guard ${nearestGuard.id} about a threat!`);
          
          // Mark that we've alerted guards
          this.hasAlertedGuards = true;
          this.alertCooldown = this.alertCooldownMax;
          
          // If threat is still present, flee
          if (this.lastKnownThreatPosition !== null) {
            this.currentState = MerchantState.FLEE;
          } else {
            // Return to previous activity
            this.currentState = MerchantState.TRAVEL;
          }
        }
        
        // If player is very close, abort alerting and just flee
        if (playerIsThreat && hasVisualOnPlayer && distanceToPlayer <= 2) {
          this.currentState = MerchantState.FLEE;
        }
        break;
        
      case MerchantState.FLEE:
        if (!this.lastKnownThreatPosition) {
          // No known threat, return to normal activities
          this.currentState = MerchantState.TRAVEL;
          break;
        }
        
        // Calculate flee direction (away from threat)
        const fleeDirection = {
          x: this.npc.position.x - this.lastKnownThreatPosition.x,
          y: this.npc.position.y - this.lastKnownThreatPosition.y
        };
        
        // Normalize direction and set flee distance
        const length = Math.sqrt(fleeDirection.x * fleeDirection.x + fleeDirection.y * fleeDirection.y);
        if (length > 0) {
          fleeDirection.x /= length;
          fleeDirection.y /= length;
        }
        
        const fleeDistance = 8; // Distance to flee
        
        // Calculate flee target position
        let fleeX = this.npc.position.x + fleeDirection.x * fleeDistance;
        let fleeY = this.npc.position.y + fleeDirection.y * fleeDistance;
        
        // Clamp to grid boundaries
        const { width, height } = useGridStore.getState().gridSize;
        fleeX = Math.min(width - 1, Math.max(0, fleeX));
        fleeY = Math.min(height - 1, Math.max(0, fleeY));
        
        this.npc.targetPosition = { x: fleeX, y: fleeY };
        
        // Check if we've reached a safe distance
        const distToThreat = this.lastKnownThreatPosition ? 
          distanceBetween(this.npc.position, this.lastKnownThreatPosition) : Infinity;
        
        if (distToThreat > this.detectionRadius + 3) {
          // We're far enough, go back to traveling
          this.currentState = MerchantState.TRAVEL;
          
          // Reset alert state after some time
          if (!hasVisualOnPlayer && this.timeWithoutVisual >= this.maxTimeWithoutVisual) {
            this.hasAlertedGuards = false;
            this.lastKnownThreatPosition = null;
          }
        }
        break;
    }
  }
  
  /**
   * Set a random wander target around the current hotspot
   */
  private setWanderTarget(): void {
    const currentHotspot = this.hotspots[this.currentHotspotIndex];
    const { width, height } = useGridStore.getState().gridSize;
    
    // Calculate random offset within wander radius
    const offsetX = (Math.random() * 2 - 1) * this.wanderRadius;
    const offsetY = (Math.random() * 2 - 1) * this.wanderRadius;
    
    // Calculate new target position and clamp to grid boundaries
    const targetX = Math.min(width - 1, Math.max(0, currentHotspot.x + offsetX));
    const targetY = Math.min(height - 1, Math.max(0, currentHotspot.y + offsetY));
    
    this.npc.targetPosition = { x: targetX, y: targetY };
  }
  
  /**
   * Find the nearest guard to alert
   */
  private findNearestGuard(): NPC | null {
    const npcs = useEntityStore.getState().npcs;
    
    // Filter to only guard NPCs
    const guards = npcs.filter(npc => npc.type === AIType.GUARD);
    if (guards.length === 0) return null;
    
    // Find the closest guard
    let closestGuard: NPC | null = null;
    let closestDistance = Infinity;
    
    for (const guard of guards) {
      const distance = distanceBetween(this.npc.position, guard.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestGuard = guard;
      }
    }
    
    return closestGuard;
  }
  
  /**
   * Calculate distance to a position
   */
  private distanceTo(position: GridPosition): number {
    return Math.sqrt(
      Math.pow(this.npc.position.x - position.x, 2) +
      Math.pow(this.npc.position.y - position.y, 2)
    );
  }
  
  /**
   * Get current state name
   */
  getCurrentState(): string {
    return this.currentState;
  }
}