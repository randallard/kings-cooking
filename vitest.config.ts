import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';

export default defineConfig(
  getViteConfig({
    test: {
      environment: 'happy-dom',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'coverage/**',
          'dist/**',
          'packages/*/test{,s}/**',
          '**/*.d.ts',
          'cypress/**',
          'test{,s}/**',
          'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
          '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
          '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
          '**/__tests__/**',
          '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
          '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
          'astro.config.mjs',
          'tailwind.config.js'
        ],
        threshold: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      },
      globals: true,
      setupFiles: ['./src/test/setup.ts']
    }
  })
);