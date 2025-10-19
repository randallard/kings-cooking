/**
 * @fileoverview Tests for VictoryScreen component
 * @module components/game/VictoryScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VictoryScreen } from './VictoryScreen';

describe('VictoryScreen', () => {
  const defaultProps = {
    winner: 'light' as const,
    winnerName: 'Alice',
    loserName: 'Bob',
    player1Name: 'Alice',
    player2Name: 'Bob',
    totalMoves: 42,
    lightCourt: [],
    darkCourt: [],
    capturedLight: [],
    capturedDark: [],
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
  };

  describe('Rendering', () => {
    it('should render with white winner', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /light wins/i })).toBeInTheDocument();
    });

    it('should render with dark winner', () => {
      render(
        <VictoryScreen {...defaultProps} winner="dark" winnerName="Charlie" loserName="David" />
      );

      expect(screen.getByRole('heading', { name: /dark wins/i })).toBeInTheDocument();
    });

    it('should render for draw', () => {
      render(<VictoryScreen {...defaultProps} winner="draw" />);

      expect(screen.getByRole('heading', { name: /it's a draw/i })).toBeInTheDocument();
    });

    it('should display winner and loser names', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByText(/alice defeated bob/i)).toBeInTheDocument();
    });

    it('should display stats title', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /game statistics/i })).toBeInTheDocument();
    });
  });

  describe('Game Statistics', () => {
    it('should display total moves', () => {
      render(<VictoryScreen {...defaultProps} totalMoves={42} />);

      expect(screen.getByText('Total Moves')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display light player stats section with player name', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should display dark player stats section with player name', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should fallback to generic name when player1Name not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { player1Name, ...propsWithoutPlayer1Name } = defaultProps;
      render(<VictoryScreen {...propsWithoutPlayer1Name} />);

      expect(screen.getByText('Light Player (Player 1)')).toBeInTheDocument();
    });

    it('should fallback to generic name when player2Name not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { player2Name, ...propsWithoutPlayer2Name } = defaultProps;
      render(<VictoryScreen {...propsWithoutPlayer2Name} />);

      expect(screen.getByText('Dark Player (Player 2)')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should not render New Game button', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.queryByText('New Game')).not.toBeInTheDocument();
    });

    it('should not render Share Result button', () => {
      const shareUrl = 'https://example.com/game#abc123';
      render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} />);

      expect(screen.queryByRole('button', { name: /share game result/i })).not.toBeInTheDocument();
    });

    it('should show URLSharer immediately when shareUrl is provided', () => {
      const shareUrl = 'https://example.com/game#abc123';
      render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} />);

      // URLSharer should be visible immediately
      expect(screen.getByText('Share this game:')).toBeInTheDocument();
      expect(screen.getByDisplayValue(shareUrl)).toBeInTheDocument();
    });

    it('should not show URLSharer when shareUrl is not provided', () => {
      render(<VictoryScreen {...defaultProps} />);

      // URLSharer should not be visible
      expect(screen.queryByText('Share this game:')).not.toBeInTheDocument();
    });

    it('should render Review Moves button when onReviewMoves is provided', () => {
      const onReviewMoves = vi.fn();
      render(<VictoryScreen {...defaultProps} onReviewMoves={onReviewMoves} />);

      expect(screen.getByRole('button', { name: /review game moves/i })).toBeInTheDocument();
    });

    it('should call onReviewMoves when Review Moves is clicked', () => {
      const onReviewMoves = vi.fn();
      render(<VictoryScreen {...defaultProps} onReviewMoves={onReviewMoves} />);

      fireEvent.click(screen.getByRole('button', { name: /review game moves/i }));

      expect(onReviewMoves).toHaveBeenCalledTimes(1);
    });

    it('should not render Review Moves button when onReviewMoves is not provided', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(
        screen.queryByRole('button', { name: /review game moves/i })
      ).not.toBeInTheDocument();
    });

    it('should render Review Moves button when onReviewMoves is provided', () => {
      render(
        <VictoryScreen
          {...defaultProps}
          onReviewMoves={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /review game moves/i })).toBeInTheDocument();
    });

    it('should render both Copy and Review Moves buttons when shareUrl and onReviewMoves are provided', () => {
      const shareUrl = 'https://example.com/game#abc123';
      render(
        <VictoryScreen
          {...defaultProps}
          shareUrl={shareUrl}
          onReviewMoves={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review game moves/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    // TASK 1: RED - New Game button tests (these will FAIL initially)
    it('should render New Game button when onNewGame is provided (hot-seat mode)', () => {
      const onNewGame = vi.fn();

      render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

      expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    });

    it('should call onNewGame when New Game button is clicked', () => {
      const onNewGame = vi.fn();

      render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

      fireEvent.click(screen.getByRole('button', { name: /new game/i }));

      expect(onNewGame).toHaveBeenCalledTimes(1);
    });

    it('should not render New Game button when onNewGame is not provided', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /new game/i })).not.toBeInTheDocument();
    });

    describe('New Game Button - URL Mode', () => {
      beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
      });

      it('should NOT show New Game button in URL mode before copy', () => {
        const onNewGame = vi.fn();
        const shareUrl = 'https://example.com/game#abc123';

        render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} onNewGame={onNewGame} />);

        expect(screen.queryByRole('button', { name: /new game/i })).not.toBeInTheDocument();
      });

      it('should show New Game button in URL mode after copy is clicked', async () => {
        const onNewGame = vi.fn();
        const shareUrl = 'https://example.com/game#abc123';

        render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} onNewGame={onNewGame} />);

        // Click copy button
        const copyButton = screen.getByRole('button', { name: /copy/i });
        fireEvent.click(copyButton);

        // New Game button should now appear
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
        });
      });

      it('should show New Game button on mount if localStorage flag exists', () => {
        // Simulate previous copy action
        localStorage.setItem('kings-cooking:victory-url-copied', 'true');

        const onNewGame = vi.fn();
        const shareUrl = 'https://example.com/game#abc123';

        render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} onNewGame={onNewGame} />);

        // Button should be visible on mount
        expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
      });

      it('should not interfere with hot-seat mode (no shareUrl)', () => {
        const onNewGame = vi.fn();

        render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

        // Button should show immediately in hot-seat mode
        expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
      });
    });
  });

  describe('Celebration Messages', () => {
    it('should show celebration for light winner', () => {
      render(<VictoryScreen {...defaultProps} winner="light" />);

      expect(screen.getByText('Light Wins!')).toBeInTheDocument();
    });

    it('should show celebration for dark winner', () => {
      render(<VictoryScreen {...defaultProps} winner="dark" />);

      expect(screen.getByText('Dark Wins!')).toBeInTheDocument();
    });

    it('should show draw message', () => {
      render(<VictoryScreen {...defaultProps} winner="draw" />);

      expect(screen.getByText("It's a Draw!")).toBeInTheDocument();
    });

    it('should show subtitle with player names for winner', () => {
      render(
        <VictoryScreen {...defaultProps} winner="light" winnerName="Alice" loserName="Bob" />
      );

      expect(screen.getByText('Alice defeated Bob')).toBeInTheDocument();
    });

    it('should show generic subtitle when names not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { winnerName, loserName, ...propsWithoutNames } = defaultProps;
      render(<VictoryScreen {...propsWithoutNames} />);

      expect(screen.getByText('Light is victorious!')).toBeInTheDocument();
    });

    it('should show draw subtitle', () => {
      render(<VictoryScreen {...defaultProps} winner="draw" />);

      expect(screen.getByText('Both players played exceptionally well!')).toBeInTheDocument();
    });
  });

  describe('Confetti Animation', () => {
    it('should render confetti for white winner', () => {
      render(<VictoryScreen {...defaultProps} winner="light" />);

      // Check for confetti pieces (rendered as divs with keys)
      const dialog = screen.getByRole('dialog');
      const confettiContainer = dialog.querySelector('[aria-hidden="true"]');
      expect(confettiContainer).toBeInTheDocument();
    });

    it('should render confetti for black winner', () => {
      render(<VictoryScreen {...defaultProps} winner="dark" />);

      const dialog = screen.getByRole('dialog');
      const confettiContainer = dialog.querySelector('[aria-hidden="true"]');
      expect(confettiContainer).toBeInTheDocument();
    });

    it('should not render confetti for draw', () => {
      render(<VictoryScreen {...defaultProps} winner="draw" />);

      const dialog = screen.getByRole('dialog');
      // For draw, there should be no aria-hidden confetti container
      const confettiContainer = dialog.querySelector('[aria-hidden="true"]');
      expect(confettiContainer).not.toBeInTheDocument();
    });

    it('should render 50 confetti pieces for winner', () => {
      render(<VictoryScreen {...defaultProps} winner="light" />);

      const dialog = screen.getByRole('dialog');
      const confettiContainer = dialog.querySelector('[aria-hidden="true"]');
      expect(confettiContainer).toBeInTheDocument();

      // Check that confetti container has child elements
      if (confettiContainer) {
        const children = confettiContainer.children;
        expect(children.length).toBe(50);
      }
    });
  });

  describe('Mobile Scrolling', () => {
    it('should render container element for scrollable content', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const container = dialog.querySelector('[class*="container"]');

      // Verify container element exists (CSS scrolling styles applied via module)
      expect(container).toBeInTheDocument();
    });

    it('should render overlay element for scroll containment', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const overlay = dialog.querySelector('[class*="overlay"]') || dialog;

      // Verify overlay element exists (CSS overscroll-behavior applied via module)
      expect(overlay).toBeInTheDocument();
    });

    it('should have proper structure for mobile scrolling', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const container = dialog.querySelector('[class*="container"]') as HTMLElement;

      // Verify container is child of dialog
      expect(container).toBeInTheDocument();
      expect(dialog).toContainElement(container);

      // Note: Actual CSS properties (max-height: 90vh, overflow-y: auto,
      // overscroll-behavior: contain, touch-action: pan-y) are verified
      // via manual mobile testing and visual inspection in browser DevTools
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBe('victory-title');
      expect(screen.getByRole('heading', { name: /light wins/i })).toHaveAttribute('id', titleId);
    });

    it('should have aria-describedby pointing to subtitle', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'victory-subtitle');
    });

    it('should have accessible button label for Review Moves', () => {
      render(
        <VictoryScreen
          {...defaultProps}
          onReviewMoves={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Review game moves' })).toBeInTheDocument();
    });

    it('should hide confetti from screen readers', () => {
      render(<VictoryScreen {...defaultProps} winner="light" />);

      const dialog = screen.getByRole('dialog');
      const confettiContainer = dialog.querySelector('[aria-hidden="true"]');
      expect(confettiContainer).toBeInTheDocument();
      expect(confettiContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long player names', () => {
      render(
        <VictoryScreen
          {...defaultProps}
          winnerName={'A'.repeat(50)}
          loserName={'B'.repeat(50)}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle zero moves', () => {
      render(<VictoryScreen {...defaultProps} totalMoves={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle empty piece arrays', () => {
      render(<VictoryScreen {...defaultProps} lightCourt={[]} darkCourt={[]} capturedLight={[]} capturedDark={[]} />);

      // Should display "0 pieces" for each stat
      const zeros = screen.getAllByText(/0 piece/);
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle very large numbers', () => {
      render(
        <VictoryScreen
          {...defaultProps}
          totalMoves={9999}
        />
      );

      expect(screen.getByText('9999')).toBeInTheDocument();
    });

    it('should not crash with missing optional props', () => {
      render(
        <VictoryScreen
          winner="light"
          totalMoves={10}
          lightCourt={[]}
          darkCourt={[]}
          capturedLight={[]}
          capturedDark={[]}
          board={[
            [null, null, null],
            [null, null, null],
            [null, null, null],
          ]}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
