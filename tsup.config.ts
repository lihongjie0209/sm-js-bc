import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  outDir: 'dist',
  dts: true,
  clean: true,
  minify: true,
  splitting: false,
  sourcemap: false,
  target: 'es2020',
  platform: 'neutral',
  globalName: 'SMBC',
  // 为不同格式生成不同文件
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : format === 'cjs' ? '.cjs' : '.js'
    }
  },
})