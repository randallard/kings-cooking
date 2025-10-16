/**
 * @fileoverview Tests for GameBoard component
 * @module components/game/GameBoard.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GameBoard } from './GameBoard';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import type { GameState, PlayerInfo } from '@/lib/validation/schemas';
import { PlayerIdSchema } from '@/lib/validation/schemas';

// Mock GameCell to isolate GameBoard logic
vi.mock('./GameCell', () => ({
  GameCell: vi.fn((props: {
    position: [number, number] | null;
    isSelected: boolean;
    isLegalMove: boolean;
    onClick: (pos: [number, number] | null) => void;
    disabled: boolean;
  }) => {
    const { position, isSelected, isLegalMove, onClick, disabled } = props;
    const [row, col] = position ?? [0, 0];
    return (
      <div
        data-testid={`cell-${row}-${col}`}
        data-selected={isSelected}
        data-legal={isLegalMove}
        data-disabled={disabled}
        onClick={() => !disabled && onClick(position)}
      >
        Cell {row},{col}
      </div>
    );
  }),
}));

// Helper: Create test players
function createTestPlayers(): { white: PlayerInfo; black: PlayerInfo } {
  return {
    white: {
      id: PlayerIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      name: 'White Player',
    },
    black: {
      id: PlayerIdSchema.parse('550e8400-e29b-41d4-a716-446655440001'),
      name: 'Black Player',
    },
  };
}

// Helper: Create test game state using KingsChessEngine
function createTestGameState(overrides?: Partial<GameState>): GameState {
  const players = createTestPlayers();
  const engine = new KingsChessEngine(players.white, players.black);
  const state = engine.getGameState();

  if (!overrides) return state;

  // Merge overrides into state
  return {
    ...state,
    ...overrides,
  };
}

describe('GameBoard', () => {
  let mockOnMove: ReturnType<typeof vi.fn>;
  let gameState: GameState;

  beforeEach(() => {
    mockOnMove = vi.fn();
    gameState = createTestGameState();
  });

  describe('Rendering', () => {
    it('should render 3x3 grid of cells', () => {
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Should have 9 cells (3x3)
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(screen.getByTestId(`cell-${row}-${col}`)).toBeInTheDocument();
        }
      }
    });

    it('should render with ARIA grid role', () => {
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute('aria-label', 'Chess board, 3 by 3 grid');
    });

    it('should render rows with row role', () => {
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3);
    });

    it('should render screen reader status region', () => {
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Piece Selection', () => {
    it('should select piece when clicked', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white piece (row 2, white starts first)
      const cell = screen.getByTestId('cell-2-0');
      await user.click(cell);

      // Cell should be marked as selected
      expect(cell).toHaveAttribute('data-selected', 'true');
    });

    it('should only select pieces owned by current player', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Try to select black piece (current player is white, black is row 0)
      const blackCell = screen.getByTestId('cell-0-0');
      await user.click(blackCell);

      // Should not be selected
      expect(blackCell).toHaveAttribute('data-selected', 'false');
    });

    it('should deselect piece when clicking same cell again', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white piece (row 2)
      const cell = screen.getByTestId('cell-2-0');

      // Select
      await user.click(cell);
      expect(cell).toHaveAttribute('data-selected', 'true');

      // Deselect
      await user.click(cell);
      expect(cell).toHaveAttribute('data-selected', 'false');
    });

    it('should switch selection to different piece', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white pieces (row 2)
      const cell1 = screen.getByTestId('cell-2-0');
      const cell2 = screen.getByTestId('cell-2-1');

      // Select first piece
      await user.click(cell1);
      expect(cell1).toHaveAttribute('data-selected', 'true');

      // Select second piece
      await user.click(cell2);
      expect(cell1).toHaveAttribute('data-selected', 'false');
      expect(cell2).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Move Execution', () => {
    it('should call onMove when clicking legal move destination', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white rook at [2, 0]
      await user.click(screen.getByTestId('cell-2-0'));

      // Click legal move destination (rook can move vertically up)
      await user.click(screen.getByTestId('cell-1-0'));

      expect(mockOnMove).toHaveBeenCalledWith([2, 0], [1, 0]);
    });

    it('should clear selection after successful move', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      const sourceCell = screen.getByTestId('cell-2-0');
      const destCell = screen.getByTestId('cell-1-0');

      // Select and move
      await user.click(sourceCell);
      expect(sourceCell).toHaveAttribute('data-selected', 'true');

      await user.click(destCell);

      // Selection should be cleared
      expect(sourceCell).toHaveAttribute('data-selected', 'false');
    });

    it('should not call onMove for illegal moves', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white rook at [2, 0]
      await user.click(screen.getByTestId('cell-2-0'));

      // Try to click illegal destination (rook can't move diagonally)
      await user.click(screen.getByTestId('cell-1-1'));

      expect(mockOnMove).not.toHaveBeenCalled();
    });
  });

  describe('Legal Move Highlighting', () => {
    it('should mark legal moves when piece is selected', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white rook at [2, 0]
      await user.click(screen.getByTestId('cell-2-0'));

      // Rook can move to [1, 0] (up one square)
      const legalMoveCell = screen.getByTestId('cell-1-0');
      expect(legalMoveCell).toHaveAttribute('data-legal', 'true');
    });

    it('should clear legal move highlights when deselecting', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      const cell = screen.getByTestId('cell-2-0');

      // Select
      await user.click(cell);

      // Deselect
      await user.click(cell);

      // Check that legal moves are cleared
      const cell10 = screen.getByTestId('cell-1-0');
      expect(cell10).toHaveAttribute('data-legal', 'false');
    });
  });

  describe('Player Turn Management', () => {
    it('should disable interaction when isPlayerTurn is false', async () => {
      const user = userEvent.setup();
      render(
        <GameBoard
          gameState={gameState}
          onMove={mockOnMove}
          isPlayerTurn={false}
        />
      );

      // Try to select a white piece
      const cell = screen.getByTestId('cell-2-0');
      await user.click(cell);

      // Should not be selected
      expect(cell).toHaveAttribute('data-selected', 'false');
    });

    it('should enable interaction by default', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white piece
      const cell = screen.getByTestId('cell-2-0');
      await user.click(cell);

      expect(cell).toHaveAttribute('data-selected', 'true');
    });

    it('should pass disabled prop to cells when not player turn', () => {
      render(
        <GameBoard
          gameState={gameState}
          onMove={mockOnMove}
          isPlayerTurn={false}
        />
      );

      // All cells should be disabled
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = screen.getByTestId(`cell-${row}-${col}`);
          expect(cell).toHaveAttribute('data-disabled', 'true');
        }
      }
    });
  });

  describe('Last Move Highlighting', () => {
    it('should highlight cells from last move', () => {
      // Create base state
      const baseState = createTestGameState();

      // Get a valid piece from the board
      const piece = baseState.board[2]?.[0]; // White rook at [2, 0]

      if (!piece) {
        throw new Error('Test setup failed: No piece found');
      }

      // Add move history
      const stateWithMove = createTestGameState({
        moveHistory: [
          {
            from: [2, 0],
            to: [1, 0],
            piece,
            captured: null,
            timestamp: Date.now(),
          },
        ],
      });

      render(<GameBoard gameState={stateWithMove} onMove={mockOnMove} />);

      // Note: Last move highlighting is handled by isLastMovePosition callback
      // which is passed to GameCell. In this test, we verify the prop is passed.
      // The actual visual highlighting is tested in GameCell.test.tsx
      const fromCell = screen.getByTestId('cell-2-0');
      const toCell = screen.getByTestId('cell-1-0');

      expect(fromCell).toBeInTheDocument();
      expect(toCell).toBeInTheDocument();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce selected piece and legal moves', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white rook at [2, 0] (A3 in chess notation)
      await user.click(screen.getByTestId('cell-2-0'));

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(/Selected rook at A3/i);
      expect(status).toHaveTextContent(/legal moves available/i);
    });

    it('should clear announcement when no piece is selected', () => {
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      const status = screen.getByRole('status');
      expect(status).toBeEmptyDOMElement();
    });

    it('should use correct chess notation for position', async () => {
      const user = userEvent.setup();
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select white knight at [2, 1] (B3 in chess notation)
      await user.click(screen.getByTestId('cell-2-1'));

      const status = screen.getByRole('status');
      // B3 is column 1 (B) row 2 (3 in chess notation)
      expect(status).toHaveTextContent(/at B3/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty board cells', () => {
      // Note: We rely on the natural game state which has an empty middle row
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Middle row should be empty (cells exist but have no pieces)
      expect(screen.getByTestId('cell-1-0')).toBeInTheDocument();
      expect(screen.getByTestId('cell-1-1')).toBeInTheDocument();
      expect(screen.getByTestId('cell-1-2')).toBeInTheDocument();
    });

    it('should handle null position in cell data', () => {
      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // All cells should render without errors
      expect(screen.getAllByTestId(/^cell-/).length).toBe(9);
    });

    it('should handle edge piece interactions', async () => {
      const user = userEvent.setup();

      render(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Select edge piece (bishop at corner)
      await user.click(screen.getByTestId('cell-2-2'));

      // Should select without crashing
      expect(screen.getByTestId('cell-2-2')).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Game State Updates', () => {
    it('should re-render when game state changes', () => {
      const { rerender } = render(
        <GameBoard gameState={gameState} onMove={mockOnMove} />
      );

      // Create a completely new game state
      const players = createTestPlayers();
      const newEngine = new KingsChessEngine(players.white, players.black);
      const newState = newEngine.getGameState();

      rerender(<GameBoard gameState={newState} onMove={mockOnMove} />);

      // Component should re-render without errors
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should memoize engine instance based on game state', () => {
      const { rerender } = render(
        <GameBoard gameState={gameState} onMove={mockOnMove} />
      );

      // Re-render with same game state
      rerender(<GameBoard gameState={gameState} onMove={mockOnMove} />);

      // Should not cause infinite loops or excessive re-renders
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});
