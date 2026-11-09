import { useEffect, type ReactNode } from 'react';

/**
 * A bottom sheet over the whole app (covers the tab bar). Tapping the dimmed
 * backdrop or pressing Escape closes it. `full` makes it nearly full height.
 */
export default function Sheet({
  title,
  onClose,
  children,
  full = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className={full ? 'sheet sheet-full' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{title}</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
