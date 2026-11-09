# alvihossain97.github.io

Personal CV website for Alvi Hossain. A static [Astro](https://astro.build) site deployed to GitHub Pages at <https://alvihossain97.github.io>.

No analytics, no cookies, no third-party requests (enforced by a test). Fonts (Geist, Geist Mono) are self-hosted.

## Architecture

```
src/data/cv.ts        the CV: single source of truth, validated with zod at build time
src/data/schema.ts    zod schema (also enforces the contact-link allow-list)
src/lib/cv-helpers.ts ordering, tags, skill <-> entry links
src/data/diagrams.ts  architecture diagrams for the three featured projects (facts only)
src/pages/            index, cv (print-styled CV, noindex), 404, og-card (build-only helper, removed from dist)
src/components/       Astro components; React islands: Timeline.tsx, Skills.tsx, PageField.tsx (lazy WebGL, fixed behind the page)
src/lib/motion.ts     the one motion switch: reveals, counters, spotlight, magnetic buttons, pause
src/styles/           tokens.css (colour/type/space tokens, both themes), global.css, print.css
scripts/postbuild.mjs generates the PDF and the social image from the built site
scripts/check-privacy.mjs privacy + content guard (pre-commit, CI, history scan)
tests/e2e/            Playwright + axe
```

One data file feeds everything:

| Output                                                     | How it is made                                                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page content (hero, timeline, projects, skills, education) | Astro components read `cv`                                                                                                                                                     |
| JSON-LD `Person`                                           | built from `cv` in `Base.astro`                                                                                                                                                |
| `dist/Alvi-Hossain-CV.pdf`                                 | `postbuild.mjs` prints the `/cv/` page with headless Chromium, so the PDF, `Ctrl+P` on `/cv/` and the on-screen sheet share one layout. The build fails if it exceeds 2 pages. |
| `dist/og.png`                                              | `postbuild.mjs` screenshots `/og-card/` (then deletes it from `dist`)                                                                                                          |

React is used only where interactivity needs it (timeline filters/expand/deep links, skills filter, the page background). Everything else is static HTML with native `<details>` for case-study detail and module lists.

### 3D and motion

- The animated background behind the whole page is ThreeUI Community's "Stream Convergence Background" (MIT, see `THIRD_PARTY_NOTICES.md`): one WebGL canvas drawn by a small fragment shader, with no `three.js`. It makes no network request of its own and uses no iframe.
- **Not every ThreeUI component is like that.** Many (for example "Topo Field") render a sandboxed iframe that loads Tailwind, iconify, GSAP and fonts from public CDNs. Those would break the "no third-party requests" rule, so they are not used. A test fails if the page makes any cross-origin request or adds an iframe.
- The field is a fixed layer behind every section. It is full strength behind the hero and settles to 40% as you scroll (`--field-o`, set from the scroll position), and a fixed left-to-right scrim keeps text contrast independent of it. Tests sample the real pixels behind body text at several scroll positions in both themes.
- The **Pause animation** button is fixed to the corner of the viewport so it is reachable from anywhere.
- First paint is a static CSS poster. The field is a separate chunk (size is checked by `npm run check:budget`), requested only after the `load` event and an idle moment, then faded in.
- It never starts for reduced motion, `Save-Data`, no WebGL, or low-power touch devices, and it is unmounted when the tab is hidden or the visitor presses **Pause animation** (kept across visits).
- Reveals, counters, the scroll-drawn timeline rail, spotlight tiles and magnetic buttons all read one switch (`src/lib/motion.ts`, mirrored as `<html data-motion>`), so reduced motion is fully static.
- `npm run check:budget` fails CI if the lazy chunk exceeds 10 KB or the other JavaScript exceeds 90 KB (gzip).

### Deep links

| Hash                                                          | Effect                                   |
| ------------------------------------------------------------- | ---------------------------------------- |
| `#timeline/work`, `#timeline/education`, `#timeline/projects` | set the timeline filter                  |
| `#cirquon`, `#learnthrive-rd`, any entry `id`                 | expand and scroll to that timeline entry |
| `#case-pistation`                                             | open that project case study             |
| `#skill-python`                                               | select a skill and list where it is used |

Every in-page link resolves to a real element id (a test enforces it).

## Updating the CV

1. Edit `src/data/cv.ts`. Only add facts that are in your master CV (`docs/master-cv.md`).
2. Skill links: each entry lists skill ids in `skills`; the Skills section and tags are derived from that. Add a skill to `skills` first.
3. Undated projects: omit `sort` (and `period`) and the entry is listed under "Undated projects".
4. `npm run build` validates the data. A bad edit (unknown skill id, a link that is not email, LinkedIn or GitHub) fails the build with a message.

Contact links are restricted to email, `linkedin.com/in/alvihossain` and `github.com/AlviHossain97` by the schema.

## Run, build, test

Requires Node 22 or later.

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # astro build + PDF + social image into dist/
npm run preview      # serve dist/
npx playwright install chromium   # once, for the PDF step and tests
npm test             # playwright (run `npm run build` first)
npm run lint         # eslint + prettier --check
npm run typecheck    # astro check (TypeScript strict)
npm run lhci         # Lighthouse CI, mobile, needs a build and Chrome
npm run check:privacy # privacy guard (add `-- --history` to scan every commit)
```

## Privacy

This repo is public. Only email, LinkedIn and GitHub are public contact details. Phone, address, personal identifiers and academic records must never be committed.

- `.gitignore` excludes all `*.pdf`, `*.docx` and anything named like a transcript.
- `scripts/check-privacy.mjs` fails on UK phone numbers, postcodes, the home town, personal-identifier wording, any tracked PDF and banned phrases. It runs in the `pre-commit` hook (`.githooks/`, enabled by `npm install`), and in CI with `--history` over every commit.
- `docs/master-cv.md` is a transcription with private details removed.

## Deployment

`.github/workflows/deploy.yml` runs on every push and pull request: privacy check (including history), lint, typecheck, build, Playwright and axe tests, Lighthouse CI (mobile, 95+ in all four categories). On a push to `main` it then deploys `dist/` with `actions/deploy-pages`.

One-off setup: in the repository settings, **Pages > Source: GitHub Actions**.

## Licence

Code: MIT (see `LICENSE`). The CV text, name and personal details are not covered by that licence.
