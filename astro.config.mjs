import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// User site: https://alvihossain97.github.io/ (served from the domain root, so no `base`).
export default defineConfig({
  site: 'https://alvihossain97.github.io',
  trailingSlash: 'ignore',
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/og-card') && !page.includes('/404') })],
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'auto' },
});
