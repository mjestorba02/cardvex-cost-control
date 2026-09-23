import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { DailyRecords } from '@/data/types';
import { fullDate } from '@/lib/format';
import { useProject } from '@/store/ProjectStore';
import { ConfirmDialog } from '@/components/ui/Modal';
import { FormModal, type FieldSpec, type Values } from './FormModal';

type RecordKind = Exclude<keyof DailyRecords, 'accomplishment'>;

export interface CrudSpec<T> {
  kind: RecordKind;
  /** Singular noun used in dialog titles and confirmations, e.g. "equipment line". */
  noun: string;
  fields: FieldSpec[];
  toValues: (row: T) => Values;
  fromValues: (v: Values) => Record<string, unknown>;
  computed?: (v: Values) => ReactNode;
  computedLabel?: string;
  /** Pre-filled values for a new record (counts, days, current diesel price…). */
  defaults?: Values;
  /** How a row is named in the delete confirmation. */
  describe: (row: T) => string;
}

type Mode<T> = { m: 'add' } | { m: 'edit'; row: T } | { m: 'delete'; row: T } | null;

/**
 * Create / update / delete for one daily record type, all through dialogs.
 * `?new=1` on the URL opens the add dialog, so a sheet can be linked to directly.
 */
export function useRecordCrud<T extends { id: string }>(spec: CrudSpec<T>, date: string) {
  const { add, update, remove } = useProject();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode<T>>(null);

  const wantsNew = params.get('new') === '1';
  useEffect(() => {
    if (wantsNew) setMode({ m: 'add' });
  }, [wantsNew]);

  const close = () => {
    setMode(null);
    if (params.get('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  const AddButton = ({ label }: { label: string }) => (
    <button className="btn btn--accent no-print" onClick={() => setMode({ m: 'add' })}>
      <Plus /> {label}
    </button>
  );

  const RowActions = ({ row }: { row: T }) => (
    <div className="row-actions no-print">
      <button className="btn btn--icon btn--sm" onClick={() => setMode({ m: 'edit', row })} aria-label={`Edit ${spec.describe(row)}`} title="Edit">
        <Pencil />
      </button>
      <button className="btn btn--icon btn--sm" onClick={() => setMode({ m: 'delete', row })} aria-label={`Delete ${spec.describe(row)}`} title="Delete">
        <Trash2 />
      </button>
    </div>
  );

  const blank: Values = Object.fromEntries(spec.fields.map((f) => [f.name, '']));

  const modals = (
    <>
      {mode?.m === 'add' && (
        <FormModal
          title={`Add ${spec.noun}`}
          sub={fullDate(date)}
          fields={spec.fields}
          initial={{ ...blank, ...spec.defaults }}
          computed={spec.computed}
          computedLabel={spec.computedLabel}
          submitLabel="Save entry"
          onSubmit={(v) => add(spec.kind, { date, ...spec.fromValues(v) } as never)}
          onClose={close}
        />
      )}
      {mode?.m === 'edit' && (
        <FormModal
          title={`Edit ${spec.noun}`}
          sub={`${spec.describe(mode.row)} · ${fullDate(date)}`}
          fields={spec.fields}
          initial={spec.toValues(mode.row)}
          computed={spec.computed}
          computedLabel={spec.computedLabel}
          submitLabel="Save changes"
          onSubmit={(v) => update(spec.kind, mode.row.id, spec.fromValues(v))}
          onClose={close}
        />
      )}
      {mode?.m === 'delete' && (
        <ConfirmDialog
          title={`Delete this ${spec.noun}?`}
          message={
            <>
              <strong>{spec.describe(mode.row)}</strong> will be removed from {fullDate(date)} and the day, week and month totals will be recalculated. This
              cannot be undone.
            </>
          }
          onConfirm={() => remove(spec.kind, mode.row.id)}
          onClose={close}
        />
      )}
    </>
  );

  return { AddButton, RowActions, modals, openAdd: () => setMode({ m: 'add' }) };
}
