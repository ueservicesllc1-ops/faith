import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        login: resolve(__dirname, 'login.html'),
        galeria: resolve(__dirname, 'galeria.html'),
        dashboard: resolve(__dirname, 'dashboard.html')
      }
    }
  }
});
