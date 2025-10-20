import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameCell } from './GameCell';
import type { Piece } from '@/lib/validation/schemas';

const mockPiece: Piece = {
  type: 'rook',
  owner: 'light',
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

    expect(screen.getByLabelText(/light rook at A1/i)).toBeInTheDocument();
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

  it('should render dark piece with correct unicode', () => {
    const blackKnight: Piece = {
      type: 'knight',
      owner: 'dark',
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
      owner: 'light',
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

  describe('Pending Move Visualization', () => {
    it('should show ghost piece at source', () => {
      const piece = {
        type: 'rook' as const,
        owner: 'light' as const,
        position: [2, 1] as [number, number],
        moveCount: 0,
        id: 'light-rook-1',
      };

      render(
        <GameCell
          position={[2, 1]}
          piece={null}
          isSelected={false}
          isLegalMove={false}
          isLastMove={false}
          isPendingSource={true}
          ghostPiece={piece}
          onClick={vi.fn()}
        />
      );

      const cell = screen.getByRole('gridcell');
      // CSS Modules hash class names, so check className includes 'pendingSource'
      expect(cell.className).toMatch(/pendingSource/);
      // Ghost piece should be rendered
      expect(cell.textContent).toBeTruthy();
    });

    it('should show animated piece at destination', () => {
      const piece = {
        type: 'rook' as const,
        owner: 'light' as const,
        position: [1, 1] as [number, number],
        moveCount: 1,
        id: 'light-rook-1',
      };

      render(
        <GameCell
          position={[1, 1]}
          piece={piece}
          isSelected={false}
          isLegalMove={false}
          isLastMove={false}
          isPendingDestination={true}
          onClick={vi.fn()}
        />
      );

      const cell = screen.getByRole('gridcell');
      // CSS Modules hash class names, so check className includes 'pendingDestination'
      expect(cell.className).toMatch(/pendingDestination/);
      // Piece should be rendered with animation class
      expect(cell.textContent).toBeTruthy();
    });

    it('should highlight pending destination square', () => {
      render(
        <GameCell
          position={[1, 1]}
          piece={null}
          isSelected={false}
          isLegalMove={false}
          isLastMove={false}
          isPendingDestination={true}
          onClick={vi.fn()}
        />
      );

      const cell = screen.getByRole('gridcell');
      // CSS Modules hash class names, so check className includes 'pendingDestination'
      expect(cell.className).toMatch(/pendingDestination/);
    });

    it('should not show pending styles when not pending', () => {
      render(
        <GameCell
          position={[1, 1]}
          piece={null}
          isSelected={false}
          isLegalMove={false}
          isLastMove={false}
          onClick={vi.fn()}
        />
      );

      const cell = screen.getByRole('gridcell');
      // CSS Modules hash class names, so check className doesn't include them
      expect(cell.className).not.toMatch(/pendingSource/);
      expect(cell.className).not.toMatch(/pendingDestination/);
    });
  });

  describe('Queen and Pawn Unicode Rendering', () => {
    it('should render queen unicode', () => {
      const queenPiece = {
        type: 'queen' as const,
        owner: 'light' as const,
        position: [1, 1] as [number, number],
        moveCount: 0,
        id: '00000000-0000-0000-0000-000000000001',
      };

      render(
        <GameCell
          position={[1, 1]}
          piece={queenPiece}
          isSelected={false}
          isLegalMove={false}
          isLastMove={false}
          onClick={vi.fn()}
        />
      );

      expect(screen.getByText('♛')).toBeInTheDocument();
    });

    it('should render pawn unicode', () => {
      const pawnPiece = {
        type: 'pawn' as const,
        owner: 'dark' as const,
        position: [0, 0] as [number, number],
        moveCount: 0,
        id: '00000000-0000-0000-0000-000000000002',
      };

      render(
        <GameCell
          position={[0, 0]}
          piece={pawnPiece}
          isSelected={false}
          isLegalMove={false}
          isLastMove={false}
          onClick={vi.fn()}
        />
      );

      expect(screen.getByText('♙')).toBeInTheDocument();
    });
  });
});
