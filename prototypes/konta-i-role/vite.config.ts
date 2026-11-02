import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { adaptDesignSystem } from './ds-adapter';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/prototypes/konta-i-role/',
  plugins: [
    { name: 'prototype-only-ds-adapter', enforce: 'pre', transform: adaptDesignSystem },
    tailwindcss(),
  ],
  build: {
    outDir: fileURLToPath(new URL('../../packages/ui/.storybook/public/prototypes/konta-i-role/', import.meta.url)),
    emptyOutDir: false,
  },
});
