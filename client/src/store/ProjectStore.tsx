import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { buildSeedRecords, TODAY } from '@/data/seed';
import type { AccomplishmentEntry, CostCategory, DailyRecords, VarianceNote } from '@/data/types';

type AccPatch = Partial<Pick<AccomplishmentEntry, 'actual' | 'remarks'>>;
type RecordKind = Exclude<keyof DailyRecords, 'accomplishment'>;
type EntryOf<K extends RecordKind> = DailyRecords[K][number];

interface State {
  records: DailyRecords;
  notes: Partial<Record<CostCategory, VarianceNote>>;
  /** Engineer's estimate-to-complete per category (₱). Null = use default method. */
  etc: Partial<Record<CostCategory, number>>;
  activeDate: string;
}

type Action =
  | { type: 'add'; kind: RecordKind; entry: EntryOf<RecordKind> }
  | { type: 'update'; kind: RecordKind; id: string; patch: Record<string, unknown> }
  | { type: 'remove'; kind: RecordKind; id: string }
  | { type: 'accomplishment'; date: string; activity: string; patch: AccPatch }
  | { type: 'note'; note: VarianceNote }
  | { type: 'etc'; category: CostCategory; value: number | null }
  | { type: 'date'; date: string }
  | { type: 'reset' };

const STORAGE_KEY = 'cardvex.cost-control.v2';

const initial = (): State => ({ records: buildSeedRecords(), notes: {}, etc: {}, activeDate: TODAY });

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initial(), ...JSON.parse(raw) };
  } catch {
    /* storage unavailable — fall back to seed */
  }
  return initial();
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'add':
      return {
        ...s,
        records: { ...s.records, [a.kind]: [...(s.records[a.kind] as EntryOf<RecordKind>[]), a.entry] },
      };
    case 'update':
      return {
        ...s,
        records: {
          ...s.records,
          [a.kind]: (s.records[a.kind] as { id: string }[]).map((e) => (e.id === a.id ? { ...e, ...a.patch } : e)),
        },
      };
    case 'remove':
      return {
        ...s,
        records: {
          ...s.records,
          [a.kind]: (s.records[a.kind] as { id: string }[]).filter((e) => e.id !== a.id),
        },
      };
    case 'accomplishment':
      return {
        ...s,
        records: {
          ...s.records,
          accomplishment: s.records.accomplishment.map((x) =>
            x.date === a.date && x.activity === a.activity ? { ...x, ...a.patch } : x,
          ),
        },
      };
    case 'note':
      return { ...s, notes: { ...s.notes, [a.note.category]: a.note } };
    case 'etc': {
      const etc = { ...s.etc };
      if (a.value === null) delete etc[a.category];
      else etc[a.category] = a.value;
      return { ...s, etc };
    }
    case 'date':
      return { ...s, activeDate: a.date };
    case 'reset':
      return initial();
  }
}

interface Ctx extends State {
  add: <K extends RecordKind>(kind: K, entry: Omit<EntryOf<K>, 'id'>) => void;
  update: (kind: RecordKind, id: string, patch: Record<string, unknown>) => void;
  remove: (kind: RecordKind, id: string) => void;
  setAccomplishment: (date: string, activity: string, patch: AccPatch) => void;
  saveNote: (note: VarianceNote) => void;
  setEtc: (category: CostCategory, value: number | null) => void;
  setDate: (date: string) => void;
  reset: () => void;
}

const ProjectContext = createContext<Ctx | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [state]);

  const add = useCallback(<K extends RecordKind>(kind: K, entry: Omit<EntryOf<K>, 'id'>) => {
    const id = `${kind.slice(0, 2)}-${Date.now().toString(36)}`;
    dispatch({ type: 'add', kind, entry: { ...entry, id } as EntryOf<RecordKind> });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      add,
      update: (kind, id, patch) => dispatch({ type: 'update', kind, id, patch }),
      remove: (kind, id) => dispatch({ type: 'remove', kind, id }),
      setAccomplishment: (date, activity, patch) => dispatch({ type: 'accomplishment', date, activity, patch }),
      saveNote: (note) => dispatch({ type: 'note', note }),
      setEtc: (category, v) => dispatch({ type: 'etc', category, value: v }),
      setDate: (date) => dispatch({ type: 'date', date }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state, add],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>');
  return ctx;
}
