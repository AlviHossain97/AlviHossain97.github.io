import { z } from 'zod';

/**
 * Schema for src/data/cv.ts. The site, the PDF and the JSON-LD all read the validated result,
 * so a mistake here fails the build instead of shipping.
 *
 * Contact rule: the only external links allowed are email, LinkedIn and GitHub (profile or repos).
 */
const ALLOWED_LINK =
  /^(mailto:alvi997@outlook\.com|https:\/\/(www\.)?linkedin\.com\/in\/alvihossain\/?|https:\/\/github\.com\/AlviHossain97(\/[\w.-]+)?\/?)$/;

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case id');

export const LinkSchema = z.strictObject({
  label: z.string().min(1),
  href: z
    .string()
    .regex(ALLOWED_LINK, 'only email, linkedin.com/in/alvihossain and github.com/AlviHossain97 links are allowed'),
});

export const SkillGroupSchema = z.strictObject({
  id,
  label: z.string().min(1),
});

export const SkillSchema = z.strictObject({
  id,
  name: z.string().min(1),
  group: id,
});

export const CaseStudySchema = z.strictObject({
  what: z.string().min(1),
  role: z.string().min(1),
  outcome: z.string().min(1),
});

export const EntrySchema = z.strictObject({
  id,
  kind: z.enum(['work', 'education', 'project']),
  title: z.string().min(1),
  /** Employer, institution or context. Optional for projects with no stated context. */
  org: z.string().optional(),
  place: z.string().optional(),
  /** Human-readable period exactly as it should appear. Omitted when the CV gives no dates. */
  period: z.string().optional(),
  /** YYYYMM used only to order the timeline (newest first). Never displayed. Omit when the CV gives no dates: the entry is listed after the dated ones. */
  sort: z.number().int().min(200001).max(209912).optional(),
  current: z.boolean().default(false),
  summary: z.string().min(1),
  highlights: z.array(z.string().min(1)).default([]),
  /** Skill ids evidenced by this entry. Drives the Skills <-> entry cross-links. */
  skills: z.array(id).default([]),
  /** Extra tech tags that are not in the skills list. */
  extraTech: z.array(z.string().min(1)).default([]),
  featured: z.boolean().default(false),
  caseStudy: CaseStudySchema.optional(),
  /** Education only: collapsed by default in the UI. */
  modules: z.array(z.string().min(1)).default([]),
  links: z.array(LinkSchema).default([]),
});

export const CvSchema = z
  .strictObject({
    site: z.strictObject({
      url: z.url(),
      title: z.string(),
      description: z.string(),
      pdfFile: z.string().regex(/\.pdf$/),
    }),
    person: z.strictObject({
      name: z.string(),
      headline: z.string(),
      location: z.string(),
      availability: z.string(),
      workAuthorisation: z.string(),
      profile: z.string(),
      positioning: z.array(z.string()).min(1),
    }),
    contact: z.strictObject({
      email: z.email(),
      linkedin: LinkSchema,
      github: LinkSchema,
    }),
    skillGroups: z.array(SkillGroupSchema).min(1),
    skills: z.array(SkillSchema).min(1),
    entries: z.array(EntrySchema).min(1),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((cv, ctx) => {
    const groupIds = new Set(cv.skillGroups.map((g) => g.id));
    const skillIds = new Set(cv.skills.map((s) => s.id));
    const entryIds = new Set<string>();
    if (skillIds.size !== cv.skills.length) ctx.addIssue({ code: 'custom', message: 'duplicate skill id' });
    for (const s of cv.skills) {
      if (!groupIds.has(s.group)) ctx.addIssue({ code: 'custom', message: `skill ${s.id}: unknown group ${s.group}` });
    }
    for (const e of cv.entries) {
      if (entryIds.has(e.id)) ctx.addIssue({ code: 'custom', message: `duplicate entry id ${e.id}` });
      entryIds.add(e.id);
      for (const sk of e.skills) {
        if (!skillIds.has(sk)) ctx.addIssue({ code: 'custom', message: `entry ${e.id}: unknown skill ${sk}` });
      }
    }
  });

export type Cv = z.infer<typeof CvSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type EntryKind = Entry['kind'];
