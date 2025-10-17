/**
 * @fileoverview Custom hook for URL state synchronization with debouncing
 * @module hooks/useUrlState
 *
 * CRITICAL PATTERNS:
 * 1. Use useRef for debounced callbacks to avoid frozen closure problem
 * 2. Empty dependency array for hashchange listener (prevents exponential growth)
 * 3. Clean up listeners and timers on unmount (prevent memory leaks)
 * 4. Use replaceState (not pushState) to prevent history pollution
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { decompressPayload, compressPayload } from '@/lib/urlEncoding/compression';
import type { UrlPayload } from '@/lib/urlEncoding/types';

/**
 * Hook configuration options
 */
export interface UseUrlStateOptions {
  /** Debounce delay for URL updates (default: 300ms) */
  debounceMs?: number;

  /** Error callback handler */
  onError?: (error: string) => void;

  /** Success callback after URL update */
  onUrlUpdated?: (url: string) => void;

  /** Callback when payload received from URL */
  onPayloadReceived?: (payload: UrlPayload) => void;
}

/**
 * Custom hook for managing game state in URL hash fragment.
 *
 * Features:
 * - Automatic URL parsing on mount
 * - Hash change monitoring (back/forward navigation)
 * - Debounced URL updates (300ms default)
 * - Error state management with validation
 * - Memory leak prevention (cleanup on unmount)
 *
 * @param options - Hook configuration options
 * @returns State object with payload, error, and update function
 *
 * @example
 * ```tsx
 * const { payload, error, updateUrl, getShareUrl } = useUrlState({
 *   debounceMs: 300,
 *   onError: (error) => showErrorToast(error),
 * });
 *
 * if (error) return <ErrorMessage error={error} />;
 * if (!payload) return <NewGameSetup />;
 *
 * if (payload.type === 'delta') {
 *   // Handle move delta
 *   applyMove(payload.move);
 * }
 * ```
 */
export function useUrlState(options: UseUrlStateOptions = {}): {
  payload: UrlPayload | null;
  error: string | null;
  isLoading: boolean;
  updateUrl: (payload: UrlPayload) => void;
  updateUrlImmediate: (payload: UrlPayload) => void;
  getShareUrl: () => string;
  copyShareUrl: () => Promise<boolean>;
} {
  const {
    debounceMs = 300,
    onError,
    onUrlUpdated,
    onPayloadReceived,
  } = options;

  // State: Current payload and error
  const [payload, setPayload] = useState<UrlPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs: Latest state for debounced callback (prevents frozen closure)
  const payloadRef = useRef<UrlPayload | null>(payload);
  const debounceTimerRef = useRef<number | null>(null);

  // Keep ref in sync with state (CRITICAL for debounce)
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  /**
   * Parse URL hash on mount.
   *
   * This effect runs ONCE on component mount to load initial state
   * from URL hash fragment. Validates payload with multi-layer pipeline.
   *
   * CRITICAL: Empty dependency array to prevent infinite loops.
   * Callbacks are captured from initial render and won't update.
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#' prefix

    if (!hash) {
      // No hash = new game
      setIsLoading(false);
      return;
    }

    // Decompress and validate payload
    const decoded = decompressPayload(hash);

    if (decoded) {
      setPayload(decoded);
      setError(null);
      onPayloadReceived?.(decoded);
    } else {
      // Validation failed
      const errorMsg = 'Failed to load game from URL - the link may be corrupted';
      setError(errorMsg);
      onError?.(errorMsg);
    }

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run ONCE on mount

  /**
   * Listen for hash changes (back/forward navigation).
   *
   * This effect monitors browser navigation (back/forward buttons)
   * and updates state when hash changes externally.
   *
   * CRITICAL: Empty dependency array prevents exponential listener growth.
   * Callbacks are captured from initial render and won't update.
   */
  useEffect(() => {
    const handleHashChange = (): void => {
      const hash = window.location.hash.slice(1);

      if (!hash) {
        // Hash removed - reset to new game
        setPayload(null);
        setError(null);
        return;
      }

      // Decompress and validate new payload
      const decoded = decompressPayload(hash);

      if (decoded) {
        setPayload(decoded);
        setError(null);
        onPayloadReceived?.(decoded);
      } else {
        const errorMsg = 'Failed to load game from URL';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // CRITICAL: Clean up listener on unmount
    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - listener is stable

  /**
   * Debounced URL update function.
   *
   * Uses useMemo to create stable debounce function that accesses
   * latest state via payloadRef (prevents frozen closure problem).
   *
   * CRITICAL: Uses useRef for latest state access, not closure.
   */
  const debouncedUpdateUrl = useMemo(() => {
    return (newPayload: UrlPayload) => {
      // Clear any existing timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Debounce URL update
      debounceTimerRef.current = window.setTimeout(() => {
        // Use payloadRef.current for latest state, not closure
        const compressed = compressPayload(newPayload);

        if (!compressed) {
          const errorMsg = 'Failed to encode game state to URL';
          setError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        // Update URL with replaceState (NO history pollution)
        const url = new URL(window.location.href);
        url.hash = compressed;
        window.history.replaceState(null, '', url.toString());

        // Update state
        setPayload(newPayload);
        setError(null);

        // Notify success
        onUrlUpdated?.(url.href);

        debounceTimerRef.current = null;
      }, debounceMs);
    };
  }, [debounceMs, onError, onUrlUpdated]);

  /**
   * Cleanup debounce timer on unmount.
   *
   * CRITICAL: Prevents memory leaks and race conditions.
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Get current shareable URL.
   *
   * @returns Current URL with hash fragment
   */
  const getShareUrl = useCallback((): string => {
    return window.location.href;
  }, []);

  /**
   * Force immediate URL update (bypasses debounce).
   *
   * Use this for significant events like game creation or resync.
   *
   * @param newPayload - Payload to encode immediately
   */
  const updateUrlImmediate = useCallback((newPayload: UrlPayload) => {
    // Clear any pending debounced update
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const compressed = compressPayload(newPayload);

    if (!compressed) {
      const errorMsg = 'Failed to encode game state to URL';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const url = new URL(window.location.href);
    url.hash = compressed;
    window.history.replaceState(null, '', url.toString());

    setPayload(newPayload);
    setError(null);
    onUrlUpdated?.(url.href);
  }, [onError, onUrlUpdated]);

  /**
   * Copy share URL to clipboard
   *
   * @returns Promise that resolves to true if copy succeeded
   */
  const copyShareUrl = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch (error) {
      console.error('Failed to copy URL:', error);
      return false;
    }
  }, []);

  return {
    /** Current parsed payload or null if no hash */
    payload,

    /** Current error message or null if no error */
    error,

    /** Loading state (true while parsing initial URL) */
    isLoading,

    /** Update URL with debouncing (300ms default) */
    updateUrl: debouncedUpdateUrl,

    /** Update URL immediately (bypasses debounce) */
    updateUrlImmediate,

    /** Get current shareable URL */
    getShareUrl,

    /** Copy share URL to clipboard */
    copyShareUrl,
  };
}
