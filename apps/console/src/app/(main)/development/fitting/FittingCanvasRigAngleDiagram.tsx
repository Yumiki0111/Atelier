"use client";

import type {
  FittingCanvasRigArmAngleDebug,
  RigRedLineArmDiagram,
} from "./fittingCanvasCompute";

function norm2(dx: number, dy: number): [number, number] {
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) return [0, 1];
  return [dx / l, dy / l];
}

type ShoulderAngleGeom = {
  rayTorso: [[number, number], [number, number]];
  rayArm: [[number, number], [number, number]];
  arcD: string;
  labelX: number;
  labelY: number;
};

/** 正面の中心縦（+Y 下）と上腕方向のなす角を弧で表示 */
function shoulderAngleDiagramVertical(
  shoulder: [number, number],
  wrist: [number, number],
  rayLen: number,
  arcR: number,
  labelR: number
): ShoulderAngleGeom | null {
  const [sx, sy] = shoulder;
  const [wx, wy] = wrist;
  const [utx, uty] = [0, 1];
  const [uax, uay] = norm2(wx - sx, wy - sy);

  const dot = Math.max(-1, Math.min(1, utx * uax + uty * uay));
  const interiorDeg = (Math.acos(dot) * 180) / Math.PI;
  if (!Number.isFinite(interiorDeg) || interiorDeg < 0.05) return null;

  const t1 = Math.atan2(uty, utx);
  const t2 = Math.atan2(uay, uax);
  let dt = t2 - t1;
  while (dt > Math.PI) dt -= 2 * Math.PI;
  while (dt < -Math.PI) dt += 2 * Math.PI;
  const sweep = dt > 0 ? 1 : 0;
  const largeArc = Math.abs(dt) > Math.PI ? 1 : 0;

  const x1 = sx + arcR * Math.cos(t1);
  const y1 = sy + arcR * Math.sin(t1);
  const x2 = sx + arcR * Math.cos(t2);
  const y2 = sy + arcR * Math.sin(t2);
  const arcD = `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${x2} ${y2}`;

  const bx = utx + uax;
  const by = uty + uay;
  const bl = Math.hypot(bx, by);
  const ux = bl > 1e-9 ? bx / bl : 0;
  const uy = bl > 1e-9 ? by / bl : -1;
  const labelX = sx + labelR * ux;
  const labelY = sy + labelR * uy;

  const rayTorso: [[number, number], [number, number]] = [
    [sx, sy],
    [sx + rayLen * utx, sy + rayLen * uty],
  ];
  const rayArm: [[number, number], [number, number]] = [
    [sx, sy],
    [sx + rayLen * uax, sy + rayLen * uay],
  ];

  return { rayTorso, rayArm, arcD, labelX, labelY };
}

/** 同一頂点から出る2リグ辺（例: 鎖骨・上腕）のなす内角を弧で表示 */
function shoulderAngleDiagramTwoRigEdges(
  pivot: [number, number],
  clavicleEnd: [number, number],
  armEnd: [number, number],
  rayLen: number,
  arcR: number,
  labelR: number
): ShoulderAngleGeom | null {
  const [sx, sy] = pivot;
  const [u1x, u1y] = norm2(clavicleEnd[0] - sx, clavicleEnd[1] - sy);
  const [u2x, u2y] = norm2(armEnd[0] - sx, armEnd[1] - sy);

  const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
  const interiorDeg = (Math.acos(dot) * 180) / Math.PI;
  if (!Number.isFinite(interiorDeg) || interiorDeg < 0.05) return null;

  const t1 = Math.atan2(u1y, u1x);
  const t2 = Math.atan2(u2y, u2x);
  let dt = t2 - t1;
  while (dt > Math.PI) dt -= 2 * Math.PI;
  while (dt < -Math.PI) dt += 2 * Math.PI;
  const sweep = dt > 0 ? 1 : 0;
  const largeArc = Math.abs(dt) > Math.PI ? 1 : 0;

  const x1 = sx + arcR * Math.cos(t1);
  const y1 = sy + arcR * Math.sin(t1);
  const x2 = sx + arcR * Math.cos(t2);
  const y2 = sy + arcR * Math.sin(t2);
  const arcD = `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${x2} ${y2}`;

  const bx = u1x + u2x;
  const by = u1y + u2y;
  const bl = Math.hypot(bx, by);
  const ux = bl > 1e-9 ? bx / bl : 0;
  const uy = bl > 1e-9 ? by / bl : -1;
  const labelX = sx + labelR * ux;
  const labelY = sy + labelR * uy;

  const rayClavicle: [[number, number], [number, number]] = [
    [sx, sy],
    [sx + rayLen * u1x, sy + rayLen * u1y],
  ];
  const rayArm: [[number, number], [number, number]] = [
    [sx, sy],
    [sx + rayLen * u2x, sy + rayLen * u2y],
  ];

  return { rayTorso: rayClavicle, rayArm, arcD, labelX, labelY };
}

