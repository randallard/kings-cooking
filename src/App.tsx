import { ReactElement, useReducer, useEffect, useState } from 'react';
import { gameFlowReducer } from './lib/gameFlow/reducer';
import type { GameFlowAction } from './types/gameFlow';
import { storage, checkAndMigrateStorage } from './lib/storage/localStorage';
import { useUrlState } from './hooks/useUrlState';
import { ModeSelector } from './components/game/ModeSelector';
import { NameForm } from './components/game/NameForm';
import { GameBoard } from './components/game/GameBoard';
import { MoveConfirmButton } from './components/game/MoveConfirmButton';
import { HandoffScreen } from './components/game/HandoffScreen';
import { VictoryScreen } from './components/game/VictoryScreen';
import { URLSharer } from './components/game/URLSharer';
import { StoryPanel } from './components/game/StoryPanel';
import { KingsChessEngine } from './lib/chess/KingsChessEngine';
import { buildFullStateUrl } from './lib/urlEncoding/urlBuilder';

/**
 * Player 2 Name Entry Screen Component
 * Separate component to properly use React hooks
 */
function Player2NameEntryScreen({ dispatch }: { dispatch: React.Dispatch<GameFlowAction> }): ReactElement {
  const [isNameValid, setIsNameValid] = useState(false);

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        Player 2's Turn
      </h1>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Enter Your Name</h2>
        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
          Before we continue, Player 2 needs to enter their name.
        </p>
        <NameForm
          storageKey="player2"
          onNameChange={(name) => {
            // Name is saved to localStorage by NameForm
            // Just track validation state for button
            setIsNameValid(name.trim().length > 0);
          }}
        />
        <button
          onClick={() => {
            // Get the saved name from localStorage
            const player2Name = storage.getPlayer2Name();
            if (player2Name && player2Name.trim().length > 0) {
              dispatch({ type: 'SET_PLAYER2_NAME', name: player2Name });
              dispatch({ type: 'COMPLETE_HANDOFF' });
            }
          }}
          disabled={!isNameValid}
          style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
        >
          Continue to Game
        </button>
      </div>
    </div>
  );
}

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
 * 3. playing: Active gameplay with move confirmation
 * 4. handoff: Transition between players (mode-specific UI)
 * 5. victory: Game end with statistics
 *
 * @returns App component
 */
