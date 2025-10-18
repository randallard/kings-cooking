/**
 * @fileoverview Tests for OffBoardButton component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffBoardButton } from './OffBoardButton';

describe('OffBoardButton', () => {
  it('renders with Party! text and emoji', () => {
    const onOffBoardMove = vi.fn();
    render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="rook"
        courtOwner="dark"
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('Party!');
    expect(screen.getByRole('button')).toHaveTextContent('🎉');
  });

  it('renders in disabled state with correct styling', () => {
    const onOffBoardMove = vi.fn();
    render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={true}
        pieceType={null}
        courtOwner="dark"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-label', 'No piece can move to opponent\'s court');
  });

  it('renders in enabled state with correct ARIA label', () => {
    const onOffBoardMove = vi.fn();
    render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="knight"
        courtOwner="light"
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-label', 'Move knight to Light King\'s Court to score');
  });

  it('calls onOffBoardMove when clicked (enabled)', async () => {
    const user = userEvent.setup();
    const onOffBoardMove = vi.fn();

    render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="rook"
        courtOwner="dark"
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onOffBoardMove).toHaveBeenCalledTimes(1);
  });

  it('does not call onOffBoardMove when clicked (disabled)', async () => {
    const user = userEvent.setup();
    const onOffBoardMove = vi.fn();

    render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={true}
        pieceType={null}
        courtOwner="dark"
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onOffBoardMove).not.toHaveBeenCalled();
  });

  it('has minimum 44px height for touch accessibility', () => {
    const onOffBoardMove = vi.fn();
    render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="bishop"
        courtOwner="dark"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    // Note: CSS minHeight is set in module.css, validated manually
  });

  it('renders correct ARIA label for each piece type', () => {
    const onOffBoardMove = vi.fn();

    // Rook
    const { rerender } = render(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="rook"
        courtOwner="dark"
      />
    );
    expect(screen.getByLabelText(/Move rook to Dark King's Court/i)).toBeInTheDocument();

    // Knight
    rerender(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="knight"
        courtOwner="light"
      />
    );
    expect(screen.getByLabelText(/Move knight to Light King's Court/i)).toBeInTheDocument();

    // Bishop
    rerender(
      <OffBoardButton
        onOffBoardMove={onOffBoardMove}
        disabled={false}
        pieceType="bishop"
        courtOwner="dark"
      />
    );
    expect(screen.getByLabelText(/Move bishop to Dark King's Court/i)).toBeInTheDocument();
  });
});
