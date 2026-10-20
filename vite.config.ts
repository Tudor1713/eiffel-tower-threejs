import { defineConfig } from 'vite';

// Relative base keeps the build working both locally and under a GitHub Pages
// project sub-path (https://<user>.github.io/eiffel-tower-threejs/).
export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 4319,
    strictPort: true,
    watch: {
      ignored: ['**/*.tmpdir/**', '**/.*.tmpdir/**'],
    },
  },
});
