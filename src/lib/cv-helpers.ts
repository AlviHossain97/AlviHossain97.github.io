import { cv } from '../data/cv';
import type { Entry, EntryKind } from '../data/schema';

export const KIND_LABEL: Record<EntryKind, string> = { work: 'Work', education: 'Education', project: 'Project' };

export interface Tag {
  label: string;
  /** Present when the tag is a listed skill, so it can link to the Skills section. */
  skillId?: string;
}

const skillName = new Map(cv.skills.map((s) => [s.id, s.name]));

export const tagsFor = (e: Entry): Tag[] => [
  ...e.skills.map((id) => ({ label: skillName.get(id) ?? id, skillId: id })),
  ...e.extraTech.map((label) => ({ label })),
];

/** Entries newest-first. Undated entries (no `sort`) follow the dated ones in source order. */
export const timelineOrder = (entries: Entry[]): { dated: Entry[]; undated: Entry[] } => {
  const dated = entries.filter((e) => e.sort !== undefined).sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0));
  return { dated, undated: entries.filter((e) => e.sort === undefined) };
};

export const entriesUsing = (skillId: string): Entry[] => cv.entries.filter((e) => e.skills.includes(skillId));

/** Display line for an entry's employer/context and place. */
export const orgLine = (e: Entry): string => [e.org, e.place].filter(Boolean).join(', ');

/** Strip the scheme for display: https://github.com/x -> github.com/x */
export const displayUrl = (href: string): string => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
