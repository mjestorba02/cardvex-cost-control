import type { CSSProperties, ReactNode } from 'react';

export function Readout({ children, cols }: { children: ReactNode; cols?: number }) {
  return (
    <div className="readout" style={{ '--cols': cols } as CSSProperties}>
      {children}
    </div>
  );
}

interface CellProps {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  hero?: boolean;
  title?: string;
}

export function ReadoutCell({ label, value, meta, hero, title }: CellProps) {
  return (
    <div className="readout__cell">
      <span className="eyebrow">{label}</span>
      <span className={hero ? 'readout__v readout__v--hero' : 'readout__v'} title={title}>
        {value}
      </span>
      {meta && <span className="readout__meta">{meta}</span>}
    </div>
  );
}

export function Band({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="band" aria-label={label}>
      <div className="band__label">
        <h2>{label}</h2>
        {note && <span className="small muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}