export default function App(): ReactElement {
  const [state, dispatch] = useReducer(gameFlowReducer, { phase: 'mode-selection' });

  // Story panel visibility state
  const [showStoryPanel, setShowStoryPanel] = useState(false);

  // URL state hook (Task 7) - enabled only in URL mode
  const {
    updateUrlImmediate,
    getShareUrl,
  } = useUrlState({
    onPayloadReceived: (payload) => {
      // When URL payload is received, dispatch LOAD_FROM_URL action
      // Filter to only full_state and delta types (exclude resync_request)
      if (payload.type === 'full_state' || payload.type === 'delta') {
        dispatch({ type: 'LOAD_FROM_URL', payload });
      }
    },
    onError: (error) => {
      console.error('URL state error:', error);
      // TODO: Show error toast to user
    },
  });

  // Task 10: Restore game state from localStorage on page refresh
  useEffect(() => {
    // Check and migrate storage if needed (Issue #4 - light/dark refactor)
    const migrated = checkAndMigrateStorage();
    if (migrated) {
      console.log('📦 Storage migrated to v2.0.0 - cleared old game data (white/black → light/dark)');
      // Early return - no saved data to restore after migration
      return;
    }

    const savedMode = storage.getGameMode();
    const savedGameState = storage.getGameState();
    const savedPlayer1 = storage.getPlayer1Name();

    // Only restore if we're in mode-selection phase (initial mount)
    if (state.phase === 'mode-selection' && savedMode && savedGameState) {
      // We have a saved game - restore it
      console.log('Restoring saved game from localStorage');

      // Check if game is over
      const isGameOver = savedGameState.status === 'light_wins' ||
                        savedGameState.status === 'dark_wins' ||
                        savedGameState.status === 'draw';

      if (isGameOver) {
        // Game is over - let user start a new game instead of restoring victory screen
        // Clear the saved state
        storage.clearAll();
        console.log('Cleared saved game (game was over)');
      } else {
        // Game is in progress - restore to playing phase
        // We need to build the full playing state
        dispatch({ type: 'SELECT_MODE', mode: savedMode });

        if (savedPlayer1) {
          dispatch({ type: 'SET_PLAYER1_NAME', name: savedPlayer1 });
        }

        dispatch({ type: 'START_GAME' });

        // The START_GAME will create initial state, but we need to replace it with saved state
        // This is handled by the reducer's LOAD_FROM_URL action for URL mode
        // For hot-seat mode, we need the game state to be restored after START_GAME
        // TODO: Add a RESTORE_GAME action for cleaner restoration
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Task 9: Browser back button handling
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (state.phase === 'playing' || state.phase === 'handoff') {
        // Try to prevent navigation during active game
        event.preventDefault();

        // Push state back to keep user on page
        window.history.pushState(null, '', window.location.href);

        // Fallback: Reload from localStorage
        const savedState = storage.getGameState();
        if (savedState) {
          console.log('Browser back button pressed - reloading game state from localStorage');
          // TODO: Show toast notification: "Loaded current game state from device"
        }
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
                dispatch({ type: 'START_GAME' });
              }
            }}
            disabled={!state.player1Name || state.player1Name.trim().length === 0}
            style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // ===========================
  // Phase 3: Playing
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

      // CRITICAL: Get checksum BEFORE making the move (for delta verification)
      const checksumBeforeMove = state.gameState.checksum;

      // Create engine and load current game state
      const engine = new KingsChessEngine(
        state.gameState.lightPlayer,
        state.gameState.darkPlayer,
        state.gameState
      );

      // Execute the move
      const result = engine.makeMove(state.pendingMove.from, state.pendingMove.to);

      if (result.success) {
        const newState = engine.getGameState();

        // Save game state to localStorage
        storage.setGameState(newState);

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
          const isFirstMove = newState.currentTurn === 1;

          console.log('🔍 URL Generation Debug:');
          console.log('  currentTurn:', newState.currentTurn);
          console.log('  isFirstMove:', isFirstMove);
          console.log('  currentPlayer:', newState.currentPlayer);
          console.log('  player1Name:', state.player1Name);
          console.log('  player2Name:', state.player2Name);
          console.log('  checksumBeforeMove:', checksumBeforeMove);
          console.log('  checksumAfterMove:', engine.getChecksum());

          // Ensure from/to are valid positions (not null)
          const from = state.pendingMove.from;
          const to = state.pendingMove.to;

          if (isFirstMove) {
            // First move: Send full game state
            console.log('  ➡️ Generating FULL_STATE URL');
            const fullStatePayload = {
              type: 'full_state' as const,
              gameState: newState,
              playerName: state.player1Name || undefined,
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
          } else {
            // Subsequent moves: Send delta with checksum
            // CRITICAL: Use checksum from BEFORE the move, so receiver can verify their state
            console.log('  ➡️ Generating DELTA URL');
            if (from && to) {
              const deltaPayload = {
                type: 'delta' as const,
                move: {
                  from,
                  to,
                },
                turn: newState.currentTurn,
                checksum: checksumBeforeMove, // Checksum BEFORE move for verification
                playerName: state.player2Name || undefined,
              };
              updateUrlImmediate(deltaPayload);

              // Detailed logging for localhost
              if (window.location.hostname === 'localhost') {
                console.log('📦 DELTA Payload:', {
                  type: deltaPayload.type,
                  playerName: deltaPayload.playerName,
                  move: deltaPayload.move,
                  turn: deltaPayload.turn,
                  checksumInPayload: deltaPayload.checksum,
                  checksumBeforeMove: checksumBeforeMove,
                  checksumAfterMove: engine.getChecksum(),
                  currentTurn: newState.currentTurn,
                });
              }
            }
          }

          // Get the share URL and dispatch URL_GENERATED
          // IMPORTANT: getShareUrl() reads from window.location.hash, which is updated by updateUrlImmediate
          const shareUrl = getShareUrl();
          dispatch({ type: 'URL_GENERATED', url: shareUrl });
        }
      }
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
              {state.gameState.currentPlayer === 'light' ? (
                state.player1Name || 'Light'
              ) : (
                state.player2Name || 'Dark'
              )}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Move {state.gameState.currentTurn} | Mode: {state.mode}
            </div>
          </div>

          <GameBoard
            gameState={state.gameState}
            onMove={(from, to) => {
              dispatch({ type: 'STAGE_MOVE', from, to });
            }}
            isPlayerTurn={true}
          />

          {state.pendingMove && (
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <MoveConfirmButton
                onConfirm={handleConfirmMove}
                disabled={false}
                isProcessing={false}
              />
            </div>
          )}

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
      </div>
    );
  }

  // ===========================
  // Phase 4: Handoff
  // ===========================
  if (state.phase === 'handoff') {
    // Hot-seat mode: Show privacy screen with "I'm Ready" button
    if (state.mode === 'hotseat') {
      // If player2Name is empty on first handoff, prompt for name
      if (!state.player2Name || state.player2Name.trim().length === 0) {
        // Separate component to properly use hooks
        return <Player2NameEntryScreen dispatch={dispatch} />;
      }

      // Show HandoffScreen with countdown
      const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
      const previousPlayerName = previousPlayer === 'light'
        ? (state.player1Name || 'Light')
        : (state.player2Name || 'Dark');
      const nextPlayerName = state.gameState.currentPlayer === 'light'
        ? (state.player1Name || 'Light')
        : (state.player2Name || 'Dark');

      return (
        <HandoffScreen
          nextPlayer={state.gameState.currentPlayer}
          nextPlayerName={nextPlayerName}
          previousPlayer={previousPlayer}
          previousPlayerName={previousPlayerName}
          onContinue={() => {
            dispatch({ type: 'COMPLETE_HANDOFF' });
          }}
          countdownSeconds={3}
        />
      );
    } else {
      // URL mode: Determine if this is Player 1 sharing URL or Player 2 entering name
      // Player 2 case: generatedUrl is null (came from LOAD_FROM_URL, hasn't clicked "Start Playing" yet)
      // Player 1 case: generatedUrl is set (came from CONFIRM_MOVE)
      const isPlayer2EnteringName = !state.generatedUrl;

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
  // Phase 5: Victory
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
    if (state.winner !== 'draw') {
      const winnerName = state.winner === 'light' ? state.player1Name : state.player2Name;
      const loserName = state.winner === 'light' ? state.player2Name : state.player1Name;

      if (winnerName) {
        victoryProps.winnerName = winnerName;
      }
      if (loserName) {
        victoryProps.loserName = loserName;
      }
    }

    // Add player names for stats section
    if (state.player1Name) {
      victoryProps.player1Name = state.player1Name;
    }
    if (state.player2Name) {
      victoryProps.player2Name = state.player2Name;
    }

    if (state.mode === 'url') {
      // Generate full state URL for victory sharing
      const victoryUrlHash = buildFullStateUrl(state.gameState, state.player1Name);
      const fullShareUrl = `${window.location.origin}${window.location.pathname}${victoryUrlHash}`;

      victoryProps.shareUrl = fullShareUrl;
    }

    return <VictoryScreen {...victoryProps} />;
  }

  // This should never be reached due to exhaustive phase checking
  throw new Error('Invalid game flow state: Unknown phase');
}
