/**
 * @fileoverview Tests for CourtArea component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourtArea } from './CourtArea';
import type { Piece } from '@/lib/validation/schemas';

// Helper: Create mock piece
const createMockPiece = (
  type: 'rook' | 'knight' | 'bishop',
  owner: 'light' | 'dark'
): Piece => ({
  type,
  owner,
  id: `${owner}-${type}-1`,
  position: null,
  moveCount: 0,
});

describe('CourtArea', () => {
  it('renders court label correctly for dark court', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('Dark King\'s Court')).toBeInTheDocument();
  });

  it('renders court label correctly for light court', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="light"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="dark"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('Light King\'s Court')).toBeInTheDocument();
  });

  it('shows scored pieces with correct icons', () => {
    const onOffBoardMove = vi.fn();
    const scoredPieces: Piece[] = [
      createMockPiece('rook', 'light'),
      createMockPiece('knight', 'light'),
    ];

    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={scoredPieces}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('♜')).toBeInTheDocument(); // Light rook
    expect(screen.getByText('♞')).toBeInTheDocument(); // Light knight
  });

  it('shows captured pieces with correct icons', () => {
    const onOffBoardMove = vi.fn();
    const capturedPieces: Piece[] = [
      createMockPiece('bishop', 'dark'),
    ];

    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={capturedPieces}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('♗')).toBeInTheDocument(); // Dark bishop
  });

  it('shows "None" when no scored pieces', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    const noneTexts = screen.getAllByText('None');
    expect(noneTexts.length).toBeGreaterThanOrEqual(2); // Scored and Caught sections
  });

  it('shows button only for target court (light turn -> dark court)', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={true}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType="rook"
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Party!')).toBeInTheDocument();
  });

  it('hides button for non-target court (light turn -> light court)', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="light"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    expect(screen.queryByText('Party!')).not.toBeInTheDocument();
  });

  it('shows button only for target court (dark turn -> light court)', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="light"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={true}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="dark"
        selectedPieceType="knight"
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Party!')).toBeInTheDocument();
  });

  it('passes canMoveOffBoard to button correctly', () => {
    const onOffBoardMove = vi.fn();

    // Disabled
    const { rerender } = render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();

    // Enabled
    rerender(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={true}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType="rook"
      />
    );

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('displays piece tooltips with correct information', () => {
    const onOffBoardMove = vi.fn();
    const scoredPieces: Piece[] = [
      createMockPiece('rook', 'light'),
    ];

    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={scoredPieces}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    const pieceIcon = screen.getByTitle('light rook');
    expect(pieceIcon).toBeInTheDocument();
  });

  it('shows both scored and captured sections', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="dark"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="light"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('Scored:')).toBeInTheDocument();
    expect(screen.getByText('Caught:')).toBeInTheDocument();
  });
});
