import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameCell } from './GameCell';
import type { Piece } from '@/lib/validation/schemas';

const mockPiece: Piece = {
  type: 'rook',
  owner: 'white',
  position: [0, 0],
  moveCount: 0,
  id: crypto.randomUUID(),
};

describe('GameCell', () => {
  it('should render empty cell', () => {
    render(
      <GameCell
        position={[0, 0]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('gridcell')).toBeInTheDocument();
    expect(screen.getByLabelText(/Empty square A1/i)).toBeInTheDocument();
  });

  it('should render piece with unicode character', () => {
    render(
      <GameCell
        position={[0, 0]}
        piece={mockPiece}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/white rook at A1/i)).toBeInTheDocument();
    expect(screen.getByText('♜')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <GameCell
        position={[1, 2]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={onClick}
      />
    );

    await user.click(screen.getByRole('gridcell'));

    expect(onClick).toHaveBeenCalledWith([1, 2]);
  });

  it('should show selected state with aria-pressed', () => {
    render(
      <GameCell
        position={[0, 0]}
        piece={mockPiece}
        isSelected={true}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    const cell = screen.getByRole('gridcell');
    expect(cell).toHaveAttribute('aria-pressed', 'true');
  });

  it('should show legal move indicator', () => {
    const { container } = render(
      <GameCell
        position={[1, 1]}
        piece={null}
        isSelected={false}
        isLegalMove={true}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    const moveIndicator = container.querySelector('[aria-hidden="true"]');
    expect(moveIndicator).toBeInTheDocument();
  });

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <GameCell
        position={[0, 0]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={onClick}
        disabled={true}
      />
    );

    await user.click(screen.getByRole('gridcell'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should format position notation correctly', () => {
    render(
      <GameCell
        position={[2, 2]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Empty square C3/i)).toBeInTheDocument();
  });

  it('should render black piece with correct unicode', () => {
    const blackKnight: Piece = {
      type: 'knight',
      owner: 'black',
      position: [1, 1],
      moveCount: 0,
      id: crypto.randomUUID(),
    };

    render(
      <GameCell
        position={[1, 1]}
        piece={blackKnight}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('♘')).toBeInTheDocument();
  });

  it('should render bishop piece correctly', () => {
    const whiteBishop: Piece = {
      type: 'bishop',
      owner: 'white',
      position: [0, 2],
      moveCount: 0,
      id: crypto.randomUUID(),
    };

    render(
      <GameCell
        position={[0, 2]}
        piece={whiteBishop}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('♝')).toBeInTheDocument();
  });

  it('should have correct tabIndex when selected', () => {
    const { rerender } = render(
      <GameCell
        position={[0, 0]}
        piece={mockPiece}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('gridcell')).toHaveAttribute('tabindex', '-1');

    rerender(
      <GameCell
        position={[0, 0]}
        piece={mockPiece}
        isSelected={true}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('gridcell')).toHaveAttribute('tabindex', '0');
  });
});
