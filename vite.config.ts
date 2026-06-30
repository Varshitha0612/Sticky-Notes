import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is just the tool that runs our dev server and bundles files for production.
export default defineConfig({
  plugins: [react()],
});
