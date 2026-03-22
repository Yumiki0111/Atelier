import type { MeasureOverlayData } from "./types";
import { BZ } from "./constants";

/** 入力 cm と画面上の換算 cm を別行に出す閾値（浮動小数の揺れを無視） */
const CM_INPUT_VS_MEASURED_EPS = 0.2;

const ARROW = 14;
const ARROW_SM = 7;
const OFFSET_HEIGHT_X = 280;
const OFFSET_SHOULDER_Y = 28;
const OFFSET_LENGTH_X = 220;
const OFFSET_CHEST_Y = 50;
const OFFSET_SLEEVE_NORMAL = 380;
const ARROW_INSET = 8;

const drawArrowUp = (cx: number, cy: number) =>
  `M ${cx} ${cy - ARROW} L ${cx - 10} ${cy + 8} L ${cx + 10} ${cy + 8} Z`;
const drawArrowDown = (cx: number, cy: number) =>
  `M ${cx} ${cy + ARROW} L ${cx - 10} ${cy - 8} L ${cx + 10} ${cy - 8} Z`;
const drawArrowLeftSm = (cx: number, cy: number) =>
  `M ${cx - ARROW_SM} ${cy} L ${cx + 4} ${cy - 5} L ${cx + 4} ${cy + 5} Z`;
const drawArrowRightSm = (cx: number, cy: number) =>
  `M ${cx + ARROW_SM} ${cy} L ${cx - 4} ${cy - 5} L ${cx - 4} ${cy + 5} Z`;

interface FittingCanvasMeasureOverlayProps {
  show: boolean;
  measureOverlay: MeasureOverlayData | null;
  height: number;
}

