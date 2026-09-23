import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'wide';
  /** Rendered between the header and the scrolling body (e.g. a computed total). */
  banner?: ReactNode;
}

/**
 * Accessible dialog: focus moves in on open and back to the trigger on close,
 * Tab is trapped, Escape and backdrop dismiss, and the page behind cannot scroll.
 */
export function Modal({ title, sub, onClose, children, footer, size = 'md', banner }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Prefer the first form control so typing can start straight away; the close
    // button is only used as a fallback on dialogs with no inputs.
    const field = ref.current?.querySelector<HTMLElement>('input, select, textarea');
    const fallback = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    (field ?? fallback ?? ref.current)?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      returnTo.current?.focus?.();
    };
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return createPortal(
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className={`modal ${size === 'sm' ? 'modal--sm' : size === 'wide' ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="keyline" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="modal__head">
          <div className="modal__titles">
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {sub && <p className="modal__sub">{sub}</p>}
          </div>
          <button type="button" className="btn btn--icon btn--sm btn--ghost" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </div>
        {banner}
        {children}
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Destructive confirmation. The record being deleted is described in the message. */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="modal__body">
        <div className="callout callout--over">
          <AlertTriangle aria-hidden="true" />
          <div>{message}</div>
        </div>
      </div>
    </Modal>
  );
}
