# Sticky Notes

A single-page sticky-notes app built with React + TypeScript, no UI libraries.

## How to run it

You need [Node.js](https://nodejs.org) (v18 or newer) installed on your computer.

```bash
# 1. Install dependencies (only needed once)
npm install

# 2. Start the app in development mode
npm run dev
```

This prints a local address (usually `http://localhost:5173`). Open it in
Chrome, Firefox, or Edge.

To produce an optimized production build:

```bash
npm run build    # creates a dist/ folder with the final static files
npm run preview  # serves that dist/ folder so you can check it
```

## Features implemented

1. **Create a note** — double-click on empty board space and drag to draw the
   note's exact position and size, then release. (You can also click
   "+ Add note" in the toolbar first to arm the same drawing mode with a
   single click-and-drag, which is easier to discover and doesn't require
   timing a double-click.)
   ![alt text](<Screenshot (25).png>)
2. **Resize a note** — drag the small handle in its bottom-right corner.
   ![alt text](<Screenshot (29).png>)
3. **Move a note** — drag its top header strip.
   
4. **Delete a note** — drag it so its center overlaps the trash circle in the
   bottom-right of the board, then release.
   ![alt text](<Screenshot (26).png>)


Bonus features included:
- **Edit text** — click a note's body to type, click away to stop editing.
- **Bring to front** — clicking/dragging a note always raises it above the others.
   ![alt text](<Screenshot (30).png>)
- **Persistence** — notes are saved automatically and restored when you reload the page.
- **Colors** — click the small dot in a note's header to pick from 5 colors.
   ![alt text](<Screenshot (24).png>)
- **Mocked REST API** — saving/loading goes through async functions (`src/api.ts`)
  that simulate real network latency, so swapping in a real backend later only
  means editing that one file.
- **Notes sidebar** — a collapsible panel (toggle tab on the right edge) lists
  every note with its color and a text preview. Clicking an entry brings that
  note to the front and briefly flashes it. Since the board doesn't pan or
  scroll, a note dragged outside the visible area is otherwise unreachable —
  this panel is what brings it back, snapping its position into view if needed.
  ![alt text](<Screenshot (27).png>)

## Architecture

The app keeps a single source of truth: an array of `Note` objects living in
React state inside `App.tsx` (`{ id, x, y, width, height, text, color, zIndex }`,
defined in `types.ts`). Every visual thing you see — a note's position, size,
color, stacking order — is just a direct read of that data; there's no
separate "DOM state" that could drift out of sync with the model. All
mutations flow one way: a child component (a `StickyNote`) reports "this
happened" through a callback prop, `App` decides how that changes the array,
and React re-renders the affected notes. This unidirectional flow keeps the
logic predictable even though three different gestures (move, resize, delete)
are all happening through the same dragging mechanism.

Dragging itself is implemented once, generically, in the `useDrag` hook
(`useDrag.ts`), rather than being duplicated for "move" and "resize". It
listens for `mousedown` on a small handle, then attaches `mousemove`/`mouseup`
listeners to the whole `window` (not just the element) so a fast mouse motion
never "escapes" the drag. It reports the *total delta* since the drag started,
and each consumer (move vs. resize) decides what to do with that delta —
move adds it to x/y, resize adds it to width/height with clamping to a minimum
size. Creating a note by dragging on the board uses a similar but separate,
simpler drag implementation directly in `App.tsx`, since it starts from empty
board space rather than from an existing note and needs board-relative
coordinates rather than a generic delta; it computes a rectangle live as the
mouse moves (supporting dragging in any of the four directions) and only
commits a real note if the drawn rectangle is larger than a tiny accidental-click
threshold. The primary trigger for this is a double-click-and-drag gesture,
detected manually by comparing timestamps between consecutive `mousedown`
events (the browser's own `dblclick` event only fires on the second
mouse-up, too late to start a drag from); the toolbar button arms the same
underlying drawing function as a more discoverable, single-click alternative.
Trash detection works the same drag-then-decide pattern: while
dragging, `App` checks whether the note's center point falls inside the trash
element's current bounding box (`getBoundingClientRect`), giving live visual
feedback, and makes the final delete decision only once the mouse is released.

Persistence is layered intentionally: `storage.ts` only knows about
`localStorage`; `api.ts` wraps it behind two async functions
(`apiFetchNotes`/`apiSaveNotes`) with an artificial delay, simulating what a
real REST API would feel like; `App.tsx` only ever talks to `api.ts`, debounced
by 400ms so rapid dragging doesn't trigger a save on every pixel. Because
`App` doesn't know or care that the "API" is fake, replacing `api.ts`'s
internals with real `fetch()` calls to a real backend would require no changes
anywhere else in the app — this is the main reason the project is split into
these particular files rather than one large component.

"The application separates UI, business logic, persistence, 
and utilities into independent modules. This keeps components focused on rendering 
while allowing storage or API implementations to be replaced without affecting 
the rest of the application."

## Project structure

```
src/
  types.ts        Data shape for a Note (no React, no logic)
  utils.ts         Small pure helper functions (id, clamp, overlap test)
  storage.ts       localStorage read/write
  api.ts           Mocked async "REST API" (delay + storage)
  useDrag.ts       Reusable mouse-drag tracking hook
  StickyNote.tsx   One note: rendering + its own move/resize/edit/color UI
  TrashZone.tsx    The delete drop-target, purely visual
  App.tsx          Owns the notes array; wires everything together
  main.tsx         Mounts <App /> into index.html
  styles.css       All visual styling
```
