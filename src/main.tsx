import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { seedIfEmpty } from './db/seed';
import './styles.css';
import './components.css';
import './live.css';

// First-run seeding of exercises and settings (no-op if already seeded).
seedIfEmpty().catch((err) => console.error('Seeding failed', err));

// Ask the browser to keep our data even when storage is low (reduces the
// chance of iOS clearing it). Fails silently where unsupported.
(async () => {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
})();

// Service worker: precaches the whole app for offline use and auto-updates.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
