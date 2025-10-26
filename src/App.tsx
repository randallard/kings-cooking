import { ReactElement, useReducer, useEffect, useState, useCallback, useMemo } from 'react';
import { gameFlowReducer } from './lib/gameFlow/reducer';
import { storage, checkAndMigrateStorage } from './lib/storage/localStorage';
import { useUrlState } from './hooks/useUrlState';
import { ModeSelector } from './components/game/ModeSelector';
import { NameForm } from './components/game/NameForm';
import { ColorSelectionScreen } from './components/game/ColorSelectionScreen';
import { PieceSelectionScreen } from './components/game/PieceSelectionScreen';
import { GameBoard } from './components/game/GameBoard';
import { HandoffScreen } from './components/game/HandoffScreen';
import { VictoryScreen } from './components/game/VictoryScreen';
import { URLSharer } from './components/game/URLSharer';
import { StoryPanel } from './components/game/StoryPanel';
import { PlaybackControls } from './components/game/PlaybackControls';
import { PiecePickerModal } from './components/game/PiecePickerModal';
import { Player2NameEntryScreen } from './components/game/Player2NameEntryScreen';
import { KingsChessEngine } from './lib/chess/KingsChessEngine';
import { buildFullStateUrl } from './lib/urlEncoding/urlBuilder';
import type { GameState, Piece, Position, PieceType } from './lib/validation/schemas';

/**
 * Main App component for King's Cooking Chess Game.
 *
 * Implements a dual-mode chess game using the gameFlowReducer state machine:
 * - Hot-seat mode: Local multiplayer on same device
 * - URL mode: Remote multiplayer via shareable URLs
 *
 * Phase flow:
 * 1. mode-selection: Choose game mode
 * 2. setup: Player 1 enters name
 * 3. piece-selection: Choose pieces and first mover (mirrored/independent/random)
 * 4. playing: Active gameplay with move confirmation
 * 5. handoff: Transition between players (mode-specific UI)
 * 6. victory: Game end with statistics
 *
 * @returns App component
 */
