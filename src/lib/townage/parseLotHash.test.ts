/**
 * @fileoverview Tests for parseLotHash
 */

import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { parseLotHash } from './parseLotHash';
import type { LotLaunchData } from '../../types/aiAgents';

function makeLotHash(data: LotLaunchData): string {
  return `#lot=${compressToEncodedURIComponent(JSON.stringify(data))}`;
}

const VALID_DATA: LotLaunchData = {
  sessionId: 'sess-123',
  npcId: 'npc-456',
  npcDisplayName: 'The Innkeeper',
  agentType: 'scripted_1',
  returnUrl: 'https://townage.app/lot/npc-456',
};

describe('parseLotHash', () => {
  it('returns null for empty string', () => {
    expect(parseLotHash('')).toBeNull();
  });

  it('returns null when hash does not start with #lot=', () => {
    expect(parseLotHash('#something=else')).toBeNull();
    expect(parseLotHash('#r=abc')).toBeNull();
    expect(parseLotHash('#')).toBeNull();
  });

  it('returns null for corrupted compressed data', () => {
    expect(parseLotHash('#lot=notvalidcompression!!!@@@')).toBeNull();
  });

  it('returns null when compressed JSON is missing required fields', () => {
    const incomplete = compressToEncodedURIComponent(
      JSON.stringify({ sessionId: 'x', npcId: 'y' })
    );
    expect(parseLotHash(`#lot=${incomplete}`)).toBeNull();
  });

  it('returns null when compressed value is not an object', () => {
    const notObject = compressToEncodedURIComponent(JSON.stringify('just a string'));
    expect(parseLotHash(`#lot=${notObject}`)).toBeNull();
  });

  it('parses valid lot data correctly', () => {
    const result = parseLotHash(makeLotHash(VALID_DATA));
    expect(result).toEqual(VALID_DATA);
  });

  it('includes optional playerName when present', () => {
    const withPlayer: LotLaunchData = { ...VALID_DATA, playerName: 'Adventurer' };
    const result = parseLotHash(makeLotHash(withPlayer));
    expect(result?.playerName).toBe('Adventurer');
  });

  it('works without optional playerName', () => {
    const result = parseLotHash(makeLotHash(VALID_DATA));
    expect(result?.playerName).toBeUndefined();
  });
});
