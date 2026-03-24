/** 入力 cm と画面上の換算 cm を別行に出す閾値（浮動小数の揺れを無視） */
export const CM_INPUT_VS_MEASURED_EPS = 0.2;

const ARROW = 14;
const ARROW_SM = 7;

export const OFFSET_HEIGHT_X = 280;
export const OFFSET_SHOULDER_Y = 28;
export const OFFSET_LENGTH_X = 220;
export const OFFSET_CHEST_Y = 50;
export const OFFSET_SLEEVE_NORMAL = 380;
export const ARROW_INSET = 8;

export const drawArrowUp = (cx: number, cy: number) =>
  `M ${cx} ${cy - ARROW} L ${cx - 10} ${cy + 8} L ${cx + 10} ${cy + 8} Z`;
export const drawArrowDown = (cx: number, cy: number) =>
  `M ${cx} ${cy + ARROW} L ${cx - 10} ${cy - 8} L ${cx + 10} ${cy - 8} Z`;
export const drawArrowLeftSm = (cx: number, cy: number) =>
  `M ${cx - ARROW_SM} ${cy} L ${cx + 4} ${cy - 5} L ${cx + 4} ${cy + 5} Z`;
export const drawArrowRightSm = (cx: number, cy: number) =>
  `M ${cx + ARROW_SM} ${cy} L ${cx - 4} ${cy - 5} L ${cx - 4} ${cy + 5} Z`;
