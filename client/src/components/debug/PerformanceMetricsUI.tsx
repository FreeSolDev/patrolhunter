import React from 'react';
import { usePerformanceStore } from '../../lib/stores/usePerformanceStore';
import { AIType } from '../../lib/ai/AITypes';

// Colors for different AI types
const AI_TYPE_COLORS = {
  [AIType.GUARD]: '#00AA55',
  [AIType.HUNTER]: '#FF5500',
  [AIType.SURVIVOR]: '#AAAAFF',
  [AIType.PRESERVER]: '#FF00FF',
  [AIType.MERCHANT]: '#FFDD00',
};

// Styles using inline CSS for simplicity
const styles = {
  container: {
    position: 'absolute' as 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    fontFamily: 'monospace',
    fontSize: '12px',
    maxWidth: '300px',
    maxHeight: '80vh',
    overflowY: 'auto' as 'auto',
    zIndex: 100,
  },
  header: {
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: 'bold' as 'bold',
  },
  row: {
    display: 'flex' as 'flex',
    justifyContent: 'space-between' as 'space-between',
    marginBottom: '5px',
  },
  section: {
    marginBottom: '15px',
    padding: '5px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
  },
  controls: {
    display: 'flex' as 'flex',
    gap: '8px',
    marginBottom: '10px',
  },
  button: {
    backgroundColor: '#4CAF50',
    border: 'none',
    color: 'white',
    padding: '5px 10px',
    textAlign: 'center' as 'center',
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '12px',
    cursor: 'pointer' as 'pointer',
    borderRadius: '4px',
    transition: '0.3s',
  },
  activeButton: {
    backgroundColor: '#45a049',
    boxShadow: '0 0 5px rgba(69, 160, 73, 0.7)',
  },
  entityList: {
    marginTop: '10px',
    maxHeight: '200px',
    overflowY: 'auto' as 'auto',
  },
  entityItem: {
    padding: '3px',
    marginBottom: '2px',
    cursor: 'pointer' as 'pointer',
    borderRadius: '2px',
    display: 'flex' as 'flex',
    justifyContent: 'space-between' as 'space-between',
  },
  stateHistory: {
    marginTop: '5px',
    padding: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '3px',
  },
  stateItem: {
    padding: '2px',
    display: 'flex' as 'flex',
    justifyContent: 'space-between' as 'space-between',
  },
  heatmapCanvas: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none' as 'none',
    zIndex: 10,
  },
  sparkline: {
    display: 'inline-block',
    height: '20px',
    width: '100px',
    marginLeft: '5px',
  },
  tooltip: {
    position: 'absolute' as 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '5px',
    borderRadius: '3px',
    fontSize: '10px',
    zIndex: 1000,
    pointerEvents: 'none' as 'none',
  },
};

