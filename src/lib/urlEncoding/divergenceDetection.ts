/**
 * @fileoverview Proactive divergence detection for URL state synchronization
 * @module lib/urlEncoding/divergenceDetection
 *
 * Catches checksum mismatches BEFORE generating URLs to prevent sending invalid moves.
 * Provides user-friendly error messages and recovery options.
 */

import type { GameState } from '@/lib/validation/schemas';

/**
 * Verification result interface
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify current state matches opponent's last known checksum
 * before generating URL
 *
 * This proactive check prevents players from sending invalid moves
 * due to state divergence (e.g., localStorage tampering, missed moves).
 *
 * @param currentState - Current game state
 * @param opponentLastChecksum - Opponent's last known checksum (from their last move)
 * @returns Verification result with error message if diverged
 *
 * @example
 * const verification = verifyStateBeforeSend(
 *   engine.getGameState(),
 *   opponentLastChecksum
 * );
 *
 * if (!verification.valid) {
 *   showError(verification.error);
 *   // Offer recovery options
 * }
 */
export function verifyStateBeforeSend(
  currentState: GameState,
  opponentLastChecksum: string | null
): VerificationResult {
  // If this is the first move, no previous checksum to verify
  if (!opponentLastChecksum || currentState.currentTurn === 0) {
    return { valid: true };
  }

  // For now, we'll do a basic check
  // TODO: Phase 3B will implement full history-based verification
  // with getGameHistory() and checking synced moves

  // If we're past turn 0, we should have move history
  if (currentState.moveHistory.length === 0 && currentState.currentTurn > 0) {
    return {
      valid: false,
      error: `Game state appears corrupted. Expected move history for turn ${currentState.currentTurn}, but history is empty.

This usually means:
• Your localStorage was cleared or corrupted
• You missed moves from your opponent
• Your game state was manually modified

Would you like to request a full state resync from your opponent?`,
    };
  }

  // Basic validation: check if state seems consistent
  const expectedTurn = currentState.moveHistory.length;
  if (currentState.currentTurn !== expectedTurn) {
    return {
      valid: false,
      error: `Game state inconsistency detected. Current turn (${currentState.currentTurn}) does not match move history length (${expectedTurn}).

This usually means:
• Your localStorage was modified manually
• Your game state became corrupted
• Moves were not properly recorded

Would you like to reload from the last verified state?`,
    };
  }

  // If all basic checks pass, assume valid
  // Full checksum verification will be added in Phase 3B with history storage
  return { valid: true };
}

/**
 * Reload game state from last verified checkpoint
 *
 * Attempts to restore game to the last known good state where
 * both players were synchronized (marked with synced: true in history).
 *
 * @returns true if reload successful, false if no checkpoint exists
 *
 * @example
 * if (reloadFromLastVerifiedState()) {
 *   showSuccess('Game state restored. Please make your move again.');
 * } else {
 *   showError('No verified state available. Request full state from opponent.');
 * }
 */
export function reloadFromLastVerifiedState(): boolean {
  // TODO: Phase 3B will implement full history-based reload
  // For now, we can't reload without history storage system

  console.warn('Reload from verified state not yet implemented. History storage system required.');
  console.log('Please request full state from opponent using resync_request payload.');

  return false;
}

/**
 * Check if game state is consistent
 *
 * Validates that the game state's internal data is logically consistent.
 * Does NOT verify checksums against opponent - use verifyStateBeforeSend for that.
 *
 * @param gameState - Game state to check
 * @returns Verification result
 */
export function checkStateConsistency(gameState: GameState): VerificationResult {
  // Check turn matches history length
  if (gameState.currentTurn !== gameState.moveHistory.length) {
    return {
      valid: false,
      error: `Turn number (${gameState.currentTurn}) does not match move history length (${gameState.moveHistory.length})`,
    };
  }

  // Check board state consistency
  let piecesOnBoard = 0;
  for (const row of gameState.board) {
    for (const cell of row) {
      if (cell !== null) {
        piecesOnBoard++;
      }
    }
  }

  const totalPieces =
    piecesOnBoard +
    gameState.whiteCourt.length +
    gameState.blackCourt.length +
    gameState.capturedWhite.length +
    gameState.capturedBlack.length;

  // Initial game starts with 6 pieces (3 white, 3 black)
  if (totalPieces > 6) {
    return {
      valid: false,
      error: `Too many pieces: ${totalPieces} (expected max 6)`,
    };
  }

  return { valid: true };
}

/**
 * Get user-friendly error message with recovery suggestions
 *
 * @param divergenceType - Type of divergence detected
 * @returns Formatted error message
 */
export function getDivergenceErrorMessage(divergenceType: 'checksum' | 'turn' | 'history' | 'corruption'): string {
  const messages = {
    checksum: `Your game state has diverged from your opponent's.

This usually means:
• You modified your localStorage manually
• You missed a URL from your opponent
• Your game state was corrupted

Recovery options:
1. Reload from last verified state (if available)
2. Request full state from opponent (recommended)`,

    turn: `Turn number mismatch detected.

This usually means:
• You missed one or more moves from your opponent
• Your game state was not properly updated

Recovery options:
1. Request full state from opponent (recommended)`,

    history: `Move history is incomplete or corrupted.

This usually means:
• Your localStorage was cleared
• Your game state was manually modified

Recovery options:
1. Request full state from opponent (required)`,

    corruption: `Game state corruption detected.

Your localStorage data appears to be invalid or tampered with.

Recovery options:
1. Request full state from opponent (required)`,
  };

  return messages[divergenceType];
}
