export function colorFilterForHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "none";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) {
    if (max === r) hue = ((g - b) / (max - min)) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
  }
  hue *= 60;
  if (hue < 0) hue += 360;
  const sepia = 0.35;
  const sat = 0.4;
  return `sepia(${sepia}) saturate(${sat}) hue-rotate(${hue}deg)`;
}
