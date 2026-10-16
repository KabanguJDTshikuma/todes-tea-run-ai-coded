import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /<repo-name>/; local dev stays at /.
  base: command === 'build' ? '/todes-tea-run-ai-coded/' : '/',
}));
