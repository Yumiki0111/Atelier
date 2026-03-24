"use client";

import type {
  FittingCanvasRigArmAngleDebug,
  RigRedLineArmDiagram,
} from "../compute/fittingCanvasCompute";
import {
  neckAxisShoulderGeom,
  rigDiagramShoulderWrist,
  shoulderAngleDiagramTwoRigEdges,
  shoulderAngleDiagramVertical,
} from "./FittingCanvasRigAngleDiagramGeom";

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
