/**
 * @fileoverview Tests for MoveConfirmButton component
 * @module components/game/MoveConfirmButton.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MoveConfirmButton } from './MoveConfirmButton';

describe('MoveConfirmButton', () => {
  describe('Rendering', () => {
    it('should render with default text', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveTextContent('Confirm Move');
    });

    it('should render as disabled when disabled prop is true', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute(
        'aria-label',
        'Select a move to confirm'
      );
    });

    it('should render processing state', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} isProcessing />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Confirming...');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('should render error state', () => {
      render(
        <MoveConfirmButton
          onConfirm={vi.fn()}
          error="Invalid move: piece is blocked"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Try Again');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(
        'Invalid move: piece is blocked'
      );
    });

    it('should show spinner when processing', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} isProcessing />);

      expect(screen.getByText('⏳')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onConfirm when clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<MoveConfirmButton onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when disabled', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<MoveConfirmButton onConfirm={onConfirm} disabled />);

      await user.click(screen.getByRole('button'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should not call onConfirm when processing', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<MoveConfirmButton onConfirm={onConfirm} isProcessing />);

      await user.click(screen.getByRole('button'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should allow retry when there is an error', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(
        <MoveConfirmButton
          onConfirm={onConfirm}
          error="Invalid move"
        />
      );

      await user.click(screen.getByRole('button'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label when enabled', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Confirm selected move'
      );
    });

    it('should have appropriate aria-label when disabled', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} disabled />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Select a move to confirm'
      );
    });

    it('should have appropriate aria-label when processing', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} isProcessing />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Move is being confirmed'
      );
    });

    it('should have aria-busy when processing', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} isProcessing />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-busy',
        'true'
      );
    });

    it('should announce errors with assertive live region', () => {
      render(
        <MoveConfirmButton onConfirm={vi.fn()} error="Test error" />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveTextContent('Test error');
    });

    it('should not show error message when error is null', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} error={null} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should hide spinner from screen readers', () => {
      render(<MoveConfirmButton onConfirm={vi.fn()} isProcessing />);

      const spinner = screen.getByText('⏳');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('State Combinations', () => {
    it('should handle disabled + error state', () => {
      render(
        <MoveConfirmButton
          onConfirm={vi.fn()}
          disabled
          error="Test error"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle processing + error state (processing takes precedence)', () => {
      render(
        <MoveConfirmButton
          onConfirm={vi.fn()}
          isProcessing
          error="Test error"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Confirming...');
      expect(button).toBeDisabled();
      // Error still shows but button shows processing state
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable with keyboard', async () => {
      const user = userEvent.setup();
      render(<MoveConfirmButton onConfirm={vi.fn()} />);

      const button = screen.getByRole('button');

      await user.tab();

      expect(button).toHaveFocus();
    });

    it('should trigger onConfirm with Enter key', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<MoveConfirmButton onConfirm={onConfirm} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should trigger onConfirm with Space key', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<MoveConfirmButton onConfirm={onConfirm} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlay Mode', () => {
    it('should render Cancel and Confirm buttons in overlay mode', () => {
      render(
        <MoveConfirmButton
          isOverlay={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should call onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <MoveConfirmButton
          isOverlay={true}
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm button is clicked in overlay mode', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(
        <MoveConfirmButton
          isOverlay={true}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      await user.click(screen.getByText('Confirm'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not render overlay if onCancel is not provided', () => {
      render(
        <MoveConfirmButton
          isOverlay={true}
          onConfirm={vi.fn()}
        />
      );

      // Should fallback to traditional mode
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.getByText('Confirm Move')).toBeInTheDocument();
    });
  });
});
