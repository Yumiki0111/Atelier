import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    // 開発サーバー設定
    server: {
      port: 5174,
      open: true,
      cors: true,
    },
    define: {
      // 本番環境では環境変数から取得、開発環境ではlocalhost
      'process.env.API_BASE_URL': isProduction
        ? JSON.stringify(process.env.WIDGET_API_BASE_URL || '')
        : JSON.stringify('http://localhost:3000'),
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
      // 本番環境ではminifyと圧縮を有効化
      minify: false, // デバッグのため一時的に無効化
      sourcemap: !isProduction,
    },
  };
});
