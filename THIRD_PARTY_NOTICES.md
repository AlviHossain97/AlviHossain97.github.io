# Third-party notices

This site's code is MIT licensed (see `LICENSE`). It uses the following third-party software. Each is used under
its own licence, reproduced in the package that ships it.

## Shipped to visitors

| Package                                                                                                            | Licence     | Used for                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@designcodeio/threeui`](https://github.com/MengTo/threeui) 1.2.0 (ThreeUI Community, Copyright (c) 2026 Meng To) | MIT         | The animated "Stream Convergence Background" behind the whole page (`StreamConvergenceBackground`). Only that one component and its shader are bundled; it is loaded as a separate chunk after first paint. It was checked to be self-contained (no iframe, no remote URL, no three.js). No Pro or Beta component, and no catalogue thumbnail or preview media, is used. |
| [`motion`](https://github.com/motiondivision/motion)                                                               | MIT         | Scroll-in reveals (`motion/mini` and `inView`).                                                                                                                                                                                                                                                                                                                          |
| [`react`](https://react.dev), `react-dom`                                                                          | MIT         | Interactive islands (timeline, skills, hero field).                                                                                                                                                                                                                                                                                                                      |
| [`@fontsource-variable/bricolage-grotesque`](https://fontsource.org/fonts/bricolage-grotesque)                     | SIL OFL 1.1 | Display typeface, self-hosted.                                                                                                                                                                                                                                                                                                                                           |
| [`@fontsource-variable/geist`](https://fontsource.org/fonts/geist), `geist-mono`                                   | SIL OFL 1.1 | Body and monospace typefaces, self-hosted.                                                                                                                                                                                                                                                                                                                               |

ThreeUI's three small layout rules for `.threeui-background` are re-written in `src/styles/global.css` instead of
importing its 73 KB `style.css`.

**Not used, on purpose.** Several ThreeUI components (for example "Topo Field" and the other Neuform effects) embed an
iframe that loads Tailwind, iconify, GSAP, Google Fonts and image hosts from public CDNs at runtime. They are MIT
licensed but would send visitors' requests to third parties, so none is used. The package's own notes say the same:
some Community scenes reference public CDNs. ThreeUI also installs `three` (including an aliased r128 copy) as
dependencies; the bundled component does not import them and they are not shipped.

ThreeUI notes (from the package): the Community edition's source and bundled assets are MIT; catalogue thumbnails
and preview videos on threeui.com are not covered by that licence and are not used here.

## Build and test only

Astro (MIT), `@astrojs/react`, `@astrojs/sitemap`, zod, Playwright, `@axe-core/playwright` (MPL-2.0),
Lighthouse CI (Apache-2.0), ESLint and Prettier. None of these ship in the built site.
