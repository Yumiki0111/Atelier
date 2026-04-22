export function sortSizeKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (style) node.style.cssText = style;
  if (text !== undefined) node.textContent = text;
  return node;
}
