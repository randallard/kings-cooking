import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/kings-cooking',
  integrations: [
    tailwind(),
    sitemap()
  ],
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'chess-engine': ['./src/lib/chess/'],
            'webrtc-utils': ['./src/lib/webrtc/']
          }
        }
      }
    }
  }
});