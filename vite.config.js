import { defineConfig } from 'vite';

// GH Pages lives at /<repo>/; set VITE_BASE at build time to override.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  server: { port: 5173, host: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
});
