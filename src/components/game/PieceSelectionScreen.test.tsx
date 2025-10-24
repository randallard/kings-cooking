/**
 * @fileoverview Tests for PieceSelectionScreen component
 * @module components/game/PieceSelectionScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PieceSelectionScreen } from './PieceSelectionScreen';
import type { PieceSelectionPhase } from '@/types/gameFlow';
import type { SelectedPieces } from '@/lib/pieceSelection/types';

// Mock localStorage utilities with stateful behavior
let mockPlayer2Name = '';
vi.mock('@/lib/storage/localStorage', () => ({
  storage: {
    getPlayer2Name: vi.fn(() => mockPlayer2Name),
    setPlayer2Name: vi.fn((name: string) => {
      mockPlayer2Name = name;
      return true;
    }),
  },
}));

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
    mockPlayer2Name = ''; // Reset mock storage
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
      player1Color: 'light',
      };
      render(<PieceSelectionScreen state={stateWithMode} dispatch={mockDispatch} />);

      expect(screen.queryByRole('button', { name: /mirrored/i })).not.toBeInTheDocument();
    });
  });

  describe('Board Display', () => {
    const stateWithMode: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'mirrored',
      player1Color: 'light',
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

      expect(screen.getByText('♖')).toBeInTheDocument(); // Rook unicode (outlined for light)
      expect(screen.getByText('♘')).toBeInTheDocument(); // Knight unicode (outlined for light)
      expect(screen.getByText('♗')).toBeInTheDocument(); // Bishop unicode (outlined for light)
    });
  });

  describe('Piece Selection Flow', () => {
    const stateWithMode: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'independent',
      player1Color: 'light',
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
      player1Color: 'light',
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
      player1Color: 'light',
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
      player1Color: 'light',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['queen', 'pawn', 'pawn'],
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
      player1Color: 'light',
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

  describe('Independent Mode - Complete Flow', () => {
    it('should show handoff screen after Player 1 completes selection', async () => {
      const user = userEvent.setup();
      // Start with 2 pieces already selected
      const stateWith2Pieces: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'independent',
        player1Color: 'light',
        player1Pieces: ['rook', 'knight', null] as unknown as SelectedPieces,
      };

      render(<PieceSelectionScreen state={stateWith2Pieces} dispatch={mockDispatch} />);

      // Player 1 selects the 3rd piece
      await user.click(screen.getByRole('button', { name: /position 3/i }));
      await user.click(screen.getByRole('button', { name: /select bishop/i }));

      // Assert: Handoff screen should appear
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/dark's turn/i)).toBeInTheDocument();
      expect(screen.getByText(/pass the device to/i)).toBeInTheDocument();
    });
  });

  describe('Independent Mode - Name Entry Flow', () => {
    it('should show name entry screen after handoff screen', async () => {
      const user = userEvent.setup();
      // Player 1 has completed selection
      const stateWith2Pieces: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'independent',
        player1Color: 'light',
        player1Pieces: ['rook', 'knight', null] as unknown as SelectedPieces,
      };

      render(<PieceSelectionScreen state={stateWith2Pieces} dispatch={mockDispatch} />);

      // Player 1 selects the 3rd piece
      await user.click(screen.getByRole('button', { name: /position 3/i }));
      await user.click(screen.getByRole('button', { name: /select bishop/i }));

      // Handoff screen should appear
      expect(screen.getByText(/dark's turn/i)).toBeInTheDocument();

      // Click "Skip Countdown" to continue
      await user.click(screen.getByRole('button', { name: /skip countdown/i }));

      // Name entry screen should now appear
      expect(screen.getByText(/player 2's turn/i)).toBeInTheDocument();
      expect(screen.getByText(/enter your name/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    });

    it('should enable continue button when valid name is entered', async () => {
      const user = userEvent.setup();
      const stateWith2Pieces: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'independent',
        player1Color: 'light',
        player1Pieces: ['rook', 'knight', null] as unknown as SelectedPieces,
      };

      render(<PieceSelectionScreen state={stateWith2Pieces} dispatch={mockDispatch} />);

      // Complete Player 1's selection
      await user.click(screen.getByRole('button', { name: /position 3/i }));
      await user.click(screen.getByRole('button', { name: /select bishop/i }));

      // Click through handoff screen
      await user.click(screen.getByRole('button', { name: /skip countdown/i }));

      // Continue button should be disabled initially
      const continueButton = screen.getByRole('button', { name: /continue to piece selection/i });
      expect(continueButton).toBeDisabled();

      // Enter a valid name
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.type(nameInput, 'Charlie');

      // Wait for debounce and validation
      await waitFor(() => {
        expect(continueButton).toBeEnabled();
      }, { timeout: 500 });
    });

    it('should dispatch SET_PLAYER2_NAME when continue button clicked', async () => {
      const user = userEvent.setup();
      const stateWith2Pieces: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'independent',
        player1Color: 'light',
        player1Pieces: ['rook', 'knight', null] as unknown as SelectedPieces,
      };

      render(<PieceSelectionScreen state={stateWith2Pieces} dispatch={mockDispatch} />);

      // Complete Player 1's selection
      await user.click(screen.getByRole('button', { name: /position 3/i }));
      await user.click(screen.getByRole('button', { name: /select bishop/i }));

      // Click through handoff screen
      await user.click(screen.getByRole('button', { name: /skip countdown/i }));

      // Enter a valid name
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.type(nameInput, 'Charlie');

      // Wait for button to be enabled
      const continueButton = screen.getByRole('button', { name: /continue to piece selection/i });
      await waitFor(() => {
        expect(continueButton).toBeEnabled();
      }, { timeout: 500 });

      // Click continue
      await user.click(continueButton);

      // Should dispatch SET_PLAYER2_NAME
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_PLAYER2_NAME',
        })
      );
    });

    it('should not show name entry in mirrored or random modes', () => {
      const mirroredState: PieceSelectionPhase = {
        ...baseState,
        selectionMode: 'mirrored',
        player1Color: 'light',
        player1Pieces: ['rook', 'knight', 'bishop'],
        player2Pieces: ['rook', 'knight', 'bishop'],
      };

      render(<PieceSelectionScreen state={mirroredState} dispatch={mockDispatch} />);

      // Start game button should be visible (no handoff/name entry in mirrored mode)
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
      expect(screen.queryByText(/enter your name/i)).not.toBeInTheDocument();
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
      player1Color: 'light',
        player1Pieces: ['rook', null, 'bishop'] as unknown as SelectedPieces,
      };
      render(<PieceSelectionScreen state={partialState} dispatch={mockDispatch} />);

      // Should show rook and bishop (outlined for light), position 2 should be empty
      expect(screen.getByText('♖')).toBeInTheDocument();
      expect(screen.getByText('♗')).toBeInTheDocument();
    });
  });
});
