/**
 * @fileoverview Tests for game flow types
 * @module types/gameFlow.test
 */

import { describe, it, expect } from 'vitest';
import type { GameFlowState, PieceSelectionPhase } from './gameFlow';

describe('GameFlowState - Piece Selection Phase', () => {
  it('should validate piece-selection phase with null selection', () => {
    const state: GameFlowState = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: '',
      selectionMode: null,
      player1Pieces: null,
      player2Pieces: null,
      player1Color: null,
    };

    // Type check should pass
    expect(state.phase).toBe('piece-selection');
  });

  it('should validate piece-selection with completed selection', () => {
    const state: GameFlowState = {
      phase: 'piece-selection',
      mode: 'url',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      player1Color: 'light',
    };

    // Type check should pass
    expect(state.phase).toBe('piece-selection');
    if (state.phase === 'piece-selection') {
      expect(state.selectionMode).toBe('mirrored');
      expect(state.player1Color).toBe('light');
    }
  });

  it('should validate piece-selection with independent mode', () => {
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'independent',
      player1Pieces: ['queen', 'knight', 'bishop'],
      player2Pieces: ['rook', 'rook', 'pawn'],
      player1Color: 'dark',
    };

    expect(state.selectionMode).toBe('independent');
    expect(state.player1Pieces).toEqual(['queen', 'knight', 'bishop']);
    expect(state.player2Pieces).toEqual(['rook', 'rook', 'pawn']);
  });

  it('should validate piece-selection with random mode', () => {
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'url',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'random',
      player1Pieces: ['pawn', 'pawn', 'pawn'],
      player2Pieces: ['pawn', 'pawn', 'pawn'],
      player1Color: 'light',
    };

    expect(state.selectionMode).toBe('random');
  });

  it('should handle phase transition states correctly', () => {
    const initialState: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: '',
      selectionMode: null,
      player1Pieces: null,
      player2Pieces: null,
      player1Color: null,
    };

    const afterModeSelection: PieceSelectionPhase = {
      ...initialState,
      selectionMode: 'mirrored',
    };

    const afterPieceSelection: PieceSelectionPhase = {
      ...afterModeSelection,
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
    };

    const complete: PieceSelectionPhase = {
      ...afterPieceSelection,
      player1Color: 'light',
    };

    expect(initialState.selectionMode).toBeNull();
    expect(afterModeSelection.selectionMode).toBe('mirrored');
    expect(afterPieceSelection.player1Pieces).toBeTruthy();
    expect(complete.player1Color).toBe('light');
  });
});
