import type { Note } from './types';

const STORAGE_KEY = 'sticky-notes:v1';

/** Reads notes saved from a previous visit. Returns [] if nothing is saved or data is corrupt. */
export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If the saved data is corrupted/unreadable, start fresh instead of crashing the app.
    return [];
  }
}

/** Saves the current list of notes so they survive a page reload. */
export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage might be full or disabled (e.g. private browsing) — fail silently.
  }
}
