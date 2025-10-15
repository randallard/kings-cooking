/**
 * @fileoverview Kings Chess Engine - Core game logic
 * @module lib/chess/KingsChessEngine
 *
 * Complete chess engine for King's Cooking variant.
 * Handles move validation, piece placement, capture mechanics,
 * and victory detection.
 */

import { v4 as uuid } from 'uuid';
import {
  GameStateSchema,
  PieceSchema,
  MoveSchema,
  GameIdSchema,
} from '../validation/schemas';
import type {
  GameState,
  Piece,
  Position,
  Move,
  GameId,
  PlayerInfo,
} from '../validation/schemas';
import type { MoveResult, VictoryResult } from './types';
import { validateMove } from './moveValidation';
import { checkGameEnd } from './victoryConditions';
import {
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
} from './pieceMovement';

/**
 * Kings Chess Engine - Main game logic class.
 *
 * Manages 3x3 board with rook, knight, bishop pieces.
 * Implements King's Cooking rules for off-board movement,
 * captures, and victory conditions.
 *
 * @example
 * ```typescript
 * const engine = new KingsChessEngine(whitePlayer, blackPlayer);
 * const result = engine.makeMove([2, 0], [1, 0]);
 * if (result.success) {
 *   const victory = engine.checkGameEnd();
 *   if (victory.gameOver) {
 *     console.log(victory.reason);
 *   }
 * }
 * ```
 */
export class KingsChessEngine {
  private gameState: GameState;

  /**
   * Create new chess engine.
   *
   * @param whitePlayer - White player info
   * @param blackPlayer - Black player info
   * @param initialState - Optional initial state to restore from
   */
  constructor(
    whitePlayer: PlayerInfo,
    blackPlayer: PlayerInfo,
    initialState?: GameState
  ) {
    if (initialState) {
      // Validate and restore state
      this.gameState = GameStateSchema.parse(initialState);
    } else {
      // Create new game
      this.gameState = this.createInitialState(whitePlayer, blackPlayer);
    }
  }

  /**
   * Create initial game state with starting position.
   *
   * Starting setup:
   * ```
   * [♜][♞][♝]  ← Black (row 0)
   * [ ][ ][ ]  ← Empty (row 1)
   * [♖][♘][♗]  ← White (row 2)
   * ```
   */
  private createInitialState(
    whitePlayer: PlayerInfo,
    blackPlayer: PlayerInfo
  ): GameState {
    const gameId: GameId = GameIdSchema.parse(uuid());

    // Create starting pieces
    const whiteRook: Piece = {
      type: 'rook',
      owner: 'white',
      position: [2, 0],
      moveCount: 0,
      id: uuid(),
    };

    const whiteKnight: Piece = {
      type: 'knight',
      owner: 'white',
      position: [2, 1],
      moveCount: 0,
      id: uuid(),
    };

    const whiteBishop: Piece = {
      type: 'bishop',
      owner: 'white',
      position: [2, 2],
      moveCount: 0,
      id: uuid(),
    };

    const blackRook: Piece = {
      type: 'rook',
      owner: 'black',
      position: [0, 0],
      moveCount: 0,
      id: uuid(),
    };

    const blackKnight: Piece = {
      type: 'knight',
      owner: 'black',
      position: [0, 1],
      moveCount: 0,
      id: uuid(),
    };

    const blackBishop: Piece = {
      type: 'bishop',
      owner: 'black',
      position: [0, 2],
      moveCount: 0,
      id: uuid(),
    };

    // Create 3x3 board
    const board: (Piece | null)[][] = [
      [blackRook, blackKnight, blackBishop],
      [null, null, null],
      [whiteRook, whiteKnight, whiteBishop],
    ];

    const initialState: GameState = {
      version: '1.0.0',
      gameId,
      board,
      whiteCourt: [],
      blackCourt: [],
      capturedWhite: [],
      capturedBlack: [],
      currentTurn: 0,
      currentPlayer: 'white',
      whitePlayer,
      blackPlayer,
      status: 'playing',
      winner: null,
      moveHistory: [],
      checksum: this.generateChecksum(gameId, 0, board),
    };

    return GameStateSchema.parse(initialState);
  }

  /**
   * Make a move on the board.
   *
   * @param from - Starting position
   * @param to - Destination position or 'off_board'
   * @returns Move result with success status
   */
  public makeMove(from: Position, to: Position | 'off_board'): MoveResult {
    const piece = this.getPieceAt(from);

    if (!piece) {
      return {
        success: false,
        error: `No piece at position [${from?.[0] ?? '?'},${from?.[1] ?? '?'}]`,
      };
    }

    // Validate move
    const validation = validateMove(
      from,
      to,
      piece,
      this.getPieceAt.bind(this),
      this.gameState.currentPlayer
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason ?? 'Invalid move',
      };
    }

