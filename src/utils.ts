/** Generates a reasonably-unique id without needing any external library. */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Keeps `value` between `min` and `max`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Returns true if the *center* of `rect` falls inside `target`. */
export function centerIsInside(rect: Rect, target: Rect): boolean {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return (
    centerX >= target.x &&
    centerX <= target.x + target.width &&
    centerY >= target.y &&
    centerY <= target.y + target.height
  );
}
