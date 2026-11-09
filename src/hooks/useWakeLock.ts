import { useEffect } from 'react';

/**
 * Keeps the screen on while the component is mounted (Screen Wake Lock API).
 * iOS drops the lock when the app is hidden, so it is re-requested when the
 * app comes back. Fails silently where unsupported.
 */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) void l.release().catch(() => {});
        else lock = l;
      } catch {
        // ignore (unsupported, low battery mode, etc.)
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}
