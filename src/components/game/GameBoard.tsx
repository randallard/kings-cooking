/**
 * @fileoverview Interactive 3x3 chess board with move selection
 * @module components/game/GameBoard
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import type { GameState, Position, Piece } from '@/lib/validation/schemas';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import {
  hasRookPathToEdge,
  canKnightJumpOffBoard,
  canBishopMoveOffBoard,
} from '@/lib/chess/pieceMovement';
import { GameCell } from './GameCell';
import { CourtArea } from './CourtArea';
import styles from './GameBoard.module.css';

interface GameBoardProps {
  /** Current game state */
  gameState: GameState;
  /** Callback when move is completed */
  onMove: (from: Position, to: Position | 'off_board') => void;
  /** Is it this player's turn? */
  isPlayerTurn?: boolean;
  /** Staged move awaiting confirmation */
  pendingMove?: { from: Position; to: Position | 'off_board' } | null;
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
  pendingMove,
}: GameBoardProps): ReactElement => {
  // State: Currently selected position
  const [selectedPosition, setSelectedPosition] = useState<Position>(null);

  // Chess engine instance (memoized)
  const engine = useMemo(() => {
    return new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );
  }, [gameState]);

  // Get legal moves for selected piece (memoized)
  const legalMoves = useMemo(() => {
    if (!selectedPosition) return [];
    return engine.getValidMoves(selectedPosition);
  }, [selectedPosition, engine]);

  // Check if selected piece can move off-board
  const canSelectedPieceMoveOffBoard = useMemo(() => {
    if (!selectedPosition) return false;

    const piece = gameState.board[selectedPosition[0]]?.[selectedPosition[1]];
    if (!piece) return false;
    if (piece.owner !== gameState.currentPlayer) return false;

    // getPiece callback for helper functions
    const getPiece = (pos: Position): Piece | null => {
      if (!pos) return null;
      const [row, col] = pos;
      return gameState.board[row]?.[col] ?? null;
    };

    // Check based on piece type
    switch (piece.type) {
      case 'rook':
        return hasRookPathToEdge(selectedPosition, piece, getPiece);
      case 'knight':
        return canKnightJumpOffBoard(selectedPosition, piece);
      case 'bishop':
        return canBishopMoveOffBoard(selectedPosition, piece, getPiece);
      default:
        return false;
    }
  }, [selectedPosition, gameState]);

  // Get selected piece type
  const selectedPieceType = useMemo(() => {
    if (!selectedPosition) return null;
    const piece = gameState.board[selectedPosition[0]]?.[selectedPosition[1]];
    return piece?.type ?? null;
  }, [selectedPosition, gameState]);

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

  // Handle off-board move
  const handleOffBoardMove = useCallback(() => {
    if (!selectedPosition) return;
    if (!canSelectedPieceMoveOffBoard) return;

    onMove(selectedPosition, 'off_board');
    setSelectedPosition(null);
  }, [selectedPosition, canSelectedPieceMoveOffBoard, onMove]);

  return (
    <div className={styles.gameBoardContainer}>
      {/* Dark King's Court (above board) - Light pieces score here */}
      <CourtArea
        courtOwner="dark"
        scoredPieces={gameState.lightCourt}
        capturedPieces={gameState.capturedDark}
        canMoveOffBoard={
          gameState.currentPlayer === 'light' && canSelectedPieceMoveOffBoard
        }
        onOffBoardMove={handleOffBoardMove}
        currentPlayer={gameState.currentPlayer}
        selectedPieceType={selectedPieceType}
      />

      {/* 3x3 Chess Board */}
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

              // Pending move logic
              const isPendingSource = Boolean(
                pendingMove &&
                  pendingMove.from &&
                  pendingMove.from[0] === rowIndex &&
                  pendingMove.from[1] === colIndex
              );

              const isPendingDest = Boolean(
                pendingMove &&
                  pendingMove.to !== 'off_board' &&
                  Array.isArray(pendingMove.to) &&
                  pendingMove.to[0] === rowIndex &&
                  pendingMove.to[1] === colIndex
              );

              // Determine which piece to display
              let displayedPiece = piece;
              let ghostPiece: Piece | null = null;

              if (isPendingDest && pendingMove && pendingMove.to !== 'off_board' && pendingMove.from) {
                // Show moving piece at destination
                const [fromRow, fromCol] = pendingMove.from;
                displayedPiece = gameState.board[fromRow]?.[fromCol] ?? null;
              }

              if (isPendingSource && piece) {
                // Show ghost piece at source
                ghostPiece = piece;
                displayedPiece = null; // Clear actual piece at source
              }

              return (
                <GameCell
                  key={`${rowIndex}-${colIndex}`}
                  position={position}
                  piece={displayedPiece}
                  isSelected={Boolean(isSelected)}
                  isLegalMove={isLegalMove(position)}
                  isLastMove={isLastMovePosition(position)}
                  isPendingSource={isPendingSource}
                  isPendingDestination={isPendingDest}
                  ghostPiece={ghostPiece}
                  onClick={handleCellClick}
                  disabled={!isPlayerTurn}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Light King's Court (below board) - Dark pieces score here */}
      <CourtArea
        courtOwner="light"
        scoredPieces={gameState.darkCourt}
        capturedPieces={gameState.capturedLight}
        canMoveOffBoard={
          gameState.currentPlayer === 'dark' && canSelectedPieceMoveOffBoard
        }
        onOffBoardMove={handleOffBoardMove}
        currentPlayer={gameState.currentPlayer}
        selectedPieceType={selectedPieceType}
      />

      {/* Screen reader announcements */}
      <div className={styles.srOnly} role="status" aria-live="polite">
        {selectedPosition && (
          `Selected ${
            gameState.board[selectedPosition[0]]?.[selectedPosition[1]]?.type ?? 'piece'
          } at ${String.fromCharCode(65 + selectedPosition[1])}${selectedPosition[0] + 1}.
          ${legalMoves.length} legal moves available.
          ${canSelectedPieceMoveOffBoard ? 'Can move off-board to score.' : ''}`
        )}
      </div>
    </div>
  );
};
