import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useEntityStore } from "../../lib/stores/useEntityStore";
import { AIType } from "../../lib/ai/AITypes";
import { Mesh, Vector3 } from "three";
import { Text } from "@react-three/drei";

interface NPCProps {
  npcId: string;
}

const NPC = ({ npcId }: NPCProps) => {
  const meshRef = useRef<Mesh>(null);
  const { getNPCById } = useEntityStore();
  
  const npc = getNPCById(npcId);
  
  // Get NPC color and shape based on its type
  const npcVisuals = useMemo(() => {
    if (!npc) return { color: "#FFFFFF", size: [0.7, 0.7, 0.7] };
    
    switch (npc.type) {
      case AIType.GUARD:
        return { 
          color: "#00AA55", 
          size: [0.7, 0.9, 0.7],
          label: "Guard" 
        };
        
      case AIType.HUNTER:
        return { 
          color: "#FF5500", 
          size: [0.8, 0.8, 0.8],
          label: "Hunter" 
        };
        
      case AIType.SURVIVOR:
        return { 
          color: "#AAF",
          size: [0.6, 0.7, 0.6],
          label: "Survivor" 
        };
        
      default:
        return { 
          color: "#888888", 
          size: [0.7, 0.7, 0.7],
          label: "Unknown" 
        };
    }
  }, [npc]);
  
  // Update visual position to match the NPC's logical position
  useFrame(() => {
    if (!meshRef.current || !npc) return;
    
    // Use lerp to smooth position updates
    const targetPosition = new Vector3(
      npc.position.x,
      0.5, // Fixed height
      npc.position.y
    );
    
    meshRef.current.position.lerp(targetPosition, 0.2);
  });
  
  // Set initial position
  useEffect(() => {
    if (meshRef.current && npc) {
      meshRef.current.position.set(
        npc.position.x,
        0.5,
        npc.position.y
      );
    }
  }, [npc]);
  
  if (!npc) return null;
  
  return (
    <group>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
      >
        <boxGeometry args={npcVisuals.size} />
        <meshStandardMaterial 
          color={npcVisuals.color} 
          emissive={npcVisuals.color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* State label floating above NPC */}
      <Text
        position={[npc.position.x, 1.2, npc.position.y]}
        fontSize={0.3}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        backgroundColor="#00000080"
        padding={0.05}
      >
        {npc.currentState}
      </Text>
    </group>
  );
};

export default NPC;
