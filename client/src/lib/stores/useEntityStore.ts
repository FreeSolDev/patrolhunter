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
  
  createPlayer: (playerData) => set({
    player: {
      position: playerData.position || { x: 0, y: 0 },
      isMonster: playerData.isMonster || false,
      speed: 5 // Default speed
    }
  }),
  
  updatePlayer: (controls, deltaTime) => set((state) => {
    if (!state.player) return {};
    
    const { up, down, left, right, transform } = controls;
    const player = { ...state.player };
    const moveDistance = player.speed * deltaTime;
    
    // Movement
    if (up) player.position.y -= moveDistance;
    if (down) player.position.y += moveDistance;
    if (left) player.position.x -= moveDistance;
    if (right) player.position.x += moveDistance;
    
    // Transform (toggle between human and monster)
    if (transform) {
      // Only toggle on key press, not hold
      if (!state.player.isMonster) {
        player.isMonster = true;
      } else {
        player.isMonster = false;
      }
    }
    
    // Clamp to grid boundaries
    const { width, height } = useGridStore.getState().gridSize;
    player.position.x = Math.max(0, Math.min(width - 1, player.position.x));
    player.position.y = Math.max(0, Math.min(height - 1, player.position.y));
    
    return { player };
  }),
  
  initializeNPCs: (npcDataArray) => {
    const npcs: NPC[] = [];
    const npcControllers = new Map<string, AIController>();
    
    for (const npcData of npcDataArray) {
      const id = nanoid();
      const npc: NPC = {
        id,
        position: npcData.position || { x: 0, y: 0 },
        type: npcData.type || AIType.SURVIVOR,
        targetPosition: npcData.position || { x: 0, y: 0 },
        speed: 3, // Default speed
        groupId: npcData.groupId,
        currentState: "Initializing"
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
