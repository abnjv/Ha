import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import io from 'socket.io-client';
import { usePlayerControls } from '../../hooks/usePlayerControls';
import Player from './Player';
import * as THREE from 'three';

const socket = io(import.meta.env.VITE_SIGNALING_SERVER_URL);

const ThreeDRoom = () => {
  const [players, setPlayers] = useState({});
  const localPlayerRef = useRef(new THREE.Object3D());
  const movement = usePlayerControls();

  // Join room and set up listeners
  useEffect(() => {
    // For simplicity, using a hardcoded room and player data
    const roomId = 'main-world';
    const initialData = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
    socket.emit('world:join', roomId, initialData);

    socket.on('world:current-players', (currentPlayers) => {
      setPlayers(currentPlayers);
    });

    socket.on('world:player-joined', (id, data) => {
      setPlayers((prev) => ({ ...prev, [id]: data }));
    });

    socket.on('world:player-moved', (id, data) => {
      setPlayers((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...data },
      }));
    });

    socket.on('world:player-left', (id) => {
      setPlayers((prev) => {
        const newPlayers = { ...prev };
        delete newPlayers[id];
        return newPlayers;
      });
    });

    return () => {
      socket.off('world:current-players');
      socket.off('world:player-joined');
      socket.off('world:player-moved');
      socket.off('world:player-left');
    };
  }, []);

  // Handle local player movement and broadcasting
  useFrame((_, delta) => {
    const speed = 5;
    const direction = new THREE.Vector3();
    direction.x = (movement.right ? 1 : 0) - (movement.left ? 1 : 0);
    direction.z = (movement.backward ? 1 : 0) - (movement.forward ? 1 : 0);
    direction.normalize();

    const velocity = direction.multiplyScalar(speed * delta);
    localPlayerRef.current.position.add(velocity);

    // Update local player in state
    const { x, y, z } = localPlayerRef.current.position;
    setPlayers(prev => ({
        ...prev,
        [socket.id]: { ...prev[socket.id], position: [x,y,z] }
    }));

    // Broadcast movement (throttling can be added here)
    socket.emit('world:player-moved', 'main-world', { position: [x, y, z] });
  });

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 10, 20], fov: 75 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="green" />
        </mesh>

        {Object.entries(players).map(([id, data]) => (
            <Player key={id} position={data.position} rotation={data.rotation} />
        ))}

        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default ThreeDRoom;
