# Third-party notices

This site's code is MIT licensed (see `LICENSE`). It uses the following third-party software. Each is used under
its own licence, reproduced in the package that ships it.

## Shipped to visitors

| Package                                                                                                            | Licence     | Used for                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@designcodeio/threeui`](https://github.com/MengTo/threeui) 1.2.0 (ThreeUI Community, Copyright (c) 2026 Meng To) | MIT         | The animated contour "Topo Field" WebGL background in the hero (`ConstellationField`, variant `topo-field`). Only that one component and its shaders are bundled; it is loaded as a separate chunk after first paint. No Pro or Beta component, no catalogue thumbnails or preview media are used. |
| [`motion`](https://github.com/motiondivision/motion)                                                               | MIT         | Scroll-in reveals (`motion/mini` and `inView`).                                                                                                                                                                                                                                                    |
| [`react`](https://react.dev), `react-dom`                                                                          | MIT         | Interactive islands (timeline, skills, hero field).                                                                                                                                                                                                                                                |
| [`@fontsource-variable/bricolage-grotesque`](https://fontsource.org/fonts/bricolage-grotesque)                     | SIL OFL 1.1 | Display typeface, self-hosted.                                                                                                                                                                                                                                                                     |
| [`@fontsource-variable/geist`](https://fontsource.org/fonts/geist), `geist-mono`                                   | SIL OFL 1.1 | Body and monospace typefaces, self-hosted.                                                                                                                                                                                                                                                         |

ThreeUI's three small layout rules for `.threeui-background` are re-written in `src/styles/global.css` instead of
importing its 73 KB `style.css`. The component renders directly with WebGL; the `three` package is a peer
dependency of ThreeUI but is not used by the component this site bundles.

ThreeUI notes (from the package): the Community edition's source and bundled assets are MIT; catalogue thumbnails
and preview videos on threeui.com are not covered by that licence and are not used here.

## Build and test only

Astro (MIT), `@astrojs/react`, `@astrojs/sitemap`, zod, Playwright, `@axe-core/playwright` (MPL-2.0),
Lighthouse CI (Apache-2.0), ESLint and Prettier. None of these ship in the built site.
