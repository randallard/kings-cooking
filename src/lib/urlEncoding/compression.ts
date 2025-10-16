/**
 * @fileoverview Compression utilities for URL payloads
 * @module lib/urlEncoding/compression
 *
 * Uses lz-string library for URL-safe compression.
 * Typical compression ratios: 66-88% size reduction.
 */

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'lz-string';
import { fromError } from 'zod-validation-error';
import { UrlPayloadSchema, type UrlPayload } from './types';

/**
 * Compress payload to URL-safe string
 *
 * @param payload - Validated URL payload
 * @returns Compressed string or empty string on error
 *
 * @example
 * const payload: DeltaPayload = { type: 'delta', ... };
 * const compressed = compressPayload(payload);
 * // Result: "N4IgdghgtgpiBcIDaB..."
 */
export function compressPayload(payload: UrlPayload): string {
  try {
    const jsonString = JSON.stringify(payload);
    const compressed = compressToEncodedURIComponent(jsonString);

    // Log size for debugging (only in development)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(`Compressed payload: ${jsonString.length} → ${compressed.length} chars (${Math.round((compressed.length / jsonString.length) * 100)}%)`);
    }

    return compressed;
  } catch (error) {
    console.error('Failed to compress payload:', error);
    return '';
  }
}

/**
 * Decompress and validate payload from URL string
 *
 * @param compressed - Compressed URL string (from hash fragment)
 * @returns Validated payload or null if decompression/validation fails
 *
 * @example
 * const hash = window.location.hash.slice(1);
 * const payload = decompressPayload(hash);
 * if (payload && payload.type === 'delta') {
 *   // Handle delta payload
 * }
 */
export function decompressPayload(compressed: string): UrlPayload | null {
  try {
    // Clean whitespace
    const cleaned = compressed.trim();
    if (!cleaned) {
      console.warn('Empty compressed string');
      return null;
    }

    // Decompress - CRITICAL: Check for null return
    const decompressed = decompressFromEncodedURIComponent(cleaned);
    if (decompressed === null) {
      console.error('Decompression returned null - data is corrupted');
      return null;
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(decompressed);
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      return null;
    }

    // Validate with Zod schema
    const result = UrlPayloadSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      // Convert ZodError to user-friendly message
      const error = fromError(result.error);
      console.error('Payload validation failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('Failed to decompress payload:', error);
    return null;
  }
}

/**
 * Get compression statistics for debugging
 *
 * @param payload - Payload to analyze
 * @returns Size statistics
 */
export function getCompressionStats(payload: UrlPayload): {
  originalSize: number;
  compressedSize: number;
  ratio: number;
} {
  const jsonString = JSON.stringify(payload);
  const compressed = compressPayload(payload);

  return {
    originalSize: jsonString.length,
    compressedSize: compressed.length,
    ratio: compressed.length / jsonString.length,
  };
}