type NeckAxisShoulderGeom = {
  raySpine: [[number, number], [number, number]];
  rayShoulder: [[number, number], [number, number]];
  arcD: string;
  labelX: number;
  labelY: number;
};

/** 首元（鎖骨合流）で中心軸（下向き）と「首元→肩リグ」のなす内角 */
function neckAxisShoulderGeom(
  neck: [number, number],
  shoulder: [number, number],
  spineUx: number,
  spineUy: number,
  rayLen: number,
  arcR: number,
  labelR: number
): NeckAxisShoulderGeom | null {
  const [sx, sy] = neck;
  const [shx, shy] = norm2(shoulder[0] - sx, shoulder[1] - sy);
  const dot = Math.max(-1, Math.min(1, spineUx * shx + spineUy * shy));
  const interiorDeg = (Math.acos(dot) * 180) / Math.PI;
  if (!Number.isFinite(interiorDeg) || interiorDeg < 0.05) return null;

  const t1 = Math.atan2(spineUy, spineUx);
  const t2 = Math.atan2(shy, shx);
  let dt = t2 - t1;
  while (dt > Math.PI) dt -= 2 * Math.PI;
  while (dt < -Math.PI) dt += 2 * Math.PI;
  const sweep = dt > 0 ? 1 : 0;
  const largeArc = Math.abs(dt) > Math.PI ? 1 : 0;

  const x1 = sx + arcR * Math.cos(t1);
  const y1 = sy + arcR * Math.sin(t1);
  const x2 = sx + arcR * Math.cos(t2);
  const y2 = sy + arcR * Math.sin(t2);
  const arcD = `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${x2} ${y2}`;

  const bx = spineUx + shx;
  const by = spineUy + shy;
  const bl = Math.hypot(bx, by);
  const ux = bl > 1e-9 ? bx / bl : 0;
  const uy = bl > 1e-9 ? by / bl : -1;
  const labelX = sx + labelR * ux;
  const labelY = sy + labelR * uy;

  const raySpine: [[number, number], [number, number]] = [
    [sx, sy],
    [sx + rayLen * spineUx, sy + rayLen * spineUy],
  ];
  const rayShoulder: [[number, number], [number, number]] = [
    [sx, sy],
    [sx + rayLen * shx, sy + rayLen * shy],
  ];

  return { raySpine, rayShoulder, arcD, labelX, labelY };
}

/**
 * 図の頂点を胴体肩に合わせる。上腕方向は腕リグ（肩→袖先）の単位ベクトルを維持し、ψ・θ の数値は変わらない。
 */
function rigDiagramShoulderWrist(
  armShoulder: [number, number],
  armWrist: [number, number],
  bodyShoulder: [number, number] | null | undefined
): { shoulder: [number, number]; wrist: [number, number]; boneLen: number } {
  const dx = armWrist[0] - armShoulder[0];
  const dy = armWrist[1] - armShoulder[1];
  const boneLen = Math.hypot(dx, dy);
  if (!bodyShoulder || boneLen < 1e-6) {
    return { shoulder: armShoulder, wrist: armWrist, boneLen };
  }
  const ux = dx / boneLen;
  const uy = dy / boneLen;
  return {
    shoulder: bodyShoulder,
    wrist: [bodyShoulder[0] + ux * boneLen, bodyShoulder[1] + uy * boneLen],
    boneLen,
  };
}

export interface FittingCanvasRigAngleDiagramProps {
  debug: FittingCanvasRigArmAngleDebug;
  /** 基準リグを脊髄相似配置したパス由来（`rigLineWarpedRigViewPaths`）。肩・首元の4角デバッグはここだけ */
  rigRedLineArmDiagram?: RigRedLineArmDiagram | null;
  /** 胴体輪郭の左右肩（`shoulderDebug.bodyShoulderContour`）。無いときは腕アウトライン肩。 */
  bodyShoulderL?: [number, number] | null;
  bodyShoulderR?: [number, number] | null;
}

