import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' 讓打包結果可以直接放在 GitHub Pages 或任意子路徑
export default defineConfig({
  base: './',
  plugins: [vue()],
})

