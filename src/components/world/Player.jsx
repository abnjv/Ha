import React, { useRef, useEffect } from 'react';
import { Capsule } from '@react-three/drei';
import * as THREE from 'three';

const Player = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const playerRef = useRef();

  // This component is now "dumb" and just renders at the given position.
  // The position is managed by the parent ThreeDRoom component.
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.set(...position);
      playerRef.current.rotation.set(...rotation);
    }
  }, [position, rotation]);

  return (
    <mesh ref={playerRef}>
      <Capsule args={[0.5, 1, 4, 8]}>
        <meshStandardMaterial color="royalblue" />
      </Capsule>
    </mesh>
  );
};

export default Player;
