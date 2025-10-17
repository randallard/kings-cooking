/**
 * @fileoverview Tests for ModeSelector component
 * @module components/game/ModeSelector.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from './ModeSelector';

describe('ModeSelector', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByRole('heading', { name: /king's cooking chess/i })).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByRole('heading', { name: /choose your game mode/i })).toBeInTheDocument();
    });

    it('should render hot-seat mode button', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const button = screen.getByRole('button', { name: /play hot-seat mode on this device/i });
      expect(button).toBeInTheDocument();
    });

    it('should render URL mode button', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const button = screen.getByRole('button', { name: /play url mode across devices/i });
      expect(button).toBeInTheDocument();
    });

    it('should display hot-seat mode features', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/pass device back and forth/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy screen between turns/i)).toBeInTheDocument();
      expect(screen.getByText(/works offline/i)).toBeInTheDocument();
    });

    it('should display URL mode features', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/each player on their own device/i)).toBeInTheDocument();
      expect(screen.getByText(/share url after each move/i)).toBeInTheDocument();
      expect(screen.getByText(/play at your own pace/i)).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should call onModeSelected with "hotseat" when hot-seat button clicked', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const button = screen.getByTestId('mode-hotseat');
      fireEvent.click(button);

      expect(onModeSelected).toHaveBeenCalledTimes(1);
      expect(onModeSelected).toHaveBeenCalledWith('hotseat');
    });

    it('should call onModeSelected with "url" when URL button clicked', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const button = screen.getByTestId('mode-url');
      fireEvent.click(button);

      expect(onModeSelected).toHaveBeenCalledTimes(1);
      expect(onModeSelected).toHaveBeenCalledWith('url');
    });

    it('should not call onModeSelected if not clicked', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      expect(onModeSelected).not.toHaveBeenCalled();
    });

    it('should allow multiple selections', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const hotseatButton = screen.getByTestId('mode-hotseat');
      const urlButton = screen.getByTestId('mode-url');

      fireEvent.click(hotseatButton);
      fireEvent.click(urlButton);
      fireEvent.click(hotseatButton);

      expect(onModeSelected).toHaveBeenCalledTimes(3);
      expect(onModeSelected).toHaveBeenNthCalledWith(1, 'hotseat');
      expect(onModeSelected).toHaveBeenNthCalledWith(2, 'url');
      expect(onModeSelected).toHaveBeenNthCalledWith(3, 'hotseat');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const hotseatButton = screen.getByRole('button', { name: /play hot-seat mode on this device/i });
      const urlButton = screen.getByRole('button', { name: /play url mode across devices/i });

      expect(hotseatButton).toHaveAttribute('aria-label', 'Play hot-seat mode on this device');
      expect(urlButton).toHaveAttribute('aria-label', 'Play URL mode across devices');
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(<ModeSelector onModeSelected={vi.fn()} />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBe(2); // Two mode icons
    });

    it('should be keyboard accessible', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const hotseatButton = screen.getByTestId('mode-hotseat');

      // Tab to button
      hotseatButton.focus();
      expect(hotseatButton).toHaveFocus();

      // Buttons are natively keyboard accessible - Enter/Space trigger click events automatically
      // So we just verify focus works and the button can be clicked
      fireEvent.click(hotseatButton);
      expect(onModeSelected).toHaveBeenCalledWith('hotseat');
    });

    it('should support tabbing between buttons', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const hotseatButton = screen.getByTestId('mode-hotseat');
      const urlButton = screen.getByTestId('mode-url');

      // Both buttons should be focusable
      hotseatButton.focus();
      expect(hotseatButton).toHaveFocus();

      urlButton.focus();
      expect(urlButton).toHaveFocus();
    });

    it('should have proper heading hierarchy', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent(/king's cooking chess/i);
      expect(h2).toHaveTextContent(/choose your game mode/i);
      expect(h3s).toHaveLength(2);
      expect(h3s[0]).toHaveTextContent(/hot-seat mode/i);
      expect(h3s[1]).toHaveTextContent(/url mode/i);
    });
  });

  describe('Test IDs', () => {
    it('should have test ID for hot-seat button', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByTestId('mode-hotseat')).toBeInTheDocument();
    });

    it('should have test ID for URL button', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByTestId('mode-url')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined callback gracefully', () => {
      // @ts-expect-error - Testing with undefined callback
      const { container } = render(<ModeSelector onModeSelected={undefined} />);

      expect(container).toBeInTheDocument();
    });

    it('should handle rapid clicks gracefully', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const button = screen.getByTestId('mode-hotseat');

      // Rapid fire clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      expect(onModeSelected).toHaveBeenCalledTimes(10);
    });

    it('should maintain focus after selection', () => {
      const onModeSelected = vi.fn();
      render(<ModeSelector onModeSelected={onModeSelected} />);

      const button = screen.getByTestId('mode-hotseat');
      button.focus();

      fireEvent.click(button);

      // Focus should still be on the button after click
      expect(button).toHaveFocus();
    });
  });
});
