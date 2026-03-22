import { NUM_ONLY_RE, round10, tokenize } from "./tokenize";

function cubicBezierPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
  const y =
    mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
  return [x, y];
}

function quadBezierPoint(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  const mt = 1 - t;
  const x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0];
  const y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1];
  return [x, y];
}

/**
 * 三次・二次ベジエを折れ線に細分化（M/L/Z のみの path）。
 * 位置依存の変換を各制御点に個別適用すると曲線が自己交差・ギザ塗りになりやすいため、
 * 外腕シームなど「長い C の連なり」に対して tPath の前に通す。
 *
 * S/T/A は未対応（含まれる場合は元の d をそのまま返す）。
 */
export function flattenSvgPathToPolyline(d: string, cubicSegments = 14, quadSegments = 10): string {
  const toks = tokenize(d);
  if (toks.some((t) => t === "S" || t === "s" || t === "T" || t === "t" || t === "A" || t === "a")) {
    return d;
  }
  const nC = Math.max(4, Math.trunc(cubicSegments));
  const nQ = Math.max(4, Math.trunc(quadSegments));
  const parts: string[] = [];
  let i = 0,
    cx = 0,
    cy = 0;
  let subMx = 0,
    subMy = 0;
  let repeatCmd: string | null = null;
  const pushM = (x: number, y: number) => {
    parts.push(`M${round10(x)} ${round10(y)}`);
    cx = x;
    cy = y;
  };
  const pushL = (x: number, y: number) => {
    parts.push(`L${round10(x)} ${round10(y)}`);
    cx = x;
    cy = y;
  };

  const emitCubicAbs = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    const p0: [number, number] = [cx, cy];
    const p1: [number, number] = [x1, y1];
    const p2: [number, number] = [x2, y2];
    const p3: [number, number] = [x, y];
    for (let s = 1; s <= nC; s++) {
      const p = cubicBezierPoint(p0, p1, p2, p3, s / nC);
      pushL(p[0], p[1]);
    }
  };

  const emitQuadAbs = (x1: number, y1: number, x: number, y: number) => {
    const p0: [number, number] = [cx, cy];
    const p1: [number, number] = [x1, y1];
    const p2: [number, number] = [x, y];
    for (let s = 1; s <= nQ; s++) {
      const p = quadBezierPoint(p0, p1, p2, s / nQ);
      pushL(p[0], p[1]);
    }
  };

  while (i < toks.length) {
    const c = toks[i];
    i++;
    if (NUM_ONLY_RE.test(c)) {
      i--;
      const rc = repeatCmd ?? "L";
      if (rc === "L" || rc === "l") {
        const rel = rc === "l";
        if (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
          let px = +toks[i++],
            py = +toks[i++];
          if (rel) {
            px += cx;
            py += cy;
          }
          pushL(px, py);
        } else {
          i++;
        }
      } else if (rc === "H" || rc === "h") {
        const rel = rc === "h";
        if (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
          let px = +toks[i++];
          if (rel) px += cx;
          pushL(px, cy);
        } else {
          i++;
        }
      } else if (rc === "V" || rc === "v") {
        const rel = rc === "v";
        if (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
          let py = +toks[i++];
          if (rel) py += cy;
          pushL(cx, py);
        } else {
          i++;
        }
      } else if (rc === "C" || rc === "c") {
        const rel = rc === "c";
        if (
          i + 5 < toks.length &&
          NUM_ONLY_RE.test(toks[i]) &&
          NUM_ONLY_RE.test(toks[i + 1]) &&
          NUM_ONLY_RE.test(toks[i + 2]) &&
          NUM_ONLY_RE.test(toks[i + 3]) &&
          NUM_ONLY_RE.test(toks[i + 4]) &&
          NUM_ONLY_RE.test(toks[i + 5])
        ) {
          let x1 = +toks[i++],
            y1 = +toks[i++],
            x2 = +toks[i++],
            y2 = +toks[i++];
          let x = +toks[i++],
            y = +toks[i++];
          if (rel) {
            x1 += cx;
            y1 += cy;
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          emitCubicAbs(x1, y1, x2, y2, x, y);
        } else {
          i++;
        }
      } else if (rc === "Q" || rc === "q") {
        const rel = rc === "q";
        if (
          i + 3 < toks.length &&
          NUM_ONLY_RE.test(toks[i]) &&
          NUM_ONLY_RE.test(toks[i + 1]) &&
          NUM_ONLY_RE.test(toks[i + 2]) &&
          NUM_ONLY_RE.test(toks[i + 3])
        ) {
          let x1 = +toks[i++],
            y1 = +toks[i++];
          let x = +toks[i++],
            y = +toks[i++];
          if (rel) {
            x1 += cx;
            y1 += cy;
            x += cx;
            y += cy;
          }
          emitQuadAbs(x1, y1, x, y);
        } else {
          i++;
        }
      } else {
        i++;
      }
      continue;
    }

    if (c === "M" || c === "m") {
      const implicitRel = c === "m";
      let x = +toks[i++],
        y = +toks[i++];
      if (implicitRel) {
        x += cx;
        y += cy;
      }
      subMx = x;
      subMy = y;
      pushM(x, y);
      while (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
        let px = +toks[i++],
          py = +toks[i++];
        if (implicitRel) {
          px += cx;
          py += cy;
        }
        pushL(px, py);
      }
      repeatCmd = implicitRel ? "l" : "L";
    } else if (c === "L" || c === "l") {
      const rel = c === "l";
      while (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
        let px = +toks[i++],
          py = +toks[i++];
        if (rel) {
          px += cx;
          py += cy;
        }
        pushL(px, py);
      }
      repeatCmd = rel ? "l" : "L";
    } else if (c === "H" || c === "h") {
      const rel = c === "h";
      while (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
        let px = +toks[i++];
        if (rel) px += cx;
        pushL(px, cy);
      }
      repeatCmd = rel ? "h" : "H";
    } else if (c === "V" || c === "v") {
      const rel = c === "v";
      while (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
        let py = +toks[i++];
        if (rel) py += cy;
        pushL(cx, py);
      }
      repeatCmd = rel ? "v" : "V";
    } else if (c === "C" || c === "c") {
      const rel = c === "c";
      while (
        i + 5 < toks.length &&
        NUM_ONLY_RE.test(toks[i]) &&
        NUM_ONLY_RE.test(toks[i + 1]) &&
        NUM_ONLY_RE.test(toks[i + 2]) &&
        NUM_ONLY_RE.test(toks[i + 3]) &&
        NUM_ONLY_RE.test(toks[i + 4]) &&
        NUM_ONLY_RE.test(toks[i + 5])
      ) {
        let x1 = +toks[i++],
          y1 = +toks[i++],
          x2 = +toks[i++],
          y2 = +toks[i++];
        let x = +toks[i++],
          y = +toks[i++];
        if (rel) {
          x1 += cx;
          y1 += cy;
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        emitCubicAbs(x1, y1, x2, y2, x, y);
      }
      repeatCmd = rel ? "c" : "C";
    } else if (c === "Q" || c === "q") {
      const rel = c === "q";
      while (
        i + 3 < toks.length &&
        NUM_ONLY_RE.test(toks[i]) &&
        NUM_ONLY_RE.test(toks[i + 1]) &&
        NUM_ONLY_RE.test(toks[i + 2]) &&
        NUM_ONLY_RE.test(toks[i + 3])
      ) {
        let x1 = +toks[i++],
          y1 = +toks[i++];
        let x = +toks[i++],
          y = +toks[i++];
        if (rel) {
          x1 += cx;
          y1 += cy;
          x += cx;
          y += cy;
        }
        emitQuadAbs(x1, y1, x, y);
      }
      repeatCmd = rel ? "q" : "Q";
    } else if (c === "Z" || c === "z") {
      parts.push("Z");
      cx = subMx;
      cy = subMy;
      repeatCmd = null;
    }
  }
  const out = parts.join("");
  return out.length > 0 ? out : d;
}
