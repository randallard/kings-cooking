/**
 * @fileoverview Tests for HistoryViewer component
 * @module components/HistoryViewer.test
 *
 * Tests collapsible panel, move display, full history modal, and export functionality.
 * Uses React Testing Library for user-centric testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryViewer } from './HistoryViewer';
import type { Move, Piece } from '@/lib/validation/schemas';

/**
 * Helper function to create a mock piece
 */
const createMockPiece = (owner: 'light' | 'dark'): Piece => ({
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
  owner: 'light' | 'dark',
  captured: Piece | null = null
): Move => ({
  from,
  to,
  piece: createMockPiece(owner),
  captured,
  timestamp: mockTimestamp++, // Increment to ensure unique timestamps
});

/**
 * Test suite for HistoryViewer component
 */
describe('HistoryViewer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Group: Basic Rendering
   */
  describe('Basic Rendering', () => {
    it('should render with empty history', () => {
      render(<HistoryViewer history={[]} />);

      expect(screen.getByRole('heading', { name: /Move History \(0\)/i })).toBeInTheDocument();
    });

    it('should show empty message when no moves', () => {
      render(<HistoryViewer history={[]} defaultExpanded={true} />);

      expect(screen.getByText(/No moves yet/i)).toBeInTheDocument();
    });

    it('should render with initial moves', () => {
      const history = [
        createMockMove([0, 0], [1, 1], 'light'),
        createMockMove([2, 2], [1, 1], 'dark'),
      ];

      render(<HistoryViewer history={history} />);

      expect(screen.getByRole('heading', { name: /Move History \(2\)/i })).toBeInTheDocument();
    });

    it('should display correct move count in header', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      expect(screen.getByRole('heading', { name: /Move History \(15\)/i })).toBeInTheDocument();
    });
  });

  /**
   * Group: Collapsible Panel
   */
  describe('Collapsible Panel', () => {
    it('should start expanded by default', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const content = screen.getByRole('log');
      expect(content).toBeVisible();
    });

    it('should start collapsed when defaultExpanded is false', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} defaultExpanded={false} />);

      const content = document.querySelector('#history-content');
      expect(content).toHaveAttribute('hidden');
    });

    it('should toggle panel on header click', async () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const header = screen.getByRole('button', { name: /Move History/i });
      const content = document.querySelector('#history-content');

      // Initially expanded
      expect(screen.getByRole('log')).toBeVisible();
      expect(content).not.toHaveAttribute('hidden');

      // Click to collapse
      await user.click(header);
      await waitFor(() => {
        expect(content).toHaveAttribute('hidden');
      });

      // Click to expand
      await user.click(header);
      await waitFor(() => {
        expect(content).not.toHaveAttribute('hidden');
      });
    });

    it('should toggle panel on Enter key', async () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const header = screen.getByRole('button', { name: /Move History/i });
      const content = document.querySelector('#history-content');
      header.focus();

      // Press Enter to collapse
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(content).toHaveAttribute('hidden');
      });
    });

    it('should toggle panel on Space key', async () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const header = screen.getByRole('button', { name: /Move History/i });
      const content = document.querySelector('#history-content');
      header.focus();

      // Press Space to collapse
      await user.keyboard(' ');
      await waitFor(() => {
        expect(content).toHaveAttribute('hidden');
      });
    });

    it('should have correct ARIA attributes when expanded', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
      expect(header).toHaveAttribute('aria-controls', 'history-content');
    });

    it('should have correct ARIA attributes when collapsed', async () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const header = screen.getByRole('button');
      await user.click(header);

      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  /**
   * Group: Move Display
   */
  describe('Move Display', () => {
    it('should show last 10 moves when history is longer', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      // Should show moves 6-15 (last 10)
      const moves = screen.getAllByRole('listitem');
      expect(moves).toHaveLength(10);
    });

    it('should display move notation correctly', () => {
      const history = [createMockMove([0, 0], [2, 2], 'light')];

      render(<HistoryViewer history={history} />);

      expect(screen.getByText(/A1 → C3/i)).toBeInTheDocument();
    });

    it('should display "Off Board" for off-board moves', () => {
      const history = [createMockMove([1, 1], 'off_board', 'light')];

      render(<HistoryViewer history={history} />);

      expect(screen.getByText(/B2 → Off Board/i)).toBeInTheDocument();
    });

    it('should display player ownership', () => {
      const history = [
        createMockMove([0, 0], [1, 1], 'light'),
        createMockMove([2, 2], [1, 1], 'dark'),
      ];

      render(<HistoryViewer history={history} />);

      expect(screen.getByText(/\(light\)/i)).toBeInTheDocument();
      expect(screen.getByText(/\(dark\)/i)).toBeInTheDocument();
    });

    it('should show capture indicator when piece captured', () => {
      const capturedPiece = createMockPiece('dark');
      const history = [createMockMove([0, 0], [1, 1], 'light', capturedPiece)];

      render(<HistoryViewer history={history} />);

      const captureIndicator = screen.getByTitle(/Captured dark rook/i);
      expect(captureIndicator).toBeInTheDocument();
    });

    it('should highlight current move with aria-current', () => {
      const history = [
        createMockMove([0, 0], [1, 1], 'light'),
        createMockMove([2, 2], [1, 1], 'dark'),
        createMockMove([1, 1], [2, 2], 'light'),
      ];

      render(<HistoryViewer history={history} currentMoveIndex={1} />);

      const moves = screen.getAllByRole('listitem');
      expect(moves[1]).toHaveAttribute('aria-current', 'step');
    });
  });

  /**
   * Group: Full History Modal
   */
  describe('Full History Modal', () => {
    it('should show "Show Full History" button when history > 10 moves', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      expect(screen.getByRole('button', { name: /Show complete game history/i })).toBeInTheDocument();
    });

    it('should not show "Show Full History" button when history <= 10 moves', () => {
      const history = Array.from({ length: 5 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      expect(
        screen.queryByRole('button', { name: /Show complete game history/i })
      ).not.toBeInTheDocument();
    });

    it('should open modal when "Show Full History" button clicked', async () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      const button = screen.getByRole('button', { name: /Show complete game history/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/Full Game History/i)).toBeInTheDocument();
      });
    });

    it('should close modal when close button clicked', async () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      const openButton = screen.getByRole('button', { name: /Show complete game history/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close modal/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal on ESC key', async () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      const openButton = screen.getByRole('button', { name: /Show complete game history/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should display all moves in modal', async () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} />);

      const openButton = screen.getByRole('button', { name: /Show complete game history/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText(/Total moves: 15/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Group: Export JSON
   */
  describe('Export JSON', () => {
    it('should show export button when handler provided', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      const onExport = vi.fn();

      render(<HistoryViewer history={history} onExportJSON={onExport} />);

      expect(screen.getByRole('button', { name: /Export game as JSON/i })).toBeInTheDocument();
    });

    it('should not show export button when no handler', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];

      render(<HistoryViewer history={history} />);

      expect(screen.queryByRole('button', { name: /Export JSON/i })).not.toBeInTheDocument();
    });

    it('should call export handler when button clicked', async () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      const onExport = vi.fn();

      render(<HistoryViewer history={history} onExportJSON={onExport} />);

      const button = screen.getByRole('button', { name: /Export game as JSON/i });
      await user.click(button);

      expect(onExport).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Group: Accessibility
   */
  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(/Move History/i);
    });

    it('should use role="log" for move list', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('should have aria-live="polite" for move list', () => {
      const history = [createMockMove([0, 0], [1, 1], 'light')];
      render(<HistoryViewer history={history} />);

      const moveList = screen.getByRole('log');
      expect(moveList).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive button labels', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createMockMove([0, 0], [1, 1], i % 2 === 0 ? 'light' : 'dark')
      );

      render(<HistoryViewer history={history} onExportJSON={vi.fn()} />);

      expect(
        screen.getByRole('button', { name: /Show complete game history/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export game as JSON/i })).toBeInTheDocument();
    });
  });
});
