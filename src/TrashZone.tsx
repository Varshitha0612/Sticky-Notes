interface TrashZoneProps {
  isActive: boolean;
}

/** A fixed visual zone in the corner of the board. Notes dropped here get deleted. */
export function TrashZone({ isActive }: TrashZoneProps) {
  return (
    <div id="trash-zone" className={`trash-zone${isActive ? ' trash-zone--active' : ''}`}>
      <span className="trash-zone__icon">🗑</span>
      <span className="trash-zone__label">Drop to delete</span>
    </div>
  );
}