/**
 * 赤リグ ON 時: 首元で中心軸↔肩線、肩で鎖骨↔腕の内角を表示。
 * それ以外は胴体基準の縦と上腕アウトラインの角（従来どおり）。
 */
export function FittingCanvasRigAngleDiagram({
  debug,
  rigRedLineArmDiagram = null,
  bodyShoulderL = null,
  bodyShoulderR = null,
}: FittingCanvasRigAngleDiagramProps) {
  const useRedRig = rigRedLineArmDiagram != null;
  const leftSw = useRedRig
    ? {
        shoulder: rigRedLineArmDiagram!.shoulderL,
        wrist: rigRedLineArmDiagram!.wristL,
        boneLen: Math.hypot(
          rigRedLineArmDiagram!.wristL[0] - rigRedLineArmDiagram!.shoulderL[0],
          rigRedLineArmDiagram!.wristL[1] - rigRedLineArmDiagram!.shoulderL[1]
        ),
      }
    : rigDiagramShoulderWrist(
        debug.warpedShoulderL,
        debug.warpedWristL,
        bodyShoulderL
      );
  const rightSw = useRedRig
    ? {
        shoulder: rigRedLineArmDiagram!.shoulderR,
        wrist: rigRedLineArmDiagram!.wristR,
        boneLen: Math.hypot(
          rigRedLineArmDiagram!.wristR[0] - rigRedLineArmDiagram!.shoulderR[0],
          rigRedLineArmDiagram!.wristR[1] - rigRedLineArmDiagram!.shoulderR[1]
        ),
      }
    : rigDiagramShoulderWrist(
        debug.warpedShoulderR,
        debug.warpedWristR,
        bodyShoulderR
      );

  const intL = useRedRig
    ? rigRedLineArmDiagram!.interiorClavicleArmDegL
    : debug.interiorShoulderVerticalDegL;
  const intR = useRedRig
    ? rigRedLineArmDiagram!.interiorClavicleArmDegR
    : debug.interiorShoulderVerticalDegR;
  const axisL = useRedRig
    ? rigRedLineArmDiagram!.warpedArmAxisDegL
    : debug.warpedArmAxisDegL;
  const axisR = useRedRig
    ? rigRedLineArmDiagram!.warpedArmAxisDegR
    : debug.warpedArmAxisDegR;
  const clavAxisL = useRedRig ? rigRedLineArmDiagram!.warpedClavicleAxisDegL : null;
  const clavAxisR = useRedRig ? rigRedLineArmDiagram!.warpedClavicleAxisDegR : null;
  const spineNeckL = useRedRig ? rigRedLineArmDiagram!.interiorSpineShoulderDegL : null;
  const spineNeckR = useRedRig ? rigRedLineArmDiagram!.interiorSpineShoulderDegR : null;

  const rayLenL = Math.max(100, Math.min(220, leftSw.boneLen * 0.42));
  const rayLenR = Math.max(100, Math.min(220, rightSw.boneLen * 0.42));
  const arcRL = Math.max(72, Math.min(130, leftSw.boneLen * 0.28));
  const arcRR = Math.max(72, Math.min(130, rightSw.boneLen * 0.28));

  const left = useRedRig
    ? shoulderAngleDiagramTwoRigEdges(
        rigRedLineArmDiagram!.shoulderL,
        rigRedLineArmDiagram!.clavicleEndL,
        rigRedLineArmDiagram!.wristL,
        rayLenL,
        arcRL,
        arcRL + 48
      )
    : shoulderAngleDiagramVertical(
        leftSw.shoulder,
        leftSw.wrist,
        rayLenL,
        arcRL,
        arcRL + 48
      );
  const right = useRedRig
    ? shoulderAngleDiagramTwoRigEdges(
        rigRedLineArmDiagram!.shoulderR,
        rigRedLineArmDiagram!.clavicleEndR,
        rigRedLineArmDiagram!.wristR,
        rayLenR,
        arcRR,
        arcRR + 48
      )
    : shoulderAngleDiagramVertical(
        rightSw.shoulder,
        rightSw.wrist,
        rayLenR,
        arcRR,
        arcRR + 48
      );

  const [spUx, spUy] = useRedRig ? rigRedLineArmDiagram!.spineDownUnit : [0, 1];
  const neckRayLen = 88;
  const neckArcR = 46;
  const neckLabelR = neckArcR + 26;
  const leftNeckGeom = useRedRig
    ? neckAxisShoulderGeom(
        rigRedLineArmDiagram!.neckCenter,
        rigRedLineArmDiagram!.shoulderL,
        spUx,
        spUy,
        neckRayLen,
        neckArcR,
        neckLabelR
      )
    : null;
  const rightNeckGeom = useRedRig
    ? neckAxisShoulderGeom(
        rigRedLineArmDiagram!.neckCenter,
        rigRedLineArmDiagram!.shoulderR,
        spUx,
        spUy,
        neckRayLen,
        neckArcR,
        neckLabelR
      )
    : null;

  const fontMain =
    "ui-serif, 'Times New Roman', 'STIX Two Text', 'Noto Serif JP', 'Hiragino Mincho ProN', serif";
  const fontSub = "ui-monospace, 'SF Mono', Menlo, monospace";
  const rayStrokeClavicle = useRedRig ? "#b91c1c" : "#0f172a";
  const rayStrokeArm = useRedRig ? "#dc2626" : "#0f172a";

  return (
    <g aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      {useRedRig && rigRedLineArmDiagram != null && (leftNeckGeom != null || rightNeckGeom != null) ? (
        <g>
          <line
            x1={rigRedLineArmDiagram.neckCenter[0]}
            y1={rigRedLineArmDiagram.neckCenter[1]}
            x2={rigRedLineArmDiagram.neckCenter[0] + neckRayLen * spUx}
            y2={rigRedLineArmDiagram.neckCenter[1] + neckRayLen * spUy}
            stroke="#64748b"
            strokeWidth={3.5}
            strokeDasharray="6 5"
            opacity={0.9}
          />
          <circle
            cx={rigRedLineArmDiagram.neckCenter[0]}
            cy={rigRedLineArmDiagram.neckCenter[1]}
            r={7}
            fill="#1e293b"
          />
          {leftNeckGeom ? (
            <g>
              <line
                x1={leftNeckGeom.rayShoulder[0][0]}
                y1={leftNeckGeom.rayShoulder[0][1]}
                x2={leftNeckGeom.rayShoulder[1][0]}
                y2={leftNeckGeom.rayShoulder[1][1]}
                stroke="#c2410c"
                strokeWidth={3.5}
                opacity={0.92}
              />
              <path d={leftNeckGeom.arcD} stroke="#059669" strokeWidth={5} fill="none" opacity={0.95} />
              <text
                x={leftNeckGeom.labelX}
                y={leftNeckGeom.labelY - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#047857"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth={7}
                paintOrder="stroke fill"
                fontSize={26}
                fontWeight={700}
                fontFamily={fontSub}
              >
                {spineNeckL != null && Number.isFinite(spineNeckL) ? `${spineNeckL.toFixed(1)}°` : "—"}
              </text>
              <text
                x={leftNeckGeom.labelX}
                y={leftNeckGeom.labelY + 22}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#334155"
                stroke="rgba(255,255,255,0.88)"
                strokeWidth={5}
                paintOrder="stroke fill"
                fontSize={20}
                fontFamily={fontSub}
              >
                軸↔肩 L
              </text>
            </g>
          ) : null}
          {rightNeckGeom ? (
            <g>
              <line
                x1={rightNeckGeom.rayShoulder[0][0]}
                y1={rightNeckGeom.rayShoulder[0][1]}
                x2={rightNeckGeom.rayShoulder[1][0]}
                y2={rightNeckGeom.rayShoulder[1][1]}
                stroke="#c2410c"
                strokeWidth={3.5}
                opacity={0.92}
              />
              <path d={rightNeckGeom.arcD} stroke="#0d9488" strokeWidth={5} fill="none" opacity={0.95} />
              <text
                x={rightNeckGeom.labelX}
                y={rightNeckGeom.labelY - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0f766e"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth={7}
                paintOrder="stroke fill"
                fontSize={26}
                fontWeight={700}
                fontFamily={fontSub}
              >
                {spineNeckR != null && Number.isFinite(spineNeckR) ? `${spineNeckR.toFixed(1)}°` : "—"}
              </text>
              <text
                x={rightNeckGeom.labelX}
                y={rightNeckGeom.labelY + 22}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#334155"
                stroke="rgba(255,255,255,0.88)"
                strokeWidth={5}
                paintOrder="stroke fill"
                fontSize={20}
                fontFamily={fontSub}
              >
                軸↔肩 R
              </text>
            </g>
          ) : null}
        </g>
      ) : null}
      {left ? (
        <g>
          <line
            x1={left.rayTorso[0][0]}
            y1={left.rayTorso[0][1]}
            x2={left.rayTorso[1][0]}
            y2={left.rayTorso[1][1]}
            stroke={rayStrokeClavicle}
            strokeWidth={5}
            strokeDasharray={useRedRig ? undefined : "10 8"}
            opacity={0.92}
          />
          <line
            x1={left.rayArm[0][0]}
            y1={left.rayArm[0][1]}
            x2={left.rayArm[1][0]}
            y2={left.rayArm[1][1]}
            stroke={rayStrokeArm}
            strokeWidth={5}
            opacity={0.92}
          />
          <path d={left.arcD} stroke="#7c3aed" strokeWidth={6} fill="none" opacity={0.95} />
          <circle
            cx={leftSw.shoulder[0]}
            cy={leftSw.shoulder[1]}
            r={10}
            fill={useRedRig ? "#991b1b" : "#0f172a"}
          />
          <text
            x={left.labelX}
            y={left.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#4c1d95"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={10}
            paintOrder="stroke fill"
            fontSize={56}
            fontWeight={600}
            fontStyle="italic"
            fontFamily={fontMain}
          >
            {`${intL.toFixed(1)}°`}
          </text>
          <text
            x={left.labelX}
            y={left.labelY + 58}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#475569"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={8}
            paintOrder="stroke fill"
            fontSize={34}
            fontFamily={fontSub}
          >
            {useRedRig && clavAxisL != null
              ? `鎖骨↔腕 内角 · θ鎖骨 ${clavAxisL >= 0 ? "+" : ""}${clavAxisL.toFixed(1)}° · θ腕 ${axisL >= 0 ? "+" : ""}${axisL.toFixed(1)}°`
              : `ψ_L（縦） θ ${axisL >= 0 ? "+" : ""}${axisL.toFixed(1)}°`}
          </text>
        </g>
      ) : null}
      {right ? (
        <g>
          <line
            x1={right.rayTorso[0][0]}
            y1={right.rayTorso[0][1]}
            x2={right.rayTorso[1][0]}
            y2={right.rayTorso[1][1]}
            stroke={rayStrokeClavicle}
            strokeWidth={5}
            strokeDasharray={useRedRig ? undefined : "10 8"}
            opacity={0.92}
          />
          <line
            x1={right.rayArm[0][0]}
            y1={right.rayArm[0][1]}
            x2={right.rayArm[1][0]}
            y2={right.rayArm[1][1]}
            stroke={rayStrokeArm}
            strokeWidth={5}
            opacity={0.92}
          />
          <path d={right.arcD} stroke="#0891b2" strokeWidth={6} fill="none" opacity={0.95} />
          <circle
            cx={rightSw.shoulder[0]}
            cy={rightSw.shoulder[1]}
            r={10}
            fill={useRedRig ? "#991b1b" : "#0f172a"}
          />
          <text
            x={right.labelX}
            y={right.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#155e75"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={10}
            paintOrder="stroke fill"
            fontSize={56}
            fontWeight={600}
            fontStyle="italic"
            fontFamily={fontMain}
          >
            {`${intR.toFixed(1)}°`}
          </text>
          <text
            x={right.labelX}
            y={right.labelY + 58}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#475569"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={8}
            paintOrder="stroke fill"
            fontSize={34}
            fontFamily={fontSub}
          >
            {useRedRig && clavAxisR != null
              ? `鎖骨↔腕 内角 · θ鎖骨 ${clavAxisR >= 0 ? "+" : ""}${clavAxisR.toFixed(1)}° · θ腕 ${axisR >= 0 ? "+" : ""}${axisR.toFixed(1)}°`
              : `ψ_R（縦） θ ${axisR >= 0 ? "+" : ""}${axisR.toFixed(1)}°`}
          </text>
        </g>
      ) : null}
    </g>
  );
}
