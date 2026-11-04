/**
 * Architecture diagrams for the three featured projects.
 *
 * Every box is a fact from docs/master-cv.md (quoted in the comment next to it). The diagrams show what each
 * project contains and how the CV groups it. They deliberately draw no arrows between components, because the
 * CV does not say how data flows between them: inventing flows would be inventing claims.
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
  /** Spoken description for screen readers. */
  desc: string;
  caption: string;
  groups: DiagramGroup[];
  /** Optional dashed link between two groups (by index), used only where the CV states a relationship. */
  link?: { from: number; to: number; label: string };
}

export const diagrams: Diagram[] = [
  {
    id: 'learnthrive-platform',
    title: 'What the LearnThrive platform covers',
    desc: 'Three groups. Surfaces: public website, tutor area, client area, student area and a browser-based real-time classroom. Features: scheduling and calendar workflows, lessons and attendance, lesson reports, notifications, authentication and sessions, role-based permissions. Structure: domain layer, repository layer, npm workspace monorepo.',
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
    title: 'How Cirquon is organised',
    desc: 'Three groups. Commands in cogs: reminders, polls, moderation, AFK, utility commands and quotes. Services and storage: HTTP clients for external APIs, caching, background workers for scheduled tasks, per-server guild configuration and persistent storage. Operations: error handling, health endpoints and diagnostic endpoints.',
    caption: 'Components named in my CV, grouped the way it describes them. No data flow is implied.',
    groups: [
      {
        label: 'Commands, in cogs',
        tone: 'cyan',
        items: ['Reminders', 'Polls', 'Moderation', 'AFK', 'Utility commands', 'Quotes'],
      },
      {
        label: 'Services and storage',
        items: [
          'HTTP clients for external APIs', // "external APIs through HTTP clients with caching"
          'Caching',
          'Background workers', // "background workers for scheduled tasks"
          'Per-server (guild) configuration',
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
    desc: 'Two devices. A Raspberry Pi console with retro gaming, media, a local AI voice assistant and database-backed functionality with structured data. A laptop that hosts the dashboard, which is streamed. The project was integrated across hardware and software, tested, evaluated and documented.',
    caption: 'Taken from my CV. The dashed line marks the streamed, laptop-hosted dashboard.',
    groups: [
      {
        label: 'Raspberry Pi console',
        tone: 'cyan',
        items: ['Retro gaming', 'Media', 'Local AI voice assistant', 'Database-backed functionality'],
      },
      {
        label: 'Laptop',
        tone: 'violet',
        items: ['Hosts the dashboard'],
      },
      {
        label: 'Process',
        items: ['Hardware and software integrated', 'Tested and evaluated', 'Documented'],
      },
    ],
    link: { from: 0, to: 1, label: 'streamed dashboard' },
  },
];
