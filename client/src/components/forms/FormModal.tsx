import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export interface FieldSpec {
  name: string;
  label: string;
  kind?: 'text' | 'number' | 'select' | 'textarea';
  options?: readonly string[];
  placeholder?: string;
  hint?: ReactNode;
  min?: number;
  step?: number;
  /** Span the full width of the field grid */
  full?: boolean;
  /** Blank is allowed (defaults to required) */
  optional?: boolean;
}

export type Values = Record<string, string>;

export const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? NaN : Number(v));

function validate(fields: FieldSpec[], values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = (values[f.name] ?? '').trim();
    if (f.optional) {
      if (raw === '') continue;
    } else if (raw === '') {
      errors[f.name] = 'Required';
      continue;
    }
    if (f.kind === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) errors[f.name] = 'Enter a number';
      else if (n < (f.min ?? 0)) errors[f.name] = `Cannot be below ${f.min ?? 0}`;
    }
  }
  return errors;
}

interface Props {
  title: string;
  sub?: ReactNode;
  fields: FieldSpec[];
  initial: Values;
  /** Live-computed figure shown above the actions, e.g. the line's cost. */
  computed?: (values: Values) => ReactNode;
  computedLabel?: string;
  submitLabel?: string;
  onSubmit: (values: Values) => void;
  onClose: () => void;
}

/**
 * One dialog for both create and edit: the caller supplies the field spec and
 * the mapping to/from a record, so every sheet validates and looks the same.
 */
export function FormModal({
  title,
  sub,
  fields,
  initial,
  computed,
  computedLabel = 'Computed cost',
  submitLabel = 'Save entry',
  onSubmit,
  onClose,
}: Props) {
  const [values, setValues] = useState<Values>(initial);
  const [touched, setTouched] = useState(false);
  const gid = useId();
  const errors = useMemo(() => validate(fields, values), [fields, values]);
  const invalid = Object.keys(errors).length > 0;

  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) {
      const firstBad = fields.find((f) => errors[f.name]);
      if (firstBad) document.getElementById(`${gid}-${firstBad.name}`)?.focus();
      return;
    }
    onSubmit(values);
    onClose();
  };

  return (
    <Modal
      title={title}
      sub={sub}
      onClose={onClose}
      footer={
        <>
          {touched && invalid && (
            <span className="modal__error" role="alert">
              Check the highlighted fields
            </span>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={gid} className="btn btn--accent">
            <Check /> {submitLabel}
          </button>
        </>
      }
    >
      <form className="modal__body" id={gid} onSubmit={submit} noValidate>
        <div className="form-grid">
          {fields.map((f) => {
            const id = `${gid}-${f.name}`;
            const err = touched ? errors[f.name] : undefined;
            const common = {
              id,
              value: values[f.name] ?? '',
              'aria-invalid': err ? (true as const) : undefined,
              'aria-describedby': err ? `${id}-err` : f.hint ? `${id}-hint` : undefined,
            };
            return (
              <div className="field" key={f.name} style={f.full ? { gridColumn: '1 / -1' } : undefined}>
                <label htmlFor={id}>
                  {f.label}
                  {f.optional && <span className="muted"> · optional</span>}
                </label>
                {f.kind === 'select' ? (
                  <select {...common} className="select" onChange={(e) => set(f.name, e.target.value)}>
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.kind === 'textarea' ? (
                  <textarea {...common} className="textarea" placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                ) : (
                  <input
                    {...common}
                    className={`input ${f.kind === 'number' ? 'input--num' : ''}`}
                    type={f.kind === 'number' ? 'number' : 'text'}
                    inputMode={f.kind === 'number' ? 'decimal' : undefined}
                    step={f.step}
                    min={f.min ?? (f.kind === 'number' ? 0 : undefined)}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
                {err ? (
                  <span className="modal__error" id={`${id}-err`}>
                    {err}
                  </span>
                ) : (
                  f.hint && (
                    <span className="hint" id={`${id}-hint`}>
                      {f.hint}
                    </span>
                  )
                )}
              </div>
            );
          })}
        </div>
        {computed && (
          <div className="modal__computed" aria-live="polite">
            <span className="eyebrow">{computedLabel}</span>
            {computed(values)}
          </div>
        )}
      </form>
    </Modal>
  );
}
