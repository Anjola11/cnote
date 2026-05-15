export type Category = 'programming' | 'spiritual' | 'general';

export const CATEGORY_OPTIONS: { value: Category; icon: string; title: string; sub: string }[] = [
  { value: 'general', icon: 'fa-solid fa-feather', title: 'General', sub: 'Thought, ideas, or quick memos.' },
  { value: 'programming', icon: 'fa-solid fa-code', title: 'Programming', sub: 'Code snippets, logic, or docs.' },
  { value: 'spiritual', icon: 'fa-solid fa-book-bible', title: 'Spiritual', sub: 'Scriptures, prayers, or insights.' },
];
export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
export type Theme = 'light' | 'dark';

export interface NoteListItem {
  id: string;
  title: string;
  category: Category;
  content_text: string;
  word_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note extends NoteListItem {
  content: object; // Tiptap JSON doc
  share_token?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface User {
  uid: string;
  email: string;
  username: string;
  is_verified?: boolean;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

export interface ScriptureVerse {
  reference: string;
  text: string;
  translation: string;
}
