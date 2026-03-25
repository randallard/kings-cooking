/**
 * @fileoverview Tests for buildPiecesWithMoves
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildPiecesWithMoves } from './buildPiecesWithMoves';
import { KingsChessEngine } from '../chess/KingsChessEngine';
import type { GameState } from '../validation/schemas';

/**
 * Create a minimal GameState with pieces at specified positions.
 * Board is 3x3: row 0 = dark starting row, row 2 = light starting row.
 */
const UUID_LIGHT_PLAYER = '00000000-0000-0000-0000-000000000001';
const UUID_DARK_PLAYER  = '00000000-0000-0000-0000-000000000002';
const UUID_GAME         = '00000000-0000-0000-0000-000000000099';

function makeUuid(n: number): string {
  return `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
}

function makeState(pieces: Array<{ type: string; owner: 'light' | 'dark'; row: number; col: number }>): GameState {
  const board: (GameState['board'][0][0])[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  pieces.forEach((p, i) => {
    board[p.row]![p.col] = {
      type: p.type as never,
      owner: p.owner,
      position: [p.row, p.col],
      moveCount: 0,
      id: makeUuid(100 + i) as never,
    };
  });

  return {
    version: '1.0.0',
    gameId: UUID_GAME as never,
    board: board as unknown as GameState['board'],
    lightCourt: [],
    darkCourt: [],
    capturedLight: [],
    capturedDark: [],
    currentTurn: 0,
    currentPlayer: 'light',
    lightPlayer: { id: UUID_LIGHT_PLAYER as never, name: 'Light' },
    darkPlayer: { id: UUID_DARK_PLAYER as never, name: 'Dark' },
    status: 'playing',
    winner: null,
    moveHistory: [],
    checksum: '',
  };
}

describe('buildPiecesWithMoves', () => {
  let engine: KingsChessEngine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when AI has no pieces', () => {
    const gameState = makeState([
      { type: 'rook', owner: 'light', row: 2, col: 0 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    expect(result).toEqual([]);
  });

  it('includes on-board moves for a rook', () => {
    const gameState = makeState([
      { type: 'rook', owner: 'dark', row: 0, col: 0 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.from).toEqual([0, 0]);
    // Rook on row 0 (dark's starting row) has straight line to opponents edge = off_board possible
    const moves = result[0]!.moves;
    expect(Array.isArray(moves)).toBe(true);
  });

  it('appends off_board for rook with clear path to opponent edge', () => {
    // Dark rook at [0,1] — clear path down column 1 to row 2 and beyond
    const gameState = makeState([
      { type: 'rook', owner: 'dark', row: 0, col: 1 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    expect(result.length).toBeGreaterThan(0);
    const moves = result[0]!.moves;
    expect(moves).toContain('off_board');
  });

  it('appends off_board for knight that can jump off-board', () => {
    // Dark knight at [0,0]: jump offsets include [2,1] -> row 2 which is light territory, not off-board
    // Try [1,0]: offset [2,1] -> row 3 -> off board for dark (row > 2)
    const gameState = makeState([
      { type: 'knight', owner: 'dark', row: 1, col: 0 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    // Knight at row 1: [2,1] -> row 3 -> off board (dark owner, row > 2)
    expect(result.some(p => p.moves.includes('off_board'))).toBe(true);
  });

  it('appends off_board for bishop on opponent starting row', () => {
    // Dark bishop at row 2 (light's starting row) → can go off-board
    const gameState = makeState([
      { type: 'bishop', owner: 'dark', row: 2, col: 1 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.moves).toContain('off_board');
  });

  it('does NOT append off_board for pawn', () => {
    // Pawns cannot go off-board in King's Cooking
    const gameState = makeState([
      { type: 'pawn', owner: 'dark', row: 1, col: 1 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    for (const p of result) {
      expect(p.moves).not.toContain('off_board');
    }
  });

  it('handles queen off-board eligibility (rook-like path)', () => {
    // Queen at [0,1] with clear column path — can go off-board via rook path
    const gameState = makeState([
      { type: 'queen', owner: 'dark', row: 0, col: 1 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.moves).toContain('off_board');
  });

  it('iterates AI pieces from advancing row first (dark: row 0 first)', () => {
    const gameState = makeState([
      { type: 'rook', owner: 'dark', row: 0, col: 0 },
      { type: 'knight', owner: 'dark', row: 2, col: 2 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    // Dark iteration order: row 0, 1, 2 — so [0,0] rook comes first
    expect(result[0]!.from).toEqual([0, 0]);
  });

  it('skips pieces belonging to the other player', () => {
    const gameState = makeState([
      { type: 'rook', owner: 'light', row: 2, col: 0 },
      { type: 'rook', owner: 'dark', row: 0, col: 0 },
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    // Only dark rook should appear
    expect(result.every(p => p.from[0] === 0)).toBe(true);
  });

  it('excludes pieces that have no moves', () => {
    // Pawn at [1,1] with no valid moves (surrounded)
    const gameState = makeState([
      { type: 'pawn', owner: 'dark', row: 1, col: 1 },
      { type: 'rook', owner: 'light', row: 0, col: 1 }, // blocks pawn
    ]);
    engine = new KingsChessEngine(
      gameState.lightPlayer,
      gameState.darkPlayer,
      gameState
    );

    // If pawn has moves, they'll be included; we just verify no crash
    const result = buildPiecesWithMoves(engine, gameState, 'dark');
    for (const p of result) {
      expect(p.moves.length).toBeGreaterThan(0);
    }
  });
});
