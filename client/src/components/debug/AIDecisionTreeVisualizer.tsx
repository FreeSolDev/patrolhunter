import React, { useRef, useEffect } from 'react';
import { usePerformanceStore } from '../../lib/stores/usePerformanceStore';

interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  state: boolean;
  color: string;
}

// Example decision tree structures for each AI type
const generateDecisionTree = (aiType: string, currentState: string): TreeNode => {
  // Guard decision tree
  if (aiType === 'GUARD') {
    return {
      id: 'guard-root',
      label: 'Guard AI',
      color: '#00AA55',
      state: true,
      children: [
        {
          id: 'guard-threat',
          label: 'Threat detected?',
          color: '#00AA55',
          state: currentState === 'Attack' || currentState === 'Investigate' || currentState === 'Coordinate',
          children: [
            {
              id: 'guard-monster',
              label: 'Is monster?',
              color: '#00AA55',
              state: currentState === 'Attack',
              children: [
                {
                  id: 'guard-attack',
                  label: 'Attack',
                  color: '#FF0000',
                  state: currentState === 'Attack',
                  children: []
                }
              ]
            },
            {
              id: 'guard-suspicious',
              label: 'Is suspicious?',
              color: '#00AA55',
              state: currentState === 'Investigate',
              children: [
                {
                  id: 'guard-investigate',
                  label: 'Investigate',
                  color: '#FFAA00',
                  state: currentState === 'Investigate',
                  children: []
                }
              ]
            },
            {
              id: 'guard-need-help',
              label: 'Need assistance?',
              color: '#00AA55',
              state: currentState === 'Coordinate',
              children: [
                {
                  id: 'guard-coordinate',
                  label: 'Coordinate',
                  color: '#AAAAFF',
                  state: currentState === 'Coordinate',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'guard-no-threat',
          label: 'No threat',
          color: '#00AA55',
          state: currentState === 'Patrol' || currentState === 'Retreat',
          children: [
            {
              id: 'guard-in-danger',
              label: 'In danger?',
              color: '#00AA55',
              state: currentState === 'Retreat',
              children: [
                {
                  id: 'guard-retreat',
                  label: 'Retreat',
                  color: '#FFAA00',
                  state: currentState === 'Retreat',
                  children: []
                }
              ]
            },
            {
              id: 'guard-patrol-duty',
              label: 'On patrol',
              color: '#00AA55',
              state: currentState === 'Patrol',
              children: [
                {
                  id: 'guard-patrol',
                  label: 'Patrol',
                  color: '#88FF88',
                  state: currentState === 'Patrol',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    };
  }
  
  // Hunter decision tree
  else if (aiType === 'HUNTER') {
    return {
      id: 'hunter-root',
      label: 'Hunter AI',
      color: '#FF5500',
      state: true,
      children: [
        {
          id: 'hunter-target',
          label: 'Target detected?',
          color: '#FF5500',
          state: currentState === 'Attack Monster' || currentState === 'Attack Human' || currentState === 'Hunt',
          children: [
            {
              id: 'hunter-monster',
              label: 'Is monster?',
              color: '#FF5500',
              state: currentState === 'Attack Monster',
              children: [
                {
                  id: 'hunter-attack-monster',
                  label: 'Attack Monster',
                  color: '#FF0000',
                  state: currentState === 'Attack Monster',
                  children: []
                }
              ]
            },
            {
              id: 'hunter-human',
              label: 'Is human?',
              color: '#FF5500',
              state: currentState === 'Attack Human',
              children: [
                {
                  id: 'hunter-attack-human',
                  label: 'Attack Human',
                  color: '#FF8800',
                  state: currentState === 'Attack Human',
                  children: []
                }
              ]
            },
            {
              id: 'hunter-hunting',
              label: 'Searching',
              color: '#FF5500',
              state: currentState === 'Hunt',
              children: [
                {
                  id: 'hunter-hunt',
                  label: 'Hunt',
                  color: '#FFCC00',
                  state: currentState === 'Hunt',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'hunter-no-target',
          label: 'No target',
          color: '#FF5500',
          state: currentState === 'Wait' || currentState === 'Retreat',
          children: [
            {
              id: 'hunter-in-danger',
              label: 'In danger?',
              color: '#FF5500',
              state: currentState === 'Retreat',
              children: [
                {
                  id: 'hunter-retreat',
                  label: 'Retreat',
                  color: '#FF8800',
                  state: currentState === 'Retreat',
                  children: []
                }
              ]
            },
            {
              id: 'hunter-idle',
              label: 'At position',
              color: '#FF5500',
              state: currentState === 'Wait',
              children: [
                {
                  id: 'hunter-wait',
                  label: 'Wait',
                  color: '#FFCC00',
                  state: currentState === 'Wait',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    };
  }
  
  // Survivor decision tree
  else if (aiType === 'SURVIVOR') {
    return {
      id: 'survivor-root',
      label: 'Survivor AI',
      color: '#AAAAFF',
      state: true,
      children: [
        {
          id: 'survivor-threat',
          label: 'Threat detected?',
          color: '#AAAAFF',
          state: currentState === 'Flee' || currentState === 'Hide' || currentState === 'Seek Safety',
          children: [
            {
              id: 'survivor-immediate-danger',
              label: 'Immediate danger?',
              color: '#AAAAFF',
              state: currentState === 'Flee',
              children: [
                {
                  id: 'survivor-flee',
                  label: 'Flee',
                  color: '#FF0000',
                  state: currentState === 'Flee',
                  children: []
                }
              ]
            },
            {
              id: 'survivor-cover-nearby',
              label: 'Cover nearby?',
              color: '#AAAAFF',
              state: currentState === 'Hide',
              children: [
                {
                  id: 'survivor-hide',
                  label: 'Hide',
                  color: '#FFAA00',
                  state: currentState === 'Hide',
                  children: []
                }
              ]
            },
            {
              id: 'survivor-unsafe',
              label: 'Current area unsafe?',
              color: '#AAAAFF',
              state: currentState === 'Seek Safety',
              children: [
                {
                  id: 'survivor-seek-safety',
                  label: 'Seek Safety',
                  color: '#FFCC00',
                  state: currentState === 'Seek Safety',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'survivor-no-threat',
          label: 'No threat',
          color: '#AAAAFF',
          state: currentState === 'Wander',
          children: [
            {
              id: 'survivor-explore',
              label: 'Exploring',
              color: '#AAAAFF',
              state: currentState === 'Wander',
              children: [
                {
                  id: 'survivor-wander',
                  label: 'Wander',
                  color: '#88AAFF',
                  state: currentState === 'Wander',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    };
  }
  
  // Preserver decision tree
  else if (aiType === 'PRESERVER') {
    return {
      id: 'preserver-root',
      label: 'Preserver AI',
      color: '#FF00FF',
      state: true,
      children: [
        {
          id: 'preserver-target',
          label: 'Target detected?',
          color: '#FF00FF',
          state: currentState === 'Approach' || currentState === 'Attack' || currentState === 'Retreat' || currentState === 'Reposition',
          children: [
            {
              id: 'preserver-in-range',
              label: 'Target in range?',
              color: '#FF00FF',
              state: currentState === 'Attack',
              children: [
                {
                  id: 'preserver-attack',
                  label: 'Attack',
                  color: '#FF0000',
                  state: currentState === 'Attack',
                  children: []
                }
              ]
            },
            {
              id: 'preserver-approaching',
              label: 'Moving to target?',
              color: '#FF00FF',
              state: currentState === 'Approach',
              children: [
                {
                  id: 'preserver-approach',
                  label: 'Approach',
                  color: '#FF88FF',
                  state: currentState === 'Approach',
                  children: []
                }
              ]
            },
            {
              id: 'preserver-post-attack',
              label: 'Post-attack?',
              color: '#FF00FF',
              state: currentState === 'Retreat' || currentState === 'Reposition',
              children: [
                {
                  id: 'preserver-retreating',
                  label: 'Need distance?',
                  color: '#FF00FF',
                  state: currentState === 'Retreat',
                  children: [
                    {
                      id: 'preserver-retreat',
                      label: 'Retreat',
                      color: '#FFAA00',
                      state: currentState === 'Retreat',
                      children: []
                    }
                  ]
                },
                {
                  id: 'preserver-repositioning',
                  label: 'New angle?',
                  color: '#FF00FF',
                  state: currentState === 'Reposition',
                  children: [
                    {
                      id: 'preserver-reposition',
                      label: 'Reposition',
                      color: '#FF88FF',
                      state: currentState === 'Reposition',
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'preserver-no-target',
          label: 'No target',
          color: '#FF00FF',
          state: currentState === 'Patrol',
          children: [
            {
              id: 'preserver-patrol',
              label: 'Patrol',
              color: '#FF88FF',
              state: currentState === 'Patrol',
              children: []
            }
          ]
        }
      ]
    };
  }
  
  // Merchant decision tree
  else if (aiType === 'MERCHANT') {
    return {
      id: 'merchant-root',
      label: 'Merchant AI',
      color: '#FFDD00',
      state: true,
      children: [
        {
          id: 'merchant-threat',
          label: 'Threat detected?',
          color: '#FFDD00',
          state: currentState === 'Alert Guards' || currentState === 'Flee',
          children: [
            {
              id: 'merchant-nearby-guards',
              label: 'Guards nearby?',
              color: '#FFDD00',
              state: currentState === 'Alert Guards',
              children: [
                {
                  id: 'merchant-alert',
                  label: 'Alert Guards',
                  color: '#FF8800',
                  state: currentState === 'Alert Guards',
                  children: []
                }
              ]
            },
            {
              id: 'merchant-danger',
              label: 'Immediate danger?',
              color: '#FFDD00',
              state: currentState === 'Flee',
              children: [
                {
                  id: 'merchant-flee',
                  label: 'Flee',
                  color: '#FF0000',
                  state: currentState === 'Flee',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'merchant-no-threat',
          label: 'No threat',
          color: '#FFDD00',
          state: currentState === 'Travel' || currentState === 'Trade' || currentState === 'Wander',
          children: [
            {
              id: 'merchant-at-hotspot',
              label: 'At hotspot?',
              color: '#FFDD00',
              state: currentState === 'Trade' || currentState === 'Wander',
              children: [
                {
                  id: 'merchant-trading',
                  label: 'Trading?',
                  color: '#FFDD00',
                  state: currentState === 'Trade',
                  children: [
                    {
                      id: 'merchant-trade',
                      label: 'Trade',
                      color: '#FFFF00',
                      state: currentState === 'Trade',
                      children: []
                    }
                  ]
                },
                {
                  id: 'merchant-wandering',
                  label: 'Explore area?',
                  color: '#FFDD00',
                  state: currentState === 'Wander',
                  children: [
                    {
                      id: 'merchant-wander',
                      label: 'Wander',
                      color: '#FFFF88',
                      state: currentState === 'Wander',
                      children: []
                    }
                  ]
                }
              ]
            },
            {
              id: 'merchant-traveling',
              label: 'Moving to hotspot?',
              color: '#FFDD00',
              state: currentState === 'Travel',
              children: [
                {
                  id: 'merchant-travel',
                  label: 'Travel',
                  color: '#DDCC00',
                  state: currentState === 'Travel',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    };
  }
  
  // Default fallback tree
  return {
    id: 'unknown-root',
    label: 'Unknown AI Type',
    color: '#CCCCCC',
    state: true,
    children: [
      {
        id: 'unknown-state',
        label: currentState || 'Unknown State',
        color: '#CCCCCC',
        state: true,
        children: []
      }
    ]
  };
};

// Styles
const styles = {
  container: {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    padding: '15px',
    maxWidth: '90%',
    maxHeight: '80%',
    overflow: 'auto',
    zIndex: 1000,
  },
  closeButton: {
    position: 'absolute' as 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#FF5555',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 8px',
    cursor: 'pointer',
  },
  canvas: {
    backgroundColor: 'transparent',
  },
  nodeActive: {
    backgroundColor: '#4CAF50',
  },
  nodeInactive: {
    backgroundColor: '#555555',
  },
};

interface AIDecisionTreeVisualizerProps {
  onClose: () => void;
}

const AIDecisionTreeVisualizer: React.FC<AIDecisionTreeVisualizerProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { aiBehaviorMetrics, visualizationOptions } = usePerformanceStore();
  
  const selectedEntityId = visualizationOptions.selectedEntityId;
  const selectedEntity = selectedEntityId ? aiBehaviorMetrics[selectedEntityId] : null;
  
  useEffect(() => {
    if (!canvasRef.current || !selectedEntity) return;
    
    // Setup canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generate the decision tree based on the entity type and state
    const decisionTree = generateDecisionTree(
      selectedEntity.entityType,
      selectedEntity.currentState
    );
    
    // Draw the decision tree
    drawDecisionTree(ctx, decisionTree, canvas.width / 2, 50, 170);
    
  }, [selectedEntity, canvasRef]);
  
  // Draw the decision tree recursively
  const drawDecisionTree = (
    ctx: CanvasRenderingContext2D,
    node: TreeNode,
    x: number,
    y: number,
    width: number
  ) => {
    // Draw this node
    ctx.fillStyle = node.state ? node.color : '#555555';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    // Draw node as rounded rectangle
    roundRect(ctx, x - 60, y, 120, 40, 8, true, true);
    
    // Add text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, x, y + 20);
    
    // Draw children
    if (node.children.length > 0) {
      const childWidth = width / node.children.length;
      const childY = y + 80;
      
      node.children.forEach((child, i) => {
        const childX = x - (width / 2) + (i * childWidth) + (childWidth / 2);
        
        // Draw line from parent to child
        ctx.strokeStyle = child.state ? child.color : '#555555';
        ctx.beginPath();
        ctx.moveTo(x, y + 40);
        ctx.lineTo(childX, childY);
        ctx.stroke();
        
        // Draw child subtree
        drawDecisionTree(ctx, child, childX, childY, childWidth);
      });
    }
  };
  
  // Helper function to draw rounded rectangles
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean,
    stroke: boolean
  ) => {
    // Draw with uniform radius
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  };
  
  if (!selectedEntity) return null;
  
  return (
    <div style={styles.container}>
      <button style={styles.closeButton} onClick={onClose}>X</button>
      <h3 style={{ color: 'white', textAlign: 'center' }}>
        {selectedEntity.entityType} AI Decision Tree: {selectedEntity.entityId.substr(0, 6)}
      </h3>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  );
};

export default AIDecisionTreeVisualizer;