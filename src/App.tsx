import { ReactElement, useState } from 'react';
import { storage } from './lib/storage/localStorage';
import { GameIdSchema } from './lib/validation/schemas';
import { GameBoard } from './components/game/GameBoard';
import { KingsChessEngine } from './lib/chess/KingsChessEngine';
import { MoveConfirmButton } from './components/game/MoveConfirmButton';
import { URLSharer } from './components/game/URLSharer';
import { NameForm } from './components/game/NameForm';
import type { GameState, Position } from './lib/validation/schemas';

/**
 * Main App component demonstrating Phase 1-4 implementation
 * Shows validation status, dark mode support, and interactive game board
 *
 * @returns App component
 */
function App(): ReactElement {
  // Create initial game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const whitePlayer = { id: crypto.randomUUID() as never, name: 'Player 1' };
    const blackPlayer = { id: crypto.randomUUID() as never, name: 'Player 2' };
    const engine = new KingsChessEngine(whitePlayer, blackPlayer);
    return engine.getGameState();
  });

  // Phase 4B component demo states
  const [pendingMove, setPendingMove] = useState<{ from: Position; to: Position } | null>(null);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [currentUrl] = useState(() => `${window.location.origin}/game/${gameState.gameId}`);

  const handleMove = (from: Position, to: Position): void => {
    // Store pending move for confirmation
    setPendingMove({ from, to });
    setMoveError(null);
  };

  const handleConfirmMove = (): void => {
    if (!pendingMove) return;

    setIsProcessingMove(true);
    setMoveError(null);

    // Simulate async move processing
    setTimeout(() => {
      const engine = new KingsChessEngine(
        gameState.whitePlayer,
        gameState.blackPlayer,
        gameState
      );

      const result = engine.makeMove(pendingMove.from, pendingMove.to);
      if (result.success) {
        setGameState(engine.getGameState());
        setPendingMove(null);
      } else {
        setMoveError(result.error ?? 'Invalid move');
      }
      setIsProcessingMove(false);
    }, 500);
  };

  const handleNewGame = (): void => {
    const whitePlayer = { id: crypto.randomUUID() as never, name: 'Player 1' };
    const blackPlayer = { id: crypto.randomUUID() as never, name: 'Player 2' };
    const engine = new KingsChessEngine(whitePlayer, blackPlayer);
    setGameState(engine.getGameState());
  };
  const handleTestValidation = (): void => {
    // Test Zod validation
    const validGameId = GameIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
    const invalidGameId = GameIdSchema.safeParse('invalid-id');

    console.log('Valid Game ID:', validGameId.success);
    console.log('Invalid Game ID:', invalidGameId.success);

    // Test localStorage
    const saved = storage.setMyName('Test Player');
    const retrieved = storage.getMyName();

    console.log('localStorage saved:', saved);
    console.log('localStorage retrieved:', retrieved);

    alert('Check console for validation results');
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)'
    }}>
      <h1>King's Cooking - Phase 4 Demo</h1>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>🎮 Interactive Game Board</h2>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Click a piece to select it, then click a highlighted square to move.
          Try making moves! Current turn: <strong>{gameState.currentPlayer}</strong>
        </p>

        <GameBoard
          gameState={gameState}
          onMove={handleMove}
          isPlayerTurn={true}
        />

        <div style={{
          marginTop: 'var(--spacing-md)',
          display: 'flex',
          gap: 'var(--spacing-sm)',
          justifyContent: 'center'
        }}>
          <button onClick={handleNewGame}>
            New Game
          </button>
          <button onClick={handleTestValidation}>
            Test Validation
          </button>
        </div>

        <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
          <strong>Game Stats:</strong> Turn {gameState.currentTurn} |
          White in court: {gameState.whiteCourt.length} |
          Black in court: {gameState.blackCourt.length}
          {(gameState.status === 'white_wins' || gameState.status === 'black_wins' || gameState.status === 'draw') && (
            <div style={{ color: 'var(--color-success)', fontWeight: 'bold', marginTop: '0.5rem' }}>
              🎉 Game Over! Winner: {gameState.winner ?? 'Draw'}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>🎯 Phase 4B: Game Controls Demo</h2>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Interactive demonstration of all 3 Phase 4B components with full accessibility support.
        </p>

        {/* MoveConfirmButton Demo */}
        <div style={{
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          border: '1px solid var(--border-color, #e0e0e0)',
          borderRadius: 'var(--border-radius-md, 0.5rem)',
          backgroundColor: 'var(--bg-secondary, #f9f9f9)'
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-sm)' }}>
            1. MoveConfirmButton
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
            Select a piece and move to see the confirm button in action. Features loading states, error handling, and retry.
          </p>
          <MoveConfirmButton
            onConfirm={handleConfirmMove}
            disabled={!pendingMove}
            isProcessing={isProcessingMove}
            error={moveError}
          />
          {pendingMove && !isProcessingMove && !moveError && (
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-sm)', color: 'var(--color-info)' }}>
              Move pending: Click "Confirm Move" to apply
            </p>
          )}
        </div>

        {/* NameForm Demo */}
        <div style={{
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          border: '1px solid var(--border-color, #e0e0e0)',
          borderRadius: 'var(--border-radius-md, 0.5rem)',
          backgroundColor: 'var(--bg-secondary, #f9f9f9)'
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-sm)' }}>
            2. NameForm (localStorage Integration)
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
            Real-time validation with debounced localStorage persistence. Try special characters to see validation errors.
          </p>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <NameForm
              storageKey="my-name"
              onNameChange={(name) => console.log('My name changed:', name)}
            />
            <NameForm
              storageKey="player1"
              onNameChange={(name) => console.log('Player 1 name changed:', name)}
            />
            <NameForm
              storageKey="player2"
              onNameChange={(name) => console.log('Player 2 name changed:', name)}
            />
          </div>
        </div>

        {/* URLSharer Demo */}
        <div style={{
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          border: '1px solid var(--border-color, #e0e0e0)',
          borderRadius: 'var(--border-radius-md, 0.5rem)',
          backgroundColor: 'var(--bg-secondary, #f9f9f9)'
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-sm)' }}>
            3. URLSharer (Clipboard API)
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
            Copy game link to clipboard with modern Clipboard API + execCommand fallback. Toast notifications on success/error.
          </p>
          <URLSharer
            url={currentUrl}
            onCopy={() => console.log('Game URL copied to clipboard!')}
          />
        </div>

        <div style={{
          padding: 'var(--spacing-sm)',
          backgroundColor: 'var(--bg-info, #e3f2fd)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-info, #1976d2)'
        }}>
          <strong>✨ Features:</strong> All components support dark mode, mobile responsive design,
          keyboard navigation, screen readers (WCAG 2.1 AA), and have 80%+ test coverage.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>✅ Implementation Status</h2>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          marginBottom: 'var(--spacing-md)'
        }}>
          <li className="text-success">✓ Phase 1: Foundation (React 19, TypeScript, Testing)</li>
          <li className="text-success">✓ Phase 2: Chess Engine (Move validation, Victory conditions)</li>
          <li className="text-success">✓ Phase 3: URL State Synchronization</li>
          <li className="text-success">✓ Phase 4A: GameBoard & GameCell Components (93.33% test coverage)</li>
          <li className="text-success">✓ Phase 4B: Game Controls (89 tests, 98%+ coverage)</li>
          <li style={{ color: 'var(--color-warning)' }}>⏳ Phase 4C: Remaining UI components (upcoming)</li>
        </ul>

        <p style={{ fontSize: 'var(--font-size-sm)' }}>
          <strong>Dark Mode:</strong> Toggle your OS dark mode to see theme changes.
        </p>
      </div>
    </div>
  );
}

export default App;
