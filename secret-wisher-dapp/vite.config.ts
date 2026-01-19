import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
   server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    tailwindcss(),
  ],
})