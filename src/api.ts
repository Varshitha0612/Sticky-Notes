import type { Note } from './types';
import { loadNotes, saveNotes } from './storage';

// This file PRETENDS to be a real backend server.
// In a real app, these functions would use `fetch()` to call an actual API.
// Here we just delay artificially and read/write localStorage instead,
// so the rest of the app doesn't need to know or care that it's fake.

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simulates: GET /api/notes */
export async function apiFetchNotes(): Promise<Note[]> {
  await delay(300);
  return loadNotes();
}

/** Simulates: PUT /api/notes (replace the whole collection) */
export async function apiSaveNotes(notes: Note[]): Promise<void> {
  await delay(150);
  saveNotes(notes);
}
