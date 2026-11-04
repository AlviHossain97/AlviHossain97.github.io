import { useEffect, useState } from 'react';
import { readHash } from '../lib/hash';

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

export default function Skills({ groups, skills }: Props) {
  const [group, setGroup] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);

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

  // Deep links: #skills/<skill-id> selects a skill. Skill tags elsewhere on the page also route here on click,
  // so they keep working when the hash is already that value, and focus moves to the result.
  useEffect(() => {
    const fromHash = () => {
      const m = /^skills\/([a-z0-9-]+)$/.exec(readHash());
      const skill = m ? skills.find((s) => s.id === m[1]) : undefined;
      if (skill) select(skill.id, false);
    };
    fromHash();
    addEventListener('hashchange', fromHash);
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.('a[href^="#skills/"]');
      const id = a?.getAttribute('href')?.slice('#skills/'.length) ?? '';
      if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || !skills.some((s) => s.id === id)) return;
      ev.preventDefault();
      history.replaceState(null, '', `#skills/${id}`);
      select(id, true);
    };
    document.addEventListener('click', onClick);
    return () => {
      removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', onClick);
    };
  }, [skills]);

  const pick = (id: string) => {
    setSelected(selected === id ? null : id);
  };

  const current = skills.find((s) => s.id === selected);
  const visibleGroups = groups.filter((g) => group === 'all' || g.id === group);
  const visibleCount = skills.filter((s) => visibleGroups.some((g) => g.id === s.group)).length;

  return (
    <div>
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

      <div className="evidence" aria-live="polite">
        {current ? (
          <>
            <h3 id="skill-evidence-title" tabIndex={-1}>
              {current.name}
            </h3>
            {current.uses.length > 0 ? (
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
            ) : (
              <p>Listed among my skills. No role or project on this site is linked to it yet.</p>
            )}
          </>
        ) : (
          <p>Select a skill to see where I have used it.</p>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Showing {visibleCount} skills.
      </p>

      {visibleGroups.map((g) => (
        <div key={g.id} className="skill-group" role="group" aria-labelledby={`sg-${g.id}`}>
          <h3 id={`sg-${g.id}`}>{g.label}</h3>
          <ul className="skill-list">
            {skills
              .filter((s) => s.group === g.id)
              .map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="skill-btn"
                    aria-pressed={selected === s.id}
                    data-unlinked={s.uses.length === 0}
                    onClick={() => pick(s.id)}
                  >
                    {s.name}
                    {s.uses.length === 0 && <span className="sr-only">, not linked yet</span>}
                    {s.uses.length > 0 && (
                      <span className="count">
                        {s.uses.length}
                        <span className="sr-only"> linked entries</span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <span className="dashed-note">Dashed skills are on my CV but not yet tied to a role or project here.</span>
    </div>
  );
}
