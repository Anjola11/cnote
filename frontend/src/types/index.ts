export type Category = 'programming' | 'spiritual' | 'general';
export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
export type Theme = 'light' | 'dark';

export interface EntryCard {
  id: string;
  title: string;
  category: Category;
  excerpt: string;
  updated_at: string;
}

export interface Entry extends EntryCard {
  content: object; // Tiptap JSON doc
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ScriptureVerse {
  reference: string;
  text: string;
  translation: string;
}
