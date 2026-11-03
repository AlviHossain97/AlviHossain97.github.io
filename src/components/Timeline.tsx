import { useEffect, useMemo, useState } from 'react';

export type Kind = 'work' | 'education' | 'project';
type Filter = 'all' | 'work' | 'education' | 'projects';

export interface TimelineEntry {
  id: string;
  kind: Kind;
  kindLabel: string;
  title: string;
  org: string;
  period?: string | undefined;
  current: boolean;
  summary: string;
  highlights: string[];
  tags: { label: string; skillId?: string | undefined }[];
  links: { label: string; href: string }[];
  hasCaseStudy: boolean;
}

interface Props {
  dated: TimelineEntry[];
  undated: TimelineEntry[];
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'work', label: 'Work' },
  { id: 'education', label: 'Education' },
  { id: 'projects', label: 'Projects' },
];
const FILTER_IDS = new Set<string>(FILTERS.map((f) => f.id));

const matches = (f: Filter, e: TimelineEntry) => f === 'all' || (f === 'projects' ? e.kind === 'project' : e.kind === f);
const hasDetail = (e: TimelineEntry) => e.highlights.length > 0 || e.tags.length > 0 || e.links.length > 0 || e.hasCaseStudy;

function Chevron() {
  return (
    <svg className="icon tl-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Item({ e, open, onToggle }: { e: TimelineEntry; open: boolean; onToggle: (id: string) => void }) {
  const panelId = `panel-${e.id}`;
  const btnId = `btn-${e.id}`;
  const expandable = hasDetail(e);
  const head = (
    <>
      <span className="tl-title">
        <span className="tl-kind">{e.kindLabel}</span>
        {e.title}
      </span>
      {e.period && <span className="tl-period mono">{e.period}</span>}
      {e.org && <span className="tl-org">{e.org}</span>}
    </>
  );
  return (
    <li id={e.id} className="tl-item" data-kind={e.kind} data-current={e.current}>
      <span className="tl-marker" aria-hidden="true" />
      <h3 style={{ font: 'inherit', letterSpacing: 'inherit' }}>
        {expandable ? (
          <button
            type="button"
            id={btnId}
            className="tl-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onToggle(e.id)}
          >
            {head}
            <Chevron />
          </button>
        ) : (
          <span className="tl-toggle tl-static">{head}</span>
        )}
      </h3>
      <p className="tl-summary">{e.summary}</p>
      {expandable && (
        <div className="panel" id={panelId} role="region" aria-labelledby={btnId} data-open={open}>
          <div className="panel-inner" inert={!open}>
            <div className="panel-content">
              {e.highlights.length > 0 && (
                <ul className="bullets">
                  {e.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
              {e.tags.length > 0 && (
                <ul className="tags" aria-label="Skills and tools">
                  {e.tags.map((t) => (
                    <li key={t.label}>
                      {t.skillId ? (
                        <a className="tag" href={`#skills/${t.skillId}`}>
                          {t.label}
                        </a>
                      ) : (
                        <span className="tag">{t.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {(e.hasCaseStudy || e.links.length > 0) && (
                <div className="link-row">
                  {e.hasCaseStudy && (
                    <a className="text-link" href={`#case-${e.id}`}>
                      Read the case study
                    </a>
                  )}
                  {e.links.map((l) => (
                    <a key={l.href} className="text-link" href={l.href}>
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Timeline({ dated, undated }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const all = useMemo(() => [...dated, ...undated], [dated, undated]);

  // Deep links: #timeline/<filter> sets the filter; #<entry-id> expands and scrolls to that entry.
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(location.hash.replace(/^#/, ''));
      const m = /^timeline\/(\w+)$/.exec(h);
      if (m && FILTER_IDS.has(m[1] ?? '')) {
        setFilter(m[1] as Filter);
        return;
      }
      const entry = all.find((x) => x.id === h);
      if (!entry) return;
      setFilter((f) => (matches(f, entry) ? f : 'all'));
      if (hasDetail(entry)) setOpen((o) => new Set(o).add(entry.id));
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(entry.id)?.scrollIntoView({ block: 'start' })));
    };
    apply();
    addEventListener('hashchange', apply);
    return () => removeEventListener('hashchange', apply);
  }, [all]);

  const choose = (f: Filter) => {
    setFilter(f);
    history.replaceState(null, '', f === 'all' ? '#timeline' : `#timeline/${f}`);
  };
  const toggle = (id: string) => {
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        history.replaceState(null, '', `#${id}`);
      }
      return next;
    });
  };

  const shownDated = dated.filter((e) => matches(filter, e));
  const shownUndated = undated.filter((e) => matches(filter, e));
  const counts = (f: Filter) => all.filter((e) => matches(f, e)).length;
  const total = shownDated.length + shownUndated.length;

  return (
    <div>
      <div className="filters" role="group" aria-label="Filter the timeline">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="filter-btn" aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
            {f.label} <span className="count">{counts(f.id)}</span>
          </button>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        Showing {total} {total === 1 ? 'entry' : 'entries'}: {FILTERS.find((f) => f.id === filter)?.label}.
      </p>
      {shownDated.length > 0 && (
        <ol className="tl-list" aria-label="Timeline, newest first">
          {shownDated.map((e) => (
            <Item key={e.id} e={e} open={open.has(e.id)} onToggle={toggle} />
          ))}
        </ol>
      )}
      {shownUndated.length > 0 && (
        <>
          <h3 className="tl-sub">Undated projects</h3>
          <ol className="tl-list" aria-label="Undated projects">
            {shownUndated.map((e) => (
              <Item key={e.id} e={e} open={open.has(e.id)} onToggle={toggle} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
