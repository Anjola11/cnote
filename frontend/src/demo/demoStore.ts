/**
 * ============================================
 * DEMO MODULE — Delete this entire folder when
 * connecting the real backend.
 * ============================================
 *
 * In-memory CRUD store for demo mode.
 * All mutations persist for the session only.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Entry, EntryCard, Category, ScriptureVerse } from '../types';
import { DEMO_ENTRIES, DEMO_SCRIPTURES } from './demoData';

// Deep clone to avoid mutation of original data
let entries: Entry[] = JSON.parse(JSON.stringify(DEMO_ENTRIES));

// Simulate network delay
function delay(ms = 400): Promise<void> {
  const jitter = Math.random() * 300;
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

export function resetDemoStore() {
  entries = JSON.parse(JSON.stringify(DEMO_ENTRIES));
}

export async function getEntries(category?: Category): Promise<EntryCard[]> {
  await delay(300);
  let filtered = entries;
  if (category) {
    filtered = entries.filter(e => e.category === category);
  }
  // Sort by updated_at descending
  filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return filtered.map(({ id, title, category, excerpt, updated_at }) => ({
    id, title, category, excerpt, updated_at,
  }));
}

export async function getEntry(id: string): Promise<Entry> {
  await delay(250);
  const entry = entries.find(e => e.id === id);
  if (!entry) throw new Error('Entry not found');
  return JSON.parse(JSON.stringify(entry));
}

export async function createEntry(category: Category): Promise<Entry> {
  await delay(350);
  const now = new Date().toISOString();
  const newEntry: Entry = {
    id: uuidv4(),
    title: 'Untitled',
    category,
    excerpt: '',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    created_at: now,
    updated_at: now,
  };
  entries.unshift(newEntry);
  return JSON.parse(JSON.stringify(newEntry));
}

export async function patchEntry(id: string, data: Partial<Entry>): Promise<Entry> {
  await delay(300);
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Entry not found');

  entries[idx] = {
    ...entries[idx],
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Auto-generate excerpt from content if content was updated
  if (data.content) {
    const content = data.content as any;
    if (content.content) {
      const texts: string[] = [];
      const extractText = (node: any) => {
        if (node.text) texts.push(node.text);
        if (node.content) node.content.forEach(extractText);
      };
      content.content.forEach(extractText);
      entries[idx].excerpt = texts.join(' ').slice(0, 180) + '...';
    }
  }

  return JSON.parse(JSON.stringify(entries[idx]));
}

export async function deleteEntry(id: string): Promise<void> {
  await delay(200);
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Entry not found');
  entries.splice(idx, 1);
}

export async function searchScripture(query: string): Promise<ScriptureVerse[]> {
  await delay(200);
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return DEMO_SCRIPTURES.filter(
    v => v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q)
  );
}
