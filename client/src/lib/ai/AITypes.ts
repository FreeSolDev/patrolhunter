// Define AI types for different NPC behaviors
export enum AIType {
  GUARD = "GUARD",       // Type 1: Guard that patrols and coordinates attacks
  HUNTER = "HUNTER",     // Type 2: Monster hunter with different behaviors based on player form
  SURVIVOR = "SURVIVOR"  // Type 3: Self-preserving AI focused on survival
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
