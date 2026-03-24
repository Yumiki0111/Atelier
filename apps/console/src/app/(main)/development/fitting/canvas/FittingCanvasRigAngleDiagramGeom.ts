"use client";

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
export function shoulderAngleDiagramVertical(
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
export function shoulderAngleDiagramTwoRigEdges(
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
export function neckAxisShoulderGeom(
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
export function rigDiagramShoulderWrist(
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
