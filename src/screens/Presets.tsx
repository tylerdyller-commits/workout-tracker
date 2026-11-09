import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/schema';
import { presetMeta } from '../domain/format';

export default function Presets() {
  const presets = useLiveQuery(() => db.presets.toArray(), []);
  const sorted = (presets ?? []).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="screen">
      <header className="screen-header">
        <div className="titles">
          <h1>Presets</h1>
        </div>
      </header>

      <section className="stack">
        {sorted.map((p) => (
          <Link key={p.id} to={`/presets/${p.id}`} className="card-link">
            <div className="card-text">
              <span className="card-title">{p.name}</span>
              <span className="card-sub">{presetMeta(p)}</span>
            </div>
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="muted"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
        {presets && presets.length === 0 && (
          <p className="placeholder">
            No presets yet. A preset is a saved list of exercises with targets, like “Lower Body
            Strength”.
          </p>
        )}
        <Link to="/presets/new" className="dashed-button accent">
          + New preset
        </Link>
      </section>
    </main>
  );
}
