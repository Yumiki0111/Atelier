/**
 * FIT&LOOK ロゴスプラッシュ（文字順フェード + オレンジドットフェードイン）
 * `apps/console/public/icon/logo.html` と同期
 */

const STYLE_ID = "fitlook-logo-splash-styles";

/**
 * オレンジドット fadeIn の終了（CSS: delay 1.4s + duration 0.6s）。`logo.html` と同一。
 * 文字フェードの最後（K）は 1.55s だが、最終タイミングはドットのフェード完了に合わせる。
 */
export const FITLOOK_LOGO_ANIM_MS = 2000;

/** アニメ完了（最終キーフレーム）後、同じ見た目を保つ時間（次の UI へ切り替える前） */
export const FITLOOK_LOGO_POST_ANIM_HOLD_MS = 1500;

/** 固定タイマー用の上限（animationend が取れない環境向け）。= アニメ終了 + ホールド */
export const FITLOOK_LOGO_SPLASH_TOTAL_MS = FITLOOK_LOGO_ANIM_MS + FITLOOK_LOGO_POST_ANIM_HOLD_MS;

/** @deprecated 互換: スプラッシュを閉じるまでの時間と同じ値（試着表示は `deferGarmentViewerMs` 分さらに遅れる） */
export const FITLOOK_LOGO_VIEWER_READY_MS = FITLOOK_LOGO_SPLASH_TOTAL_MS;

/** @deprecated 互換: `FITLOOK_LOGO_POST_ANIM_HOLD_MS` に名称変更 */
export const FITLOOK_LOGO_SHELL_HOLD_MS = FITLOOK_LOGO_POST_ANIM_HOLD_MS;

/** @deprecated 互換: `FITLOOK_LOGO_SPLASH_TOTAL_MS` を使用 */
export const FITLOOK_LOGO_SPLASH_DURATION_MS = FITLOOK_LOGO_SPLASH_TOTAL_MS;

function injectSplashStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes fitlook-logo-fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fitlook-logo-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .fitlook-logo-wrap .fitlook-letter { opacity: 0; }
    .fitlook-logo-wrap .fitlook-letter-F  { animation: fitlook-logo-fadeUp 0.4s ease forwards 0.1s; }
    .fitlook-logo-wrap .fitlook-letter-I  { animation: fitlook-logo-fadeUp 0.4s ease forwards 0.25s; }
    .fitlook-logo-wrap .fitlook-letter-T  { animation: fitlook-logo-fadeUp 0.4s ease forwards 0.4s; }
    .fitlook-logo-wrap .fitlook-letter-amp{ animation: fitlook-logo-fadeUp 0.4s ease forwards 0.55s; }
    .fitlook-logo-wrap .fitlook-letter-L  { animation: fitlook-logo-fadeUp 0.4s ease forwards 0.7s; }
    .fitlook-logo-wrap .fitlook-letter-O  { animation: fitlook-logo-fadeUp 0.4s ease forwards 0.85s; }
    .fitlook-logo-wrap .fitlook-letter-O2 { animation: fitlook-logo-fadeUp 0.4s ease forwards 1.0s; }
    .fitlook-logo-wrap .fitlook-letter-K  { animation: fitlook-logo-fadeUp 0.4s ease forwards 1.15s; }
    .fitlook-logo-wrap .fitlook-orange-dot {
      opacity: 0;
      animation: fitlook-logo-fadeIn 0.6s ease forwards 1.4s;
    }
  `;
  document.head.appendChild(s);
}

/**
 * オレンジ `fitlook-logo-fadeIn` 終了 → 1.5s ホールド後に解決。
 * `animationend` で実際の終了を取り、CSS と定数のズレでも「終了フレーム＋1.5s」を保証する。
 * フォールバック: `splashStartMs + FITLOOK_LOGO_SPLASH_TOTAL_MS`（animationend 未発火時）。
 */
export function waitForFitLookSplashHold(container: HTMLElement, splashStartMs: number): Promise<void> {
  const orange = container.querySelector(".fitlook-orange-dot");
  const deadlineMs = splashStartMs + FITLOOK_LOGO_SPLASH_TOTAL_MS;

  return new Promise((resolve) => {
    let settled = false;
    let holdTimer: number | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
      orange?.removeEventListener("animationend", onAnimEnd);
      resolve();
    };

    const fallbackTimer = window.setTimeout(finish, Math.max(0, deadlineMs - Date.now()));

    function onAnimEnd(e: Event) {
      const ae = e as AnimationEvent;
      const name = ae.animationName || "";
      if (!name.includes("fitlook-logo-fadeIn")) return;
      if (settled) return;
      window.clearTimeout(fallbackTimer);
      orange?.removeEventListener("animationend", onAnimEnd);
      holdTimer = window.setTimeout(finish, FITLOOK_LOGO_POST_ANIM_HOLD_MS);
    }

    if (orange instanceof Element) {
      orange.addEventListener("animationend", onAnimEnd);
    }
  });
}

/**
 * ロゴスプラッシュ。戻り値でスタイルの削除はしない（他インスタンスで共有）。
 */
export function mountFitLookLogoLoadingAnimation(container: HTMLElement): () => void {
  injectSplashStyles();

  const wrap = document.createElement("div");
  wrap.className = "fitlook-logo-wrap";
  /** `logo.html` の `.logo-wrap` と同じ（中央配置・最大幅のみ） */
  wrap.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:100%;max-width:min(740px,100%);margin:0 auto;box-sizing:border-box;overflow:visible;";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 739 130");
  svg.setAttribute("fill", "none");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("overflow", "visible");
  svg.style.cssText =
    "width:100%;height:auto;max-width:100%;display:block;overflow:visible;flex-shrink:0;";

  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = "FIT&LOOK";
  svg.appendChild(title);

  const orange = document.createElementNS("http://www.w3.org/2000/svg", "g");
  orange.setAttribute("class", "fitlook-orange-dot");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("y", "7");
  rect.setAttribute("width", "100");
  rect.setAttribute("height", "100");
  rect.setAttribute("rx", "50");
  rect.setAttribute("fill", "#E87D4C");
  orange.appendChild(rect);
  svg.appendChild(orange);

  const letters: { cls: string; d: string }[] = [
    {
      cls: "fitlook-letter fitlook-letter-F",
      d: "M115.557 22.952H168.933V38.792H136.773V50.12H164.421V65.288H136.773V89H115.557V22.952Z",
    },
    { cls: "fitlook-letter fitlook-letter-I", d: "M180.548 89V22.952H201.764V89H180.548Z" },
    {
      cls: "fitlook-letter fitlook-letter-T",
      d: "M254.917 39.848V89H233.701V39.848H212.005V22.952H276.517V39.848H254.917Z",
    },
    {
      cls: "fitlook-letter fitlook-letter-amp",
      d: "M350.422 51.875L357.922 52.0625H358.016C360.078 52.0625 361.531 52.0312 362.375 51.9688C362.625 52.125 362.844 52.4219 363.031 52.8594L362.797 54.5C362.484 58.0625 361.516 61.625 359.891 65.1875C358.297 68.75 356.109 71.9219 353.328 74.7031L362.469 84.1719C363.344 85.1094 364.078 85.9688 364.672 86.75L365.609 87.6406C366.672 88.6719 367.234 89.4219 367.297 89.8906C367.297 90.3906 366.359 90.6406 364.484 90.6406L362.281 90.5938H350.141C346.578 90.5938 343.234 90.5312 340.109 90.4062C339.078 89.8438 338.156 89.1562 337.344 88.3438L335.516 86.7969L333.031 88.0625C326.344 90.5625 320.766 91.9531 316.297 92.2344L312.125 92.375C305.938 92.375 300.375 91.4688 295.438 89.6562C290.5 87.8438 286.672 85.3594 283.953 82.2031C281.234 79.0469 279.875 75.5312 279.875 71.6562C279.875 62.4688 286.125 55.5781 298.625 50.9844C295.281 48.8281 292.516 46.2344 290.328 43.2031C288.172 40.1719 287.094 37.3594 287.094 34.7656C287.094 29.9219 288.688 26.0156 291.875 23.0469C293.812 21.2344 296.859 19.6563 301.016 18.3125C305.172 16.9687 309.734 16.2969 314.703 16.2969C325.203 16.2969 333.047 18.1094 338.234 21.7344C342.172 24.5156 344.141 28.3438 344.141 33.2188C344.141 36.7812 342.938 40.0469 340.531 43.0156C338.156 45.9844 334.594 49.1875 329.844 52.625C331.5 54.2812 332.781 55.4844 333.688 56.2344V56.1875L338.75 61.0156C340.469 58.7031 341.375 56.7812 341.469 55.25C341.594 53.6875 341.969 52.75 342.594 52.4375C343.406 52.0625 346.016 51.875 350.422 51.875ZM326.516 75.8281C325.172 74.7656 324.125 73.7969 323.375 72.9219C322.625 72.0469 322.156 71.5156 321.969 71.3281L314.891 64.5781C314.484 64.5781 314.172 64.3906 313.953 64.0156C313.766 63.6094 313.141 62.9062 312.078 61.9062C311.047 60.875 310.125 60.3438 309.312 60.3125C307.625 61.125 306.078 62.5469 304.672 64.5781C303.297 66.6094 302.609 68.5938 302.609 70.5312C302.609 72.4375 303.234 74.125 304.484 75.5938C306.828 78.25 309.906 79.5781 313.719 79.5781C317.531 79.5781 321.797 78.3281 326.516 75.8281ZM314.797 43.2969L314.75 43.25C315.156 43.5 315.578 43.625 316.016 43.625C316.453 43.625 316.844 43.5469 317.188 43.3906C320.719 40.7031 322.922 38.3906 323.797 36.4531C324.203 35.5156 324.406 34.3906 324.406 33.0781C324.406 31.7656 323.875 30.5781 322.812 29.5156C321.031 27.7344 318.766 26.8438 316.016 26.8438C313.297 26.8438 311.109 27.5156 309.453 28.8594C307.797 30.1719 306.969 31.9531 306.969 34.2031C307.281 37.2656 309.891 40.2969 314.797 43.2969Z",
    },
    {
      cls: "fitlook-letter fitlook-letter-L",
      d: "M371.307 22.952H392.523V72.104H426.411V89H371.307V22.952Z",
    },
    {
      cls: "fitlook-letter fitlook-letter-O",
      d: "M466.577 21.8C477.969 21.8 486.769 24.712 492.977 30.536C499.185 36.36 502.289 44.84 502.289 55.976C502.289 67.112 499.185 75.592 492.977 81.416C486.769 87.24 477.969 90.152 466.577 90.152C455.185 90.152 446.385 87.272 440.177 81.512C434.033 75.688 430.961 67.176 430.961 55.976C430.961 44.776 434.033 36.296 440.177 30.536C446.385 24.712 455.185 21.8 466.577 21.8ZM466.577 37.64C462.033 37.64 458.577 39.016 456.209 41.768C453.841 44.52 452.657 48.232 452.657 52.904V59.048C452.657 63.72 453.841 67.432 456.209 70.184C458.577 72.936 462.033 74.312 466.577 74.312C471.121 74.312 474.577 72.936 476.945 70.184C479.377 67.432 480.593 63.72 480.593 59.048V52.904C480.593 48.232 479.377 44.52 476.945 41.768C474.577 39.016 471.121 37.64 466.577 37.64Z",
    },
    {
      cls: "fitlook-letter fitlook-letter-O2",
      d: "M546.545 21.8C557.937 21.8 566.737 24.712 572.945 30.536C579.153 36.36 582.257 44.84 582.257 55.976C582.257 67.112 579.153 75.592 572.945 81.416C566.737 87.24 557.937 90.152 546.545 90.152C535.153 90.152 526.353 87.272 520.145 81.512C514.001 75.688 510.929 67.176 510.929 55.976C510.929 44.776 514.001 36.296 520.145 30.536C526.353 24.712 535.153 21.8 546.545 21.8ZM546.545 37.64C542.001 37.64 538.545 39.016 536.177 41.768C533.809 44.52 532.625 48.232 532.625 52.904V59.048C532.625 63.72 533.809 67.432 536.177 70.184C538.545 72.936 542.001 74.312 546.545 74.312C551.089 74.312 554.545 72.936 556.913 70.184C559.345 67.432 560.561 63.72 560.561 59.048V52.904C560.561 48.232 559.345 44.52 556.913 41.768C554.545 39.016 551.089 37.64 546.545 37.64Z",
    },
    {
      cls: "fitlook-letter fitlook-letter-K",
      d: "M638.418 22.952H664.722L641.01 50.12L665.202 89H640.146L626.418 64.808L614.898 74.216V89H593.682V22.952H614.898V51.176L638.418 22.952Z",
    },
  ];

  for (const { cls, d } of letters) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", cls);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "#111");
    g.appendChild(path);
    svg.appendChild(g);
  }

  wrap.appendChild(svg);
  container.appendChild(wrap);

  return () => {
    /* CSS は共有のため残す */
  };
}
