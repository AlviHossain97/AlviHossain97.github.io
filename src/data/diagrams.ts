/**
 * Architecture diagrams for the three featured projects.
 *
 * Every box is a fact from docs/master-cv.md (quoted in the comment next to it). The diagrams show what each
 * project contains. Where the CV lists things together without saying how they relate, the diagram keeps them in
 * a neutral group ("Features", "Also in the project") rather than inventing a structure, and it draws no arrows,
 * because the CV does not say how data flows between components.
 */
export interface DiagramGroup {
  label: string;
  tone?: 'cyan' | 'violet';
  items: string[];
}
export interface Diagram {
  /** Entry id this diagram belongs to. */
  id: string;
  title: string;
  caption: string;
  groups: DiagramGroup[];
  /** Optional dashed link between two groups (by index), used only where the CV states a relationship. */
  link?: { from: number; to: number; label: string };
}

export const diagrams: Diagram[] = [
  {
    id: 'learnthrive-platform',
    title: 'What the LearnThrive platform covers',
    caption: 'Taken from my CV. Boxes group related parts; they are not a deployment or data-flow diagram.',
    groups: [
      {
        label: 'Surfaces',
        tone: 'cyan',
        items: [
          'Public website', // "public website"
          'Tutor area', // "authenticated tutor, client and student areas"
          'Client area',
          'Student area',
          'Real-time classroom', // "browser-based real-time classroom"
        ],
      },
      {
        label: 'Features',
        items: [
          'Scheduling and calendar', // "scheduling and calendar workflows"
          'Lessons and attendance',
          'Lesson reports',
          'Notifications',
          'Authentication and sessions',
          'Role-based permissions',
        ],
      },
      {
        label: 'Structure',
        tone: 'violet',
        items: [
          'Domain layer', // "domain and repository layers"
          'Repository layer',
          'npm workspace (monorepo)',
        ],
      },
    ],
  },
  {
    id: 'cirquon',
    title: 'What Cirquon includes',
    caption: 'Components named in my CV. The CV lists them together, so no structure or data flow is implied.',
    groups: [
      {
        label: 'Features',
        tone: 'cyan',
        items: [
          'Reminders', // "reminders, polls, moderation, AFK and utility commands, quotes"
          'Polls',
          'Moderation',
          'AFK commands',
          'Utility commands',
          'Quotes',
          'Per-server (guild) configuration',
        ],
      },
      {
        label: 'Under the hood',
        items: [
          'Commands organised in cogs', // "commands organised in cogs and a service-oriented design"
          'Service-oriented design',
          'HTTP clients for external APIs', // "external APIs through HTTP clients with caching"
          'Caching',
          'Background workers', // "background workers for scheduled tasks"
          'Persistent storage',
        ],
      },
      {
        label: 'Operations',
        tone: 'violet',
        items: ['Error handling', 'Health endpoints', 'Diagnostic endpoints'],
      },
    ],
  },
  {
    id: 'pistation',
    title: 'What PiStation is made of',
    caption: 'Taken from my CV. The dashed line marks the streamed, laptop-hosted dashboard.',
    groups: [
      {
        label: 'Raspberry Pi console',
        tone: 'cyan',
        items: ['Retro gaming', 'Media', 'Local AI voice assistant'],
      },
      {
        label: 'Laptop',
        tone: 'violet',
        items: ['Hosts the dashboard'],
      },
      {
        label: 'Also in the project',
        items: [
          'Database-backed functionality', // "database-backed functionality and structured data"
          'Structured data',
          'Hardware and software integrated',
          'Tested and evaluated',
          'Documented',
        ],
      },
    ],
    link: { from: 0, to: 1, label: 'streamed dashboard' },
  },
];

/** Spoken description, generated from the groups so it cannot drift from what is drawn. */
export const describe = (d: Diagram): string =>
  `${d.title}. ${d.groups.map((g) => `${g.label}: ${g.items.join(', ')}.`).join(' ')}`;
