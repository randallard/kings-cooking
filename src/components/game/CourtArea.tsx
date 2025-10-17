/**
 * @fileoverview King's Court area showing scored and captured pieces
 * @module components/game/CourtArea
 */

import { type ReactElement } from 'react';
import type { Piece } from '@/lib/validation/schemas';
import { OffBoardButton } from './OffBoardButton';
import styles from './CourtArea.module.css';

interface CourtAreaProps {
  /** Owner of this court (white/black) */
  courtOwner: 'white' | 'black';
  /** Pieces that have scored in this court (opponent's pieces) */
  scoredPieces: Piece[];
  /** Pieces that were captured and returned to their own court */
  capturedPieces: Piece[];
  /** Is off-board button enabled */
  canMoveOffBoard: boolean;
  /** Callback for off-board move */
  onOffBoardMove: () => void;
  /** Current player's turn */
  currentPlayer: 'white' | 'black';
  /** Selected piece type (if any) */
  selectedPieceType: 'rook' | 'knight' | 'bishop' | null;
}

// Helper: Unicode piece lookup
const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
  rook: { white: '♜', black: '♖' },
  knight: { white: '♞', black: '♘' },
  bishop: { white: '♝', black: '♗' },
};

/**
 * Get Unicode icon for piece.
 *
 * @param piece - Piece to get icon for
 * @returns Unicode chess piece character
 */
function getPieceIcon(piece: Piece): string {
  const icons = PIECE_UNICODE[piece.type];
  if (!icons) return '?';
  return piece.owner === 'white' ? icons.white : icons.black;
}

/**
 * King's Court area component.
 *
 * Displays:
 * - Court label (e.g., "Black King's Court")
 * - Scored pieces (opponent's pieces that made it to this court)
 * - Captured pieces (this court owner's pieces that were captured)
 * - Off-board button (when it's opponent's turn and they can score)
 *
 * Layout:
 * - Black King's Court appears ABOVE the board (white pieces score here)
 * - White King's Court appears BELOW the board (black pieces score here)
 *
 * @component
 * @example
 * ```tsx
 * <CourtArea
 *   courtOwner="black"
 *   scoredPieces={gameState.whiteCourt}
 *   capturedPieces={gameState.capturedBlack}
 *   canMoveOffBoard={canWhitePieceScore}
 *   onOffBoardMove={handleOffBoard}
 *   currentPlayer="white"
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
  // White scores in Black's court, Black scores in White's court
  const isTargetCourt = currentPlayer !== courtOwner;

  return (
    <div className={styles.courtArea}>
      <div className={styles.courtLabel}>
        {courtOwner === 'white' ? 'White' : 'Black'} King's Court
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

      {/* Off-board button - only show for target court */}
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
