import { createContext, useContext } from 'react';
import type { RestTimer } from '../domain/timer';

export interface RestTimerApi {
  timer: RestTimer | null;
  /** Current time, ticking 4×/s while a rest is running. */
  now: number;
  start: (durationSec: number) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
}

export const RestTimerContext = createContext<RestTimerApi | null>(null);

export function useRestTimer(): RestTimerApi {
  const api = useContext(RestTimerContext);
  if (!api) throw new Error('useRestTimer must be used inside RestTimerProvider');
  return api;
}
