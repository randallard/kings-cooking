/**
 * @fileoverview Zod validation schemas for King's Cooking game state
 * @module lib/validation/schemas
 *
 * This module defines all validation schemas using Zod for runtime type safety.
 * All external data (localStorage, URL parameters, WebRTC messages) MUST be
 * validated with these schemas before use.
 *
 * @see PRD.md Section 2.3 - Data Structures
 * @see ZOD_VALIDATION_PATTERNS_RESEARCH.md
 */

import { z } from 'zod';

// ============================================================================
// Branded Types for Type Safety (ZOD_VALIDATION_PATTERNS_RESEARCH.md lines 90-112)
// ============================================================================

/**
 * Branded type for Player IDs.
 * Prevents accidentally mixing player IDs with other string types.
 *
 * @example
 * ```typescript
 * const playerId = PlayerIdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
 * function getPlayer(id: PlayerId) { ... }
 * getPlayer(playerId); // ✓ Works
 * getPlayer('some-string'); // ✗ Type error
 * ```
 */
export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export type PlayerId = z.infer<typeof PlayerIdSchema>;

/**
 * Branded type for Game IDs.
 * Ensures game IDs cannot be confused with player IDs or other identifiers.
 */
export const GameIdSchema = z.string().uuid().brand<'GameId'>();
export type GameId = z.infer<typeof GameIdSchema>;

/**
 * Branded type for Move IDs.
 * Tracks individual moves in move history.
 */
export const MoveIdSchema = z.string().uuid().brand<'MoveId'>();
export type MoveId = z.infer<typeof MoveIdSchema>;

// ============================================================================
// Piece Types (PRD.md Section 2.3)
// ============================================================================

/**
 * Chess piece types available in King's Cooking.
 * Initial implementation: rook, knight, bishop (no pawns, no king/queen).
 */
export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop']);
export type PieceType = z.infer<typeof PieceTypeSchema>;

/**
 * Piece owner (color).
 * White always starts first.
 */
export const PieceOwnerSchema = z.enum(['white', 'black']);
export type PieceOwner = z.infer<typeof PieceOwnerSchema>;

/**
 * Board position with validation.
 * Row and column are 0-indexed.
 * Null position means piece is off-board (in a court or captured).
 *
 * @example
 * ```typescript
 * const pos = PositionSchema.parse([0, 0]); // Top-left corner
 * ```
 */
export const PositionSchema = z.tuple([
  z.number().int().min(0),
  z.number().int().min(0),
]).nullable();

export type Position = z.infer<typeof PositionSchema>;

/**
 * Complete piece schema with position and state.
 *
 * @property type - Type of chess piece
 * @property owner - Which player owns this piece
 * @property position - Current position or null if off-board
 * @property moveCount - Number of times piece has moved (for move validation)
 * @property id - Unique identifier for this piece instance
 */
export const PieceSchema = z.object({
  type: PieceTypeSchema,
  owner: PieceOwnerSchema,
  position: PositionSchema,
  moveCount: z.number().int().min(0),
  id: z.string().uuid(),
});

export type Piece = z.infer<typeof PieceSchema>;

// ============================================================================
// Player Info
// ============================================================================

/**
 * Player information schema.
 *
 * @property id - Unique player identifier (UUID)
 * @property name - Player's display name (1-20 characters)
 */
export const PlayerInfoSchema = z.object({
  id: PlayerIdSchema,
  name: z.string().min(1).max(20),
});

export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;

// ============================================================================
// Move History
// ============================================================================

/**
 * Individual move schema.
 * Records a single move in the game with complete context.
 *
 * @property from - Starting position
 * @property to - Ending position or 'off_board' if scoring
 * @property piece - Piece that moved
 * @property captured - Piece captured during this move (if any)
 * @property timestamp - Unix timestamp when move was made
 */
export const MoveSchema = z.object({
  from: z.tuple([z.number(), z.number()]),
  to: z.union([
    z.tuple([z.number(), z.number()]),
    z.literal('off_board')
  ]),
  piece: PieceSchema,
  captured: PieceSchema.nullable(),
  timestamp: z.number(),
});

