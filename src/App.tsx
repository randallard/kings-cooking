import { ReactElement } from 'react';
import { storage } from './lib/storage/localStorage';
import { GameIdSchema } from './lib/validation/schemas';

/**
 * Main App component demonstrating Phase 1 foundation
 * Shows validation status and dark mode support
 *
 * @returns App component
 */
function App(): ReactElement {
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

  const handleClearStorage = (): void => {
    storage.clearAll();
    alert('Storage cleared');
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)'
    }}>
      <h1>King's Cooking - Phase 1 Foundation</h1>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Foundation Status</h2>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          marginBottom: 'var(--spacing-md)'
        }}>
          <li className="text-success">✓ React 19.2.0 with Compiler</li>
          <li className="text-success">✓ Vite 7.0 Build System</li>
          <li className="text-success">✓ TypeScript Strict Mode</li>
          <li className="text-success">✓ Zod Validation (Branded Types)</li>
          <li className="text-success">✓ localStorage Utilities</li>
          <li className="text-success">✓ Dark Mode Support</li>
          <li className="text-success">✓ Vitest 3.x + Playwright</li>
        </ul>

        <p style={{ fontSize: 'var(--font-size-sm)' }}>
          Toggle your OS dark mode to see theme changes.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Validation Tests</h2>
        <p>Test Zod validation and localStorage utilities:</p>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          flexWrap: 'wrap'
        }}>
          <button onClick={handleTestValidation}>
            Test Validation
          </button>
          <button onClick={handleClearStorage}>
            Clear Storage
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Next Steps</h2>
        <p>Phase 1 foundation is complete. Ready for:</p>
        <ul style={{
          marginLeft: 'var(--spacing-lg)',
          color: 'var(--color-text-secondary)'
        }}>
          <li>Phase 2: Game board component</li>
          <li>Phase 3: Move validation logic</li>
          <li>Phase 4: Game state management</li>
          <li>Phase 5: Hot-seat multiplayer</li>
          <li>Phase 6: URL-based multiplayer (WebRTC)</li>
          <li>Phase 7: Polish and deployment</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
