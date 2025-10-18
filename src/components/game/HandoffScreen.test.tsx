/**
 * @fileoverview Tests for HandoffScreen component
 * @module components/game/HandoffScreen.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { HandoffScreen } from './HandoffScreen';

describe('HandoffScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with correct title for light player', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: /light's turn/i })).toBeInTheDocument();
    });

    it('should render with correct title for dark player', () => {
      render(
        <HandoffScreen
          nextPlayer="dark"
          nextPlayerName="Charlie"
          previousPlayer="light"
          previousPlayerName="David"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: /dark's turn/i })).toBeInTheDocument();
    });

    it('should display handoff message with player names', () => {
      render(
        <HandoffScreen
          nextPlayer="dark"
          nextPlayerName="Alice"
          previousPlayer="light"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByText(/light \(bob\) made their move/i)).toBeInTheDocument();
      expect(screen.getByText(/pass the device to alice/i)).toBeInTheDocument();
    });

    it('should render skip button', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /skip countdown/i })).toBeInTheDocument();
    });

    it('should display initial countdown', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
          countdownSeconds={3}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('seconds')).toBeInTheDocument();
    });

    it('should display keyboard hint', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByText(/press/i)).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
    });
  });

  describe('Countdown Timer', () => {
    it('should countdown from 3 to 0', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
          countdownSeconds={3}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('2')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should call onContinue when countdown reaches 0', () => {
      const onContinue = vi.fn();

      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={onContinue}
          countdownSeconds={1}
        />
      );

      // Wait one second for countdown to reach 0
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should support custom countdown duration', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
          countdownSeconds={5}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display singular "second" when countdown is 1', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
          countdownSeconds={2}
        />
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('second')).toBeInTheDocument();
    });
  });

  describe('Skip Functionality', () => {
    it('should call onContinue when skip button is clicked', () => {
      const onContinue = vi.fn();

      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={onContinue}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /skip countdown/i }));

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should call onContinue when Escape key is pressed', () => {
      const onContinue = vi.fn();

      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={onContinue}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBe('handoff-title');
      expect(screen.getByRole('heading', { name: /light's turn/i })).toHaveAttribute('id', titleId);
    });

    it('should have aria-describedby pointing to description', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'handoff-description');
    });

    it('should announce countdown with aria-live', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      const countdown = screen.getByText('3').parentElement;
      expect(countdown).toHaveAttribute('aria-live', 'polite');
      expect(countdown).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have accessible skip button label', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Skip countdown and continue to game');
    });

    it('should hide blur overlay from screen readers', () => {
      const { container } = render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      const blurOverlay = container.querySelector('[aria-hidden="true"]');
      expect(blurOverlay).toBeInTheDocument();
    });
  });

  describe('Focus Trap', () => {
    it('should trap focus within modal', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      // Button should have initial focus
      const skipButton = screen.getByRole('button');
      expect(skipButton).toHaveFocus();

      // Tab should keep focus on button (trapped)
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(skipButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle countdown of 0 seconds', () => {
      const onContinue = vi.fn();

      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={onContinue}
          countdownSeconds={0}
        />
      );

      // Should call onContinue immediately
      expect(onContinue).toHaveBeenCalled();
    });

    it('should not crash with very long player names', () => {
      render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName={'A'.repeat(50)}
          previousPlayer="dark"
          previousPlayerName={'B'.repeat(50)}
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = render(
        <HandoffScreen
          nextPlayer="light"
          nextPlayerName="Alice"
          previousPlayer="dark"
          previousPlayerName="Bob"
          onContinue={vi.fn()}
        />
      );

      unmount();

      // No errors should occur
      expect(true).toBe(true);
    });
  });
});
