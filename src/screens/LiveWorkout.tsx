import { Link } from 'react-router-dom';

/** Placeholder until Phase 3 builds the live workout. */
export default function LiveWorkout() {
  return (
    <main className="screen">
      <header className="screen-header">
        <div className="titles">
          <h1>Workout</h1>
        </div>
      </header>
      <p className="placeholder">Logging a live workout is coming in the next update.</p>
      <Link to="/" className="secondary-button">
        Back to Home
      </Link>
    </main>
  );
}
