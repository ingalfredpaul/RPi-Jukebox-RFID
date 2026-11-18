import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The phone talks to the box through nginx on port 80 (same origin):
//   /            static app          /upload, /files/   upload service
//   /cover-cache cover images        ws://<box>:5556/5557  Jukebox daemon (direct)
// For development on a PC set VITE_BOX=http://<box-ip> to forward those paths.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const box = env.VITE_BOX;
  const proxy = box
    ? Object.fromEntries(
        ['/upload', '/files', '/cover-cache'].map((p) => [p, { target: box, changeOrigin: true }]),
      )
    : undefined;

  return {
    plugins: [react()],
    build: {
      outDir: 'build',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            state: ['zustand'],
            i18n: ['i18next', 'react-i18next'],
          },
        },
      },
    },
    server: { port: 3000, host: true, proxy },
    preview: { port: 4173, host: true, proxy },
  };
});
