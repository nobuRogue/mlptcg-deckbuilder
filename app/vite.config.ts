import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 公開先のパス（GitHub Pages のサブパス等）に依存しないよう相対パスで出力する
  base: './',
  plugins: [react()],
})
