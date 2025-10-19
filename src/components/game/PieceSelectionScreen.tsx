/**
 * @fileoverview Main piece selection screen component
 * @module components/game/PieceSelectionScreen
 */

import { type ReactElement, useState, useEffect } from 'react';
import type { PieceSelectionPhase, GameFlowAction } from '@/types/gameFlow';
import type { PieceType, SelectedPieces } from '@/lib/pieceSelection/types';
import { getAvailablePieces, generateRandomPieces } from '@/lib/pieceSelection/logic';
import { PIECE_POOL } from '@/lib/pieceSelection/types';
import { PiecePickerModal } from './PiecePickerModal';
import styles from './PieceSelectionScreen.module.css';

interface PieceSelectionScreenProps {
  /** Current piece selection state */
  state: PieceSelectionPhase;
  /** Dispatch function for game flow actions */
  dispatch: (action: GameFlowAction) => void;
}

/**
 * Piece selection screen component.
 *
 * Features:
 * - Mode selection (mirrored/independent/random)
 * - 3x3 board grid (top row clickable for piece selection)
 * - PiecePickerModal integration
 * - First mover selection
 * - Start game button when complete
 * - Full accessibility (ARIA, keyboard nav)
 *
 * @component
 */
export function PieceSelectionScreen({
  state,
  dispatch,
}: PieceSelectionScreenProps): ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Handle random mode auto-generation
  useEffect(() => {
    if (state.selectionMode === 'random' && !state.player1Pieces) {
      const seed = `${state.player1Name}-${state.player2Name}-${Date.now()}`;
      const pieces = generateRandomPieces(seed);

      dispatch({
        type: 'SET_PLAYER_PIECES',
        player: 'player1',
        pieces,
      });
      dispatch({
        type: 'SET_PLAYER_PIECES',
        player: 'player2',
        pieces,
      });
    }
  }, [state.selectionMode, state.player1Pieces, state.player1Name, state.player2Name, dispatch]);

  const handleModeSelect = (mode: 'mirrored' | 'independent' | 'random') => {
    dispatch({
      type: 'SET_SELECTION_MODE',
      mode,
    });
  };

  const handlePositionClick = (position: number) => {
    setSelectedPosition(position);
    setModalOpen(true);
  };

  const handlePieceSelect = (piece: PieceType) => {
    if (selectedPosition === null) return;

    // Build new pieces array
    const currentPieces = state.player1Pieces || [null, null, null];
    const newPieces: SelectedPieces = [
      selectedPosition === 0 ? piece : currentPieces[0] ?? null,
      selectedPosition === 1 ? piece : currentPieces[1] ?? null,
      selectedPosition === 2 ? piece : currentPieces[2] ?? null,
    ] as unknown as SelectedPieces;

    dispatch({
      type: 'SET_PLAYER_PIECES',
      player: 'player1',
      pieces: newPieces,
    });

    // In mirrored mode, also set player2 pieces
    if (state.selectionMode === 'mirrored') {
      dispatch({
        type: 'SET_PLAYER_PIECES',
        player: 'player2',
        pieces: newPieces,
      });
    }

    setModalOpen(false);
    setSelectedPosition(null);
  };

  const handleFirstMoverSelect = (mover: 'player1' | 'player2') => {
    dispatch({
      type: 'SET_FIRST_MOVER',
      mover,
    });
  };

  const handleStartGame = () => {
    dispatch({
      type: 'COMPLETE_PIECE_SELECTION',
    });
  };

  // Calculate available pieces for picker modal
  const getAvailableForPosition = (): PieceType[] => {
    const currentPieces = state.player1Pieces || [null, null, null];
    const selected: PieceType[] = currentPieces.filter((p): p is PieceType => p !== null);
    return getAvailablePieces(selected);
  };

  // Check if selection is complete
  const isComplete =
    state.selectionMode !== null &&
    state.player1Pieces !== null &&
    state.player2Pieces !== null &&
    state.player1Pieces.every((p) => p !== null) &&
    state.player2Pieces.every((p) => p !== null) &&
    state.firstMover !== null;

  const needsFirstMover =
    state.selectionMode !== null &&
    state.player1Pieces !== null &&
    state.player2Pieces !== null &&
    state.player1Pieces.every((p) => p !== null) &&
    state.player2Pieces.every((p) => p !== null) &&
    state.firstMover === null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Piece Selection</h1>
      <p className={styles.subtitle}>
        {state.player1Name} vs {state.player2Name || 'Player 2'}
      </p>

      {/* Mode Selection */}
      {state.selectionMode === null && (
        <div className={styles.modeSelection}>
          <h2 className={styles.sectionTitle}>Choose Selection Mode</h2>
          <div className={styles.modeButtons}>
            <button
              type="button"
              onClick={() => handleModeSelect('mirrored')}
              className={styles.modeButton}
            >
              <span className={styles.modeIcon}>🔃</span>
              <span className={styles.modeName}>Mirrored</span>
              <span className={styles.modeDescription}>
                Same pieces for both players
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect('independent')}
              className={styles.modeButton}
            >
              <span className={styles.modeIcon}>⚔️</span>
              <span className={styles.modeName}>Independent</span>
              <span className={styles.modeDescription}>
                Each player chooses their own pieces
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect('random')}
              className={styles.modeButton}
            >
              <span className={styles.modeIcon}>🎲</span>
              <span className={styles.modeName}>Random</span>
              <span className={styles.modeDescription}>
                Randomly generated identical pieces
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Board Grid */}
      {state.selectionMode !== null && state.selectionMode !== 'random' && (
        <div className={styles.boardSection}>
          <h2 className={styles.sectionTitle}>Select Your Pieces</h2>
          <p className={styles.instruction}>Click each position to choose a piece</p>

          <div className={styles.board}>
            {/* Row 0: Player pieces (clickable) */}
            <div className={styles.row}>
              {[0, 1, 2].map((col) => {
                const piece = state.player1Pieces?.[col];
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handlePositionClick(col)}
                    className={styles.cell}
                    aria-label={`Position ${col + 1}${piece ? `: ${piece}` : ' (empty)'}`}
                  >
                    {piece ? (
                      <span className={styles.pieceIcon} aria-hidden="true">
                        {PIECE_POOL[piece].unicode.light}
                      </span>
                    ) : (
                      <span className={styles.emptyCell}>{col + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Row 1: Empty middle row */}
            <div className={styles.row}>
              {[0, 1, 2].map((col) => (
                <div key={col} className={styles.emptyRow} />
              ))}
            </div>

            {/* Row 2: Opponent pieces (display only) */}
            <div className={styles.row}>
              {[0, 1, 2].map((col) => {
                const piece = state.player2Pieces?.[col];
                return (
                  <div key={col} className={styles.cellDisplay}>
                    {piece && (
                      <span className={styles.pieceIcon} aria-hidden="true">
                        {PIECE_POOL[piece].unicode.dark}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Random mode display */}
      {state.selectionMode === 'random' && state.player1Pieces && (
        <div className={styles.boardSection}>
          <h2 className={styles.sectionTitle}>Random Pieces Generated</h2>
          <div className={styles.randomDisplay}>
            {state.player1Pieces.map((piece, index) => (
              <div key={index} className={styles.randomPiece}>
                <span className={styles.pieceIcon}>{PIECE_POOL[piece].unicode.light}</span>
                <span className={styles.pieceName}>{piece}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First Mover Selection */}
      {needsFirstMover && (
        <div className={styles.firstMoverSection}>
          <h2 className={styles.sectionTitle}>Who Goes First?</h2>
          <p className={styles.instruction}>First player gets light pieces</p>
          <div className={styles.firstMoverButtons}>
            <button
              type="button"
              onClick={() => handleFirstMoverSelect('player1')}
              className={styles.firstMoverButton}
            >
              {state.player1Name}
            </button>
            <button
              type="button"
              onClick={() => handleFirstMoverSelect('player2')}
              className={styles.firstMoverButton}
            >
              {state.player2Name || 'Player 2'}
            </button>
          </div>
        </div>
      )}

      {/* Start Game Button */}
      {isComplete && (
        <div className={styles.startSection}>
          <button
            type="button"
            onClick={handleStartGame}
            className={styles.startButton}
          >
            Start Game
          </button>
        </div>
      )}

      {/* Piece Picker Modal */}
      <PiecePickerModal
        isOpen={modalOpen}
        availablePieces={getAvailableForPosition()}
        onSelect={handlePieceSelect}
        onClose={() => {
          setModalOpen(false);
          setSelectedPosition(null);
        }}
        position={selectedPosition ?? 0}
      />
    </div>
  );
}
