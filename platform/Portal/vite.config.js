import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ base: '/portal/', plugins: [vue()], server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:5080', '/assets': 'http://127.0.0.1:8092' } } });
