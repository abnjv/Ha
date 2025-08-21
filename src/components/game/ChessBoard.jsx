import React, { useState } from 'react';

const pieceSymbols = {
  p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔',
  P: '♟', R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚',
};

const ChessBoard = ({ board, onMove, playerColor }) => {
  const [fromSquare, setFromSquare] = useState(null);

  const handleSquareClick = (square) => {
    if (fromSquare) {
      // This is the destination square
      onMove({ from: fromSquare, to: square });
      setFromSquare(null);
    } else {
      // This is the source square
      setFromSquare(square);
    }
  };

  const renderBoard = () => {
    const squares = [];
    const ranks = playerColor === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
    const files = playerColor === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

    for (const rank of ranks) {
      for (const file of files) {
        const squareName = `${file}${rank}`;
        const piece = board.get(squareName);
        const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
        const isSelected = fromSquare === squareName;

        squares.push(
          <div
            key={squareName}
            onClick={() => handleSquareClick(squareName)}
            className={`w-16 h-16 flex justify-center items-center text-4xl
                        ${isLight ? 'bg-gray-400' : 'bg-gray-700'}
                        ${isSelected ? 'border-4 border-yellow-400' : ''}
                        cursor-pointer`}
          >
            {piece ? pieceSymbols[piece.color === 'b' ? piece.type.toUpperCase() : piece.type] : ''}
          </div>
        );
      }
    }
    return squares;
  };

  return (
    <div className="w-[512px] h-[512px] grid grid-cols-8 grid-rows-8 border-4 border-gray-800">
      {renderBoard()}
    </div>
  );
};

export default ChessBoard;