export default function App(): ReactElement {
  /**
   * Game flow state machine.
   *
   * Manages 7 phases: mode-selection, setup, color-selection, piece-selection,
   * playing, handoff, victory.
   *
   * @see {@link GameFlowState} for phase definitions
   * @see {@link gameFlowReducer} for state transition logic
   * @see {@link docs/ARCHITECTURE.md} for state machine diagram
   */
  const [state, dispatch] = useReducer(gameFlowReducer, { phase: 'mode-selection' });

  /**
   * Story panel visibility state.
   *
   * Controls overlay modal showing game story and instructions.
   * Automatically shown once per player in hot-seat mode, once per device in URL mode.
   *
   * @see {@link StoryPanel} component
   */
  const [showStoryPanel, setShowStoryPanel] = useState(false);

  /**
   * Handoff step tracking for Player 2 name collection (hot-seat mode only).
   *
   * Two-step flow after Player 1's first move:
   * 1. handoffStepCompleted=false: Show HandoffScreen (privacy screen)
   * 2. handoffStepCompleted=true: Show Player2NameEntryScreen
   *
   * Reset to false on phase change to handoff.
   *
   * @see {@link Player2NameEntryScreen}
   * @see {@link HandoffScreen}
   */
  const [handoffStepCompleted, setHandoffStepCompleted] = useState(false);

  /**
   * History navigation state (null = at latest move).
   *
   * Controls history playback feature:
   * - null: Viewing current game state (board is interactive)
   * - number: Viewing past move at index (board is read-only)
   *
   * Always initialize to null on mount to show current game state.
   * Reset to null when entering playing phase.
   *
   * @see {@link PlaybackControls}
   * @see {@link reconstructGameStateAtMove}
   */
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  /** Derived state: are we viewing history? */
  const isViewingHistory = historyIndex !== null;

  /**
   * Promotion state for pawn promotion flow.
   *
   * When pawn reaches promotion row, stores move details and engine state
   * to show PiecePickerModal. User selects promotion piece (queen/rook/bishop/knight),
   * then move is completed with selected piece.
   *
   * @see {@link PiecePickerModal}
   * @see {@link handlePromotionSelect}
   */
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Position;
    to: Position;
    engine: KingsChessEngine;
  } | null>(null);

  // Reset history view when phase changes or game loads
  useEffect(() => {
    // Reset to current view when entering playing phase (page refresh or new game)
    if (state.phase === 'playing') {
      setHistoryIndex(null);
    }
  }, [state.phase]);

  // URL state hook (Task 7) - enabled only in URL mode
  const {
    updateUrlImmediate,
    getShareUrl,
  } = useUrlState({
    onPayloadReceived: (payload) => {
      // When URL payload is received, dispatch LOAD_FROM_URL action
      // All payloads are now full_state (no delta payloads)
      if (payload.type === 'full_state') {
        dispatch({ type: 'LOAD_FROM_URL', payload });
      }
    },
    onError: (error) => {
      console.error('URL state error:', error);
      // TODO: Show error toast to user
    },
  });

  // Storage migration check
  useEffect(() => {
    // Check and migrate storage if needed (Issue #4 - light/dark refactor)
    const migrated = checkAndMigrateStorage();
    if (migrated) {
      console.log('📦 Storage migrated to v2.0.0 - cleared old game data (white/black → light/dark)');
    }
    // Note: Game state is no longer persisted to localStorage
    // URLs now contain full game state for persistence
  }, []); // Empty deps - only run on mount

  // Generate initial URL when Player 1 finishes piece selection in URL mode
  useEffect(() => {
    if (state.phase === 'handoff') {
      const handoffState = state;
      if (
        handoffState.mode === 'url' &&
        handoffState.gameState &&
        !handoffState.generatedUrl &&
        storage.getMyName() // Only for Player 1 who has a saved name
      ) {
        // Generate initial URL with starting game state (no moves yet)
        const fullStatePayload = {
          type: 'full_state' as const,
          gameState: handoffState.gameState,
          playerName: handoffState.player1Name || undefined,
        };
        updateUrlImmediate(fullStatePayload);
        const url = getShareUrl();
        dispatch({ type: 'URL_GENERATED', url });

        console.log('✅ Initial URL generated for Player 1 after piece selection');
      }
    }
  }, [state]);

  // Task 9: Browser back button handling
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (state.phase === 'playing' || state.phase === 'handoff') {
        // Try to prevent navigation during active game
        event.preventDefault();

        // Push state back to keep user on page
        window.history.pushState(null, '', window.location.href);

        // Note: Game state is now in URL hash, not localStorage
        console.log('Browser back button pressed - game state preserved in URL');
      }
    };

    // Add listener
    window.addEventListener('popstate', handlePopState);

    // Prevent back navigation by pushing a state entry
    if (state.phase === 'playing' || state.phase === 'handoff') {
      window.history.pushState(null, '', window.location.href);
    }

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [state.phase]);

  // Reset handoff step when phase changes
  useEffect(() => {
    if (state.phase === 'handoff') {
      setHandoffStepCompleted(false);
    }
  }, [state.phase]);

  // Check story panel flags and show if needed
  useEffect(() => {
    if (state.phase === 'playing') {
      const player1Seen = storage.getPlayer1SeenStory();
      const player2Seen = storage.getPlayer2SeenStory();
      const currentPlayer = state.gameState.currentPlayer;
      const mode = state.mode;

      // URL mode: Show if BOTH flags are false (first visit on this device)
      if (mode === 'url' && !player1Seen && !player2Seen) {
        setShowStoryPanel(true);
      }
      // Hot-seat mode: Show if current player hasn't seen it yet
      else if (mode === 'hotseat') {
        if (currentPlayer === 'light' && !player1Seen) {
          setShowStoryPanel(true);
        } else if (currentPlayer === 'dark' && !player2Seen) {
          setShowStoryPanel(true);
        }
      }
    }
  }, [state.phase, state]);

  // ===========================
  // History Navigation Handlers
  // ===========================

  // Helper: reconstruct game state at specific move index
  const reconstructGameStateAtMove = useCallback((
    finalState: GameState,
    targetIndex: number
  ): GameState => {
    // Reconstruct original piece positions from move history
    // Map each piece ID to its original position by tracking first appearance
    const pieceOriginalPositions = new Map<string, Position>();

    // Scan move history to find each piece's first "from" position
    for (const move of finalState.moveHistory) {
      const pieceId = move.piece.id;

      // If we haven't seen this piece yet, record its original position
      if (!pieceOriginalPositions.has(pieceId)) {
        pieceOriginalPositions.set(pieceId, move.from);
      }

      // Also track captured pieces: if a piece was captured but never moved,
      // its original position is where it was captured
      if (move.captured && !pieceOriginalPositions.has(move.captured.id)) {
        // The captured piece was at move.to when it was captured
        if (move.to !== 'off_board') {
          pieceOriginalPositions.set(move.captured.id, move.to);
        }
      }
    }

    // Collect all pieces from the board (with their current positions for unmoved pieces)
    const boardPieces: Array<{ piece: Piece; currentPos: [number, number] }> = [];
    finalState.board.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece) {
          boardPieces.push({ piece, currentPos: [rowIndex, colIndex] });
        }
      });
    });

    // Collect pieces from courts and captured (these must have moved)
    const offBoardPieces: Piece[] = [];
    offBoardPieces.push(...finalState.lightCourt);
    offBoardPieces.push(...finalState.darkCourt);
    offBoardPieces.push(...finalState.capturedLight);
    offBoardPieces.push(...finalState.capturedDark);

    // Create initial board
    const initialBoard: (Piece | null)[][] = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];

    // Place board pieces: use move history position if available, otherwise use current position
    for (const { piece, currentPos } of boardPieces) {
      const pieceId = piece.id;
      const originalPos = pieceOriginalPositions.get(pieceId);

      // Use tracked original position from move history, or current position if piece hasn't moved
      const positionToUse = originalPos ?? currentPos;
      const [row, col] = positionToUse;
      const boardRow = initialBoard[row];
      if (boardRow) {
        boardRow[col] = {
          ...piece,
          position: positionToUse,
          moveCount: 0,
        };
      }
    }

    // Place off-board pieces: these must have a move history entry
    for (const piece of offBoardPieces) {
      const pieceId = piece.id;
      const originalPos = pieceOriginalPositions.get(pieceId);

      if (originalPos) {
        const [row, col] = originalPos;
        const boardRow = initialBoard[row];
        if (boardRow) {
          boardRow[col] = {
            ...piece,
            position: originalPos,
            moveCount: 0,
          };
        }
      }
    }

    // Create initial game state
    const initialState: GameState = {
      version: finalState.version,
      gameId: finalState.gameId,
      board: initialBoard,
      currentPlayer: 'light',
      currentTurn: 0,
      lightPlayer: finalState.lightPlayer,
      darkPlayer: finalState.darkPlayer,
      lightCourt: [],
      darkCourt: [],
      capturedLight: [],
      capturedDark: [],
      status: 'playing',
      winner: null,
      moveHistory: [],
      checksum: '', // Will be set by engine
    };

    // Create engine with initial state
    const engine = new KingsChessEngine(
      finalState.lightPlayer,
      finalState.darkPlayer,
      initialState
    );

    // Replay moves to reconstruct position at targetIndex
    // targetIndex 0 = starting position (no moves)
    // targetIndex 1 = after first move (replay move[0])
    // targetIndex n = after nth move (replay moves[0..n-1])
    for (let i = 0; i < targetIndex && i < finalState.moveHistory.length; i++) {
      const move = finalState.moveHistory[i];
      if (move) {
        engine.makeMove(move.from, move.to);
      }
    }

    return engine.getGameState();
  }, []);

  // Handler: step back one move
  const handleStepBack = useCallback(() => {
    if (state.phase !== 'playing') return;
    const currentIndex = historyIndex ?? state.gameState.moveHistory.length;
    if (currentIndex > 0) {
      setHistoryIndex(currentIndex - 1);
    }
  }, [historyIndex, state]);

  // Handler: step forward one move
  const handleStepForward = useCallback(() => {
    if (state.phase !== 'playing') return;
    const currentIndex = historyIndex ?? state.gameState.moveHistory.length;
    const maxIndex = state.gameState.moveHistory.length;
    if (currentIndex < maxIndex) {
      const nextIndex = currentIndex + 1;
      // If stepping forward to the latest move, set to null to activate board
      if (nextIndex >= maxIndex) {
        setHistoryIndex(null);
      } else {
        setHistoryIndex(nextIndex);
      }
    }
  }, [historyIndex, state]);

  // Handler: return to current (latest) move
  const handleReturnToCurrent = useCallback(() => {
    setHistoryIndex(null);
  }, []);

  // Compute displayed game state (current or historical)
  const displayedGameState = useMemo(() => {
    if (state.phase !== 'playing') return null;
    if (!isViewingHistory) return state.gameState;
    return reconstructGameStateAtMove(state.gameState, historyIndex ?? 0);
  }, [state, isViewingHistory, historyIndex, reconstructGameStateAtMove]);

  // ===========================
  // Phase 1: Mode Selection
  // ===========================
  if (state.phase === 'mode-selection') {
    return (
      <ModeSelector
        onModeSelected={(mode) => {
          dispatch({ type: 'SELECT_MODE', mode });
          storage.setGameMode(mode);
        }}
      />
    );
  }

  // ===========================
  // Phase 2: Setup
  // ===========================
  if (state.phase === 'setup') {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: 'var(--spacing-xl)',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
          King's Cooking Chess
        </h1>
        <div className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Game Setup</h2>
          <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
            {state.mode === 'hotseat'
              ? 'Enter your name to start a hot-seat game. You\'ll pass the device back and forth.'
              : 'Enter your name to start a URL-based game. You\'ll share a link after each move.'}
          </p>
          <NameForm
            storageKey="player1"
            onNameChange={(name) => {
              dispatch({ type: 'SET_PLAYER1_NAME', name });
            }}
          />
          <button
            onClick={() => {
              if (state.player1Name && state.player1Name.trim().length > 0) {
                dispatch({ type: 'START_COLOR_SELECTION' });
              }
            }}
            disabled={!state.player1Name || state.player1Name.trim().length === 0}
            style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ===========================
  // Phase 3: Color Selection
  // ===========================
  if (state.phase === 'color-selection') {
    return <ColorSelectionScreen player1Name={state.player1Name} dispatch={dispatch} />;
  }

  // ===========================
  // Phase 4: Piece Selection
  // ===========================
  if (state.phase === 'piece-selection') {
    return <PieceSelectionScreen state={state} dispatch={dispatch} />;
  }

  // ===========================
  // Phase 4: Playing
  // ===========================
  if (state.phase === 'playing') {
    const handleCloseStoryPanel = (): void => {
      setShowStoryPanel(false);

      const currentPlayer = state.gameState.currentPlayer;
      const mode = state.mode;

      if (mode === 'url') {
        // URL mode: Set both flags (per-device behavior)
        storage.setPlayer1SeenStory(true);
        storage.setPlayer2SeenStory(true);
      } else if (mode === 'hotseat') {
        // Hot-seat mode: Set flag for current player only
        if (currentPlayer === 'light') {
          storage.setPlayer1SeenStory(true);
        } else if (currentPlayer === 'dark') {
          storage.setPlayer2SeenStory(true);
        }
      }
    };

    const handleConfirmMove = (): void => {
      if (!state.pendingMove) return;

      // Create engine and load current game state
      const engine = new KingsChessEngine(
        state.gameState.lightPlayer,
        state.gameState.darkPlayer,
        state.gameState
      );

      // Execute the move
      const result = engine.makeMove(state.pendingMove.from, state.pendingMove.to);

      // Check if promotion is required
      if (!result.success && result.requiresPromotion && result.from && result.to !== 'off_board' && result.to) {
        // Pawn reached promotion row - show modal for piece selection
        setPendingPromotion({
          from: result.from,
          to: result.to,
          engine,
        });
        // Don't dispatch anything yet - wait for promotion piece selection
        return;
      }

      if (result.success) {
        const newState = engine.getGameState();

        // Dispatch CONFIRM_MOVE with result
        dispatch({
          type: 'CONFIRM_MOVE',
          result: {
            newState,
            engine,
          },
        });

        // Task 7: Generate URL if in URL mode
        if (state.mode === 'url' && state.pendingMove) {
          console.log('🔍 URL Generation Debug:');
          console.log('  currentTurn:', newState.currentTurn);
          console.log('  currentPlayer:', newState.currentPlayer);
          console.log('  player1Name:', state.player1Name);
          console.log('  player2Name:', state.player2Name);
          console.log('  checksum:', newState.checksum);

          // Always send full game state
          console.log('  ➡️ Generating FULL_STATE URL');

          // Determine which player just made the move
          // After a move, currentPlayer switches to the next player
          // So if currentPlayer is 'light', then 'dark' just moved
          const playerWhoMoved = newState.currentPlayer === 'light' ? 'dark' : 'light';

          // Get the name of the player who just moved from the gameState
          // Use gameState player names directly (not state.player1Name/player2Name)
          // because player1 might be light OR dark depending on color selection
          const playerName = playerWhoMoved === 'light'
            ? newState.lightPlayer.name
            : newState.darkPlayer.name;

          console.log(`  👤 Player who moved: ${playerWhoMoved}`);
          console.log(`  📤 Sending playerName: ${playerName}`);

          const fullStatePayload = {
            type: 'full_state' as const,
            gameState: newState,
            playerName: playerName || undefined,
          };
          updateUrlImmediate(fullStatePayload);

          // Detailed logging for localhost
          if (window.location.hostname === 'localhost') {
            console.log('📦 FULL_STATE Payload:', {
              type: fullStatePayload.type,
              playerName: fullStatePayload.playerName,
              currentTurn: newState.currentTurn,
              checksum: newState.checksum,
              lightPlayer: newState.lightPlayer.name,
              darkPlayer: newState.darkPlayer.name,
              board: newState.board,
            });
          }

          // Get the share URL and dispatch URL_GENERATED
          // IMPORTANT: getShareUrl() reads from window.location.hash, which is updated by updateUrlImmediate
          const shareUrl = getShareUrl();
          dispatch({ type: 'URL_GENERATED', url: shareUrl });
        }
      }
    };

    const handlePromotionSelect = (promotionPiece: PieceType): void => {
      if (!pendingPromotion) return;

      // Execute promotion using the saved engine state
      const result = pendingPromotion.engine.promotePawn(
        pendingPromotion.from,
        pendingPromotion.to,
        promotionPiece as 'queen' | 'rook' | 'bishop' | 'knight'
      );

      if (result.success) {
        const newState = pendingPromotion.engine.getGameState();

        // Dispatch CONFIRM_MOVE with result
        dispatch({
          type: 'CONFIRM_MOVE',
          result: {
            newState,
            engine: pendingPromotion.engine,
          },
        });

        // Task 7: Generate URL if in URL mode
        if (state.mode === 'url') {
          // Determine which player just made the move
          // After a move, currentPlayer switches to the next player
          // So if currentPlayer is 'light', then 'dark' just moved
          const playerWhoMoved = newState.currentPlayer === 'light' ? 'dark' : 'light';

          // Get the name of the player who just moved from the gameState
          // Use gameState player names directly (not state.player1Name/player2Name)
          // because player1 might be light OR dark depending on color selection
          const playerName = playerWhoMoved === 'light'
            ? newState.lightPlayer.name
            : newState.darkPlayer.name;

          // Always send full game state
          const fullStatePayload = {
            type: 'full_state' as const,
            gameState: newState,
            playerName: playerName || undefined,
          };
          updateUrlImmediate(fullStatePayload);

          const shareUrl = getShareUrl();
          dispatch({ type: 'URL_GENERATED', url: shareUrl });
        }

        // Clear promotion state
        setPendingPromotion(null);
      }
    };

    const handlePromotionCancel = (): void => {
      // Cancel promotion - don't execute the move
      setPendingPromotion(null);
      // Also deselect the piece
      dispatch({ type: 'DESELECT_PIECE' });
    };

    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--spacing-xl)',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
          King's Cooking Chess
        </h1>

        {/* Story/Instructions toggle */}
        {!showStoryPanel && (
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <button
              onClick={() => setShowStoryPanel(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                padding: 'var(--spacing-xs)',
              }}
              aria-label="Show game story and instructions"
            >
              Show Story/Instructions
            </button>
          </div>
        )}

        <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-md)',
          }}>
            <div>
              <strong>Current Turn:</strong>{' '}
              {state.gameState.currentPlayer === 'light'
                ? state.gameState.lightPlayer.name
                : state.gameState.darkPlayer.name}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Move {state.gameState.currentTurn} | Mode: {state.mode}
            </div>
          </div>

          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <PlaybackControls
              onStepBack={handleStepBack}
              onStepForward={handleStepForward}
              onReturnToCurrent={handleReturnToCurrent}
              canStepBack={(historyIndex ?? state.gameState.moveHistory.length) > 0}
              canStepForward={(historyIndex ?? state.gameState.moveHistory.length) < state.gameState.moveHistory.length}
              isAtLatest={historyIndex === null}
              currentMoveIndex={historyIndex ?? state.gameState.moveHistory.length}
              totalMoves={state.gameState.moveHistory.length}
            />
          </div>

          <GameBoard
            gameState={displayedGameState ?? state.gameState}
            onMove={(from, to) => {
              if (!isViewingHistory) {
                dispatch({ type: 'STAGE_MOVE', from, to });
              }
            }}
            onConfirmMove={handleConfirmMove}
            onCancelMove={() => {
              dispatch({ type: 'DESELECT_PIECE' });
            }}
            isPlayerTurn={!isViewingHistory}
            pendingMove={state.pendingMove}
            realCurrentPlayer={state.gameState.currentPlayer}
          />

          <div style={{
            marginTop: 'var(--spacing-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}>
            <strong>Game Stats:</strong> Light in court: {state.gameState.lightCourt.length} |
            Dark in court: {state.gameState.darkCourt.length}
          </div>
        </div>

        {/* Story/Instructions Panel */}
        <StoryPanel
          isOpen={showStoryPanel}
          onClose={handleCloseStoryPanel}
        />

        {/* Pawn Promotion Modal */}
        <PiecePickerModal
          isOpen={!!pendingPromotion}
          availablePieces={['queen', 'rook', 'bishop', 'knight']}
          onSelect={handlePromotionSelect}
          onClose={handlePromotionCancel}
          mode="promotion"
        />
      </div>
    );
  }

  // ===========================
  // Phase 5: Handoff
  // ===========================
  if (state.phase === 'handoff') {
    // Hot-seat mode: Show privacy screen with "I'm Ready" button
    if (state.mode === 'hotseat') {
      // Check if player2Name is missing
      const needsPlayer2Name = !state.player2Name || state.player2Name.trim().length === 0;

      // Check if we're coming from a move (gameState exists) vs. piece-selection (gameState null)
      const comingFromMove = state.gameState !== null;

      if (needsPlayer2Name && comingFromMove && state.gameState) {
        // Two-step flow: Handoff screen → Name entry
        if (!handoffStepCompleted) {
          // Step 1: Show handoff screen
          const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
          // Use player names from gameState (stored in localStorage)
          const previousPlayerName = previousPlayer === 'light'
            ? state.gameState.lightPlayer.name
            : state.gameState.darkPlayer.name;
          const nextPlayerName = state.gameState.currentPlayer === 'light'
            ? state.gameState.lightPlayer.name
            : state.gameState.darkPlayer.name;

          return (
            <HandoffScreen
              nextPlayer={state.gameState.currentPlayer}
              nextPlayerName={nextPlayerName}
              previousPlayer={previousPlayer}
              previousPlayerName={previousPlayerName}
              isGameStart={state.gameState.currentTurn === 0}
              onContinue={() => {
                setHandoffStepCompleted(true);
              }}
              countdownSeconds={3}
            />
          );
        } else {
          // Step 2: Show name entry
          return <Player2NameEntryScreen dispatch={dispatch} />;
        }
      }

      if (needsPlayer2Name && !comingFromMove) {
        // Legacy fallback: Coming from piece-selection (should not happen after fix)
        console.warn('Unexpected flow: piece-selection → handoff for name entry');
        return <Player2NameEntryScreen dispatch={dispatch} />;
      }

      // gameState might be null if coming from piece-selection (legacy fallback)
      if (!state.gameState) {
        return (
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: 'var(--spacing-xl)',
          }}>
            <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
              Ready to Play!
            </h1>
            <div className="card">
              <p style={{ marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
                All players are set. Click Continue to start the game!
              </p>
              <button
                onClick={() => dispatch({ type: 'COMPLETE_HANDOFF' })}
                style={{ width: '100%' }}
              >
                Continue to Game
              </button>
            </div>
          </div>
        );
      }

      // Show HandoffScreen with countdown (normal turn-based handoff with both names known)
      const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
      // Use player names from gameState (stored in localStorage)
      const previousPlayerName = previousPlayer === 'light'
        ? state.gameState.lightPlayer.name
        : state.gameState.darkPlayer.name;
      const nextPlayerName = state.gameState.currentPlayer === 'light'
        ? state.gameState.lightPlayer.name
        : state.gameState.darkPlayer.name;
      const isGameStart = state.gameState.currentTurn === 0 && state.gameState.moveHistory.length === 0;

      return (
        <HandoffScreen
          nextPlayer={state.gameState.currentPlayer}
          nextPlayerName={nextPlayerName}
          previousPlayer={previousPlayer}
          previousPlayerName={previousPlayerName}
          isGameStart={isGameStart}
          onContinue={() => {
            dispatch({ type: 'COMPLETE_HANDOFF' });
          }}
          countdownSeconds={3}
        />
      );
    } else {
      // URL mode: Determine if this is Player 1 sharing URL or Player 2 entering name
      // Player 1: Has saved name in localStorage (entered during setup)
      // Player 2: No saved name (first time opening URL)
      const myName = storage.getMyName();
      const isPlayer2EnteringName = !myName;

      if (isPlayer2EnteringName) {
        return (
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: 'var(--spacing-xl)',
          }}>
            <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
              Welcome Player 2!
            </h1>
            <div className="card">
              <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Enter Your Name</h2>
              <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                Before you start playing, please enter your name.
              </p>
              <NameForm
                storageKey="my-name"
                onNameChange={(name) => {
                  dispatch({ type: 'SET_PLAYER2_NAME', name });
                }}
              />
              <button
                onClick={() => {
                  if (state.player2Name && state.player2Name.trim().length > 0) {
                    dispatch({ type: 'COMPLETE_HANDOFF' });
                  }
                }}
                disabled={!state.player2Name || state.player2Name.trim().length === 0}
                style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
              >
                Start Playing
              </button>
            </div>
          </div>
        );
      }

      // URL mode: Show URLSharer with generated URL (Player 1 sharing their move)
      const shareUrl = state.generatedUrl || getShareUrl();

      return (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: 'var(--spacing-xl)',
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
            Share Your Move
          </h1>
          <div className="card">
            <p style={{ marginBottom: 'var(--spacing-md)' }}>
              Copy the URL below and send it to your opponent to continue the game.
            </p>
            <URLSharer
              url={shareUrl}
              onCopy={() => {
                console.log('URL copied to clipboard');
                // TODO (Task 8): Add toast notification
              }}
            />
            <p style={{
              marginTop: 'var(--spacing-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}>
              ⏳ Waiting for your opponent to make their move...
            </p>
          </div>
        </div>
      );
    }
  }

  // ===========================
  // Phase 6: Victory
  // ===========================
  if (state.phase === 'victory') {
    // Build VictoryScreen props conditionally to satisfy exactOptionalPropertyTypes
    const victoryProps: Parameters<typeof VictoryScreen>[0] = {
      winner: state.winner,
      totalMoves: state.gameState.currentTurn,
      lightCourt: state.gameState.lightCourt,
      darkCourt: state.gameState.darkCourt,
      capturedLight: state.gameState.capturedLight,
      capturedDark: state.gameState.capturedDark,
      board: state.gameState.board,
    };

    // Add optional props only if they have values
    // Use player names from gameState (stored in localStorage)
    if (state.winner !== 'draw') {
      const winnerName = state.winner === 'light'
        ? state.gameState.lightPlayer.name
        : state.gameState.darkPlayer.name;
      const loserName = state.winner === 'light'
        ? state.gameState.darkPlayer.name
        : state.gameState.lightPlayer.name;

      if (winnerName) {
        victoryProps.winnerName = winnerName;
      }
      if (loserName) {
        victoryProps.loserName = loserName;
      }
    }

    // Add player names for stats section (use gameState names)
    victoryProps.player1Name = state.gameState.lightPlayer.name;
    victoryProps.player2Name = state.gameState.darkPlayer.name;

    if (state.mode === 'url') {
      // Generate full state URL for victory sharing
      const victoryUrlHash = buildFullStateUrl(state.gameState, state.player1Name);
      const fullShareUrl = `${window.location.origin}${window.location.pathname}${victoryUrlHash}`;

      victoryProps.shareUrl = fullShareUrl;
    }

    // Add New Game callback
    victoryProps.onNewGame = () => {
      // Clear victory URL copied flag
      localStorage.removeItem('kings-cooking:victory-url-copied');
      // Dispatch NEW_GAME action
      dispatch({ type: 'NEW_GAME' });
    };

    return <VictoryScreen {...victoryProps} />;
  }

  // This should never be reached due to exhaustive phase checking
  throw new Error('Invalid game flow state: Unknown phase');
}
