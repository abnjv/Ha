import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import GameContainer from './GameContainer';

const GameLobby = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [availableRooms, setAvailableRooms] = useState([]);
  const [game, setGame] = useState(null);
  const [status, setStatus] = useState('lobby'); // lobby, waiting, playing
  const [selectedGameType, setSelectedGameType] = useState('TicTacToe');

  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SIGNALING_SERVER_URL);

    // Initial fetch of rooms
    socketRef.current.emit('game:get-rooms');

    // Listen for updates to the room list
    socketRef.current.on('game:rooms-list', (rooms) => {
      setAvailableRooms(rooms);
    });

    // Listen for the game to start
    socketRef.current.on('game:start', ({ opponent, symbol, room }) => {
      setGame({ room, opponent, symbol });
      setStatus('playing');
    });

    socketRef.current.on('game:room-created', (room) => {
      setStatus('waiting');
    });

    socketRef.current.on('game:error', (errorMessage) => {
      alert(errorMessage);
      setStatus('lobby');
    });

    // Cleanup on unmount
    return () => socketRef.current.disconnect();
  }, []);

  const handleCreateRoom = () => {
    socketRef.current.emit('game:create-room', {
      playerName: userProfile.name,
      gameType: selectedGameType
    });
  };

  const handleJoinRoom = (roomId) => {
    socketRef.current.emit('game:join-room', {
      roomId,
      playerName: userProfile.name
    });
  };

  if (status === 'playing' && game) {
    return <GameContainer
             gameRoom={game.room}
             opponent={game.opponent}
             initialPlayerSymbol={game.symbol}
           />;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8">Game Lobby</h1>

      {status === 'waiting' && (
        <div className="text-center p-6 bg-gray-800 rounded-lg animate-pulse">
          <h2 className="text-2xl font-bold">Waiting for an opponent...</h2>
        </div>
      )}

      {status === 'lobby' && (
        <div className="w-full max-w-md">
          <div className="p-4 bg-gray-800 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-3 text-center">Create a New Game</h2>
            <div className="flex flex-col space-y-4">
              <select
                value={selectedGameType}
                onChange={(e) => setSelectedGameType(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              >
                <option value="TicTacToe">Tic-Tac-Toe</option>
                <option value="Chess">Chess</option>
              </select>
              <button
                onClick={handleCreateRoom}
                className="w-full p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
              >
                Create Game
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4 text-center">Or Join a Game</h2>
          <div className="space-y-3 bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto">
            {availableRooms.length === 0 ? (
              <p className="text-gray-400 text-center">No available rooms. Create one!</p>
            ) : (
              availableRooms.map(room => (
                <div key={room.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{room.players[0].name}'s Game</p>
                    <p className="text-xs text-gray-400">{room.gameType}</p>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-1 bg-green-600 text-white font-semibold rounded hover:bg-green-700"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button onClick={() => navigate('/dashboard')} className="mt-8 px-4 py-2 bg-gray-700 rounded">Back to Dashboard</button>
    </div>
  );
};

export default GameLobby;
