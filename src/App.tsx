import { useEffect, useRef, useState, useCallback } from 'react';
import type { Note, NoteColor } from './types';
import { MIN_NOTE_WIDTH, MIN_NOTE_HEIGHT, NOTE_COLORS } from './types';
import { generateId, centerIsInside, clamp, type Rect } from './utils';
import { apiFetchNotes, apiSaveNotes } from './api';
import { StickyNote } from './StickyNote';
import { TrashZone } from './TrashZone';
import { NotesSidebar } from './NotesSidebar';

// A "ref" to the trash element's on-screen box, refreshed on demand,
// is how we detect overlap — see `getTrashRect` below.
function getTrashRect(): Rect | null {
  const el = document.getElementById('trash-zone');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

let nextColorIndex = 0;
function pickNextColor(): NoteColor {
  const color = NOTE_COLORS[nextColorIndex % NOTE_COLORS.length];
  nextColorIndex += 1;
  return color;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // "Create mode": true while the user is actively drawing a new note,
  // either via double-click-and-drag on the board, or via the toolbar
  // button (kept as a more discoverable, accessible alternative).
  // `drawRect` is the live preview rectangle shown while dragging.
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [drawRect, setDrawRect] = useState<Rect | null>(null);
  const currentRectRef = useRef<Rect | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Tracks the timestamp of the last plain mousedown on empty board space,
  // so a second mousedown arriving quickly afterward can be recognized as
  // "the start of a double-click" — without waiting for the browser's own
  // `dblclick` event, which only fires on mouseUP and would be too late to
  // start a drag from. The window is generous (500ms) because trackpad taps
  // tend to land slightly further apart in time than a physical mouse click.
  const lastBoardMouseDownRef = useRef(0);
  const DOUBLE_CLICK_THRESHOLD_MS = 500;

  // Sidebar: lists every note so one can be found and focused even if it
  // was dragged outside the visible board (the board has no panning/scroll,
  // so this is the only way to recover a note that went off-screen).
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [flashedNoteId, setFlashedNoteId] = useState<string | null>(null);
  const maxZIndexRef = useRef(0);

  // --- Load notes once when the app first mounts (bonus: REST API + localStorage) ---
  useEffect(() => {
    apiFetchNotes().then((loaded) => {
      setNotes(loaded);
      maxZIndexRef.current = loaded.reduce((max, n) => Math.max(max, n.zIndex), 0);
      setIsLoaded(true);
    });
  }, []);

  // --- Persist notes whenever they change, but only after the initial load ---
  // A short debounce avoids spamming "save" on every pixel of mouse movement.
  useEffect(() => {
    if (!isLoaded) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      apiSaveNotes(notes).then(() => setSaveStatus('saved'));
    }, 400);
    return () => clearTimeout(timer);
  }, [notes, isLoaded]);

  const bringToFront = useCallback((id: string) => {
    maxZIndexRef.current += 1;
    const newZ = maxZIndexRef.current;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n)));
  }, []);

  const updateRect = useCallback((id: string, rect: Rect) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x: rect.x, y: rect.y, width: rect.width, height: rect.height } : n))
    );
    setDraggingNoteId(id);

    // Live-check trash overlap so the note can visually react WHILE dragging.
    const trashRect = getTrashRect();
    setIsOverTrash(trashRect ? centerIsInside(rect, trashRect) : false);
  }, []);

  const handleDragEnd = useCallback(
    (id: string) => {
      const trashRect = getTrashRect();
      const note = notes.find((n) => n.id === id);
      if (note && trashRect && centerIsInside(note, trashRect)) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
      setDraggingNoteId(null);
      setIsOverTrash(false);
    },
    [notes]
  );

  const handleTextChange = useCallback((id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  }, []);

  const handleColorChange = useCallback((id: string, color: NoteColor) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
  }, []);

  // --- Sidebar: focus a note (used when clicking an entry in the list) ---
  // If the note is currently outside the visible board area (the board has
  // no scrolling, so a note dragged far enough is otherwise unreachable),
  // its position is pulled back inside the bounds. Either way, it's also
  // brought to front and briefly flashed so the eye finds it immediately.
  const focusNote = useCallback(
    (id: string) => {
      const board = boardRef.current;
      const note = notes.find((n) => n.id === id);
      if (!board || !note) return;

      const boardBox = board.getBoundingClientRect();
      const margin = 12;
      const maxX = Math.max(margin, boardBox.width - note.width - margin);
      const maxY = Math.max(margin, boardBox.height - note.height - margin);
      const isOffScreen =
        note.x < margin || note.y < margin || note.x > maxX || note.y > maxY;

      if (isOffScreen) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, x: clamp(n.x, margin, maxX), y: clamp(n.y, margin, maxY) } : n
          )
        );
      }

      bringToFront(id);
      setFlashedNoteId(id);
      window.setTimeout(() => {
        setFlashedNoteId((current) => (current === id ? null : current));
      }, 1200);
    },
    [notes, bringToFront]
  );

  // --- Click-and-drag note creation ---
  // This is a separate, simpler drag implementation from useDrag.ts, because
  // it starts from the BOARD (empty space) rather than from an existing note,
  // and it needs board-relative coordinates instead of a generic pixel delta.

  /** Begins drawing a new note's rectangle, starting from the given mouse event. */
  const beginDrawingNote = useCallback((e: React.MouseEvent) => {
    const board = boardRef.current;
    if (!board) return;
    const boardBox = board.getBoundingClientRect();
    const startX = e.clientX - boardBox.left;
    const startY = e.clientY - boardBox.top;

    setIsCreateMode(true);
    const initialRect: Rect = { x: startX, y: startY, width: 0, height: 0 };
    currentRectRef.current = initialRect;
    setDrawRect(initialRect);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX - boardBox.left;
      const currentY = moveEvent.clientY - boardBox.top;

      // Support dragging in any direction (left/up as well as right/down)
      // by always taking the top-left corner as the smaller of the two x's/y's.
      const rect: Rect = {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      };
      currentRectRef.current = rect;
      setDrawRect(rect);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const finalRect = currentRectRef.current;
      setDrawRect(null);
      setIsCreateMode(false);

      // Ignore accidental clicks/tiny drags — require a deliberate drag
      // of at least a few pixels before creating a real note.
      if (finalRect && finalRect.width > 8 && finalRect.height > 8) {
        maxZIndexRef.current += 1;
        const newNote: Note = {
          id: generateId(),
          x: finalRect.x,
          y: finalRect.y,
          width: clamp(finalRect.width, MIN_NOTE_WIDTH, 800),
          height: clamp(finalRect.height, MIN_NOTE_HEIGHT, 800),
          text: '',
          color: pickNextColor(),
          zIndex: maxZIndexRef.current,
        };
        setNotes((prev) => [...prev, newNote]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  /**
   * Handles every mousedown on the board. Two ways to start drawing a note:
   * 1. The toolbar button already armed `isCreateMode` — any mousedown starts drawing.
   * 2. This mousedown arrived soon after a previous one — recognized as the
   *    start of a double-click — starts drawing immediately, rather than
   *    waiting for the browser's `dblclick` (which fires too late to drag from).
   */
  const handleBoardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only react to clicks that began on the empty board itself,
      // not on a note or the trash zone sitting on top of it.
      if (e.target !== boardRef.current) return;

      if (isCreateMode) {
        beginDrawingNote(e);
        return;
      }

      const now = Date.now();
      const isDoubleClick = now - lastBoardMouseDownRef.current < DOUBLE_CLICK_THRESHOLD_MS;
      lastBoardMouseDownRef.current = isDoubleClick ? 0 : now;

      if (isDoubleClick) {
        beginDrawingNote(e);
      }
    },
    [isCreateMode, beginDrawingNote]
  );

  /**
   * Safety net: some trackpads/devices fire mousedown events with enough
   * jitter (timing or target) that the manual detection above can miss a
   * double-click. The browser's native `dblclick` event is 100% reliable
   * regardless of input device, but fires too late to start a drag from —
   * so instead of dragging immediately, this just arms create mode, the
   * same as clicking the toolbar button, letting the very next click-drag
   * (with no further double-clicking needed) draw the note.
   */
  const handleBoardDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== boardRef.current) return;
      if (!isCreateMode) setIsCreateMode(true);
    },
    [isCreateMode]
  );

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar__title">Sticky Notes</h1>
        <button
          className={`toolbar__add-button${isCreateMode ? ' toolbar__add-button--active' : ''}`}
          onClick={() => setIsCreateMode((v) => !v)}
        >
          {isCreateMode ? 'Click and drag on the board…' : '+ Add note'}
        </button>
        <span className="toolbar__hint">or double-click and drag on the board</span>
        <span className="toolbar__status">{saveStatus === 'saving' ? 'Saving…' : 'Saved'}</span>
      </header>

      <div className="app__body">
        <main
          ref={boardRef}
          className={`board${isCreateMode ? ' board--create-mode' : ''}`}
          onMouseDown={handleBoardMouseDown}
          onDoubleClick={handleBoardDoubleClick}
        >
          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              onUpdateRect={updateRect}
              onDragEnd={handleDragEnd}
              onTextChange={handleTextChange}
              onBringToFront={bringToFront}
              onColorChange={handleColorChange}
              isOverTrash={isOverTrash && draggingNoteId === note.id}
              isFlashed={flashedNoteId === note.id}
            />
          ))}

          {drawRect && (
            <div
              className="draw-preview"
              style={{
                left: drawRect.x,
                top: drawRect.y,
                width: drawRect.width,
                height: drawRect.height,
              }}
            />
          )}

          <TrashZone isActive={isOverTrash} />
        </main>

        <NotesSidebar
          notes={notes}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((v) => !v)}
          onSelectNote={focusNote}
        />
      </div>
    </div>
  );
}
