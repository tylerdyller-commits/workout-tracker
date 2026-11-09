import { Link } from 'react-router-dom';

export default function Settings() {
  return (
    <main className="screen">
      <header
        className="screen-header"
        style={{ alignItems: 'center', justifyContent: 'flex-start' }}
      >
        <Link to="/" className="icon-button" aria-label="Back to Home">
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1>Settings</h1>
      </header>

      <section className="card row">
        <span>App version</span>
        <span className="muted">{__APP_VERSION__}</span>
      </section>
    </main>
  );
}
