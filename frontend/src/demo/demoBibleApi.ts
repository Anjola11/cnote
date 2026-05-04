/**
 * ============================================
 * DEMO MODULE — Delete this entire folder when
 * connecting the real backend.
 * ============================================
 *
 * Free Bible API integration for demo mode.
 * Uses bible-api.com (no API key required).
 * In production, the backend handles scripture search.
 */

import type { ScriptureVerse } from '../types';
import { DEMO_SCRIPTURES } from './demoData';

const BIBLE_API_BASE = 'https://bible-api.com';

export async function searchBibleApi(query: string): Promise<ScriptureVerse[]> {
  if (!query.trim()) return [];

  // First, try the local hardcoded verses for instant results
  const q = query.toLowerCase();
  const localResults = DEMO_SCRIPTURES.filter(
    v => v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q)
  );

  // Then try the free API for the exact reference
  try {
    const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(query)}?translation=kjv`);
    if (response.ok) {
      const data = await response.json();
      if (data.text && data.reference) {
        const apiVerse: ScriptureVerse = {
          reference: data.reference,
          text: data.text.trim().replace(/\n/g, ' '),
          translation: data.translation_name || 'KJV',
        };
        // Avoid duplicates with local results
        const isDuplicate = localResults.some(
          v => v.reference.toLowerCase() === apiVerse.reference.toLowerCase()
        );
        if (!isDuplicate) {
          return [apiVerse, ...localResults];
        }
      }
    }
  } catch {
    // API failed, fall back to local results only
  }

  return localResults;
}
