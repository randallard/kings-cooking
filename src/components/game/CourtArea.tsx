/**
 * @fileoverview King's Court area showing scored and captured pieces
 * @module components/game/CourtArea
 */

import { type ReactElement } from 'react';
import type { Piece, PieceType } from '@/lib/validation/schemas';
import { OffBoardButton } from './OffBoardButton';
import styles from './CourtArea.module.css';

interface CourtAreaProps {
  /** Owner of this court (light/dark) */
  courtOwner: 'light' | 'dark';
  /** Pieces that have scored in this court (opponent's pieces) */
  scoredPieces: Piece[];
  /** Pieces that were captured and returned to their own court */
  capturedPieces: Piece[];
  /** Is off-board button enabled */
  canMoveOffBoard: boolean;
  /** Callback for off-board move */
  onOffBoardMove: () => void;
  /** Current player's turn */
  currentPlayer: 'light' | 'dark';
  /** Selected piece type (if any) */
  selectedPieceType: PieceType | null;
}

/**
 * Unicode chess piece symbols.
 * Light pieces use OUTLINED symbols, dark pieces use FILLED symbols.
 */
const PIECE_UNICODE: Record<string, { light: string; dark: string }> = {
  rook: { light: '♖', dark: '♜' },
  knight: { light: '♘', dark: '♞' },
  bishop: { light: '♗', dark: '♝' },
  queen: { light: '♕', dark: '♛' },
  pawn: { light: '♙', dark: '♟' },
  king: { light: '♔', dark: '♚' },
};

/**
 * Get Unicode icon for piece.
 * Returns different symbols for light (outlined) vs dark (filled) pieces.
 *
 * @param piece - Piece to get icon for
 * @returns Unicode chess piece character
 */
function getPieceIcon(piece: Piece): string {
  const symbols = PIECE_UNICODE[piece.type];
  if (!symbols) return '?';
  return piece.owner === 'light' ? symbols.light : symbols.dark;
}

/**
 * King's Court area component.
 *
 * Displays:
 * - Court label (e.g., "Dark King's Court")
 * - Scored pieces (opponent's pieces that made it to this court)
 * - Captured pieces (this court owner's pieces that were captured)
 * - Off-board button (when it's opponent's turn and they can score)
 *
 * Layout:
 * - Dark King's Court appears ABOVE the board (light pieces score here)
 * - Light King's Court appears BELOW the board (dark pieces score here)
 *
 * @component
 * @example
 * ```tsx
 * <CourtArea
 *   courtOwner="dark"
 *   scoredPieces={gameState.lightCourt}
 *   capturedPieces={gameState.capturedDark}
 *   canMoveOffBoard={canLightPieceScore}
 *   onOffBoardMove={handleOffBoard}
 *   currentPlayer="light"
 *   selectedPieceType="rook"
 * />
 * ```
 */
export const CourtArea = ({
  courtOwner,
  scoredPieces,
  capturedPieces,
  canMoveOffBoard,
  onOffBoardMove,
  currentPlayer,
  selectedPieceType,
}: CourtAreaProps): ReactElement => {
  // Determine if this court should show button
  // Light scores in Dark's court, Dark scores in Light's court
  const isTargetCourt = currentPlayer !== courtOwner;

  return (
    <div className={styles.courtArea}>
      <div className={styles.courtLabel}>
        {courtOwner === 'light' ? 'Light' : 'Dark'} King's Court
      </div>

      <div className={styles.piecesContainer}>
        {/* Scored pieces (opponent pieces that made it here) */}
        <div className={styles.scoredSection}>
          <span className={styles.sectionLabel}>Scored:</span>
          <div className={styles.pieceList}>
            {scoredPieces.length === 0 ? (
              <span className={styles.emptyText}>None</span>
            ) : (
              scoredPieces.map((piece, index) => (
                <span
                  key={`scored-${index}`}
                  className={styles.pieceIcon}
                  title={`${piece.owner} ${piece.type}`}
                >
                  {getPieceIcon(piece)}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Captured pieces (this court owner's pieces that were caught) */}
        <div className={styles.capturedSection}>
          <span className={styles.sectionLabel}>Caught:</span>
          <div className={styles.pieceList}>
            {capturedPieces.length === 0 ? (
              <span className={styles.emptyText}>None</span>
            ) : (
              capturedPieces.map((piece, index) => (
                <span
                  key={`captured-${index}`}
                  className={styles.pieceIcon}
                  title={`${piece.owner} ${piece.type} (captured)`}
                >
                  {getPieceIcon(piece)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Off-board button - always visible for target court */}
      {isTargetCourt && (
        <div className={styles.buttonContainer}>
          <OffBoardButton
            onOffBoardMove={onOffBoardMove}
            disabled={!canMoveOffBoard}
            pieceType={selectedPieceType}
            courtOwner={courtOwner}
          />
        </div>
      )}
    </div>
  );
};
