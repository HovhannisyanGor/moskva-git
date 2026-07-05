import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Дев-прокси: фронт ходит на /api того же localhost:5173, а Vite сам
    // пробрасывает запрос на прод-API. Нужно для симулятора iOS (live-reload):
    // у него бывает сломан DNS, а localhost работает всегда.
    proxy: {
      '/api': {
        target: 'https://api.localee.ru',
        changeOrigin: true,
      },
    },
  },
})
