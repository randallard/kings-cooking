/**
 * @fileoverview Parse #lot= hash from townage.app NPC launch URLs
 * @module lib/townage/parseLotHash
 */

import { decompressFromEncodedURIComponent } from 'lz-string';
import type { LotLaunchData } from '../../types/aiAgents';

/**
 * Parse the #lot= hash appended by townage.app when launching a game from an NPC.
 *
 * @param hash - window.location.hash value (e.g. "#lot=<compressed>")
 * @returns Parsed LotLaunchData or null if hash is absent or malformed
 */
export function parseLotHash(hash: string): LotLaunchData | null {
  if (!hash.startsWith('#lot=')) return null;

  const compressed = hash.slice('#lot='.length);
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const data = JSON.parse(json) as unknown;

    if (
      typeof data !== 'object' ||
      data === null ||
      !('sessionId' in data) ||
      !('npcId' in data) ||
      !('npcDisplayName' in data) ||
      !('agentType' in data) ||
      !('returnUrl' in data)
    ) {
      return null;
    }

    return data as LotLaunchData;
  } catch {
    return null;
  }
}
