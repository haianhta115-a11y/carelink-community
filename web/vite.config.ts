import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
const apiUrl = process.env.CARELINK_API_URL ?? 'http://localhost:5080';
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': apiUrl, '/hubs': { target: apiUrl, ws: true }, '/health': apiUrl } }, test: { include: ['src/test/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false } });
