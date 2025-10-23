/**
 * @fileoverview Tests for piece selection type definitions and schemas
 * @module lib/pieceSelection/types.test
 */

import { describe, it, expect } from 'vitest';
import {
  PieceTypeSchema,
  SelectionModeSchema,
  SelectedPiecesSchema,
  PieceSelectionDataSchema,
  PIECE_POOL,
} from './types';

describe('Piece Selection Types', () => {
  describe('PieceTypeSchema', () => {
    it('should accept valid piece types', () => {
      expect(PieceTypeSchema.parse('rook')).toBe('rook');
      expect(PieceTypeSchema.parse('knight')).toBe('knight');
      expect(PieceTypeSchema.parse('bishop')).toBe('bishop');
      expect(PieceTypeSchema.parse('queen')).toBe('queen');
      expect(PieceTypeSchema.parse('pawn')).toBe('pawn');
    });

    it('should reject invalid piece types', () => {
      expect(() => PieceTypeSchema.parse('king')).toThrow();
      expect(() => PieceTypeSchema.parse('invalid')).toThrow();
      expect(() => PieceTypeSchema.parse('')).toThrow();
    });
  });

  describe('SelectionModeSchema', () => {
    it('should accept valid selection modes', () => {
      expect(SelectionModeSchema.parse('mirrored')).toBe('mirrored');
      expect(SelectionModeSchema.parse('independent')).toBe('independent');
      expect(SelectionModeSchema.parse('random')).toBe('random');
    });

    it('should reject invalid selection modes', () => {
      expect(() => SelectionModeSchema.parse('invalid')).toThrow();
      expect(() => SelectionModeSchema.parse('')).toThrow();
    });
  });


  describe('SelectedPiecesSchema', () => {
    it('should accept exactly 3 pieces', () => {
      const valid = ['rook', 'knight', 'bishop'] as const;
      expect(() => SelectedPiecesSchema.parse(valid)).not.toThrow();
    });

    it('should reject less than 3 pieces', () => {
      const invalid = ['rook', 'knight'];
      expect(() => SelectedPiecesSchema.parse(invalid)).toThrow();
    });

    it('should reject more than 3 pieces', () => {
      const invalid = ['rook', 'knight', 'bishop', 'queen'];
      expect(() => SelectedPiecesSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid piece types in tuple', () => {
      const invalid = ['rook', 'knight', 'invalid'];
      expect(() => SelectedPiecesSchema.parse(invalid)).toThrow();
    });
  });

  describe('PieceSelectionDataSchema', () => {
    it('should validate complete piece selection data', () => {
      const valid = {
        mode: 'mirrored',
        player1Pieces: ['rook', 'knight', 'bishop'],
        player2Pieces: ['rook', 'knight', 'bishop'],
        player1Color: 'light',
      };
      expect(() => PieceSelectionDataSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid mode', () => {
      const invalid = {
        mode: 'invalid',
        player1Pieces: ['rook', 'knight', 'bishop'],
        player2Pieces: ['rook', 'knight', 'bishop'],
        player1Color: 'light',
      };
      expect(() => PieceSelectionDataSchema.parse(invalid)).toThrow();
    });

    it('should reject wrong number of pieces', () => {
      const invalid = {
        mode: 'mirrored',
        player1Pieces: ['rook', 'knight'], // only 2
        player2Pieces: ['rook', 'knight', 'bishop'],
        player1Color: 'light',
      };
      expect(() => PieceSelectionDataSchema.parse(invalid)).toThrow();
    });

    it('should reject missing fields', () => {
      const invalid = {
        mode: 'mirrored',
        player1Pieces: ['rook', 'knight', 'bishop'],
        // missing player2Pieces and player1Color
      };
      expect(() => PieceSelectionDataSchema.parse(invalid)).toThrow();
    });
  });

  describe('PIECE_POOL', () => {
    it('should have correct max counts', () => {
      expect(PIECE_POOL.rook.max).toBe(2);
      expect(PIECE_POOL.knight.max).toBe(2);
      expect(PIECE_POOL.bishop.max).toBe(2);
      expect(PIECE_POOL.queen.max).toBe(1);
      expect(PIECE_POOL.pawn.max).toBe(8);
    });

    it('should have unicode characters for both colors', () => {
      Object.values(PIECE_POOL).forEach((piece) => {
        expect(piece.unicode.light).toBeTruthy();
        expect(piece.unicode.dark).toBeTruthy();
        expect(typeof piece.unicode.light).toBe('string');
        expect(typeof piece.unicode.dark).toBe('string');
      });
    });

    it('should use outlined symbols for light pieces', () => {
      expect(PIECE_POOL.rook.unicode.light).toBe('♖');
      expect(PIECE_POOL.knight.unicode.light).toBe('♘');
      expect(PIECE_POOL.bishop.unicode.light).toBe('♗');
      expect(PIECE_POOL.queen.unicode.light).toBe('♕');
      expect(PIECE_POOL.pawn.unicode.light).toBe('♙');
    });

    it('should use filled symbols for dark pieces', () => {
      expect(PIECE_POOL.rook.unicode.dark).toBe('♜');
      expect(PIECE_POOL.knight.unicode.dark).toBe('♞');
      expect(PIECE_POOL.bishop.unicode.dark).toBe('♝');
      expect(PIECE_POOL.queen.unicode.dark).toBe('♛');
      expect(PIECE_POOL.pawn.unicode.dark).toBe('♟\uFE0E'); // Includes text presentation selector for iOS
    });

    describe('pawn unicode (Issue #26)', () => {
      it('should use U+2659 for light pawn (no emoji variant)', () => {
        const lightPawn = PIECE_POOL.pawn.unicode.light;
        expect(lightPawn.codePointAt(0)).toBe(0x2659); // ♙ WHITE CHESS PAWN
      });

      it('should use U+265F for dark pawn with text presentation selector', () => {
        const darkPawn = PIECE_POOL.pawn.unicode.dark;
        expect(darkPawn.codePointAt(0)).toBe(0x265f); // ♟ BLACK CHESS PAWN
        expect(darkPawn.codePointAt(1)).toBe(0xfe0e); // U+FE0E TEXT PRESENTATION SELECTOR (for iOS)
        expect(darkPawn.length).toBe(2); // Base character + variation selector
      });

      it('should follow light=filled, dark=outline pattern', () => {
        // Light pawn should match pattern of other light pieces (filled)
        const lightPawn = PIECE_POOL.pawn.unicode.light;
        const lightRook = PIECE_POOL.rook.unicode.light;

        // Both should be "filled" style (lower codepoints in chess unicode block)
        expect(lightPawn.codePointAt(0)).toBeLessThan(0x2660);
        expect(lightRook.codePointAt(0)).toBeLessThan(0x2660);
      });
    });
  });
});