export function FittingCanvasMeasureOverlay({
  show,
  measureOverlay,
  height,
}: FittingCanvasMeasureOverlayProps) {
  if (!show || !measureOverlay) return null;

  return (
    <g key="measure-overlay" aria-hidden className="pointer-events-none">
      {/* モデル身長 */}
      {(() => {
        const top = measureOverlay.bodyHeight.top;
        const bottom = measureOverlay.bodyHeight.bottom;
        const bodyX = top[0];
        const lineX = bodyX + OFFSET_HEIGHT_X;
        const midY = (top[1] + bottom[1]) / 2;
        // 表示中の身長ライン(px)を基準体(170cm)の頭頂〜足元スパンに換算して実測cmを出す
        const baseBodySpanPx = BZ.foot - BZ.head_top;
        const measuredHeightCm =
          baseBodySpanPx > 0 ? ((bottom[1] - top[1]) / baseBodySpanPx) * 170 : height;
        const heightMeasuredDiffers =
          Math.abs(measuredHeightCm - height) > CM_INPUT_VS_MEASURED_EPS;
        return (
          <>
            <line x1={bodyX} y1={top[1]} x2={lineX} y2={top[1]} stroke="#059669" strokeWidth={2} opacity={0.9} />
            <line x1={bodyX} y1={bottom[1]} x2={lineX} y2={bottom[1]} stroke="#059669" strokeWidth={2} opacity={0.9} />
            <line x1={lineX} y1={top[1]} x2={lineX} y2={bottom[1]} stroke="#059669" strokeWidth={4} strokeDasharray="6 4" />
            <path d={drawArrowUp(lineX, top[1])} fill="#059669" stroke="#047857" strokeWidth={2} />
            <path d={drawArrowDown(lineX, bottom[1])} fill="#059669" stroke="#047857" strokeWidth={2} />
            <text x={lineX + 24} y={midY} fontSize={18} fontWeight="bold" fill="#047857" fontFamily="sans-serif" dominantBaseline="middle">
              身長 {height}cm（入力）
            </text>
            {heightMeasuredDiffers ? (
              <text x={lineX + 24} y={midY + 18} fontSize={10} fill="#64748b" fontFamily="sans-serif" dominantBaseline="middle">
                画面上（実測）{measuredHeightCm.toFixed(1)}cm
              </text>
            ) : null}
          </>
        );
      })()}
      {/* 服の採寸 */}
      {measureOverlay.garment && (() => {
        const g = measureOverlay.garment;
        const midX = (g.shoulderLeft[0] + g.shoulderRight[0]) / 2;
        const shoulderY = (g.shoulderLeft[1] + g.shoulderRight[1]) / 2;
        const hemY = g.hemCenter[1];
        const lengthTopY = g.lengthMeasureTop ? g.lengthMeasureTop[1] : shoulderY;
        const lengthTopHorizX = g.lengthMeasureTop ? g.lengthMeasureTop[0] : midX;
        const lineShoulderY = shoulderY + OFFSET_SHOULDER_Y;
        const lineLengthX = midX + OFFSET_LENGTH_X;
        const slL = g.shoulderLeft[0];
        const slR = g.shoulderRight[0];
        return (
          <>
            {g.sizeLabel && (
              <text x={midX} y={lineShoulderY - 22} fontSize={13} fontWeight="bold" fill="#1e293b" fontFamily="sans-serif" textAnchor="middle">
                {g.sizeLabel}
              </text>
            )}
            <line x1={slL + ARROW_INSET} y1={lineShoulderY} x2={slR - ARROW_INSET} y2={lineShoulderY} stroke="#2563eb" strokeWidth={3} strokeDasharray="6 4" />
            <path d={drawArrowLeftSm(slL, lineShoulderY)} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
            <path d={drawArrowRightSm(slR, lineShoulderY)} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
            <text x={slL} y={lineShoulderY - 6} fontSize={11} fill="#1d4ed8" fontFamily="sans-serif" textAnchor="middle">ここから</text>
            <text x={slR} y={lineShoulderY - 6} fontSize={11} fill="#1d4ed8" fontFamily="sans-serif" textAnchor="middle">ここまで</text>
            <text x={midX} y={lineShoulderY + 26} fontSize={16} fontWeight="bold" fill="#1d4ed8" fontFamily="sans-serif" textAnchor="middle">
              肩幅 {g.size.shoulder}cm
            </text>
            <text x={midX} y={lineShoulderY + 44} fontSize={10} fill="#64748b" fontFamily="sans-serif" textAnchor="middle">
              服の肩縫い左端〜右端
            </text>
            <line x1={lengthTopHorizX} y1={lengthTopY} x2={lineLengthX} y2={lengthTopY} stroke="#7c3aed" strokeWidth={2} opacity={0.9} />
            <line x1={g.hemCenter[0]} y1={hemY} x2={lineLengthX} y2={hemY} stroke="#7c3aed" strokeWidth={2} opacity={0.9} />
            <line x1={lineLengthX} y1={lengthTopY} x2={lineLengthX} y2={hemY} stroke="#7c3aed" strokeWidth={4} strokeDasharray="6 4" />
            <path d={drawArrowDown(lineLengthX, hemY)} fill="#7c3aed" stroke="#6d28d9" strokeWidth={2} />
            {(() => {
              const inputLen = g.size.length;
              const measuredLen = g.lengthMeasuredCm;
              const lengthMeasuredDiffers =
                measuredLen != null &&
                Number.isFinite(measuredLen) &&
                Math.abs(measuredLen - inputLen) > CM_INPUT_VS_MEASURED_EPS;
              const midLengthY = (lengthTopY + hemY) / 2;
              return (
                <>
                  <text
                    x={lineLengthX + 24}
                    y={midLengthY}
                    fontSize={16}
                    fontWeight="bold"
                    fill="#6d28d9"
                    fontFamily="sans-serif"
                    dominantBaseline="middle"
                  >
                    着丈 {inputLen}cm（入力）
                    {(inputLen < 40 || inputLen > 95) && measuredLen == null && (
                      <tspan fontSize={10} fill="#b91c1c">
                        {" "}
                        （要確認）
                      </tspan>
                    )}
                  </text>
                  {lengthMeasuredDiffers ? (
                    <text
                      x={lineLengthX + 24}
                      y={midLengthY + 18}
                      fontSize={10}
                      fill="#64748b"
                      fontFamily="sans-serif"
                      dominantBaseline="middle"
                    >
                      画面上（実測）{measuredLen!.toFixed(1)}cm
                    </text>
                  ) : null}
                </>
              );
            })()}
            {g.chestLeft && g.chestRight && (() => {
              const cLy = (g.chestLeft[1] + g.chestRight[1]) / 2 + OFFSET_CHEST_Y;
              const cMidX = (g.chestLeft[0] + g.chestRight[0]) / 2;
              return (
                <>
                  <line x1={g.chestLeft[0]} y1={g.chestLeft[1]} x2={g.chestLeft[0]} y2={cLy} stroke="#0d9488" strokeWidth={2} opacity={0.9} />
                  <line x1={g.chestRight[0]} y1={g.chestRight[1]} x2={g.chestRight[0]} y2={cLy} stroke="#0d9488" strokeWidth={2} opacity={0.9} />
                  <line x1={g.chestLeft[0] + ARROW_INSET} y1={cLy} x2={g.chestRight[0] - ARROW_INSET} y2={cLy} stroke="#0d9488" strokeWidth={3} strokeDasharray="6 4" />
                  <path d={drawArrowLeftSm(g.chestLeft[0], cLy)} fill="#0d9488" stroke="#0f766e" strokeWidth={1.5} />
                  <path d={drawArrowRightSm(g.chestRight[0], cLy)} fill="#0d9488" stroke="#0f766e" strokeWidth={1.5} />
                  <text x={g.chestLeft[0]} y={cLy - 8} fontSize={11} fill="#0f766e" fontFamily="sans-serif" textAnchor="middle">ここから</text>
                  <text x={g.chestRight[0]} y={cLy - 8} fontSize={11} fill="#0f766e" fontFamily="sans-serif" textAnchor="middle">ここまで</text>
                  <text x={cMidX} y={cLy + 26} fontSize={16} fontWeight="bold" fill="#0f766e" fontFamily="sans-serif" textAnchor="middle">身幅 {g.size.chest}cm</text>
                  <text x={cMidX} y={cLy + 44} fontSize={10} fill="#64748b" fontFamily="sans-serif" textAnchor="middle">胸周り付近の幅</text>
                </>
              );
            })()}
            {g.sleeveStart && g.sleeveEnd && (() => {
              const [sx, sy] = g.sleeveStart;
              const [ex, ey] = g.sleeveEnd;
              const inputSleeve = g.size.sleeve;
              const measuredSleeve = g.sleeveMeasuredCm;
              const sleeveMeasuredDiffers =
                measuredSleeve != null &&
                Number.isFinite(measuredSleeve) &&
                Math.abs(measuredSleeve - inputSleeve) > CM_INPUT_VS_MEASURED_EPS;
              const dx = ex - sx;
              const dy = ey - sy;
              const L = Math.hypot(dx, dy) || 1;
              const nx = -dy / L;
              const ny = dx / L;
              const d = OFFSET_SLEEVE_NORMAL;
              const slStart = [sx + nx * d, sy + ny * d] as const;
              const slEnd = [ex + nx * d, ey + ny * d] as const;
              const slMidX = (slStart[0] + slEnd[0]) / 2;
              const slMidY = (slStart[1] + slEnd[1]) / 2;
              const labelOffset = nx >= 0 ? -22 : 22;
              const hasPath = g.sleevePathPoints && g.sleevePathPoints.length >= 2;
              const strokeColor = hasPath ? "#dc2626" : "#c026d3";
              const fillColor = hasPath ? "#b91c1c" : "#a21caf";
              return (
                <>
                  {/* 袖丈計測ライン（左内側ライン沿い・赤線） */}
                  {hasPath ? (
                    <path
                      d={`M ${g.sleevePathPoints!.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>
                        袖丈 入力 {inputSleeve}cm
                        {measuredSleeve != null
                          ? ` · 画面上の実長（折れ線） ${measuredSleeve.toFixed(1)}cm`
                          : ""}
                      </title>
                    </path>
                  ) : (
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
                  )}
                  {/* プロット点 */}
                  <circle cx={sx} cy={sy} r={6} fill={strokeColor} fillOpacity={0.9} stroke={fillColor} strokeWidth={2}>
                    <title>袖丈 起点（肩）</title>
                  </circle>
                  <text x={sx - 4} y={sy - 10} fontSize={9} fill={fillColor} fontFamily="sans-serif" textAnchor="middle">肩</text>
                  <circle cx={ex} cy={ey} r={6} fill={strokeColor} fillOpacity={0.9} stroke={fillColor} strokeWidth={2}>
                    <title>袖丈 終点（袖口）</title>
                  </circle>
                  <text x={ex - 4} y={ey + 18} fontSize={9} fill={fillColor} fontFamily="sans-serif" textAnchor="middle">袖口</text>
                  {/* 長さラベル用の補助線 */}
                  <line x1={sx} y1={sy} x2={slStart[0]} y2={slStart[1]} stroke={strokeColor} strokeWidth={2} opacity={0.7} />
                  <line x1={ex} y1={ey} x2={slEnd[0]} y2={slEnd[1]} stroke={strokeColor} strokeWidth={2} opacity={0.7} />
                  <line x1={slStart[0]} y1={slStart[1]} x2={slEnd[0]} y2={slEnd[1]} stroke={strokeColor} strokeWidth={2} strokeDasharray="6 4" />
                  <path d={drawArrowDown(slEnd[0], slEnd[1])} fill={strokeColor} stroke={fillColor} strokeWidth={2} />
                  <text x={slMidX + labelOffset} y={slMidY} fontSize={16} fontWeight="bold" fill={fillColor} fontFamily="sans-serif" dominantBaseline="middle">
                    袖丈 {inputSleeve}cm（入力）
                  </text>
                  <text x={slMidX + labelOffset} y={slMidY + 18} fontSize={10} fill="#64748b" fontFamily="sans-serif" dominantBaseline="middle">
                    {sleeveMeasuredDiffers && measuredSleeve != null
                      ? `画面上（両端|ΔY|）${measuredSleeve.toFixed(1)}cm · `
                      : ""}
                    {hasPath ? "赤線＝計測区間" : "肩〜袖口"}
                  </text>
                </>
              );
            })()}
            {(!g.chestLeft || !g.chestRight) && (
              <text x={lineLengthX + 24} y={hemY + 36} fontSize={14} fontWeight="bold" fill="#0f766e" fontFamily="sans-serif" dominantBaseline="middle">
                身幅 {g.size.chest}cm（採寸のみ）
              </text>
            )}
            {(!g.sleeveStart || !g.sleeveEnd) && (
              <text x={lineLengthX + 24} y={hemY + 56} fontSize={14} fontWeight="bold" fill="#a21caf" fontFamily="sans-serif" dominantBaseline="middle">
                袖丈 {g.size.sleeve}cm（採寸のみ）
              </text>
            )}
          </>
        );
      })()}
    </g>
  );
}
