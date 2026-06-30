// This file has NO React code in it on purpose.
// It only describes the *shape* of our data, so that every other file
// (storage, components, App) agrees on what a "note" looks like.

/** The colors a note is allowed to have. A plain union of strings. */
export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

/**
 * One sticky note.
 * Position (x, y) is the top-left corner, measured in pixels from the
 * top-left of the board. Width/height are also pixels.
 */
export interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: NoteColor;
  /** Higher zIndex draws on top of lower zIndex. Used for "bring to front". */
  zIndex: number;
}

export const NOTE_COLORS: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple'];

export const MIN_NOTE_WIDTH = 120;
export const MIN_NOTE_HEIGHT = 100;
export const DEFAULT_NOTE_WIDTH = 200;
export const DEFAULT_NOTE_HEIGHT = 180;