const PerformanceMetricsUI: React.FC = () => {
  const {
    currentPerformance,
    performanceHistory,
    aiBehaviorMetrics,
    visualizationOptions,
    toggleMetricsDisplay,
    toggleBehaviorStates,
    togglePathfinding,
    toggleHeatmap,
    toggleDecisionTree,
    selectEntity,
    toggleDetailedView,
  } = usePerformanceStore();

  // Refs for visualizations
  const heatmapCanvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // Track whether the component is visible/mounted
  const [isMounted, setIsMounted] = React.useState(true);

  // Toggle button handler
  const handleToggleButton = (toggleFn: () => void) => {
    toggleFn();
  };

  // Select entity handler
  const handleSelectEntity = (entityId: string) => {
    selectEntity(entityId === visualizationOptions.selectedEntityId ? null : entityId);
  };

  // Format time in ms with 2 decimal places
  const formatTime = (time: number) => {
    return `${time.toFixed(2)}ms`;
  };

  // Calculate a color for metric visualization (green to red)
  const getMetricColor = (value: number, min: number, max: number) => {
    const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
    return `rgb(${Math.round(ratio * 255)}, ${Math.round((1 - ratio) * 255)}, 0)`;
  };

  // Create a mini sparkline visualization for FPS or other metrics
  const renderSparkline = (data: number[], min: number, max: number, width = 100, height = 20) => {
    if (data.length === 0) return null;
    
    const sparklineData = data.slice(-width);
    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * width;
      const y = height - ((value - min) / (max - min)) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} style={styles.sparkline}>
        <polyline
          points={points}
          stroke="#4CAF50"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    );
  };

  // If metrics should not be shown, render nothing
  if (!visualizationOptions.showMetrics || !isMounted) return null;

  // Get FPS data for sparkline
  const fpsData = performanceHistory.map(p => p.fps);
  const frameTimeData = performanceHistory.map(p => p.frameTime);

  // Get entity data
  const entities = Object.values(aiBehaviorMetrics);
  const selectedEntity = visualizationOptions.selectedEntityId 
    ? aiBehaviorMetrics[visualizationOptions.selectedEntityId] 
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>Performance &amp; AI Metrics</div>
      
      <div style={styles.controls}>
        <button 
          style={{
            ...styles.button,
            ...(visualizationOptions.showBehaviorStates ? styles.activeButton : {})
          }}
          onClick={() => handleToggleButton(toggleBehaviorStates)}
        >
          AI States
        </button>
        <button 
          style={{
            ...styles.button,
            ...(visualizationOptions.showPathfinding ? styles.activeButton : {})
          }}
          onClick={() => handleToggleButton(togglePathfinding)}
        >
          Paths
        </button>
        <button 
          style={{
            ...styles.button,
            ...(visualizationOptions.showHeatmap ? styles.activeButton : {})
          }}
          onClick={() => handleToggleButton(toggleHeatmap)}
        >
          Heatmap
        </button>
        <button 
          style={{
            ...styles.button,
            ...(visualizationOptions.showDecisionTree ? styles.activeButton : {})
          }}
          onClick={() => handleToggleButton(toggleDecisionTree)}
        >
          Decision Tree
        </button>
      </div>
      
      <div style={styles.section}>
        <div style={styles.row}>
          <span>FPS:</span>
          <span>{currentPerformance.fps.toFixed(1)}</span>
          {renderSparkline(fpsData, 0, 60)}
        </div>
        <div style={styles.row}>
          <span>Frame time:</span>
          <span>{formatTime(currentPerformance.frameTime)}</span>
          {renderSparkline(frameTimeData, 0, 50)}
        </div>
        <div style={styles.row}>
          <span>Entities:</span>
          <span>{currentPerformance.entityCount}</span>
        </div>
        <div style={styles.row}>
          <span>Paths recalculated:</span>
          <span>{currentPerformance.pathsRecalculated}</span>
        </div>
      </div>
      
      <div style={styles.section}>
        <div style={{...styles.header, fontSize: '12px'}}>AI Entities</div>
        
        <div style={styles.row}>
          <span>Total entities:</span>
          <span>{entities.length}</span>
        </div>
        
        <button 
          style={{
            ...styles.button,
            width: '100%',
            marginBottom: '5px',
            ...(visualizationOptions.detailedView ? styles.activeButton : {})
          }}
          onClick={() => handleToggleButton(toggleDetailedView)}
        >
          {visualizationOptions.detailedView ? 'Simplified View' : 'Detailed View'}
        </button>
        
        <div style={styles.entityList}>
          {entities.map(entity => (
            <div 
              key={entity.entityId}
              style={{
                ...styles.entityItem,
                backgroundColor: entity.entityId === visualizationOptions.selectedEntityId 
                  ? AI_TYPE_COLORS[entity.entityType] + '44' // 44 is for 27% opacity
                  : 'transparent',
                borderLeft: `3px solid ${AI_TYPE_COLORS[entity.entityType]}`,
              }}
              onClick={() => handleSelectEntity(entity.entityId)}
            >
              <span>{entity.entityType}: {entity.entityId.substr(0, 6)}</span>
              <span>{entity.currentState}</span>
            </div>
          ))}
        </div>
      </div>
      
      {selectedEntity && (
        <div style={styles.section}>
          <div style={{...styles.header, fontSize: '12px'}}>
            Selected Entity: {selectedEntity.entityId.substr(0, 6)}
          </div>
          
          <div style={styles.row}>
            <span>Type:</span>
            <span>{selectedEntity.entityType}</span>
          </div>
          
          <div style={styles.row}>
            <span>Current state:</span>
            <span>{selectedEntity.currentState}</span>
          </div>
          
          <div style={styles.row}>
            <span>Previous state:</span>
            <span>{selectedEntity.previousState || 'None'}</span>
          </div>
          
          <div style={styles.row}>
            <span>State changes:</span>
            <span>{selectedEntity.stateChangeCount}</span>
          </div>
          
          <div style={styles.row}>
            <span>Decision time:</span>
            <span>{formatTime(selectedEntity.decisionTime)}</span>
          </div>
          
          <div style={styles.row}>
            <span>Path length:</span>
            <span>{selectedEntity.pathLength}</span>
          </div>
          
          <div style={styles.row}>
            <span>Path updates:</span>
            <span>{selectedEntity.pathUpdateCount}</span>
          </div>
          
          <div style={styles.row}>
            <span>Target distance:</span>
            <span>{selectedEntity.targetDistance.toFixed(2)}</span>
          </div>
          
          {selectedEntity.playerDistance !== null && (
            <div style={styles.row}>
              <span>Player distance:</span>
              <span>{selectedEntity.playerDistance.toFixed(2)}</span>
            </div>
          )}
          
          {visualizationOptions.detailedView && (
            <>
              <div style={{...styles.header, fontSize: '11px', marginTop: '10px'}}>
                State Change History
              </div>
              <div style={styles.stateHistory}>
                {selectedEntity.stateChangeHistory.slice().reverse().map((change, index) => (
                  <div key={index} style={styles.stateItem}>
                    <span>{change.state}</span>
                    <span>{new Date(change.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {visualizationOptions.showHeatmap && (
        <canvas 
          ref={heatmapCanvasRef}
          style={styles.heatmapCanvas}
        />
      )}
    </div>
  );
};

export default PerformanceMetricsUI;