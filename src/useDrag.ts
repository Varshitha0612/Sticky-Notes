import { useRef, useCallback, useEffect } from 'react';

interface DragCallbacks {
  /** Called once, the instant the mouse button goes down. */
  onStart?: () => void;
  /** Called repeatedly as the mouse moves, with the TOTAL distance moved since onStart. */
  onMove: (deltaX: number, deltaY: number) => void;
  /** Called once when the mouse button is released. */
  onEnd?: () => void;
}

/**
 * useDrag gives you back a single function: `startDrag`.
 * Call `startDrag(mouseDownEvent)` inside an `onMouseDown` handler, and this
 * hook takes care of listening to mousemove/mouseup on the WHOLE window
 * (not just the element) so dragging still works even if the cursor moves
 * faster than the element under it — a common bug with naive drag code.
 */
export function useDrag({ onStart, onMove, onEnd }: DragCallbacks) {
  // Refs (not state) because we need the latest callbacks inside event
  // listeners without re-creating those listeners on every render.
  const callbacksRef = useRef({ onStart, onMove, onEnd });
  callbacksRef.current = { onStart, onMove, onEnd };

  const startPointRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startPointRef.current.x;
    const deltaY = e.clientY - startPointRef.current.y;
    callbacksRef.current.onMove(deltaX, deltaY);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    callbacksRef.current.onEnd?.();
  }, [handleMouseMove]);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      // Prevents accidentally selecting/highlighting text while dragging.
      e.preventDefault();
      e.stopPropagation();

      startPointRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = true;
      callbacksRef.current.onStart?.();

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp]
  );

  // Safety net: if the component unmounts mid-drag, remove leftover listeners.
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return startDrag;
}
