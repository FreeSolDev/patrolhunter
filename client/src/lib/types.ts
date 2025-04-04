import { AIType } from "./ai/AITypes";

// Position in the grid
export interface GridPosition {
  x: number;
  y: number;
}

// Size of the grid
export interface GridSize {
  width: number;
  height: number;
}

// Player entity
export interface Player {
  position: GridPosition;
  pixelPosition?: {
    x: number;
    y: number;
  };
  isMonster: boolean;
  speed: number;
}

// Non-player character
export interface NPC {
  id: string;
  position: GridPosition;
  pixelPosition: {
    x: number;
    y: number;
  };
  type: AIType;
  targetPosition: GridPosition;
  speed: number;
  groupId?: number; // For coordinated behaviors
  currentState: string;
  isMoving: boolean;
  currentPathIndex?: number;
}

// Pathfinding visualization data
export interface PathData {
  entityId: string;
  path: GridPosition[];
  color: string;
}

// Input controls
export interface Controls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  transform: boolean;
  debug: boolean;
}
