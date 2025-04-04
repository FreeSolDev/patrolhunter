import { create } from "zustand";
import { Player, NPC, GridPosition, Controls } from "../types";
import { AIType } from "../ai/AITypes";
import { nanoid } from "nanoid";
import { AIController } from "../ai/AIController";

interface EntityState {
  // Entities
  player: Player | null;
  npcs: NPC[];
  npcControllers: Map<string, AIController>;
  
  // Actions
  createPlayer: (playerData: Partial<Player>) => void;
  updatePlayer: (controls: Controls, deltaTime: number) => void;
  initializeNPCs: (npcDataArray: Partial<NPC>[]) => void;
  getNPCById: (id: string) => NPC | undefined;
  updateNPCs: (deltaTime: number) => void;
  updateNPCTarget: (id: string, targetPosition: GridPosition) => void;
}

export const useEntityStore = create<EntityState>((set, get) => ({
  player: null,
  npcs: [],
  npcControllers: new Map(),
  
  createPlayer: (playerData) => {
    const position = playerData.position || { x: 0, y: 0 };
    const TILE_SIZE = 30; // Same as in Game.tsx
    
    set({
      player: {
        position: position,
        pixelPosition: {
          x: position.x * TILE_SIZE,
          y: position.y * TILE_SIZE
        },
        isMonster: playerData.isMonster || false,
        speed: 5 // Default speed
      }
    });
  },
  
  updatePlayer: (controls, deltaTime) => set((state) => {
    if (!state.player) return {};
    
    const { up, down, left, right, transform } = controls;
    const player = { ...state.player };
    const TILE_SIZE = 30; // Same as in Game.tsx
    
    // Use pixel-based movement for player too
    if (!player.pixelPosition) {
      player.pixelPosition = {
        x: player.position.x * TILE_SIZE,
        y: player.position.y * TILE_SIZE
      };
    }
    
    // Pixel speed (pixels per second)
    const pixelSpeed = player.speed * TILE_SIZE * deltaTime;
    
    // Movement
    if (up) player.pixelPosition.y -= pixelSpeed;
    if (down) player.pixelPosition.y += pixelSpeed;
    if (left) player.pixelPosition.x -= pixelSpeed;
    if (right) player.pixelPosition.x += pixelSpeed;
    
    // Update grid position based on pixel position
    player.position.x = player.pixelPosition.x / TILE_SIZE;
    player.position.y = player.pixelPosition.y / TILE_SIZE;
    
    // Transform (toggle between human and monster)
    if (transform) {
      // Only toggle on key press, not hold
      if (!state.player.isMonster) {
        player.isMonster = true;
      } else {
        player.isMonster = false;
      }
    }
    
    // Clamp to grid boundaries (in pixels)
    const { width, height } = useGridStore.getState().gridSize;
    const maxPixelX = (width - 1) * TILE_SIZE;
    const maxPixelY = (height - 1) * TILE_SIZE;
    
    player.pixelPosition.x = Math.max(0, Math.min(maxPixelX, player.pixelPosition.x));
    player.pixelPosition.y = Math.max(0, Math.min(maxPixelY, player.pixelPosition.y));
    
    // Update grid position after clamping
    player.position.x = player.pixelPosition.x / TILE_SIZE;
    player.position.y = player.pixelPosition.y / TILE_SIZE;
    
    return { player };
  }),
  
  initializeNPCs: (npcDataArray) => {
    const npcs: NPC[] = [];
    const npcControllers = new Map<string, AIController>();
    
    for (const npcData of npcDataArray) {
      const id = nanoid();
      const position = npcData.position || { x: 0, y: 0 };
      const npc: NPC = {
        id,
        position: position,
        pixelPosition: {
          x: position.x * 30, // Convert to pixel position (30 = TILE_SIZE)
          y: position.y * 30  // Convert to pixel position
        },
        type: npcData.type || AIType.SURVIVOR,
        targetPosition: npcData.position || { x: 0, y: 0 },
        speed: 3, // Default speed
        groupId: npcData.groupId,
        currentState: "Initializing",
        isMoving: false,
        currentPathIndex: 0
      };
      
      npcs.push(npc);
      
      // Create AI controller for this NPC
      const controller = new AIController(npc);
      npcControllers.set(id, controller);
    }
    
    set({ npcs, npcControllers });
  },
  
  getNPCById: (id) => {
    return get().npcs.find(npc => npc.id === id);
  },
  
  updateNPCs: (deltaTime) => set((state) => {
    const { npcControllers } = state;
    const updatedNPCs = [...state.npcs];
    
    // Update each NPC using its AI controller
    for (let i = 0; i < updatedNPCs.length; i++) {
      const npc = updatedNPCs[i];
      const controller = npcControllers.get(npc.id);
      
      if (controller) {
        // Update AI logic
        controller.update(deltaTime);
        
        // Update current state for display
        npc.currentState = controller.getCurrentState();
      }
    }
    
    return { npcs: updatedNPCs };
  }),
  
  updateNPCTarget: (id, targetPosition) => set((state) => {
    const updatedNPCs = state.npcs.map(npc => {
      if (npc.id === id) {
        return { ...npc, targetPosition };
      }
      return npc;
    });
    
    return { npcs: updatedNPCs };
  })
}));

// Import grid store for boundary checking
import { useGridStore } from "./useGridStore";
