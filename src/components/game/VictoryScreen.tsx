/**
 * @fileoverview Victory screen for game end celebration
 * @module components/game/VictoryScreen
 */

import { useState, useEffect, type ReactElement } from 'react';
import type { Piece, PieceType } from '@/lib/validation/schemas';
import { URLSharer } from './URLSharer';
import styles from './VictoryScreen.module.css';

// Storage key constant
const VICTORY_URL_COPIED_KEY = 'kings-cooking:victory-url-copied';

interface VictoryScreenProps {
  /** Winner of the game */
  winner: 'light' | 'dark' | 'draw';
  /** Winner's player name */
  winnerName?: string;
  /** Loser's player name */
  loserName?: string;
  /** Light player's name (for stats section) */
  player1Name?: string;
  /** Dark player's name (for stats section) */
  player2Name?: string;
  /** Total number of moves in the game */
  totalMoves: number;
  /** Light pieces in Dark's court (scored by light) */
  lightCourt: Piece[];
  /** Dark pieces in Light's court (scored by dark) */
  darkCourt: Piece[];
  /** Light player's captured pieces */
  capturedLight: Piece[];
  /** Dark player's captured pieces */
  capturedDark: Piece[];
  /** Game board to check for auto-scored pieces */
  board: (Piece | null)[][];
  /** Shareable URL for game result */
  shareUrl?: string;
  /** Callback for reviewing moves */
  onReviewMoves?: () => void;
  /** Callback for starting a new game */
  onNewGame?: () => void;
}

/**
 * Victory screen component for game end celebration.
 *
 * Features:
 * - Winner announcement with celebration message
 * - Game statistics (moves, duration, captures)
 * - CSS confetti animation
 * - Action buttons (New Game, Share Result, Review Moves)
 * - Accessibility support
 * - Dark mode support
 *
 * Accessibility:
 * - ARIA role="dialog" for modal overlay
 * - Semantic heading structure
 * - Clear focus indicators
 * - Keyboard navigation
 *
 * @component
 * @example
 * ```tsx
 * <VictoryScreen
 *   winner="light"
 *   winnerName="Alice"
 *   loserName="Bob"
 *   totalMoves={42}
 *   gameDuration={1234}
 *   whiteCaptured={5}
 *   blackCaptured={3}
 *   onNewGame={() => startNewGame()}
 *   onShare={() => shareResult()}
 *   onReviewMoves={() => showMoveHistory()}
 * />
 * ```
 */