export type Move = z.infer<typeof MoveSchema>;

// ============================================================================
// Game State (Core Schema) - PRD.md Section 2.3
// ============================================================================

/**
 * Complete game state schema.
 * This is the PRIMARY schema for the entire game state.
 *
 * VALIDATION CRITICAL: This schema MUST be used to validate:
 * - Data loaded from localStorage
 * - Data received via WebRTC
 * - Data decoded from URLs
 *
 * @property version - Schema version for backward compatibility
 * @property gameId - Unique game identifier
 * @property board - 3x3 grid of pieces (null = empty square)
 * @property whiteCourt - White pieces that reached Black's court (white scores)
 * @property blackCourt - Black pieces that reached White's court (black scores)
 * @property capturedWhite - White pieces captured (not scored)
 * @property capturedBlack - Black pieces captured (not scored)
 * @property currentTurn - Turn number (starts at 0)
 * @property currentPlayer - Whose turn it is
 * @property whitePlayer - White player info
 * @property blackPlayer - Black player info
 * @property status - Current game status
 * @property winner - Winner if game is finished
 * @property moveHistory - Complete move history
 * @property checksum - Data integrity checksum
 */
export const GameStateSchema = z.object({
  version: z.literal('1.0.0'),
  gameId: GameIdSchema,

  // Board state (3x3 grid)
  board: z.array(z.array(PieceSchema.nullable()).length(3)).length(3),

  // Pieces in courts (scoring)
  whiteCourt: z.array(PieceSchema), // White pieces in Black's court
  blackCourt: z.array(PieceSchema), // Black pieces in White's court

  // Captured pieces (removed from play)
  capturedWhite: z.array(PieceSchema),
  capturedBlack: z.array(PieceSchema),

  // Turn management
  currentTurn: z.number().int().min(0),
  currentPlayer: PieceOwnerSchema,

  // Player info
  whitePlayer: PlayerInfoSchema,
  blackPlayer: PlayerInfoSchema,

  // Game status
  status: z.enum(['playing', 'white_wins', 'black_wins', 'draw']),
  winner: PieceOwnerSchema.nullable(),

  // Move history
  moveHistory: z.array(MoveSchema),

  // Checksum for validation
  checksum: z.string(),
});

export type GameState = z.infer<typeof GameStateSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates game state and throws on error.
 * Use for trusted internal data.
 *
 * @param data - Unknown data to validate
 * @returns Validated GameState
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const state = validateGameState(unknownData);
 *   // state is fully typed and validated
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid game state:', error.issues);
 *   }
 * }
 * ```
 */
export function validateGameState(data: unknown): GameState {
  return GameStateSchema.parse(data);
}

/**
 * Safely validates game state without throwing.
 * Use for untrusted external data (URLs, localStorage, WebRTC).
 *
 * PREFERRED for all boundary validations.
 *
 * @param data - Unknown data to validate
 * @returns Success or error result
 *
 * @example
 * ```typescript
 * const result = safeValidateGameState(externalData);
 *
 * if (result.success) {
 *   const state = result.data; // Typed as GameState
 *   updateGame(state);
 * } else {
 *   console.error('Validation failed:', result.error.format());
 *   showErrorToUser('Invalid game data');
 * }
 * ```
 */
export function safeValidateGameState(
  data: unknown
): z.SafeParseReturnType<unknown, GameState> {
  return GameStateSchema.safeParse(data);
}

/**
 * Validates a single piece.
 * Used when validating user input for piece selection.
 *
 * @param data - Unknown data to validate as Piece
 * @returns Validated Piece
 * @throws {z.ZodError} If validation fails
 */
export function validatePiece(data: unknown): Piece {
  return PieceSchema.parse(data);
}

/**
 * Safely validates a single piece.
 *
 * @param data - Unknown data to validate as Piece
 * @returns Success or error result
 */
export function safeValidatePiece(
  data: unknown
): z.SafeParseReturnType<unknown, Piece> {
  return PieceSchema.safeParse(data);
}
