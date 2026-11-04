import { useEffect, useState } from 'react';

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

  // Deep links: #skills/<skill-id> selects a skill and scrolls the section into view.
  useEffect(() => {
    const apply = () => {
      const m = /^skills\/([a-z0-9-]+)$/.exec(decodeURIComponent(location.hash.replace(/^#/, '')));
      const skill = m ? skills.find((s) => s.id === m[1]) : undefined;
      if (!skill) return;
      setSelected(skill.id);
      setGroup('all');
      requestAnimationFrame(() => document.getElementById('skills')?.scrollIntoView({ block: 'start' }));
    };
    apply();
    addEventListener('hashchange', apply);
    return () => removeEventListener('hashchange', apply);
  }, [skills]);

  const pick = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    history.replaceState(null, '', next ? `#skills/${next}` : '#skills');
  };

  const current = skills.find((s) => s.id === selected);
  const visibleGroups = groups.filter((g) => group === 'all' || g.id === group);

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

      {visibleGroups.map((g) => (
        <section key={g.id} className="skill-group" aria-labelledby={`sg-${g.id}`}>
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
                    {s.uses.length > 0 && (
                      <span className="count" aria-label={`, used in ${s.uses.length}`}>
                        {s.uses.length}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <span className="dashed-note">
        Select a skill to see where I have used it. Dashed skills are on my CV but not yet tied to a role or project
        here.
      </span>

      <div className="evidence" aria-live="polite">
        {current ? (
          <>
            <h3>{current.name}</h3>
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
          <p>Nothing selected. Pick a skill above to see the roles and projects that show it in use.</p>
        )}
      </div>
    </div>
  );
}
