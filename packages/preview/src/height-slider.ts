/**
 * 身長スライダーコンポーネント
 * プレビューとウィジェットの両方で使用される共通実装
 */

/**
 * 縦型の身長スライダーを構築する
 * @param container スライダーを配置するコンテナ要素
 * @param min 最小値
 * @param max 最大値
 * @param initial 初期値
 * @param onChange 値が変更されたときに呼ばれるコールバック
 */
export function buildHeightSlider(
  container: HTMLElement,
  min: number,
  max: number,
  initial: number,
  onChange: (v: number) => void
) {
  const plus = document.createElement("div");
  plus.textContent = "+";
  plus.style.cssText = `
    font-size: 12px; font-weight: 700; color: #374151;
    cursor: pointer; line-height: 1; flex-shrink: 0; user-select: none;
    width: 100%; text-align: center; padding: 2px 0;
    position: relative;
  `;

  // 数値表示用の要素を作成（プラスボタンの上に表示）
  const valueLabel = document.createElement("div");
  valueLabel.textContent = `${initial}`;
  valueLabel.style.cssText = `
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 2;
    background: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
    border-radius: 4px;
  `;
  plus.appendChild(valueLabel);

  const trackWrap = document.createElement("div");
  trackWrap.style.cssText = `
    flex: 1; min-height: 0; position: relative;
    display: flex; align-items: center; justify-content: center;
    margin: 3px 0;
  `;
  const track = document.createElement("div");
  track.style.cssText = "position:absolute;top:0;bottom:0;width:2px;background:#d1d5db;border-radius:1px;left:50%;transform:translateX(-50%);";

  const handle = document.createElement("div");
  handle.style.cssText = `
    position: absolute;
    width: 12px; height: 12px;
    background: #111; border-radius: 50%;
    left: 50%; transform: translate(-50%, -50%);
    cursor: grab; touch-action: none; z-index: 1;
  `;

  const minus = document.createElement("div");
  minus.textContent = "−";
  minus.style.cssText = `
    font-size: 12px; font-weight: 700; color: #374151;
    cursor: pointer; line-height: 1; flex-shrink: 0; user-select: none;
    width: 100%; text-align: center; padding: 2px 0;
  `;

  trackWrap.appendChild(track);
  trackWrap.appendChild(handle);
  container.appendChild(plus);
  container.appendChild(trackWrap);
  container.appendChild(minus);

  let dragging = false;
  let currentValue = initial;

  const valueToY = (v: number): number => {
    const h = trackWrap.clientHeight;
    return (1 - (v - min) / (max - min)) * h; // top = max
  };
  const yToValue = (y: number): number => {
    const h = trackWrap.clientHeight || 1;
    const ratio = Math.max(0, Math.min(1, y / h));
    return Math.round(max - ratio * (max - min));
  };
  const positionHandle = (v: number) => {
    const y = valueToY(v);
    handle.style.top = `${y}px`;
    // 数字を更新（表示はドラッグ時のみ）
    valueLabel.textContent = `${v}`;
  };

  requestAnimationFrame(() => positionHandle(currentValue));
  window.addEventListener("resize", () => positionHandle(currentValue), { passive: true });

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    handle.style.cursor = "grabbing";
    valueLabel.style.opacity = "1";
  });
  handle.addEventListener("touchstart", (e) => {
    e.preventDefault();
    dragging = true;
    valueLabel.style.opacity = "1";
  }, { passive: false });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = trackWrap.getBoundingClientRect();
    const v = yToValue(e.clientY - rect.top);
    if (v !== currentValue) { currentValue = v; positionHandle(v); onChange(v); }
  });
  document.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    e.preventDefault();
    const rect = trackWrap.getBoundingClientRect();
    const v = yToValue(e.touches[0].clientY - rect.top);
    if (v !== currentValue) { currentValue = v; positionHandle(v); onChange(v); }
  }, { passive: false });
  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      handle.style.cursor = "grab";
      valueLabel.style.opacity = "0";
    }
  });
  document.addEventListener("touchend", () => {
    if (dragging) {
      dragging = false;
      valueLabel.style.opacity = "0";
    }
  });

  plus.addEventListener("click", () => {
    currentValue = Math.min(max, currentValue + 1);
    positionHandle(currentValue); onChange(currentValue);
  });
  minus.addEventListener("click", () => {
    currentValue = Math.max(min, currentValue - 1);
    positionHandle(currentValue); onChange(currentValue);
  });
}
