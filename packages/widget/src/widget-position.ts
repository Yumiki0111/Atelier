export function updateButtonPositions() {
  const allWidgetContainers = Array.from(document.querySelectorAll<HTMLElement>('[id^="atelier-widget-container-"]'));
  
  const baseBottomPx = 24;
  const baseRightPx = 24;
  const buttonSpacingPx = 72;
  
  allWidgetContainers.forEach((container, index) => {
    const bottomOffsetPx = baseBottomPx + (index * buttonSpacingPx);
    container.style.bottom = `${bottomOffsetPx}px`;
    container.style.right = `${baseRightPx}px`;
  });
}
