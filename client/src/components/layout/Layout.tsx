import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, RotateCcw, Sun, X } from 'lucide-react';
import { contract, TODAY, CURRENT_WEEK } from '@/data/seed';
import { DAILY_CATEGORIES, type CostCategory } from '@/data/types';
import { severity, variancePct } from '@/lib/calc';
import { fullDate } from '@/lib/format';
import { useMetrics } from '@/lib/metrics';
import { GROUPS, SHEETS, sheetByPath } from '@/lib/sheets';
import { useProject } from '@/store/ProjectStore';
import { Mark } from '../ui/Mark';

type Theme = 'light' | 'dark';

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('cardvex.theme') as Theme | null;
      if (saved) return saved;
    } catch {
      /* no storage */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('cardvex.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

export function Layout() {
  const { pathname } = useLocation();
  const sheet = sheetByPath(pathname);
  const [open, setOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const { reset } = useProject();
  const m = useMetrics();

  useEffect(() => {
    setOpen(false);
    document.title = `${sheet.no} ${sheet.nav} · CARDVEX Cost Control`;
    window.scrollTo({ top: 0 });
  }, [pathname, sheet]);

  // Flag daily sheets whose week-to-date variance is significant
  const flags: Record<string, 'over' | 'watch' | undefined> = {};
  DAILY_CATEGORIES.forEach((c: CostCategory) => {
    const s = severity(variancePct(m.weekTotals[c], m.weekBudget[c]));
    if (s === 'over' || s === 'watch') flags[`/daily/${c}`] = s;
  });
  if (m.forecastVariance < 0) flags['/forecast'] = 'over';

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside className="sidebar" data-open={open} aria-label="Sheet index">
        <div className="row" style={{ justifyContent: 'space-between', paddingRight: 8 }}>
          <Link to="/" className="brand">
            <Mark className="brand__mark" />
            <div>
              <div className="brand__name">CARDVEX</div>
              <div className="brand__sub">Cost Control · {contract.contractNo}</div>
            </div>
          </Link>
          {open && (
            <button className="btn btn--icon btn--ghost" onClick={() => setOpen(false)} aria-label="Close menu">
              <X />
            </button>
          )}
        </div>

        <nav className="sheet-nav">
          {GROUPS.map((g) => (
            <div className="sheet-group" key={g.id}>
              <div className="sheet-group__head">
                <span className="eyebrow">{g.label}</span>
                <span className="sheet-group__cadence">{g.cadence}</span>
              </div>
              {SHEETS.filter((s) => s.group === g.id).map((s) => (
                <NavLink key={s.path} to={s.path} end className="sheet-link">
                  <span className="sheet-link__no">{s.no}</span>
                  <span>{s.nav}</span>
                  {flags[s.path] ? (
                    <span
                      className={`sheet-link__flag sheet-link__flag--${flags[s.path]}`}
                      role="img"
                      aria-label={flags[s.path] === 'over' ? 'Over budget' : 'Watch'}
                      title={flags[s.path] === 'over' ? 'Over budget' : 'Watch'}
                    />
                  ) : (
                    <span />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="principle" aria-label="Key principle">
            <div>
              <b>Record</b>
              <span>daily</span>
            </div>
            <div>
              <b>Analyze</b>
              <span>weekly</span>
            </div>
            <div>
              <b>Control</b>
              <span>monthly</span>
            </div>
          </div>
          <div className="sidebar__tools">
            <button className="btn btn--sm" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun /> : <Moon />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                if (window.confirm('Reset all records to the sample data? Entries you added will be removed.')) reset();
              }}
            >
              <RotateCcw />
              Reset data
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="btn btn--icon" onClick={() => setOpen(true)} aria-label="Open sheet index" aria-expanded={open}>
            <Menu />
          </button>
          <Mark className="brand__mark" />
          <span className="brand__name">CARDVEX</span>
          <span className="spacer" />
          <span className="mono small muted">
            Sheet {sheet.no}/16
          </span>
        </div>

        <header className="titleblock">
          <div className="titleblock__title">
            <div className="titleblock__crumb">
              <span className="eyebrow">{GROUPS.find((g) => g.id === sheet.group)?.label}</span>
            </div>
            <h1>{sheet.title}</h1>
            <p className="titleblock__desc">{sheet.description}</p>
          </div>
          <div className="titleblock__cells">
            <div className="tb-cell">
              <span className="eyebrow">Project</span>
              <span className="tb-cell__v">{contract.projectName}</span>
            </div>
            <div className="tb-cell">
              <span className="eyebrow">Contract no.</span>
              <span className="tb-cell__v">{contract.contractNo}</span>
            </div>
            <div className="tb-cell">
              <span className="eyebrow">Report date · {CURRENT_WEEK}</span>
              <span className="tb-cell__v">{fullDate(TODAY)}</span>
            </div>
            <div className="tb-cell tb-cell--sheet">
              <span className="eyebrow">Sheet</span>
              <span className="tb-cell__v">
                {sheet.no} <em>/ 16</em>
              </span>
            </div>
          </div>
        </header>

        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
