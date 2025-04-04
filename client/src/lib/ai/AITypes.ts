// Define AI types for different NPC behaviors
export enum AIType {
  GUARD = "GUARD",       // Type 1: Guard that patrols and coordinates attacks
  HUNTER = "HUNTER",     // Type 2: Monster hunter with different behaviors based on player form
  SURVIVOR = "SURVIVOR", // Type 3: Self-preserving AI focused on survival
  PRESERVER = "PRESERVER", // Type 4: Life preserver ring attacker that does hit-and-run tactics
  MERCHANT = "MERCHANT"  // Type 5: Merchant that moves between trading hotspots, alerts guards, can flee
}

// Define AI states for Guard behavior
export enum GuardState {
  PATROL = "Patrol",       // Moving between patrol points
  INVESTIGATE = "Investigate", // Investigate suspicious activity
  ATTACK = "Attack",       // Attack monster
  RETREAT = "Retreat",     // Retreat from danger
  COORDINATE = "Coordinate" // Coordinate with other guards
}

// Define AI states for Hunter behavior
export enum HunterState {
  HUNT = "Hunt",         // Hunt for targets
  ATTACK_MONSTER = "Attack Monster", // Attack monster form
  ATTACK_HUMAN = "Attack Human",   // Attack human form
  RETREAT = "Retreat",   // Retreat when necessary
  WAIT = "Wait"          // Wait at a position
}

// Define AI states for Survivor behavior
export enum SurvivorState {
  WANDER = "Wander",     // Wander around area
  FLEE = "Flee",         // Flee from danger
  HIDE = "Hide",         // Hide from threats
  SEEK_SAFETY = "Seek Safety" // Seek safer locations
}

// Define AI states for Life Preserver Ring attacker behavior
export enum PreserverState {
  PATROL = "Patrol",     // Move around looking for targets
  APPROACH = "Approach", // Approach target for attack
  ATTACK = "Attack",     // Attack target
  RETREAT = "Retreat",   // Retreat after attack
  REPOSITION = "Reposition" // Move to a new attack position
}

// Define AI states for Merchant behavior
export enum MerchantState {
  TRAVEL = "Travel",       // Traveling between hotspots
  TRADE = "Trade",         // Trading at a hotspot location
  ALERT_GUARDS = "Alert Guards", // Running to guards to alert about a threat
  FLEE = "Flee",           // Fleeing from danger
  WANDER = "Wander"        // Wandering around a hotspot area
}
