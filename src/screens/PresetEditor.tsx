import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/schema';
import {
  createPreset,
  deletePreset,
  duplicatePreset,
  moveItem,
  newPresetItem,
  updatePreset,
} from '../db/queries';
import { formatDuration, targetSummary } from '../domain/format';
import { DEFAULT_SETTINGS, type Exercise, type Preset, type PresetItem } from '../domain/types';
import ExercisePicker from '../components/ExercisePicker';
import PresetItemEditor from '../components/PresetItemEditor';
import Sheet from '../components/Sheet';
import TypeBadge from '../components/TypeBadge';

const DEFAULT_NAME = 'Untitled preset';

/**
 * Edits a preset. Every change is saved to the database right away. For
 * /presets/new nothing is stored until the first real change (a name or an
 * exercise), so backing out of an untouched new preset leaves nothing behind.
 */
export default function PresetEditor() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const isNew = routeId === 'new';

  // undefined = loading (or a new, unsaved preset); null = not found
  const preset = useLiveQuery(async (): Promise<Preset | null | undefined> => {
    if (isNew || !routeId) return undefined;
    return (await db.presets.get(routeId)) ?? null;
  }, [routeId, isNew]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const defaultRest = settings?.defaultRestSec ?? DEFAULT_SETTINGS.defaultRestSec;

  const exById = useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e] as const)),
    [exercises],
  );

  // The editor works on a local copy (so taps and typing apply instantly, even
  // in quick succession) and writes every change to the database, in order.
  const [name, setName] = useState('');
  const [items, setItems] = useState<PresetItem[]>([]);
  const itemsRef = useRef<PresetItem[]>([]);
  const nameRef = useRef('');
  const loadedFor = useRef<string | null>(null);
  const savedId = useRef<string | null>(isNew ? null : (routeId ?? null));
  useEffect(() => {
    if (preset && loadedFor.current !== preset.id) {
      loadedFor.current = preset.id;
      savedId.current = preset.id;
      nameRef.current = preset.name;
      itemsRef.current = preset.items;
      setName(preset.name);
      setItems(preset.items);
    }
  }, [preset]);

  const [picking, setPicking] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Serializes writes; for /presets/new the first write creates the record.
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());
  const persist = () => {
    writeQueue.current = writeQueue.current
      .then(async () => {
        const changes = { name: nameRef.current.trim() || DEFAULT_NAME, items: itemsRef.current };
        if (savedId.current) {
          await updatePreset(savedId.current, changes);
        } else {
          const p = await createPreset(changes.name);
          savedId.current = p.id;
          loadedFor.current = p.id; // keep the local copy; don't reload it
          await updatePreset(p.id, changes);
          navigate(`/presets/${p.id}`, { replace: true });
        }
      })
      .catch((err) => console.error('Saving preset failed', err));
  };

  const saveName = (value: string) => {
    nameRef.current = value;
    setName(value);
    setNameError(false);
    // an untouched new preset isn't stored until it has a name or an exercise
    if (!savedId.current && !value.trim() && itemsRef.current.length === 0) return;
    persist();
  };

  const updateItems = (fn: (prev: PresetItem[]) => PresetItem[]) => {
    itemsRef.current = fn(itemsRef.current);
    setItems(itemsRef.current);
    persist();
  };

  const patchItem = (id: string, patch: Partial<PresetItem>) =>
    updateItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next: PresetItem = { ...it, ...patch };
        for (const k of Object.keys(patch) as (keyof PresetItem)[]) {
          if (patch[k] === undefined) delete next[k];
        }
        return next;
      }),
    );

  const addExercise = (ex: Exercise) => {
    setPicking(false);
    const item = newPresetItem(ex);
    updateItems((prev) => [...prev, item]);
    setEditingItemId(item.id);
  };

  const onSave = () => {
    if (!isNew && !name.trim()) {
      setNameError(true);
      return;
    }
    navigate('/presets');
  };

  if (preset === null) {
    return (
      <main className="screen">
        <p className="placeholder">This preset no longer exists.</p>
        <Link to="/presets" className="secondary-button">
          Back to presets
        </Link>
      </main>
    );
  }

  const editingItem = items.find((i) => i.id === editingItemId);
  const editingEx = editingItem && exById.get(editingItem.exerciseId);

  return (
    <main className="screen editor">
      <header className="editor-header">
        <Link to="/presets" className="back-link">
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
          Presets
        </Link>
        <div className="editor-actions">
          {!isNew && (
            <button
              type="button"
              className="icon-button"
              aria-label="More: duplicate or delete preset"
              onClick={() => setMenuOpen(true)}
            >
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          )}
          <button type="button" className="primary-button pill" onClick={onSave}>
            Save
          </button>
        </div>
      </header>

      <label className="field">
        <span className="field-label">Preset name</span>
        <input
          className="text-input name-input"
          value={name}
          placeholder="e.g. Lower Body Strength"
          aria-invalid={nameError}
          onChange={(e) => saveName(e.target.value)}
        />
        {nameError && (
          <span className="error" role="alert">
            Give the preset a name.
          </span>
        )}
      </label>

      <div className="row-between">
        <h2 className="section-title">
          {items.length} {items.length === 1 ? 'exercise' : 'exercises'}
        </h2>
        <span className="muted small">Default rest {formatDuration(defaultRest)}</span>
      </div>

      <ol className="item-list">
        {items.map((item, i) => {
          const ex = exById.get(item.exerciseId);
          return (
            <li key={item.id} className="item-row">
              <button
                type="button"
                className="item-main"
                onClick={() => setEditingItemId(item.id)}
                aria-label={`Edit targets for ${ex?.name ?? 'exercise'}`}
              >
                <span className="item-title">
                  <span className="item-name">{ex?.name ?? 'Unknown exercise'}</span>
                  {ex && <TypeBadge type={ex.type} />}
                </span>
                <span className="item-sub">{ex ? targetSummary(item, ex) : ''}</span>
              </button>
              <button
                type="button"
                className="move-btn"
                aria-label={`Move ${ex?.name ?? 'exercise'} up`}
                disabled={i === 0}
                onClick={() => updateItems((prev) => moveItem(prev, i, -1))}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="move-btn"
                aria-label={`Move ${ex?.name ?? 'exercise'} down`}
                disabled={i === items.length - 1}
                onClick={() => updateItems((prev) => moveItem(prev, i, 1))}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>
      {items.length === 0 && (
        <p className="muted small center">
          Add exercises in the order you do them. Tap one to set its targets.
        </p>
      )}

      <button type="button" className="dashed-button accent" onClick={() => setPicking(true)}>
        + Add exercise
      </button>

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}

      {editingItem && editingEx && (
        <PresetItemEditor
          item={editingItem}
          exercise={editingEx}
          defaultRestSec={defaultRest}
          onPatch={(patch) => patchItem(editingItem.id, patch)}
          onRemove={() => {
            setEditingItemId(null);
            updateItems((prev) => prev.filter((it) => it.id !== editingItem.id));
          }}
          onClose={() => setEditingItemId(null)}
        />
      )}

      {menuOpen && preset && (
        <Sheet title={preset.name} onClose={() => setMenuOpen(false)}>
          <button
            type="button"
            className="secondary-button full"
            onClick={async () => {
              await writeQueue.current; // include any change still being saved
              const copy = await duplicatePreset(preset.id);
              setMenuOpen(false);
              navigate(`/presets/${copy.id}`);
            }}
          >
            Duplicate preset
          </button>
          <button
            type="button"
            className="secondary-button full"
            onClick={async () => {
              if (!window.confirm(`Delete “${preset.name}”? Your past workouts are kept.`)) return;
              await deletePreset(preset.id);
              navigate('/presets', { replace: true });
            }}
          >
            Delete preset
          </button>
        </Sheet>
      )}
    </main>
  );
}
