/**
 * @fileoverview Tests for PieceSelectionScreen component
 * @module components/game/PieceSelectionScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PieceSelectionScreen } from './PieceSelectionScreen';
import type { PieceSelectionPhase } from '@/types/gameFlow';
import type { SelectedPieces } from '@/lib/pieceSelection/types';

describe('PieceSelectionScreen', () => {
  const mockDispatch = vi.fn();

  const baseState: PieceSelectionPhase = {
    phase: 'piece-selection',
    mode: 'hotseat',
    player1Name: 'Alice',
    player2Name: 'Bob',
    selectionMode: null,
    player1Pieces: null,
    player2Pieces: null,
    player1Color: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mode Selection', () => {
    it('should show mode selection buttons when selectionMode is null', () => {
      render(<PieceSelectionScreen state={baseState} dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /mirrored/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /independent/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /random/i })).toBeInTheDocument();
    });

    it('should dispatch SET_SELECTION_MODE when mode button clicked', async () => {
      const user = userEvent.setup();
      render(<PieceSelectionScreen state={baseState} dispatch={mockDispatch} />);

      await user.click(screen.getByRole('button', { name: /mirrored/i }));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION_MODE',
        mode: 'mirrored',
      });
    });

    it('should hide mode selection after mode is chosen', () => {
      const stateWithMode: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'mirrored',
      };
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      expect(screen.queryByRole('button', { name: /mirrored/i })).not.toBeInTheDocument();
    });
  });

  describe('Board Display', () => {
    const stateWithMode: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'mirrored',
    };

    it('should display 3x3 grid', () => {
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      const cells = screen.getAllByRole('button', { name: /position/i });
      expect(cells).toHaveLength(3); // Only top row is clickable
    });

    it('should show position numbers', () => {
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /position 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /position 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /position 3/i })).toBeInTheDocument();
    });

    it('should display selected pieces', () => {
      const stateWithPieces: PieceSelectionPhase = {
        ...stateWithMode,
        player1Pieces: ['rook', 'knight', 'bishop'],
      };
      render(<PieceSelectionScreen state={stateWithPieces} dispatch={mockDispatch} />);

      expect(screen.getByText('♜')).toBeInTheDocument(); // Rook unicode
      expect(screen.getByText('♞')).toBeInTheDocument(); // Knight unicode
      expect(screen.getByText('♝')).toBeInTheDocument(); // Bishop unicode
    });
  });

  describe('Piece Selection Flow', () => {
    const stateWithMode: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'independent',
    };

    it('should open PiecePickerModal when position clicked', async () => {
      const user = userEvent.setup();
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      await user.click(screen.getByRole('button', { name: /position 1/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/choose piece for position 1/i)).toBeInTheDocument();
    });

    it('should dispatch SET_PLAYER_PIECES when piece selected', async () => {
      const user = userEvent.setup();
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      // Open modal for position 0
      await user.click(screen.getByRole('button', { name: /position 1/i }));

      // Select rook
      await user.click(screen.getByRole('button', { name: /select rook/i }));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER_PIECES',
        player: 'player1',
        pieces: ['rook', null, null],
      });
    });

    it('should update available pieces after selection', async () => {
      const user = userEvent.setup();
      const stateWithOnePiece: PieceSelectionPhase = {
        ...stateWithMode,
        player1Pieces: ['rook', null, null] as unknown as SelectedPieces,
      };
      render(<PieceSelectionScreen state={stateWithOnePiece} dispatch={mockDispatch} />);

      // Open modal for position 1
      await user.click(screen.getByRole('button', { name: /position 2/i }));

      // Rook should still be available (2 max)
      expect(screen.getByRole('button', { name: /select rook/i })).toBeInTheDocument();
    });

    it('should allow changing an already-selected piece', async () => {
      const user = userEvent.setup();
      const stateWithOnePiece: PieceSelectionPhase = {
        ...stateWithMode,
        player1Pieces: ['rook', null, null] as unknown as SelectedPieces,
      };
      render(<PieceSelectionScreen state={stateWithOnePiece} dispatch={mockDispatch} />);

      // Click on position 0 which already has a rook
      await user.click(screen.getByRole('button', { name: /position 1: rook/i }));

      // The current rook should be available to re-select (since we're changing this position)
      expect(screen.getByRole('button', { name: /select rook/i })).toBeInTheDocument();

      // We should also be able to select a different piece
      expect(screen.getByRole('button', { name: /select knight/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select bishop/i })).toBeInTheDocument();
    });
  });

  describe('Mirrored Mode', () => {
    const stateWithMirrored: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'mirrored',
    };

    it('should auto-select player2 pieces when player1 selects in mirrored mode', async () => {
      const user = userEvent.setup();
      render(<PieceSelectionScreen state={stateWithMirrored} dispatch={mockDispatch} />);

      await user.click(screen.getByRole('button', { name: /position 1/i }));
      await user.click(screen.getByRole('button', { name: /select rook/i }));

      // Should dispatch for both players
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER_PIECES',
        player: 'player1',
        pieces: ['rook', null, null],
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER_PIECES',
        player: 'player2',
        pieces: ['rook', null, null],
      });
    });
  });

  describe('Random Mode', () => {
    const stateWithRandom: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'random',
    };

    it('should auto-generate pieces when random mode is selected', () => {
      render(<PieceSelectionScreen state={stateWithRandom} dispatch={mockDispatch} />);

      // Should dispatch SET_PLAYER_PIECES for both players with random pieces
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_PLAYER_PIECES',
          player: 'player1',
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_PLAYER_PIECES',
          player: 'player2',
        })
      );
    });
  });

  describe('Start Game Button', () => {
    const completeState: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'independent',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['queen', 'pawn', 'pawn'],
      player1Color: 'light',
    };

    it('should show start game button when selection complete', () => {
      render(<PieceSelectionScreen state={completeState} dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
    });

    it('should not show start game button when pieces incomplete', () => {
      const incompleteState: PieceSelectionPhase = {
        ...completeState,
        player1Pieces: null,
      };
      render(<PieceSelectionScreen state={incompleteState} dispatch={mockDispatch} />);

      expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
    });

    it('should dispatch COMPLETE_PIECE_SELECTION when clicked', async () => {
      const user = userEvent.setup();
      render(<PieceSelectionScreen state={completeState} dispatch={mockDispatch} />);

      await user.click(screen.getByRole('button', { name: /start game/i }));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'COMPLETE_PIECE_SELECTION',
      });
    });
  });

  describe('Accessibility', () => {
    const stateWithMode: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'mirrored',
    };

    it('should have proper ARIA labels', () => {
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /position 1/i })).toHaveAttribute('aria-label');
    });

    it('should have heading for screen readers', () => {
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      expect(screen.getByRole('heading', { name: /piece selection/i })).toBeInTheDocument();
    });

    it('should show player names in headings', () => {
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null player2Name gracefully', () => {
      const stateWithoutP2: PieceSelectionPhase = {
        ...baseState,
        player2Name: '',
      };
      render(<PieceSelectionScreen state={stateWithoutP2} dispatch={mockDispatch} />);

      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });

    it('should handle partial piece selection', () => {
      const partialState: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'independent',
        player1Pieces: ['rook', null, 'bishop'] as unknown as SelectedPieces,
      };
      render(<PieceSelectionScreen state={partialState} dispatch={mockDispatch} />);

      // Should show rook and bishop, position 2 should be empty
      expect(screen.getByText('♜')).toBeInTheDocument();
      expect(screen.getByText('♝')).toBeInTheDocument();
    });
  });
});