export const VictoryScreen = ({
  winner,
  winnerName,
  loserName,
  player1Name,
  player2Name,
  totalMoves,
  lightCourt,
  darkCourt,
  capturedLight,
  capturedDark,
  board,
  shareUrl,
  onReviewMoves,
  onNewGame,
}: VictoryScreenProps): ReactElement => {

  // Track whether URL has been copied (URL mode only)
  const [urlWasCopied, setUrlWasCopied] = useState(false);

  /**
   * Check localStorage on mount for URL copied flag.
   * This allows button to appear when user returns after sharing.
   */
  useEffect(() => {
    if (shareUrl) {
      const flag = localStorage.getItem(VICTORY_URL_COPIED_KEY);
      setUrlWasCopied(flag === 'true');
    }
  }, [shareUrl]);

  /**
   * Handle Copy button click - set flag in localStorage.
   */
  const handleUrlCopied = (): void => {
    localStorage.setItem(VICTORY_URL_COPIED_KEY, 'true');
    setUrlWasCopied(true);
  };

  /**
   * Determine if New Game button should be shown.
   * - Hot-seat mode: Always show if onNewGame provided
   * - URL mode: Show only if URL was copied
   */
  const showNewGameButton = onNewGame && (!shareUrl || urlWasCopied);

  // Extract auto-scored pieces (pieces still on board when game ended)
  const getAutoScoredPieces = (owner: 'light' | 'dark'): Piece[] => {
    const pieces: Piece[] = [];
    for (let row = 0; row < board.length; row++) {
      const boardRow = board[row];
      if (!boardRow) continue;
      for (let col = 0; col < boardRow.length; col++) {
        const piece = boardRow[col];
        if (piece && piece.owner === owner) {
          pieces.push(piece);
        }
      }
    }
    return pieces;
  };

  const whiteAutoScored = getAutoScoredPieces('light');
  const blackAutoScored = getAutoScoredPieces('dark');

  // Get celebration message based on winner
  const getCelebrationMessage = (): string => {
    if (winner === 'draw') {
      return "It's a Draw!";
    }
    const winnerColor = winner === 'light' ? 'Light' : 'Dark';
    return `${winnerColor} Wins!`;
  };

  // Get subtitle message
  const getSubtitle = (): string => {
    if (winner === 'draw') {
      return 'Both players played exceptionally well!';
    }
    if (winnerName && loserName) {
      return `${winnerName} defeated ${loserName}`;
    }
    const winnerColor = winner === 'light' ? 'Light' : 'Dark';
    return `${winnerColor} is victorious!`;
  };

  // Get piece symbol for display
  // Light pieces use OUTLINED symbols, dark pieces use FILLED symbols
  const getPieceSymbol = (piece: Piece): string => {
    const symbols: Record<string, { light: string; dark: string }> = {
      rook: { light: '♖', dark: '♜' },
      knight: { light: '♘', dark: '♞' },
      bishop: { light: '♗', dark: '♝' },
      queen: { light: '♕', dark: '♛' },
      pawn: { light: '♙', dark: '♟' },
      king: { light: '♔', dark: '♚' },
    };
    const pieceSymbols = symbols[piece.type];
    if (!pieceSymbols) return '?';
    return piece.owner === 'light' ? pieceSymbols.light : pieceSymbols.dark;
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      aria-describedby="victory-subtitle"
    >
      {/* Confetti animation */}
      {winner !== 'draw' && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className={styles.confettiPiece} />
          ))}
        </div>
      )}

      <div className={styles.container}>
        {/* Title */}
        <h1 id="victory-title" className={styles.title}>
          {getCelebrationMessage()}
        </h1>

        {/* Subtitle */}
        <p id="victory-subtitle" className={styles.subtitle}>
          {getSubtitle()}
        </p>

        {/* NEW GAME BUTTON - Hot-seat mode always shows, URL mode conditional */}
        {showNewGameButton && (
          <div className={styles.newGameSection}>
            <button
              type="button"
              onClick={onNewGame}
              className={`${styles.button} ${styles.primaryButton}`}
              aria-label="Start a new game and return to mode selection"
              data-testid="new-game-button"
            >
              New Game
            </button>
          </div>
        )}

        {/* URL Sharing - shown immediately in URL mode */}
        {shareUrl && (
          <div style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
            <URLSharer
              url={shareUrl}
              onCopy={handleUrlCopied}
            />
          </div>
        )}

        {/* Game Statistics */}
        <div className={styles.stats}>
          <h2 className={styles.statsTitle}>Game Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Moves</span>
              <span className={styles.statValue}>{totalMoves}</span>
            </div>
          </div>

          {/* Light Player Stats */}
          <div className={styles.playerStats}>
            <h3 className={styles.playerStatsTitle}>{player1Name || 'Light Player (Player 1)'}</h3>
            <div className={styles.courtSection}>
              <div className={styles.courtLabel}>
                <strong>Scored in Dark's Court:</strong> {lightCourt.length} piece{lightCourt.length !== 1 ? 's' : ''}
              </div>
              {lightCourt.length > 0 && (
                <div className={styles.piecesList}>
                  {lightCourt.map((piece, idx) => (
                    <span key={`light-court-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {whiteAutoScored.length > 0 && (
              <div className={styles.autoScoredSection}>
                <div className={styles.autoScoredLabel}>
                  <strong>Auto-scored (on board at game end):</strong> {whiteAutoScored.length} piece{whiteAutoScored.length !== 1 ? 's' : ''}
                </div>
                <div className={styles.piecesList}>
                  {whiteAutoScored.map((piece, idx) => (
                    <span key={`light-auto-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.capturedSection}>
              <div className={styles.capturedLabel}>
                <strong>Captured:</strong> {capturedLight.length} piece{capturedLight.length !== 1 ? 's' : ''}
              </div>
              {capturedLight.length > 0 && (
                <div className={styles.piecesList}>
                  {capturedLight.map((piece, idx) => (
                    <span key={`light-captured-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dark Player Stats */}
          <div className={styles.playerStats}>
            <h3 className={styles.playerStatsTitle}>{player2Name || 'Dark Player (Player 2)'}</h3>
            <div className={styles.courtSection}>
              <div className={styles.courtLabel}>
                <strong>Scored in Light's Court:</strong> {darkCourt.length} piece{darkCourt.length !== 1 ? 's' : ''}
              </div>
              {darkCourt.length > 0 && (
                <div className={styles.piecesList}>
                  {darkCourt.map((piece, idx) => (
                    <span key={`dark-court-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {blackAutoScored.length > 0 && (
              <div className={styles.autoScoredSection}>
                <div className={styles.autoScoredLabel}>
                  <strong>Auto-scored (on board at game end):</strong> {blackAutoScored.length} piece{blackAutoScored.length !== 1 ? 's' : ''}
                </div>
                <div className={styles.piecesList}>
                  {blackAutoScored.map((piece, idx) => (
                    <span key={`dark-auto-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.capturedSection}>
              <div className={styles.capturedLabel}>
                <strong>Captured:</strong> {capturedDark.length} piece{capturedDark.length !== 1 ? 's' : ''}
              </div>
              {capturedDark.length > 0 && (
                <div className={styles.piecesList}>
                  {capturedDark.map((piece, idx) => (
                    <span key={`dark-captured-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          {onReviewMoves && (
            <button
              type="button"
              onClick={onReviewMoves}
              className={`${styles.button} ${styles.secondaryButton}`}
              aria-label="Review game moves"
            >
              Review Moves
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
