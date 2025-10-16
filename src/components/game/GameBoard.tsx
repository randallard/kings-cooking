/**
 * @fileoverview Interactive 3x3 chess board with move selection
 * @module components/game/GameBoard
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import type { GameState, Position } from '@/lib/validation/schemas';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import { GameCell } from './GameCell';
import styles from './GameBoard.module.css';

interface GameBoardProps {
  /** Current game state */
  gameState: GameState;
  /** Callback when move is completed */
  onMove: (from: Position, to: Position) => void;
  /** Is it this player's turn? */
  isPlayerTurn?: boolean;
}

/**
 * Interactive 3x3 chess board with click-to-move.
 *
 * Features:
 * - Click piece → highlights legal moves → click destination → move confirmed
 * - Keyboard navigation with Tab and Arrow keys
 * - Full screen reader support with ARIA
 * - Responsive design (mobile, tablet, desktop)
 * - Dark mode support
 *
 * @component
 * @example
 * ```tsx
 * <GameBoard
 *   gameState={currentGame}
 *   onMove={(from, to) => handleMove(from, to)}
 *   isPlayerTurn={true}
 * />
 * ```
 */
export const GameBoard = ({
  gameState,
  onMove,
  isPlayerTurn = true,
}: GameBoardProps): ReactElement => {
  // State: Currently selected position
  const [selectedPosition, setSelectedPosition] = useState<Position>(null);

  // Chess engine instance (memoized)
  const engine = useMemo(() => {
    return new KingsChessEngine(
      gameState.whitePlayer,
      gameState.blackPlayer,
      gameState
    );
  }, [gameState]);

  // Get legal moves for selected piece (memoized)
  const legalMoves = useMemo(() => {
    if (!selectedPosition) return [];
    return engine.getValidMoves(selectedPosition);
  }, [selectedPosition, engine]);

  // Get last move positions for highlighting
  const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];

  // Handle cell click
  const handleCellClick = useCallback((position: Position) => {
    if (!position || !isPlayerTurn) return;

    const piece = gameState.board[position[0]]?.[position[1]];

    // If no piece selected yet
    if (!selectedPosition) {
      // Only select pieces owned by current player
      if (piece && piece.owner === gameState.currentPlayer) {
        setSelectedPosition(position);
      }
      return;
    }

    // If clicking same piece, deselect
    if (
      selectedPosition[0] === position[0] &&
      selectedPosition[1] === position[1]
    ) {
      setSelectedPosition(null);
      return;
    }

    // Check if this is a legal move
    const isLegal = legalMoves.some((move) => {
      if (!move) return false;
      return move[0] === position[0] && move[1] === position[1];
    });

    if (isLegal) {
      // Make the move
      onMove(selectedPosition, position);
      setSelectedPosition(null);
    } else {
      // Select different piece if it's current player's
      if (piece && piece.owner === gameState.currentPlayer) {
        setSelectedPosition(position);
      }
    }
  }, [selectedPosition, legalMoves, gameState, isPlayerTurn, onMove]);

  // Helper: Check if position is a legal move
  const isLegalMove = useCallback((position: Position): boolean => {
    if (!position) return false;
    return legalMoves.some((move) => {
      if (!move) return false;
      return move[0] === position[0] && move[1] === position[1];
    });
  }, [legalMoves]);

  // Helper: Check if position was part of last move
  const isLastMovePosition = useCallback((position: Position): boolean => {
    if (!position || !lastMove) return false;

    return (
      (lastMove.from[0] === position[0] && lastMove.from[1] === position[1]) ||
      (lastMove.to !== 'off_board' &&
        lastMove.to[0] === position[0] &&
        lastMove.to[1] === position[1])
    );
  }, [lastMove]);

  return (
    <div className={styles.gameBoardContainer}>
      <div
        role="grid"
        className={styles.gameBoard}
        aria-label="Chess board, 3 by 3 grid"
      >
        {gameState.board.map((row, rowIndex) => (
          <div key={rowIndex} role="row" className={styles.boardRow}>
            {row.map((piece, colIndex) => {
              const position: Position = [rowIndex, colIndex];
              const isSelected =
                selectedPosition &&
                selectedPosition[0] === rowIndex &&
                selectedPosition[1] === colIndex;

              return (
                <GameCell
                  key={`${rowIndex}-${colIndex}`}
                  position={position}
                  piece={piece}
                  isSelected={Boolean(isSelected)}
                  isLegalMove={isLegalMove(position)}
                  isLastMove={isLastMovePosition(position)}
                  onClick={handleCellClick}
                  disabled={!isPlayerTurn}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Screen reader announcements */}
      <div className={styles.srOnly} role="status" aria-live="polite">
        {selectedPosition && (
          `Selected ${
            gameState.board[selectedPosition[0]]?.[selectedPosition[1]]?.type ?? 'piece'
          } at ${String.fromCharCode(65 + selectedPosition[1])}${selectedPosition[0] + 1}.
          ${legalMoves.length} legal moves available.`
        )}
      </div>
    </div>
  );
};
