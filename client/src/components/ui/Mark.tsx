export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="var(--ink)" />
      <path d="M7 23V9h6M19 9h6v14h-6" stroke="var(--accent-mark)" strokeWidth="3" fill="none" />
      <path d="M13 16h6" stroke="var(--surface)" strokeWidth="3" />
    </svg>
  );
}
