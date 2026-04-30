import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
function buildTime() {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_TIME__: JSON.stringify(buildTime()) },
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
