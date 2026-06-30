import { useRef, useState } from 'react';
import type { Note } from './types';
import { MIN_NOTE_WIDTH, MIN_NOTE_HEIGHT } from './types';
import { useDrag } from './useDrag';
import { clamp, type Rect } from './utils';

interface StickyNoteProps {
  note: Note;
  /** Called continuously while dragging/resizing, with the proposed new rect. */
  onUpdateRect: (id: string, rect: Rect) => void;
  /** Called once when a drag finishes — used to check "was this dropped on the trash?" */
  onDragEnd: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onBringToFront: (id: string) => void;
  onColorChange: (id: string, color: Note['color']) => void;
  /** True while this exact note is hovering the trash zone — used for a visual warning. */
  isOverTrash: boolean;
  /** True briefly after this note is selected from the sidebar, to draw the eye to it. */
  isFlashed: boolean;
}

const COLOR_SWATCHES: Note['color'][] = ['yellow', 'pink', 'blue', 'green', 'purple'];

export function StickyNote({
  note,
  onUpdateRect,
  onDragEnd,
  onTextChange,
  onBringToFront,
  onColorChange,
  isOverTrash,
  isFlashed,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // Snapshot of the note's rect taken the instant a drag starts.
  // Must be a ref (not a plain variable) because this component re-renders
  // mid-drag (every onMove updates state), and a plain `let` would reset
  // to the latest note position on each of those re-renders — making the
  // drag math compound errors and feel "out of control".
  const dragStartRectRef = useRef<Rect>({ x: note.x, y: note.y, width: note.width, height: note.height });

  const startMoveDrag = useDrag({
    onStart: () => {
      dragStartRectRef.current = { x: note.x, y: note.y, width: note.width, height: note.height };
      onBringToFront(note.id);
    },
    onMove: (dx, dy) => {
      const start = dragStartRectRef.current;
      onUpdateRect(note.id, {
        ...start,
        x: start.x + dx,
        y: start.y + dy,
      });
    },
    onEnd: () => onDragEnd(note.id),
  });

  const startResizeDrag = useDrag({
    onStart: () => {
      dragStartRectRef.current = { x: note.x, y: note.y, width: note.width, height: note.height };
      onBringToFront(note.id);
    },
    onMove: (dx, dy) => {
      const start = dragStartRectRef.current;
      onUpdateRect(note.id, {
        ...start,
        width: clamp(start.width + dx, MIN_NOTE_WIDTH, 600),
        height: clamp(start.height + dy, MIN_NOTE_HEIGHT, 600),
      });
    },
    // Resizing never deletes a note, so no onEnd needed here.
  });

  return (
    <div
      className={`sticky-note sticky-note--${note.color}${isOverTrash ? ' sticky-note--over-trash' : ''}${isFlashed ? ' sticky-note--flashed' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        zIndex: note.zIndex,
      }}
      onMouseDown={() => onBringToFront(note.id)}
    >
      <div className="sticky-note__header" onMouseDown={startMoveDrag}>
        <button
          className="sticky-note__color-dot"
          style={{ background: 'currentColor' }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setShowPalette((v) => !v)}
          aria-label="Change color"
        />
        {showPalette && (
          <div className="sticky-note__palette" onMouseDown={(e) => e.stopPropagation()}>
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                className={`sticky-note__swatch sticky-note__swatch--${c}`}
                onClick={() => {
                  onColorChange(note.id, c);
                  setShowPalette(false);
                }}
                aria-label={c}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sticky-note__body" onClick={() => setIsEditing(true)}>
        {isEditing ? (
          <textarea
            className="sticky-note__textarea"
            autoFocus
            value={note.text}
            placeholder="Type something..."
            onChange={(e) => onTextChange(note.id, e.target.value)}
            onBlur={() => setIsEditing(false)}
            // Don't let the textarea's own click start a move-drag.
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="sticky-note__text">{note.text || 'Click to edit'}</p>
        )}
      </div>

      <div className="sticky-note__resize-handle" onMouseDown={startResizeDrag} />
    </div>
  );
}
