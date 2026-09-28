import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdir, readFile } from 'node:fs/promises';
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/puyopuyo/' : '/',
  plugins: [
    react(),
    mode === 'pages' && {
      name: 'pages-font-licenses',
      async generateBundle() {
        const directory = new URL('./public/licenses/', import.meta.url);
        for (const name of await readdir(directory)) {
          this.emitFile({
            type: 'asset',
            fileName: `licenses/${name}`,
            source: await readFile(new URL(name, directory)),
          });
        }
      },
    },
  ],
  build: {
    // 公開用にはローカル専用の公式画像をコピーしない。
    copyPublicDir: mode !== 'pages',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('/src/data/next-drills.json')) return 'drills';
        },
      },
    },
  },
}));
