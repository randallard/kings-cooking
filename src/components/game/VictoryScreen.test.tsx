/**
 * @fileoverview Tests for VictoryScreen component
 * @module components/game/VictoryScreen.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VictoryScreen } from './VictoryScreen';

describe('VictoryScreen', () => {
  const defaultProps = {
    winner: 'white' as const,
    winnerName: 'Alice',
    loserName: 'Bob',
    totalMoves: 42,
    gameDuration: 1234,
    whiteCourt: [],
    blackCourt: [],
    capturedWhite: [],
    capturedBlack: [],
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
  };

  describe('Rendering', () => {
    it('should render with white winner', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /white wins/i })).toBeInTheDocument();
    });

    it('should render with black winner', () => {
      render(
        <VictoryScreen {...defaultProps} winner="black" winnerName="Charlie" loserName="David" />
      );

      expect(screen.getByRole('heading', { name: /black wins/i })).toBeInTheDocument();
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

    it('should format duration correctly (MM:SS)', () => {
      render(<VictoryScreen {...defaultProps} gameDuration={125} />);

      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should format duration with padding', () => {
      render(<VictoryScreen {...defaultProps} gameDuration={65} />);

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should display white player stats section', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByText('White Player (Player 1)')).toBeInTheDocument();
    });

    it('should display black player stats section', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.getByText('Black Player (Player 2)')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      render(<VictoryScreen {...defaultProps} gameDuration={0} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should handle large duration', () => {
      render(<VictoryScreen {...defaultProps} gameDuration={3661} />);

      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should not render New Game button', () => {
      render(<VictoryScreen {...defaultProps} />);

      expect(screen.queryByText('New Game')).not.toBeInTheDocument();
    });

    it('should render Share Result button when onShare and shareUrl are provided', () => {
      const onShare = vi.fn();
      const shareUrl = 'https://example.com/game#abc123';
      render(<VictoryScreen {...defaultProps} onShare={onShare} shareUrl={shareUrl} />);

      expect(screen.getByRole('button', { name: /share game result/i })).toBeInTheDocument();
    });

    it('should not render Share Result button when shareUrl is not provided', () => {
      const onShare = vi.fn();
      render(<VictoryScreen {...defaultProps} onShare={onShare} />);

      expect(screen.queryByRole('button', { name: /share game result/i })).not.toBeInTheDocument();
    });

    it('should not render Share Result button when onShare is not provided', () => {
      const shareUrl = 'https://example.com/game#abc123';
      render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} />);

      expect(screen.queryByRole('button', { name: /share game result/i })).not.toBeInTheDocument();
    });

    it('should show URLSharer when Share Result is clicked', () => {
      const onShare = vi.fn();
      const shareUrl = 'https://example.com/game#abc123';
      render(<VictoryScreen {...defaultProps} onShare={onShare} shareUrl={shareUrl} />);

      // URLSharer should not be visible initially
      expect(screen.queryByText('Share this game:')).not.toBeInTheDocument();

      // Click Share Result button
      fireEvent.click(screen.getByRole('button', { name: /share game result/i }));

      // URLSharer should now be visible
      expect(screen.getByText('Share this game:')).toBeInTheDocument();
      expect(screen.getByDisplayValue(shareUrl)).toBeInTheDocument();
    });

    it('should call onShare callback when Share Result is clicked', () => {
      const onShare = vi.fn();
      const shareUrl = 'https://example.com/game#abc123';
      render(<VictoryScreen {...defaultProps} onShare={onShare} shareUrl={shareUrl} />);

      fireEvent.click(screen.getByRole('button', { name: /share game result/i }));

      expect(onShare).toHaveBeenCalledTimes(1);
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

    it('should render Share Result and Review Moves buttons when callbacks are provided', () => {
      const shareUrl = 'https://example.com/game#abc123';
      render(
        <VictoryScreen
          {...defaultProps}
          shareUrl={shareUrl}
          onShare={vi.fn()}
          onReviewMoves={vi.fn()}
        />
      );

      expect(screen.getAllByRole('button')).toHaveLength(2);
    });
  });

  describe('Celebration Messages', () => {
    it('should show celebration for white winner', () => {
      render(<VictoryScreen {...defaultProps} winner="white" />);

      expect(screen.getByText('White Wins!')).toBeInTheDocument();
    });

    it('should show celebration for black winner', () => {
      render(<VictoryScreen {...defaultProps} winner="black" />);

      expect(screen.getByText('Black Wins!')).toBeInTheDocument();
    });

    it('should show draw message', () => {
      render(<VictoryScreen {...defaultProps} winner="draw" />);

      expect(screen.getByText("It's a Draw!")).toBeInTheDocument();
    });

    it('should show subtitle with player names for winner', () => {
      render(
        <VictoryScreen {...defaultProps} winner="white" winnerName="Alice" loserName="Bob" />
      );

      expect(screen.getByText('Alice defeated Bob')).toBeInTheDocument();
    });

    it('should show generic subtitle when names not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { winnerName, loserName, ...propsWithoutNames } = defaultProps;
      render(<VictoryScreen {...propsWithoutNames} />);

      expect(screen.getByText('White is victorious!')).toBeInTheDocument();
    });

    it('should show draw subtitle', () => {
      render(<VictoryScreen {...defaultProps} winner="draw" />);

      expect(screen.getByText('Both players played exceptionally well!')).toBeInTheDocument();
    });
  });

  describe('Confetti Animation', () => {
    it('should render confetti for white winner', () => {
      render(<VictoryScreen {...defaultProps} winner="white" />);

      // Check for confetti pieces (rendered as divs with keys)
      const dialog = screen.getByRole('dialog');
      const confettiContainer = dialog.querySelector('[aria-hidden="true"]');
      expect(confettiContainer).toBeInTheDocument();
    });

    it('should render confetti for black winner', () => {
      render(<VictoryScreen {...defaultProps} winner="black" />);

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
      render(<VictoryScreen {...defaultProps} winner="white" />);

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
      expect(screen.getByRole('heading', { name: /white wins/i })).toHaveAttribute('id', titleId);
    });

    it('should have aria-describedby pointing to subtitle', () => {
      render(<VictoryScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'victory-subtitle');
    });

    it('should have accessible button labels', () => {
      const shareUrl = 'https://example.com/game#abc123';
      render(
        <VictoryScreen
          {...defaultProps}
          shareUrl={shareUrl}
          onShare={vi.fn()}
          onReviewMoves={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Share game result' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Review game moves' })).toBeInTheDocument();
    });

    it('should hide confetti from screen readers', () => {
      render(<VictoryScreen {...defaultProps} winner="white" />);

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
      render(<VictoryScreen {...defaultProps} whiteCourt={[]} blackCourt={[]} capturedWhite={[]} capturedBlack={[]} />);

      // Should display "0 pieces" for each stat
      const zeros = screen.getAllByText(/0 piece/);
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle very large numbers', () => {
      render(
        <VictoryScreen
          {...defaultProps}
          totalMoves={9999}
          gameDuration={99999}
        />
      );

      expect(screen.getByText('9999')).toBeInTheDocument();
      expect(screen.getByText('1666:39')).toBeInTheDocument();
    });

    it('should not crash with missing optional props', () => {
      render(
        <VictoryScreen
          winner="white"
          totalMoves={10}
          gameDuration={60}
          whiteCourt={[]}
          blackCourt={[]}
          capturedWhite={[]}
          capturedBlack={[]}
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