    // Execute move
    if (to === 'off_board') {
      return this.executeOffBoardMove(from, piece);
    } else {
      return this.executeStandardMove(from, to, piece);
    }
  }

  /**
   * Execute off-board move.
   */
  private executeOffBoardMove(from: Position, piece: Piece): MoveResult {
    if (!from) {
      return {
        success: false,
        error: 'Invalid position',
      };
    }

    // Remove piece from board
    this.gameState.board[from[0]]![from[1]] = null;

    // Update piece position
    piece.position = null;
    piece.moveCount++;

    // Add to scoring court (piece goes to opponent's side to score)
    if (piece.owner === 'white') {
      this.gameState.whiteCourt.push(piece);
    } else {
      this.gameState.blackCourt.push(piece);
    }

    // Record move
    const move: Move = MoveSchema.parse({
      from,
      to: 'off_board',
      piece: PieceSchema.parse(piece),
      captured: null,
      timestamp: Date.now(),
    });

    this.gameState.moveHistory.push(move);

    // Switch turns
    this.advanceTurn();

    return {
      success: true,
      gameState: this.gameState,
    };
  }

  /**
   * Execute standard on-board move.
   */
  private executeStandardMove(
    from: Position,
    to: Position,
    piece: Piece
  ): MoveResult {
    if (!from || !to) {
      return {
        success: false,
        error: 'Invalid position',
      };
    }

    const targetPiece = this.getPieceAt(to);

    // Handle capture
    if (targetPiece) {
      // CRITICAL: Captured piece goes to THEIR OWN king's court (not captor's)
      targetPiece.position = null;

      if (targetPiece.owner === 'white') {
        this.gameState.capturedWhite.push(targetPiece);
      } else {
        this.gameState.capturedBlack.push(targetPiece);
      }
    }

    // Move piece
    this.gameState.board[from[0]]![from[1]] = null;
    this.gameState.board[to[0]]![to[1]] = piece;
    piece.position = to;
    piece.moveCount++;

    // Record move
    const move: Move = MoveSchema.parse({
      from,
      to,
      piece: PieceSchema.parse(piece),
      captured: targetPiece ? PieceSchema.parse(targetPiece) : null,
      timestamp: Date.now(),
    });

    this.gameState.moveHistory.push(move);

    // Switch turns
    this.advanceTurn();

    const result: MoveResult = {
      success: true,
      gameState: this.gameState,
    };

    if (targetPiece) {
      result.captured = targetPiece;
    }

    return result;
  }

  /**
   * Advance to next turn.
   */
  private advanceTurn(): void {
    this.gameState.currentTurn++;
    this.gameState.currentPlayer =
      this.gameState.currentPlayer === 'white' ? 'black' : 'white';
    this.gameState.checksum = this.generateChecksum(
      this.gameState.gameId,
      this.gameState.currentTurn,
      this.gameState.board
    );
  }

  /**
   * Get valid moves for piece at position.
   *
   * @param position - Position to check
   * @returns Array of valid move destinations
   */
  public getValidMoves(position: Position): Position[] {
    const piece = this.getPieceAt(position);
    if (!piece) return [];
    if (piece.owner !== this.gameState.currentPlayer) return [];

    switch (piece.type) {
      case 'rook':
        return getRookMoves(
          position,
          this.getPieceAt.bind(this),
          this.gameState.currentPlayer
        );
      case 'knight':
        return getKnightMoves(
          position,
          this.getPieceAt.bind(this),
          this.gameState.currentPlayer
        );
      case 'bishop':
        return getBishopMoves(
          position,
          this.getPieceAt.bind(this),
          this.gameState.currentPlayer
        );
      default:
        return [];
    }
  }

  /**
   * Check if game has ended.
   *
   * @returns Victory result with winner
   */
  public checkGameEnd(): VictoryResult {
    return checkGameEnd(this.gameState);
  }

  /**
   * Get current game state.
   *
   * @returns Current game state (deep copy)
   */
  public getGameState(): GameState {
    return GameStateSchema.parse(JSON.parse(JSON.stringify(this.gameState)));
  }

  /**
   * Get piece at position.
   *
   * @param position - Position to check
   * @returns Piece at position or null
   */
  public getPieceAt(position: Position): Piece | null {
    if (!position) return null;
    return this.gameState.board[position[0]]?.[position[1]] ?? null;
  }

  /**
   * Serialize to JSON.
   *
   * @returns Game state as JSON
   */
  public toJSON(): GameState {
    return this.getGameState();
  }

  /**
   * Create engine from JSON state.
   *
   * @param json - Serialized game state
   * @returns New engine instance
   */
  public static fromJSON(json: GameState): KingsChessEngine {
    const validated = GameStateSchema.parse(json);
    return new KingsChessEngine(
      validated.whitePlayer,
      validated.blackPlayer,
      validated
    );
  }

  /**
   * Generate checksum for state validation.
   */
  private generateChecksum(
    gameId: GameId,
    turn: number,
    board: (Piece | null)[][]
  ): string {
    const data = `${gameId}-${turn}-${JSON.stringify(board)}`;
    // Simple checksum (could use crypto.subtle for production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
