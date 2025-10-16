/**
 * @fileoverview Tests for HistoryComparisonModal component
 * @module components/HistoryComparisonModal.test
 *
 * Tests divergence detection, action buttons, and modal accessibility.
 * Uses React Testing Library for user-centric testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryComparisonModal } from './HistoryComparisonModal';
import type { GameState, Move, Piece } from '@/lib/validation/schemas';

/**
 * Helper function to create a mock piece
 */
const createMockPiece = (owner: 'white' | 'black'): Piece => ({
  type: 'rook',
  owner,
  position: [0, 0],
  moveCount: 0,
  id: crypto.randomUUID(),
});

/**
 * Helper function to create a mock move
 */
let mockTimestamp = Date.now();
const createMockMove = (
  from: [number, number],
  to: [number, number] | 'off_board',
  owner: 'white' | 'black'
): Move => ({
  from,
  to,
  piece: createMockPiece(owner),
  captured: null,
  timestamp: mockTimestamp++, // Increment to ensure unique timestamps
});

/**
 * Helper function to create a mock game state
 */
const createMockGameState = (moveHistory: Move[] = []): GameState => ({
  version: '1.0.0',
  gameId: crypto.randomUUID() as never,
  board: [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ],
  whiteCourt: [],
  blackCourt: [],
  capturedWhite: [],
  capturedBlack: [],
  currentTurn: moveHistory.length,
  currentPlayer: moveHistory.length % 2 === 0 ? 'white' : 'black',
  whitePlayer: {
    id: crypto.randomUUID() as never,
    name: 'Player 1',
  },
  blackPlayer: {
    id: crypto.randomUUID() as never,
    name: 'Player 2',
  },
  status: 'playing',
  winner: null,
  moveHistory,
  checksum: 'mock-checksum',
});

/**
 * Test suite for HistoryComparisonModal component
 */
describe('HistoryComparisonModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  // Mock clipboard API
  const mockClipboard = {
    writeText: vi.fn(),
  };

  beforeEach(() => {
    user = userEvent.setup();

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });

    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Group: Basic Rendering
   */
  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={false}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Timeline Divergence Detected/i)).toBeInTheDocument();
    });

    it('should display divergence message', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(
        screen.getByText(/Your game state and your opponent's state have diverged/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * Group: Divergence Detection
   */
  describe('Divergence Detection', () => {
    it('should detect divergence at first differing move', () => {
      const myHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
        createMockMove([1, 1], [2, 2], 'white'), // Diverges here
      ];

      const theirHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
        createMockMove([1, 1], [0, 0], 'white'), // Different move
      ];

      const myState = createMockGameState(myHistory);

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByText(/Diverged at move 3/i)).toBeInTheDocument();
    });

    it('should detect divergence when histories have different lengths', () => {
      const myHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
      ];

      const theirHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
        createMockMove([1, 1], [2, 2], 'white'),
      ];

      const myState = createMockGameState(myHistory);

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByText(/Diverged at move 3/i)).toBeInTheDocument();
    });

    it('should handle empty histories', () => {
      const myState = createMockGameState([]);
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByText(/Diverged at move 1/i)).toBeInTheDocument();
    });

    it('should highlight divergent moves', () => {
      const myHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
        createMockMove([1, 1], [2, 2], 'white'),
      ];

      const theirHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
        createMockMove([1, 1], [0, 0], 'white'),
      ];

      const myState = createMockGameState(myHistory);

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const divergentMoves = screen.getAllByRole('listitem');
      // Last move in each history should have 'divergent' class
      expect(divergentMoves.some((move) => move.classList.contains('divergent'))).toBe(true);
    });
  });

  /**
   * Group: Side-by-Side Comparison
   */
  describe('Side-by-Side Comparison', () => {
    it('should display both histories', () => {
      const myHistory = [createMockMove([0, 0], [1, 1], 'white')];
      const theirHistory = [createMockMove([2, 2], [1, 1], 'black')];

      const myState = createMockGameState(myHistory);

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByRole('heading', { name: /Your History/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Opponent's History/i })).toBeInTheDocument();
    });

    it('should show move counts in summary', () => {
      const myHistory = [
        createMockMove([0, 0], [1, 1], 'white'),
        createMockMove([2, 2], [1, 1], 'black'),
      ];
      const theirHistory = [createMockMove([0, 0], [1, 1], 'white')];

      const myState = createMockGameState(myHistory);

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByText(/Your history:/i)).toBeInTheDocument();
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getByText(/Opponent's history:/i)).toBeInTheDocument();
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });

    it('should display move notation correctly', () => {
      const myHistory = [createMockMove([0, 0], [2, 2], 'white')];
      const theirHistory: Move[] = [];

      const myState = createMockGameState(myHistory);

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByText(/A1 → C3/i)).toBeInTheDocument();
    });
  });

  /**
   * Group: Action Buttons
   */
  describe('Action Buttons', () => {
    it('should render all four action buttons', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByRole('button', { name: /Send your state to opponent/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Accept opponent's state/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Review detailed comparison/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel and close modal/i })).toBeInTheDocument();
    });

    it('should copy URL when "Send My State" clicked', async () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const button = screen.getByRole('button', { name: /Send your state to opponent/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('http'));
      });
    });

    it('should show success message after sending state', async () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const button = screen.getByRole('button', { name: /Send your state to opponent/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Full state URL copied/i)).toBeInTheDocument();
      });
    });

    it('should disable buttons while processing', async () => {
      // Make clipboard operation slow to test disabled state
      mockClipboard.writeText.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const sendButton = screen.getByRole('button', { name: /Send your state to opponent/i });

      // Click button and immediately check disabled state
      void user.click(sendButton); // Don't await - check immediately

      // Buttons should be disabled during processing
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept opponent's state/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Review detailed comparison/i })).toBeDisabled();
      });

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByText(/Full state URL copied/i)).toBeInTheDocument();
      });
    });

    it('should show message when "Accept Their State" clicked', async () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];
      const onAcceptTheirState = vi.fn();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
          onAcceptTheirState={onAcceptTheirState}
        />
      );

      const button = screen.getByRole('button', { name: /Accept opponent's state/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Ask your opponent to send their full state URL/i)).toBeInTheDocument();
      });
    });

    it('should show message when "Review Details" clicked', async () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const button = screen.getByRole('button', { name: /Review detailed comparison/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Detailed review will be available in Phase 6/i)).toBeInTheDocument();
      });
    });

    it('should close modal when "Cancel" clicked', async () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];
      const onClose = vi.fn();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={onClose}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const button = screen.getByRole('button', { name: /Cancel and close modal/i });
      await user.click(button);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Group: Modal Accessibility
   */
  describe('Modal Accessibility', () => {
    it('should have role="dialog"', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should close on backdrop click', async () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];
      const onClose = vi.fn();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={onClose}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should have descriptive button labels', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(screen.getByLabelText(/Send your state to opponent/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Accept opponent's state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Review detailed comparison/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cancel and close modal/i)).toBeInTheDocument();
    });

    it('should prevent body scroll when open', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const myState = createMockGameState();
      const theirHistory: Move[] = [];

      const { rerender } = render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <HistoryComparisonModal
          isOpen={false}
          onClose={vi.fn()}
          myState={myState}
          theirHistory={theirHistory}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });
});
