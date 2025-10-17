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
  owner: 'white' | 'black'
): Piece => ({
  type,
  owner,
  id: `${owner}-${type}-1`,
  position: null,
  moveCount: 0,
});

describe('CourtArea', () => {
  it('renders court label correctly for black court', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('Black King\'s Court')).toBeInTheDocument();
  });

  it('renders court label correctly for white court', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="white"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="black"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('White King\'s Court')).toBeInTheDocument();
  });

  it('shows scored pieces with correct icons', () => {
    const onOffBoardMove = vi.fn();
    const scoredPieces: Piece[] = [
      createMockPiece('rook', 'white'),
      createMockPiece('knight', 'white'),
    ];

    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={scoredPieces}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('♜')).toBeInTheDocument(); // White rook
    expect(screen.getByText('♞')).toBeInTheDocument(); // White knight
  });

  it('shows captured pieces with correct icons', () => {
    const onOffBoardMove = vi.fn();
    const capturedPieces: Piece[] = [
      createMockPiece('bishop', 'black'),
    ];

    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={capturedPieces}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('♗')).toBeInTheDocument(); // Black bishop
  });

  it('shows "None" when no scored pieces', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    const noneTexts = screen.getAllByText('None');
    expect(noneTexts.length).toBeGreaterThanOrEqual(2); // Scored and Caught sections
  });

  it('shows button only for target court (white turn -> black court)', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={true}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType="rook"
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Party!')).toBeInTheDocument();
  });

  it('hides button for non-target court (white turn -> white court)', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="white"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    expect(screen.queryByText('Party!')).not.toBeInTheDocument();
  });

  it('shows button only for target court (black turn -> white court)', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="white"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={true}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="black"
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
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();

    // Enabled
    rerender(
      <CourtArea
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={true}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType="rook"
      />
    );

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('displays piece tooltips with correct information', () => {
    const onOffBoardMove = vi.fn();
    const scoredPieces: Piece[] = [
      createMockPiece('rook', 'white'),
    ];

    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={scoredPieces}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    const pieceIcon = screen.getByTitle('white rook');
    expect(pieceIcon).toBeInTheDocument();
  });

  it('shows both scored and captured sections', () => {
    const onOffBoardMove = vi.fn();
    render(
      <CourtArea
        courtOwner="black"
        scoredPieces={[]}
        capturedPieces={[]}
        canMoveOffBoard={false}
        onOffBoardMove={onOffBoardMove}
        currentPlayer="white"
        selectedPieceType={null}
      />
    );

    expect(screen.getByText('Scored:')).toBeInTheDocument();
    expect(screen.getByText('Caught:')).toBeInTheDocument();
  });
});
