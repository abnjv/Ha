import { useState, useEffect } from 'react';

export const usePlayerControls = () => {
  const [movement, setMovement] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
          setMovement((m) => ({ ...m, forward: true }));
          break;
        case 'KeyS':
          setMovement((m) => ({ ...m, backward: true }));
          break;
        case 'KeyA':
          setMovement((m) => ({ ...m, left: true }));
          break;
        case 'KeyD':
          setMovement((m) => ({ ...m, right: true }));
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
          setMovement((m) => ({ ...m, forward: false }));
          break;
        case 'KeyS':
          setMovement((m) => ({ ...m, backward: false }));
          break;
        case 'KeyA':
          setMovement((m) => ({ ...m, left: false }));
          break;
        case 'KeyD':
          setMovement((m) => ({ ...m, right: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
};
