/**
 * デバッグログ用のユーティリティ
 * 開発環境でのみログを出力する
 */

const DEBUG = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export const debugLog = {
  log: (...args: any[]) => {
    if (DEBUG) {
      console.log("[Atelier Preview]", ...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG) {
      console.warn("[Atelier Preview]", ...args);
    }
  },
  error: (...args: any[]) => {
    // エラーは常に出力
    console.error("[Atelier Preview]", ...args);
  },
};
