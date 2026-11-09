import { TYPE_LABELS, type ExerciseType } from '../domain/types';

/** Neutral type label. Deliberately not color-coded. */
export default function TypeBadge({ type }: { type: ExerciseType }) {
  return <span className="badge">{TYPE_LABELS[type]}</span>;
}
