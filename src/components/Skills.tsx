import { useEffect, useRef, useState } from 'react';
import { readHash } from '../lib/hash';
import { reveal } from '../lib/motion';

interface Use {
  id: string;
  title: string;
  kindLabel: string;
  org: string;
  period?: string | undefined;
}
interface SkillItem {
  id: string;
  name: string;
  group: string;
  uses: Use[];
}
interface Props {
  groups: { id: string; label: string }[];
  skills: SkillItem[];
}

const PREFIX = 'skill-';

export default function Skills({ groups, skills }: Props) {
  const [group, setGroup] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const linked = (id: string) => skills.some((s) => s.id === id && s.uses.length > 0);

  const select = (id: string, focus: boolean) => {
    setSelected(id);
    setGroup('all');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById('skill-evidence-title');
        el?.scrollIntoView({ block: 'center' });
        if (focus) el?.focus({ preventScroll: true });
      }),
    );
  };

  // Deep links: #skill-<id> is the id of that skill's own element, so it always resolves.
  // Skill tags elsewhere on the page link here too; clicking one selects the skill and moves focus to the evidence.
  useEffect(() => {
    const fromHash = () => {
      const h = readHash();
      if (h.startsWith(PREFIX) && linked(h.slice(PREFIX.length))) select(h.slice(PREFIX.length), false);
    };
    fromHash();
    addEventListener('hashchange', fromHash);
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.(`a[href^="#${PREFIX}"]`);
      const id = a?.getAttribute('href')?.slice(PREFIX.length + 1) ?? '';
      if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || !linked(id)) return;
      ev.preventDefault();
      history.replaceState(null, '', `#${PREFIX}${id}`);
      select(id, true);
    };
    document.addEventListener('click', onClick);
    return () => {
      removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', onClick);
    };
  }, [skills]);

  useEffect(() => {
    if (root.current) reveal(root.current.querySelectorAll('.skill-group'));
  }, [group]);

  // Picking a skill shows its evidence above the groups; on a small screen that may be off screen, so bring it
  // into view (without moving focus) when it is not already visible.
  const pick = (id: string) => {
    setSelected(selected === id ? null : id);
    if (selected === id) return;
    requestAnimationFrame(() => {
      const el = document.getElementById('skill-evidence');
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  };

  const current = skills.find((s) => s.id === selected);
  const visibleGroups = groups.filter((g) => group === 'all' || g.id === group);
  const visibleCount = skills.filter((s) => visibleGroups.some((g) => g.id === s.group)).length;

  return (
    <div ref={root}>
      <div className="filters" role="group" aria-label="Filter skills by group">
        {[{ id: 'all', label: 'All' }, ...groups].map((g) => (
          <button
            key={g.id}
            type="button"
            className="filter-btn"
            aria-pressed={group === g.id}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="evidence" id="skill-evidence">
        {current ? (
          <>
            <h3 id="skill-evidence-title" tabIndex={-1}>
              {current.name}
            </h3>
            <ul>
              {current.uses.map((u) => (
                <li key={u.id}>
                  <a href={`#${u.id}`}>
                    <span className="ev-title">{u.title}</span>
                    <span className="ev-meta mono">
                      {u.kindLabel}
                      {u.org ? ` · ${u.org}` : ''}
                      {u.period ? ` · ${u.period}` : ''}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Select a skill to see where I have used it.</p>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {current
          ? `${current.name}: ${current.uses.length} linked ${current.uses.length === 1 ? 'entry' : 'entries'}, listed below the filters.`
          : `Showing ${visibleCount} skills.`}
      </p>

      {visibleGroups.map((g) => (
        <div key={g.id} className="skill-group" role="group" aria-labelledby={`sg-${g.id}`}>
          <h3 id={`sg-${g.id}`}>{g.label}</h3>
          <ul className="skill-list">
            {skills
              .filter((s) => s.group === g.id)
              .map((s) => (
                <li key={s.id}>
                  {s.uses.length > 0 ? (
                    <button
                      type="button"
                      id={`${PREFIX}${s.id}`}
                      className="skill-btn"
                      aria-pressed={selected === s.id}
                      aria-controls="skill-evidence"
                      onClick={() => pick(s.id)}
                    >
                      {s.name}
                      <span className="count">
                        {s.uses.length}
                        <span className="sr-only"> linked entries</span>
                      </span>
                    </button>
                  ) : (
                    <span id={`${PREFIX}${s.id}`} className="skill-chip">
                      {s.name}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
