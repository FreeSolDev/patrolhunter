import { StateMachine } from "../StateMachine";
import { MerchantState, AIType } from "../AITypes";
import { GridPosition, NPC } from "../../types";
import { useEntityStore } from "../../stores/useEntityStore";
import { useGridStore } from "../../stores/useGridStore";
import { hasLineOfSight, distanceBetween } from "../../utils";

// Helper function to check if a position is valid (in bounds and walkable)
const isValidPosition = (pos: GridPosition): boolean => {
  const { grid } = useGridStore.getState();
  
  if (!grid || grid.length === 0) return false;
  
  // Check position values are valid numbers and within reasonable range
  if (
    !pos || 
    !Number.isFinite(pos.x) || 
    !Number.isFinite(pos.y) ||
    Math.abs(pos.x) > 10000 ||  // Sanity check for extremely large values
    Math.abs(pos.y) > 10000
  ) {
    return false;
  }
  
  // Round positions to handle decimal values
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  
  try {
    // Check grid bounds and walkability
    return (
      x >= 0 && 
      x < grid[0].length &&
      y >= 0 && 
      y < grid.length &&
      grid[y][x] // Check if the tile is walkable
    );
  } catch (error) {
    console.error("Error checking valid position:", error);
    return false;
  }
};

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
  
  // Stuck detection
  private lastPosition: GridPosition = { x: 0, y: 0 };
  private stuckTime: number = 0;
  private stuckThreshold: number = 3; // If we don't move for 3 seconds, consider stuck
  
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
    this.lastPosition = { ...npc.position }; // Initialize last position for stuck detection
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
        {
          // Set destination to current hotspot
          const targetHotspot = this.hotspots[this.currentHotspotIndex];
          
          // Validate the target position
          if (!isValidPosition(targetHotspot)) {
            console.log(`Invalid hotspot target for merchant ${this.npc.id}, finding alternative`);
            
            // Try to find a valid position nearby
            const validPos = this.findValidPositionNear(targetHotspot);
            if (validPos) {
              this.npc.targetPosition = validPos;
            } else {
              // If we can't find a valid position, move to the next hotspot and update logic
              this.currentHotspotIndex = (this.currentHotspotIndex + 1) % this.hotspots.length;
              this.currentState = MerchantState.TRAVEL; // Re-trigger TRAVEL state evaluation in next update
            }
          } else {
            this.npc.targetPosition = { ...targetHotspot };
          }
        }
        
        // Check if we're stuck - if we haven't moved in a while
        if (this.isStuck()) {
          console.log(`Merchant ${this.npc.id} is stuck, trying next hotspot`);
          this.currentHotspotIndex = (this.currentHotspotIndex + 1) % this.hotspots.length;
          break;
        }
        
        // Check if we've reached the current hotspot
        const distToHotspot = this.distanceTo(this.npc.targetPosition);
        if (distToHotspot < 0.5) {
          // Start trading at this hotspot
          this.currentState = MerchantState.TRADE;
          this.tradeTime = this.tradeTimeMax;
          // Reset stuck detection since we reached our destination
          this.clearStuckDetection();
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
    
    // Try up to 5 times to find a valid wander position
    for (let attempts = 0; attempts < 5; attempts++) {
      // Calculate random offset within wander radius
      const offsetX = (Math.random() * 2 - 1) * this.wanderRadius;
      const offsetY = (Math.random() * 2 - 1) * this.wanderRadius;
      
      // Calculate new target position and clamp to grid boundaries
      const targetX = Math.min(width - 1, Math.max(0, currentHotspot.x + offsetX));
      const targetY = Math.min(height - 1, Math.max(0, currentHotspot.y + offsetY));
      
      // Test if this is a valid position
      if (isValidPosition({ x: targetX, y: targetY })) {
        this.npc.targetPosition = { x: targetX, y: targetY };
        return;
      }
    }
    
    // If we can't find a valid random position, try to find any valid position nearby
    const validPos = this.findValidPositionNear(currentHotspot);
    if (validPos) {
      this.npc.targetPosition = validPos;
    } else {
      // If we still can't find a valid position, just stay put
      this.npc.targetPosition = { ...this.npc.position };
      
      // Force a state change to try a different hotspot
      this.currentHotspotIndex = (this.currentHotspotIndex + 1) % this.hotspots.length;
      this.currentState = MerchantState.TRAVEL;
    }
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
   * Check if the NPC is stuck
   */
  private isStuck(): boolean {
    // Update stuck detection
    const distanceMoved = distanceBetween(this.npc.position, this.lastPosition);
    
    if (distanceMoved < 0.05) {
      // We're not moving, increment stuck time
      this.stuckTime += 0.1; // Add a small increment
      
      if (this.stuckTime >= this.stuckThreshold) {
        // We've been stuck too long, take action
        this.clearStuckDetection();
        return true;
      }
    } else {
      // We're moving, reset stuck time
      this.clearStuckDetection();
    }
    
    // Update last position for next check
    this.lastPosition = { ...this.npc.position };
    
    return false;
  }
  
  /**
   * Clear stuck detection state
   */
  private clearStuckDetection(): void {
    this.stuckTime = 0;
    this.lastPosition = { ...this.npc.position };
  }
  
  /**
   * Find a valid walkable position near the given position
   */
  private findValidPositionNear(pos: GridPosition): GridPosition | null {
    // Check if the input position itself is valid and finite
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      console.log(`Cannot find valid position near invalid position: ${JSON.stringify(pos)}`);
      
      // Use a fallback position in the center of the map
      const { width, height } = useGridStore.getState().gridSize;
      pos = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    }
    
    const { width, height } = useGridStore.getState().gridSize;
    const searchRadius = 5; // How far to search for a valid position
    
    try {
      // Round the starting position to ensure we're working with integers
      const startX = Math.round(Math.min(width - 1, Math.max(0, pos.x)));
      const startY = Math.round(Math.min(height - 1, Math.max(0, pos.y)));
      
      // First check if the starting position (after clamping) is valid
      if (isValidPosition({ x: startX, y: startY })) {
        return { x: startX, y: startY };
      }
      
      // Try positions in increasing distance from the target
      for (let radius = 1; radius <= searchRadius; radius++) {
        for (let offsetX = -radius; offsetX <= radius; offsetX++) {
          for (let offsetY = -radius; offsetY <= radius; offsetY++) {
            // Skip positions that aren't on the radius boundary
            if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) continue;
            
            const testX = Math.round(startX + offsetX);
            const testY = Math.round(startY + offsetY);
            
            // Make sure we're within grid bounds
            if (testX < 0 || testX >= width || testY < 0 || testY >= height) continue;
            
            // Check if this position is valid/walkable
            if (isValidPosition({ x: testX, y: testY })) {
              return { x: testX, y: testY };
            }
          }
        }
      }
      
      // If we can't find a valid position nearby, try a last resort - the center of the map
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      
      if (isValidPosition({ x: centerX, y: centerY })) {
        console.log(`Using center position (${centerX}, ${centerY}) as last resort for NPC ${this.npc.id}`);
        return { x: centerX, y: centerY };
      }
      
      // Couldn't find any valid position
      return null;
    } catch (error) {
      console.error("Error finding valid position:", error);
      return null;
    }
  }
  
  /**
   * Get current state name
   */
  getCurrentState(): string {
    return this.currentState;
  }
}