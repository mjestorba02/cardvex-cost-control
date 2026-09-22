import type { ReactNode } from 'react';

interface PanelProps {
  title: ReactNode;
  sub?: ReactNode;
  refNo?: string;
  actions?: ReactNode;
  flush?: boolean;
  foot?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Panel({ title, sub, refNo, actions, flush, foot, children, className, id }: PanelProps) {
  const headingId = id ? `${id}-h` : undefined;
  return (
    <section className={`panel ${className ?? ''}`} aria-labelledby={headingId} id={id}>
      <div className="panel__head">
        {refNo && <span className="panel__ref">{refNo}</span>}
        <div className="panel__titles">
          <h2 className="panel__title" id={headingId}>
            {title}
          </h2>
          {sub && <p className="panel__sub">{sub}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
      <div className={flush ? 'panel__body panel__body--flush' : 'panel__body'}>{children}</div>
      {foot && <div className="panel__foot">{foot}</div>}
    </section>
  );
}
