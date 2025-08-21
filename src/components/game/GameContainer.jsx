import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import TicTacToeBoard from './TicTacToeBoard';
import { createBoard, calculateWinner } from '../../game/ticTacToe';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';

// This component manages the state and logic for an active game session.
const GameContainer = ({ gameRoom, opponent, initialPlayerSymbol }) => {
  const { user } = useAuth();

  // Tic-Tac-Toe State
  const [board, setBoard] = useState(createBoard());
  const tttWinner = calculateWinner(board);

  // Chess State
  const [chessGame, setChessGame] = useState(new Chess());
  const [fen, setFen] = useState(chessGame.fen());

  // Common Game State
  const [playerSymbol, setPlayerSymbol] = useState(initialPlayerSymbol); // X/O for TTT, w/b for Chess
  const [currentPlayer, setCurrentPlayer] = useState('X'); // TTT turn
  const [gameStatus, setGameStatus] = useState('active'); // active, opponent_left, ended

  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SIGNALING_SERVER_URL);
    socketRef.current.emit('game:join-socket-room', gameRoom.id);

    socketRef.current.on('game:move', ({ move }) => {
      if (gameRoom.gameType === 'TicTacToe') {
        setBoard(move);
        setCurrentPlayer(prev => prev === 'X' ? 'O' : 'X');
      } else if (gameRoom.gameType === 'Chess') {
        const game = new Chess(fen);
        game.move(move);
        setChessGame(game);
        setFen(game.fen());
      }
    });

    // ... (reset, leave, opponent-left handlers)

    return () => {
      socketRef.current.emit('game:leave', { roomId: gameRoom.id });
      socketRef.current.disconnect();
    };
  }, [gameRoom.id, gameRoom.gameType, fen]);

  const handleTTTMove = (index) => {
    if (board[index] || tttWinner || currentPlayer !== playerSymbol) return;
    const newBoard = board.slice();
    newBoard[index] = playerSymbol;
    setBoard(newBoard);
    setCurrentPlayer(playerSymbol === 'X' ? 'O' : 'X');
    socketRef.current.emit('game:move', { roomId: gameRoom.id, move: newBoard });
  };

  const handleChessMove = (move) => {
    const game = new Chess(fen);
    // Check if it's the player's turn
    if (game.turn() !== playerSymbol) return;

    try {
      const result = game.move(move);
      if (result) {
        setChessGame(game);
        setFen(game.fen());
        socketRef.current.emit('game:move', { roomId: gameRoom.id, move });
      }
    } catch (e) {
      console.log("Invalid move");
    }
  };

  // ... (reset and leave game handlers)

  const renderGame = () => {
    if (gameRoom.gameType === 'TicTacToe') {
      return (
        <div>
          <TicTacToeBoard squares={board} onPlay={handleTTTMove} />
          <div className="mt-4 text-xl font-bold">
            {tttWinner ? (tttWinner === 'draw' ? 'It\'s a Draw!' : `Winner: ${tttWinner}`) : `Turn: ${currentPlayer}`}
          </div>
        </div>
      );
    }
    if (gameRoom.gameType === 'Chess') {
      return (
        <div>
          <ChessBoard board={chessGame} onMove={handleChessMove} playerColor={playerSymbol} />
           <div className="mt-4 text-xl font-bold">
            {chessGame.isGameOver() ? "Game Over" : `Turn: ${chessGame.turn() === 'w' ? 'White' : 'Black'}`}
          </div>
        </div>
      );
    }
    return <p>Unknown game type.</p>;
  };

  return (
    <div className="p-6 rounded-lg bg-gray-900 shadow-2xl text-white">
      <h2 className="text-2xl font-bold mb-4">{gameRoom.gameType} vs {opponent.name}</h2>

      {gameStatus === 'opponent_left' ? (
        <p className="text-xl text-yellow-500">Your opponent has left the game.</p>
      ) : (
        renderGame()
      )}

      <p className="text-sm text-gray-400 mt-2">You are playing as: {playerSymbol}</p>
      {/* ... (reset/leave buttons) ... */}
    </div>
  );
};

export default GameContainer;
