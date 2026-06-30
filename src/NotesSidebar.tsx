import type { Note } from './types';

interface NotesSidebarProps {
  notes: Note[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectNote: (id: string) => void;
}

/** Shortens a note's text to a short one-line preview for the list. */
function previewText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Empty note';
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

/**
 * A collapsible panel listing every note on the board. The board has no
 * panning or scrolling, so a note dragged outside the visible area would
 * otherwise be impossible to find again — clicking an entry here brings
 * that note back into view (see `focusNote` in App.tsx).
 */
export function NotesSidebar({ notes, isOpen, onToggle, onSelectNote }: NotesSidebarProps) {
  // Newest-first feels more useful than creation order when scanning a long list.
  const sorted = [...notes].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <button className="sidebar__toggle" onClick={onToggle} aria-label="Toggle notes list">
        <span className="sidebar__toggle-arrow">{isOpen ? '▸' : '◂'}</span>
        <span className="sidebar__toggle-label">{notes.length} note{notes.length === 1 ? '' : 's'}</span>
      </button>

      {isOpen && (
        <div className="sidebar__panel">
          <h2 className="sidebar__title">All notes ({notes.length})</h2>
          {notes.length === 0 ? (
            <p className="sidebar__empty">No notes yet. Double-click the board to create one.</p>
          ) : (
            <ul className="sidebar__list">
              {sorted.map((note) => (
                <li key={note.id}>
                  <button className="sidebar__item" onClick={() => onSelectNote(note.id)}>
                    <span className={`sidebar__swatch sidebar__swatch--${note.color}`} />
                    <span className="sidebar__preview">{previewText(note.text)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
