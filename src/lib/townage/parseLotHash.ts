/**
 * @fileoverview Parse #lot= hash from townage.app NPC launch URLs
 * @module lib/townage/parseLotHash
 */

import { decompressFromEncodedURIComponent } from 'lz-string';
import type { LotLaunchData } from '../../types/aiAgents';

/**
 * Parse the #lot-home= hash appended by townage.app when launching directly to the game home.
 * Carries only { returnUrl } — no NPC or session data.
 *
 * @param hash - window.location.hash value (e.g. "#lot-home=<compressed>")
 * @returns returnUrl string or null if hash is absent or malformed
 */
export function parseLotHomeHash(hash: string): string | null {
  if (!hash.startsWith('#lot-home=')) return null;

  const compressed = hash.slice('#lot-home='.length);
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const data = JSON.parse(json) as unknown;

    if (
      typeof data !== 'object' ||
      data === null ||
      !('returnUrl' in data) ||
      typeof (data as { returnUrl: unknown }).returnUrl !== 'string'
    ) {
      return null;
    }

    return (data as { returnUrl: string }).returnUrl;
  } catch {
    return null;
  }
}

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
