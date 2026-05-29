import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Uncomment and set to your repo name when deploying to GitHub Pages:
  // base: '/sketchbook-orrery/',

  build: {
    rollupOptions: {
      output: {
        // Split Three.js into its own chunk so the main bundle stays small
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
