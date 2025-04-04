import { create } from 'zustand';
import { AIType } from '../ai/AITypes';

export interface AIBehaviorMetric {
  entityId: string;
  entityType: AIType;
  currentState: string;
  previousState: string | null;
  stateChangeCount: number;
  stateChangeHistory: { state: string; timestamp: number }[];
  decisionTime: number; // Time taken for AI to make a decision (ms)
  pathLength: number; // Current path length
  pathUpdateCount: number; // Number of path recalculations
  targetDistance: number; // Distance to current target
  playerDistance: number | null; // Distance to player (if relevant)
  lastUpdated: number; // Timestamp of last update
}

export interface PerformanceMetric {
  frameTime: number; // Time to process a frame (ms)
  fps: number; // Frames per second
  entityCount: number; // Total number of entities
  pathsRecalculated: number; // Number of paths recalculated in this frame
  visibleEntities: number; // Number of entities in view
  timestamp: number; // When this metric was recorded
}

export interface VisualizationOptions {
  showMetrics: boolean;
  showBehaviorStates: boolean;
  showPathfinding: boolean;
  showHeatmap: boolean;
  showDecisionTree: boolean;
  selectedEntityId: string | null;
  detailedView: boolean;
}

interface PerformanceState {
  // Performance metrics history (limited to last N frames)
  performanceHistory: PerformanceMetric[];
  maxHistoryLength: number;
  
  // Current performance stats
  currentPerformance: PerformanceMetric;
  
  // AI behavior metrics for each entity
  aiBehaviorMetrics: Record<string, AIBehaviorMetric>;
  
  // Visualization options
  visualizationOptions: VisualizationOptions;
  
  // Actions
  addPerformanceMetric: (metric: Partial<PerformanceMetric>) => void;
  updateEntityMetric: (entityId: string, metric: Partial<AIBehaviorMetric>) => void;
  toggleMetricsDisplay: () => void;
  toggleBehaviorStates: () => void;
  togglePathfinding: () => void;
  toggleHeatmap: () => void;
  toggleDecisionTree: () => void;
  selectEntity: (entityId: string | null) => void;
  toggleDetailedView: () => void;
  clearMetrics: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  performanceHistory: [],
  maxHistoryLength: 300, // Store 5 seconds at 60fps
  
  currentPerformance: {
    frameTime: 0,
    fps: 0,
    entityCount: 0,
    pathsRecalculated: 0,
    visibleEntities: 0,
    timestamp: Date.now()
  },
  
  aiBehaviorMetrics: {},
  
  visualizationOptions: {
    showMetrics: false,
    showBehaviorStates: false,
    showPathfinding: true, // On by default for backward compatibility
    showHeatmap: false,
    showDecisionTree: false,
    selectedEntityId: null,
    detailedView: false
  },
  
  addPerformanceMetric: (metric) => set((state) => {
    const newMetric = {
      ...state.currentPerformance,
      ...metric,
      timestamp: Date.now()
    };
    
    // Add to history and trim if needed
    let newHistory = [...state.performanceHistory, newMetric];
    if (newHistory.length > state.maxHistoryLength) {
      newHistory = newHistory.slice(newHistory.length - state.maxHistoryLength);
    }
    
    return {
      currentPerformance: newMetric,
      performanceHistory: newHistory
    };
  }),
  
  updateEntityMetric: (entityId, metric) => set((state) => {
    const existingMetric = state.aiBehaviorMetrics[entityId] || {
      entityId,
      entityType: AIType.SURVIVOR, // Default type
      currentState: '',
      previousState: null,
      stateChangeCount: 0,
      stateChangeHistory: [],
      decisionTime: 0,
      pathLength: 0,
      pathUpdateCount: 0,
      targetDistance: 0,
      playerDistance: null,
      lastUpdated: Date.now()
    };
    
    // Check if state has changed
    let stateChangeCount = existingMetric.stateChangeCount;
    let stateChangeHistory = [...existingMetric.stateChangeHistory];
    
    if (metric.currentState && 
        metric.currentState !== existingMetric.currentState) {
      stateChangeCount++;
      stateChangeHistory.push({
        state: metric.currentState,
        timestamp: Date.now()
      });
      
      // Keep only recent history (last 20 state changes)
      if (stateChangeHistory.length > 20) {
        stateChangeHistory = stateChangeHistory.slice(
          stateChangeHistory.length - 20
        );
      }
    }
    
    const updatedMetric = {
      ...existingMetric,
      ...metric,
      stateChangeCount,
      stateChangeHistory,
      previousState: existingMetric.currentState !== metric.currentState 
        ? existingMetric.currentState 
        : existingMetric.previousState,
      lastUpdated: Date.now()
    };
    
    return {
      aiBehaviorMetrics: {
        ...state.aiBehaviorMetrics,
        [entityId]: updatedMetric
      }
    };
  }),
  
  toggleMetricsDisplay: () => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      showMetrics: !state.visualizationOptions.showMetrics
    }
  })),
  
  toggleBehaviorStates: () => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      showBehaviorStates: !state.visualizationOptions.showBehaviorStates
    }
  })),
  
  togglePathfinding: () => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      showPathfinding: !state.visualizationOptions.showPathfinding
    }
  })),
  
  toggleHeatmap: () => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      showHeatmap: !state.visualizationOptions.showHeatmap
    }
  })),
  
  toggleDecisionTree: () => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      showDecisionTree: !state.visualizationOptions.showDecisionTree
    }
  })),
  
  selectEntity: (entityId) => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      selectedEntityId: entityId
    }
  })),
  
  toggleDetailedView: () => set((state) => ({
    visualizationOptions: {
      ...state.visualizationOptions,
      detailedView: !state.visualizationOptions.detailedView
    }
  })),
  
  clearMetrics: () => set({
    performanceHistory: [],
    aiBehaviorMetrics: {}
  })
}));