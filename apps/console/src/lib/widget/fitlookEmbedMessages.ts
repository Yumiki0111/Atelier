/** 親ウィジェット `packages/widget` の `FITLOOK_SPLASH_FINISHED_MESSAGE` と同値 */
export const FITLOOK_SPLASH_FINISHED_MESSAGE = "fitlook-splash-finished" as const;

/**
 * スプラッシュ除去・親の再レイアウト後に、iframe 内の段階表示（図解・脚注）を開始するまでの余裕。
 * 切り替わりと同フレームでタイマーが走ると早く見えるため、ペイントを挟む。
 */
export const FITLOOK_EMBED_SPLASH_HANDOFF_DELAY_MS = 80;
