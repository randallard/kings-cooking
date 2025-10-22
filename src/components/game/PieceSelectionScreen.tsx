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
import { HandoffScreen } from './HandoffScreen';
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

  // Track which player is currently selecting pieces in independent mode
  const [currentSelector, setCurrentSelector] = useState<'player1' | 'player2' | 'complete'>('player1');

  // Track handoff screen visibility (independent mode only)
  const [showHandoff, setShowHandoff] = useState(false);

  // Detect when both players have completed selection in independent mode
  useEffect((): void => {
    if (
      state.selectionMode === 'independent' &&
      state.player1Pieces?.every((p) => p !== null) &&
      state.player2Pieces?.every((p) => p !== null) &&
      currentSelector !== 'complete'
    ) {
      setCurrentSelector('complete');
    }
  }, [state.selectionMode, state.player1Pieces, state.player2Pieces, currentSelector]);

  // Handle random mode auto-generation
  useEffect((): void => {
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

  const handleModeSelect = (mode: 'mirrored' | 'independent' | 'random'): void => {
    dispatch({
      type: 'SET_SELECTION_MODE',
      mode,
    });
  };

  const handlePositionClick = (position: number): void => {
    setSelectedPosition(position);
    setModalOpen(true);
  };

  const handlePieceSelect = (piece: PieceType): void => {
    if (selectedPosition === null) return;

    // Determine which player is selecting
    const isPlayer1Selecting = currentSelector === 'player1';
    const currentPieces = isPlayer1Selecting
      ? (state.player1Pieces || [null, null, null])
      : (state.player2Pieces || [null, null, null]);

    // Build new pieces array
    const newPieces: SelectedPieces = [
      selectedPosition === 0 ? piece : currentPieces[0] ?? null,
      selectedPosition === 1 ? piece : currentPieces[1] ?? null,
      selectedPosition === 2 ? piece : currentPieces[2] ?? null,
    ] as unknown as SelectedPieces;

    // Dispatch to correct player
    dispatch({
      type: 'SET_PLAYER_PIECES',
      player: isPlayer1Selecting ? 'player1' : 'player2',
      pieces: newPieces,
    });

    // In mirrored mode, also set player2 pieces (existing behavior)
    if (state.selectionMode === 'mirrored' && isPlayer1Selecting) {
      dispatch({
        type: 'SET_PLAYER_PIECES',
        player: 'player2',
        pieces: newPieces,
      });
    }

    // Check if current player has completed selection (all 3 pieces chosen)
    const allPiecesSelected = newPieces.every((p) => p !== null);

    if (allPiecesSelected && state.selectionMode === 'independent') {
      if (currentSelector === 'player1') {
        // Player 1 done → Show handoff
        setShowHandoff(true);
      } else if (currentSelector === 'player2') {
        // Player 2 done → Mark complete
        setCurrentSelector('complete');
      }
    }

    setModalOpen(false);
    setSelectedPosition(null);
  };

  const handleHandoffContinue = (): void => {
    setShowHandoff(false);
    setCurrentSelector('player2');
  };

  const handleStartGame = (): void => {
    dispatch({
      type: 'COMPLETE_PIECE_SELECTION',
    });
  };

  // Calculate available pieces for picker modal
  const getAvailableForPosition = (): PieceType[] => {
    const currentPieces = state.player1Pieces || [null, null, null];

    // Exclude the piece at the currently selected position so it can be changed
    const selected: PieceType[] = currentPieces
      .map((piece, index) => (index === selectedPosition ? null : piece))
      .filter((p): p is PieceType => p !== null);

    return getAvailablePieces(selected);
  };

  // Check if selection is complete
  const isComplete =
    state.selectionMode !== null &&
    state.player1Pieces !== null &&
    state.player2Pieces !== null &&
    state.player1Pieces.every((p) => p !== null) &&
    state.player2Pieces.every((p) => p !== null) &&
    // In independent mode, also check that both players have finished (currentSelector === 'complete')
    (state.selectionMode !== 'independent' || currentSelector === 'complete');

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
          <p className={styles.instruction}>Click any position to choose or change a piece</p>

          <div className={styles.board}>
            {/* Row 0: Top row - shows dark pieces (player2 if p1=light, player1 if p1=dark) */}
            <div className={styles.row}>
              {[0, 1, 2].map((col) => {
                // If player1 chose light, show player2's dark pieces on top (display only)
                // If player1 chose dark, show player1's pieces on top (clickable)
                const isPlayer1Row = state.player1Color === 'dark';
                const piece = isPlayer1Row ? state.player1Pieces?.[col] : state.player2Pieces?.[col];
                // Chess board pattern: Row 0 is [dark, light, dark]
                const squareColor = col % 2 === 0 ? 'darkSquare' : 'lightSquare';

                if (isPlayer1Row) {
                  // Player 1 chose dark - top row is clickable for piece selection
                  // Blind selection: hide Player 1's pieces during and after Player 2's turn in independent mode
                  const shouldHidePlayer1Pieces =
                    (currentSelector === 'player2' || currentSelector === 'complete') &&
                    state.selectionMode === 'independent';
                  const displayPiece = shouldHidePlayer1Pieces ? null : piece;

                  // During Player 2's turn or when complete, make this row non-clickable (Player 1's pieces)
                  if (shouldHidePlayer1Pieces) {
                    return (
                      <div key={col} className={`${styles.cellDisplay} ${styles[squareColor]}`}>
                        {/* Hidden - Player 1's pieces remain secret */}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handlePositionClick(col)}
                      className={`${styles.cell} ${styles[squareColor]}`}
                      aria-label={`Position ${col + 1}${displayPiece ? `: ${displayPiece}` : ' (empty)'}`}
                    >
                      {displayPiece ? (
                        <span className={styles.pieceIcon} aria-hidden="true">
                          {PIECE_POOL[displayPiece].unicode.dark}
                        </span>
                      ) : (
                        <span className={styles.emptyCell}>{col + 1}</span>
                      )}
                    </button>
                  );
                } else {
                  // Player 1 chose light - top row shows opponent's dark pieces
                  // In independent mode during/after Player 2's turn, make this row clickable for Player 2
                  const isPlayer2Selecting =
                    (currentSelector === 'player2' || currentSelector === 'complete') &&
                    state.selectionMode === 'independent';

                  if (isPlayer2Selecting) {
                    // Player 2 is selecting or can change their pieces - make top row clickable
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handlePositionClick(col)}
                        className={`${styles.cell} ${styles[squareColor]}`}
                        aria-label={`Position ${col + 1}${piece ? `: ${piece}` : ' (empty)'}`}
                      >
                        {piece ? (
                          <span className={styles.pieceIcon} aria-hidden="true">
                            {PIECE_POOL[piece].unicode.dark}
                          </span>
                        ) : (
                          <span className={styles.emptyCell}>{col + 1}</span>
                        )}
                      </button>
                    );
                  } else {
                    // Display only (Player 1 selecting or other modes)
                    return (
                      <div key={col} className={`${styles.cellDisplay} ${styles[squareColor]}`}>
                        {piece && (
                          <span className={styles.pieceIcon} aria-hidden="true">
                            {PIECE_POOL[piece].unicode.dark}
                          </span>
                        )}
                      </div>
                    );
                  }
                }
              })}
            </div>

            {/* Row 1: Empty middle row */}
            <div className={styles.row}>
              {[0, 1, 2].map((col) => (
                <div key={col} className={styles.emptyRow} />
              ))}
            </div>

            {/* Row 2: Bottom row - shows light pieces (player1 if p1=light, player2 if p1=dark) */}
            <div className={styles.row}>
              {[0, 1, 2].map((col) => {
                // If player1 chose light, show player1's pieces on bottom (clickable)
                // If player1 chose dark, show player2's light pieces on bottom (display only)
                const isPlayer1Row = state.player1Color === 'light';
                const piece = isPlayer1Row ? state.player1Pieces?.[col] : state.player2Pieces?.[col];
                // Chess board pattern: Row 2 is [dark, light, dark] (same as row 0)
                const squareColor = col % 2 === 0 ? 'darkSquare' : 'lightSquare';

                if (isPlayer1Row) {
                  // Player 1 chose light - bottom row is clickable for piece selection
                  // Blind selection: hide Player 1's pieces during and after Player 2's turn in independent mode
                  const shouldHidePlayer1Pieces =
                    (currentSelector === 'player2' || currentSelector === 'complete') &&
                    state.selectionMode === 'independent';
                  const displayPiece = shouldHidePlayer1Pieces ? null : piece;

                  // During/after Player 2's turn, make bottom row display-only (they select from top row)
                  if (shouldHidePlayer1Pieces) {
                    return (
                      <div key={col} className={`${styles.cellDisplay} ${styles[squareColor]}`}>
                        {/* Empty - Player 2 can't see Player 1's pieces */}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handlePositionClick(col)}
                      className={`${styles.cell} ${styles[squareColor]}`}
                      aria-label={`Position ${col + 1}${displayPiece ? `: ${displayPiece}` : ' (empty)'}`}
                    >
                      {displayPiece ? (
                        <span className={styles.pieceIcon} aria-hidden="true">
                          {PIECE_POOL[displayPiece].unicode.light}
                        </span>
                      ) : (
                        <span className={styles.emptyCell}>{col + 1}</span>
                      )}
                    </button>
                  );
                } else {
                  // Player 1 chose dark - bottom row shows opponent's light pieces (display only)
                  return (
                    <div key={col} className={`${styles.cellDisplay} ${styles[squareColor]}`}>
                      {piece && (
                        <span className={styles.pieceIcon} aria-hidden="true">
                          {PIECE_POOL[piece].unicode.light}
                        </span>
                      )}
                    </div>
                  );
                }
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
                <span className={styles.pieceIcon}>{PIECE_POOL[piece].unicode.dark}</span>
                <span className={styles.pieceName}>{piece}</span>
              </div>
            ))}
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

      {/* Handoff Screen (Independent Mode Only) */}
      {showHandoff && state.selectionMode === 'independent' && (
        <HandoffScreen
          nextPlayer="dark"  // Player 2 is always dark in piece selection
          nextPlayerName={state.player2Name || 'Player 2'}
          previousPlayer="light"  // Player 1 is always light
          previousPlayerName={state.player1Name}
          onContinue={handleHandoffContinue}
          countdownSeconds={3}
        />
      )}
    </div>
  );
}
