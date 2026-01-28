import { defineConfig } from "vite";

export default defineConfig({
  // 開発サーバー設定
  server: {
    port: 5174,
    open: true,
    cors: true,
  },
  define: {
    // 開発環境ではconsoleのAPIを呼び出す
    'process.env.API_BASE_URL': JSON.stringify('http://localhost:3000'),
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "AtelierWidget",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    outDir: "dist",
  },
});
