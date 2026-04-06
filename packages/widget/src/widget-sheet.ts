/**
 * モーダルシートのUI補助コンポーネント
 * ドラッグ操作・シートの開閉アニメーションを担当する
 */

// ─── UI parts ─────────────────────────────────────────────────────────────────

export function buildDragBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.setAttribute("data-fitlook-drag-bar", "true");
  bar.style.cssText = `
    flex-shrink: 0;
    display: flex; justify-content: center;
    padding: 3px 0 2px; cursor: grab; touch-action: none;
  `;
  const pill = document.createElement("div");
  pill.style.cssText = "width:32px;height:3px;background:#d1d5db;border-radius:99px;";
  bar.appendChild(pill);
  return bar;
}

export function makeArrowBtn(symbol: string): HTMLElement {
  const btn = document.createElement("button");
  btn.textContent = symbol;
  btn.style.cssText = `
    width: 32px; height: 32px;
    background: transparent; border: none; outline: none;
    cursor: pointer; font-size: 22px; color: #111;
    display: flex; align-items: center; justify-content: center;
    line-height: 1; padding: 0; border-radius: 50%;
    transition: background 0.15s;
  `;
  btn.addEventListener("mouseenter", () => { btn.style.background = "#f3f4f6"; });
  btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
  return btn;
}

// ─── Sheet open / close ───────────────────────────────────────────────────────

export function dismissSheet(sheet: HTMLElement, overlay: HTMLElement) {
  sheet.style.animation = "none";
  sheet.style.transition = "transform 0.3s cubic-bezier(0.32,0.72,0,1)";
  sheet.style.transform = "translateY(calc(100% - 20px))";
  overlay.style.animation = "none";
  overlay.style.transition = "opacity 0.3s ease-out";
  overlay.style.opacity = "0";
  setTimeout(() => { overlay.style.pointerEvents = "none"; }, 320);
  if ((sheet as any).__fitlookSetOpen) (sheet as any).__fitlookSetOpen(false);
}

export function openSheet(sheet: HTMLElement, overlay: HTMLElement) {
  overlay.style.pointerEvents = "auto";
  sheet.style.animation = "none";
  sheet.style.transition = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
  sheet.style.transform = "translateY(0)";
  overlay.style.animation = "none";
  overlay.style.transition = "opacity 0.22s ease-out";
  overlay.style.opacity = "1";
  if ((sheet as any).__fitlookSetOpen) (sheet as any).__fitlookSetOpen(true);
}

// ─── Drag-to-dismiss ──────────────────────────────────────────────────────────

export function setupDragToDismiss(
  handle: HTMLElement,
  sheet: HTMLElement,
  overlay: HTMLElement,
  onDismiss: () => void
) {
  let startY = 0, curY = 0, dragging = false;
  let isOpen = true;
  const sheetHeight = sheet.offsetHeight || parseInt(sheet.style.height) || window.innerHeight * 0.9;

  const onStart = (y: number) => {
    startY = curY = y;
    dragging = true;
    sheet.style.transition = "none";
    overlay.style.transition = "none";
  };

  const onMove = (y: number) => {
    if (!dragging) return;
    curY = y;
    const delta = y - startY;
    if (isOpen) {
      const translateY = Math.max(0, delta);
      sheet.style.transform = `translateY(${translateY}px)`;
      overlay.style.opacity = String(Math.max(0, 1 - translateY / sheetHeight));
    } else {
      const translateY = Math.min(0, delta);
      sheet.style.transform = `translateY(calc(100% - 20px + ${translateY}px))`;
      overlay.style.opacity = String(Math.min(1, Math.abs(translateY) / sheetHeight));
    }
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    const delta = curY - startY;
    const threshold = 90;

    sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
    overlay.style.transition = "opacity 0.3s ease-out";

    if (isOpen) {
      if (delta > threshold) {
        isOpen = false;
        onDismiss();
        dismissSheet(sheet, overlay);
      } else {
        sheet.style.transform = "translateY(0)";
        overlay.style.opacity = "1";
      }
    } else {
      if (delta < -threshold) {
        isOpen = true;
        openSheet(sheet, overlay);
      } else {
        sheet.style.transform = "translateY(calc(100% - 20px))";
        overlay.style.opacity = "0";
      }
    }
  };

  (sheet as any).__fitlookIsOpen = () => isOpen;
  (sheet as any).__fitlookSetOpen = (open: boolean) => { isOpen = open; };

  handle.addEventListener("mousedown", (e) => { e.preventDefault(); onStart(e.clientY); });
  handle.addEventListener("touchstart", (e) => { e.preventDefault(); onStart(e.touches[0].clientY); }, { passive: false });
  document.addEventListener("mousemove", (e) => { if (dragging) { e.preventDefault(); onMove(e.clientY); } });
  document.addEventListener("touchmove", (e) => { if (dragging) { e.preventDefault(); onMove(e.touches[0].clientY); } }, { passive: false });
  document.addEventListener("mouseup", onEnd);
  document.addEventListener("touchend", onEnd);
}
