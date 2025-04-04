import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import Grid from "./grid/Grid";
import Player from "./entities/Player";
import NPC from "./entities/NPC";
import PathfindingDebug from "./debug/PathfindingDebug";
import { useGridStore } from "../lib/stores/useGridStore";
import { useEntityStore } from "../lib/stores/useEntityStore";
import { AIType } from "../lib/ai/AITypes";
import { useGame } from "../lib/stores/useGame";

const Game = () => {
  const { phase, start } = useGame();
  const { initializeGrid } = useGridStore();
  const { 
    createPlayer, 
    initializeNPCs, 
    player, 
    npcs, 
    updateNPCs,
    updatePlayer
  } = useEntityStore();
  
  const [, getKeys] = useKeyboardControls();
  const debugMode = useKeyboardControls(state => state.debug);

  // Initialize the game on component mount
  useEffect(() => {
    console.log("Initializing game...");
    
    // Set grid size and initialize
    const gridSize = { width: 20, height: 20 };
    initializeGrid(gridSize);
    
    // Create player at position [10, 10]
    createPlayer({ 
      position: { x: 10, y: 10 }, 
      isMonster: false 
    });
    
    // Create various NPCs with different AI types and positions
    initializeNPCs([
      // Create some guards (Type 1)
      { position: { x: 2, y: 2 }, type: AIType.GUARD, groupId: 1 },
      { position: { x: 3, y: 2 }, type: AIType.GUARD, groupId: 1 },
      { position: { x: 2, y: 3 }, type: AIType.GUARD, groupId: 1 },
      
      // Create some hunters (Type 2)
      { position: { x: 17, y: 17 }, type: AIType.HUNTER },
      { position: { x: 17, y: 2 }, type: AIType.HUNTER },
      
      // Create some survivors (Type 3)
      { position: { x: 5, y: 15 }, type: AIType.SURVIVOR },
      { position: { x: 15, y: 5 }, type: AIType.SURVIVOR },
      { position: { x: 10, y: 15 }, type: AIType.SURVIVOR },
    ]);
    
    // Start the game
    start();
    
    console.log("Game initialized successfully");
  }, [initializeGrid, createPlayer, initializeNPCs, start]);

  // Game update loop
  useFrame((_, delta) => {
    if (phase !== "playing") return;
    
    // Get current keyboard state
    const { up, down, left, right, transform } = getKeys();
    
    // Update player
    if (player) {
      updatePlayer({ up, down, left, right, transform }, delta);
    }
    
    // Update all NPCs
    updateNPCs(delta);
  });

  return (
    <>
      <Grid />
      
      {/* Render player if it exists */}
      {player && <Player />}
      
      {/* Render all NPCs */}
      {npcs.map((npc) => (
        <NPC key={npc.id} npcId={npc.id} />
      ))}
      
      {/* Only show pathfinding debug visualization if debug is enabled */}
      {debugMode && <PathfindingDebug />}
    </>
  );
};

export default Game;
