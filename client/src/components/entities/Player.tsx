import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useEntityStore } from "../../lib/stores/useEntityStore";
import { Mesh, Vector3 } from "three";
import { useAudio } from "../../lib/stores/useAudio";

const Player = () => {
  const meshRef = useRef<Mesh>(null);
  const { player } = useEntityStore();
  const { playHitSound } = useAudio();
  
  // Track previous monster state for sound effect
  const prevIsMonsterRef = useRef(player?.isMonster || false);
  
  // Update visual position to match the player's logical position
  useFrame(() => {
    if (!meshRef.current || !player) return;
    
    // Use lerp to smooth position updates
    const targetPosition = new Vector3(
      player.position.x,
      0.5, // Fixed height
      player.position.y
    );
    
    meshRef.current.position.lerp(targetPosition, 0.3);
    
    // Check if player form has changed
    if (prevIsMonsterRef.current !== player.isMonster) {
      // Play transformation sound
      playHitSound();
      prevIsMonsterRef.current = player.isMonster;
    }
  });
  
  // Set initial position
  useEffect(() => {
    if (meshRef.current && player) {
      meshRef.current.position.set(
        player.position.x,
        0.5,
        player.position.y
      );
    }
  }, [player]);
  
  if (!player) return null;
  
  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
    >
      {/* Use a box for human form, a sphere for monster form */}
      {player.isMonster ? (
        <sphereGeometry args={[0.6, 16, 16]} />
      ) : (
        <boxGeometry args={[0.8, 1, 0.8]} />
      )}
      
      <meshStandardMaterial 
        color={player.isMonster ? "#8B0000" : "#0000CD"} 
        emissive={player.isMonster ? "#FF4500" : "#1E90FF"}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

export default Player;
