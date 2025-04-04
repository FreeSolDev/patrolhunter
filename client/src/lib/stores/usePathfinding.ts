import { create } from "zustand";
import { GridPosition, PathData } from "../types";

interface PathfindingState {
  // Visualization data
  openSet: GridPosition[];
  closedSet: GridPosition[];
  currentPaths: PathData[];
  
  // Actions
  setOpenSet: (openSet: GridPosition[]) => void;
  setClosedSet: (closedSet: GridPosition[]) => void;
  addCurrentPath: (pathData: PathData) => void;
  clearPathData: (entityId: string) => void;
  clearAllPaths: () => void;
}

export const usePathfinding = create<PathfindingState>((set) => ({
  openSet: [],
  closedSet: [],
  currentPaths: [],
  
  setOpenSet: (openSet) => set({ openSet }),
  
  setClosedSet: (closedSet) => set({ closedSet }),
  
  addCurrentPath: (pathData) => set((state) => {
    // Remove any existing path for this entity
    const filteredPaths = state.currentPaths.filter(
      (p) => p.entityId !== pathData.entityId
    );
    
    // Add the new path
    return {
      currentPaths: [...filteredPaths, pathData]
    };
  }),
  
  clearPathData: (entityId) => set((state) => ({
    currentPaths: state.currentPaths.filter((p) => p.entityId !== entityId)
  })),
  
  clearAllPaths: () => set({
    openSet: [],
    closedSet: [],
    currentPaths: []
  })
}));
