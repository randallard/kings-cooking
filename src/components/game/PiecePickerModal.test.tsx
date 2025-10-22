/**
 * @fileoverview Tests for PiecePickerModal component
 * @module components/game/PiecePickerModal.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PiecePickerModal } from './PiecePickerModal';
import type { PieceType } from '@/lib/validation/schemas';

describe('PiecePickerModal', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    availablePieces: ['rook', 'knight', 'bishop'] as PieceType[],
    onSelect: mockOnSelect,
    onClose: mockOnClose,
    position: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<PiecePickerModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/choose piece for position/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<PiecePickerModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display all available pieces', () => {
      render(<PiecePickerModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /rook/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /knight/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bishop/i })).toBeInTheDocument();
    });

    it('should not display unavailable pieces', () => {
      render(
        <PiecePickerModal
          {...defaultProps}
          availablePieces={['rook', 'knight'] as PieceType[]}
        />
      );
      expect(screen.getByRole('button', { name: /rook/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /knight/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bishop/i })).not.toBeInTheDocument();
    });

    it('should display position number', () => {
      render(<PiecePickerModal {...defaultProps} position={1} />);
      expect(screen.getByText(/position 2/i)).toBeInTheDocument(); // 0-indexed, display as 1-indexed
    });

    it('should show close button', () => {
      render(<PiecePickerModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onSelect when piece is clicked', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /rook/i }));

      expect(mockOnSelect).toHaveBeenCalledWith('rook');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...defaultProps} />);

      const backdrop = screen.getByRole('dialog').parentElement!;
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PiecePickerModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should focus first piece button on open', () => {
      render(<PiecePickerModal {...defaultProps} />);

      const firstButton = screen.getByRole('button', { name: /rook/i });
      expect(firstButton).toHaveFocus();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const lastButton = buttons[buttons.length - 1]!;

      // Tab to last button
      lastButton.focus();
      expect(lastButton).toHaveFocus();

      // Tab again should cycle to first button
      await user.tab();
      expect(buttons[0]).toHaveFocus();
    });

    it('should have accessible piece labels with unicode icons', () => {
      render(<PiecePickerModal {...defaultProps} />);

      // Check that unicode icons are present (outlined symbols for light pieces)
      expect(screen.getByText('♖')).toBeInTheDocument(); // Rook (outlined)
      expect(screen.getByText('♘')).toBeInTheDocument(); // Knight (outlined)
      expect(screen.getByText('♗')).toBeInTheDocument(); // Bishop (outlined)
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty available pieces array', () => {
      render(<PiecePickerModal {...defaultProps} availablePieces={[]} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /rook/i })).not.toBeInTheDocument();
    });

    it('should handle all piece types', () => {
      render(
        <PiecePickerModal
          {...defaultProps}
          availablePieces={['rook', 'knight', 'bishop', 'queen', 'pawn'] as PieceType[]}
        />
      );

      expect(screen.getByRole('button', { name: /rook/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /knight/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bishop/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /queen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pawn/i })).toBeInTheDocument();
    });

    it('should handle position 0', () => {
      render(<PiecePickerModal {...defaultProps} position={0} />);
      expect(screen.getByText(/position 1/i)).toBeInTheDocument();
    });

    it('should handle position 2', () => {
      render(<PiecePickerModal {...defaultProps} position={2} />);
      expect(screen.getByText(/position 3/i)).toBeInTheDocument();
    });
  });

  describe('Promotion Mode', () => {
    const promotionProps = {
      isOpen: true,
      availablePieces: ['queen', 'rook', 'bishop', 'knight'] as PieceType[],
      onSelect: mockOnSelect,
      onClose: mockOnClose,
      mode: 'promotion' as const,
    };

    it('should show promotion title in promotion mode', () => {
      render(<PiecePickerModal {...promotionProps} />);

      expect(screen.getByText('Choose a piece to confirm and promote')).toBeInTheDocument();
      expect(screen.queryByText(/position/i)).not.toBeInTheDocument();
    });

    it('should show Cancel button in promotion mode', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...promotionProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel promotion/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveTextContent('Cancel');

      // Should not have the × close button
      expect(screen.queryByRole('button', { name: /close modal/i })).not.toBeInTheDocument();

      await user.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect with chosen promotion piece', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...promotionProps} />);

      // Test selecting each promotion piece
      const pieces = ['queen', 'rook', 'bishop', 'knight'];

      for (const piece of pieces) {
        vi.clearAllMocks();
        await user.click(screen.getByRole('button', { name: new RegExp(piece, 'i') }));
        expect(mockOnSelect).toHaveBeenCalledWith(piece);
        expect(mockOnSelect).toHaveBeenCalledTimes(1);
      }
    });

    it('should display all 4 promotion pieces', () => {
      render(<PiecePickerModal {...promotionProps} />);

      expect(screen.getByRole('button', { name: /queen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rook/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bishop/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /knight/i })).toBeInTheDocument();
    });

    it('should not require position prop in promotion mode', () => {
      // Position is optional for promotion mode
      render(
        <PiecePickerModal
          isOpen={true}
          availablePieces={['queen', 'rook', 'bishop', 'knight'] as PieceType[]}
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          mode="promotion"
        />
      );

      expect(screen.getByText('Choose a piece to confirm and promote')).toBeInTheDocument();
    });

    it('should handle Escape key to cancel promotion', async () => {
      const user = userEvent.setup();
      render(<PiecePickerModal {...promotionProps} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show correct ARIA labels in promotion mode', () => {
      render(<PiecePickerModal {...promotionProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'piece-picker-title');

      const cancelButton = screen.getByRole('button', { name: /cancel promotion/i });
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel promotion');
    });
  });
});
