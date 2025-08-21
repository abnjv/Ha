import React from 'react';

const Square = ({ value, onSquareClick }) => {
  return (
    <button
      className="w-16 h-16 bg-gray-700 border border-gray-600 text-white text-3xl font-bold flex items-center justify-center hover:bg-gray-600"
      onClick={onSquareClick}
    >
      {value}
    </button>
  );
};

const TicTacToeBoard = ({ squares, onPlay }) => {
  const renderSquare = (i) => {
    return <Square value={squares[i]} onSquareClick={() => onPlay(i)} />;
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <div className="grid grid-cols-3 gap-1">
        {renderSquare(0)}
        {renderSquare(1)}
        {renderSquare(2)}
        {renderSquare(3)}
        {renderSquare(4)}
        {renderSquare(5)}
        {renderSquare(6)}
        {renderSquare(7)}
        {renderSquare(8)}
      </div>
    </div>
  );
};

export default TicTacToeBoard;
