import { defineConfig } from 'vite';

// Dev server used by the media2threejs capture adapter.
// The ignore pattern avoids Windows EBUSY crashes when an editor writes files
// through a temporary directory inside the watched source tree.
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4319,
    strictPort: true,
    watch: {
      ignored: ['**/*.tmpdir/**', '**/.*.tmpdir/**'],
    },
  },
});
