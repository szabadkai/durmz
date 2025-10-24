// URL-based pattern sharing with base64 encoding

import { Pattern } from '../types/pattern';

/**
 * Encode a pattern to a URL-safe base64 string
 */
export function encodePatternToURL(pattern: Pattern): string {
  try {
    // Create a simplified version (remove unnecessary data)
    const simplified = {
      n: pattern.name,
      b: pattern.bpm,
      s: pattern.swing,
      st: pattern.steps,
      t: pattern.tracks.map(track => ({
        n: track.name,
        t: track.synthType,
        v: track.volume,
        m: track.mute,
        so: track.solo,
        p: track.synthParams,
        s: track.steps.map(step => ({
          a: step.active,
          v: step.velocity,
          pr: step.probability,
          mt: step.microTiming,
          pm: step.parameters
        }))
      }))
    };

    const json = JSON.stringify(simplified);
    const encoded = btoa(json);
    return encoded;
  } catch (error) {
    console.error('Failed to encode pattern:', error);
    throw new Error('Failed to encode pattern for sharing');
  }
}

/**
 * Decode a pattern from a URL-safe base64 string
 */
export function decodePatternFromURL(encoded: string): Partial<Pattern> {
  try {
    const json = atob(encoded);
    const simplified = JSON.parse(json);

    // Reconstruct the full pattern
    return {
      name: simplified.n,
      bpm: simplified.b,
      swing: simplified.s,
      steps: simplified.st,
      tracks: simplified.t.map((t: any, i: number) => ({
        id: String(i),
        name: t.n,
        synthType: t.t,
        volume: t.v,
        mute: t.m,
        solo: t.so,
        synthParams: t.p,
        steps: t.s.map((s: any) => ({
          active: s.a,
          velocity: s.v,
          probability: s.pr,
          microTiming: s.mt,
          parameters: s.pm
        }))
      }))
    };
  } catch (error) {
    console.error('Failed to decode pattern:', error);
    throw new Error('Invalid pattern URL');
  }
}

/**
 * Get shareable URL for current pattern
 */
export function getShareableURL(pattern: Pattern): string {
  const encoded = encodePatternToURL(pattern);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#pattern=${encoded}`;
}

/**
 * Load pattern from URL hash if present
 */
export function loadPatternFromURL(): Partial<Pattern> | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#pattern=')) return null;

  const encoded = hash.substring(9); // Remove '#pattern='
  try {
    return decodePatternFromURL(encoded);
  } catch (error) {
    console.error('Failed to load pattern from URL:', error);
    return null;
  }
}

/**
 * Clear pattern from URL hash
 */
export function clearPatternFromURL(): void {
  window.history.replaceState(null, '', window.location.pathname);
}
