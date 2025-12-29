import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' must be set to './' or the repo name for assets to load correctly on GitHub Pages
  base: './', 
  build: {
    outDir: 'dist',
  }
});