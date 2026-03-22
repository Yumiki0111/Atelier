import type { PointTransform } from "../types";
import { NUM_ONLY_RE, tokenize } from "./tokenize";

export function extractPoints(d: string, fn: PointTransform): [number, number][] {
  const toks = tokenize(d);
  const pts: [number, number][] = [];
  let i = 0,
    cx = 0,
    cy = 0;
  let repeatCmd: string | null = null;
  let subMx = 0,
    subMy = 0;

  const consumeCubic = (rel: boolean): boolean => {
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
      cx = x;
      cy = y;
      pts.push(fn(cx, cy));
      return true;
    }
    return false;
  };

  const consumeQuad = (rel: boolean): boolean => {
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
      cx = x;
      cy = y;
      pts.push(fn(cx, cy));
      return true;
    }
    return false;
  };

  const consumeSmooth = (rel: boolean): boolean => {
    if (
      i + 3 < toks.length &&
      NUM_ONLY_RE.test(toks[i]) &&
      NUM_ONLY_RE.test(toks[i + 1]) &&
      NUM_ONLY_RE.test(toks[i + 2]) &&
      NUM_ONLY_RE.test(toks[i + 3])
    ) {
      let x2 = +toks[i++],
        y2 = +toks[i++];
      let x = +toks[i++],
        y = +toks[i++];
      if (rel) {
        x2 += cx;
        y2 += cy;
        x += cx;
        y += cy;
      }
      cx = x;
      cy = y;
      pts.push(fn(cx, cy));
      return true;
    }
    return false;
  };

  const consumeArc = (rel: boolean): boolean => {
    if (
      i + 6 < toks.length &&
      NUM_ONLY_RE.test(toks[i]) &&
      NUM_ONLY_RE.test(toks[i + 1]) &&
      NUM_ONLY_RE.test(toks[i + 2]) &&
      NUM_ONLY_RE.test(toks[i + 3]) &&
      NUM_ONLY_RE.test(toks[i + 4]) &&
      NUM_ONLY_RE.test(toks[i + 5]) &&
      NUM_ONLY_RE.test(toks[i + 6])
    ) {
      i += 5; // rx ry x-axis-rotation large-arc sweep
      let x = +toks[i++],
        y = +toks[i++];
      if (rel) {
        x += cx;
        y += cy;
      }
      cx = x;
      cy = y;
      pts.push(fn(cx, cy));
      return true;
    }
    return false;
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
            cx += px;
            cy += py;
          } else {
            cx = px;
            cy = py;
          }
          pts.push(fn(cx, cy));
        } else {
          i++;
        }
      } else if (rc === "H" || rc === "h") {
        const rel = rc === "h";
        if (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
          let px = +toks[i++];
          if (rel) cx += px;
          else cx = px;
          pts.push(fn(cx, cy));
        } else {
          i++;
        }
      } else if (rc === "V" || rc === "v") {
        const rel = rc === "v";
        if (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
          let py = +toks[i++];
          if (rel) cy += py;
          else cy = py;
          pts.push(fn(cx, cy));
        } else {
          i++;
        }
      } else if (rc === "C" || rc === "c") {
        if (!consumeCubic(rc === "c")) i++;
      } else if (rc === "Q" || rc === "q") {
        if (!consumeQuad(rc === "q")) i++;
      } else if (rc === "S" || rc === "s") {
        if (!consumeSmooth(rc === "s")) i++;
      } else if (rc === "T" || rc === "t") {
        const rel = rc === "t";
        if (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
          let x = +toks[i++],
            y = +toks[i++];
          if (rel) {
            x += cx;
            y += cy;
          }
          cx = x;
          cy = y;
          pts.push(fn(cx, cy));
        } else {
          i++;
        }
      } else if (rc === "A" || rc === "a") {
        if (!consumeArc(rc === "a")) i++;
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
        cx += x;
        cy += y;
      } else {
        cx = x;
        cy = y;
      }
      subMx = cx;
      subMy = cy;
      pts.push(fn(cx, cy));
      while (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
        let px = +toks[i++],
          py = +toks[i++];
        if (implicitRel) {
          cx += px;
          cy += py;
        } else {
          cx = px;
          cy = py;
        }
        pts.push(fn(cx, cy));
      }
      repeatCmd = implicitRel ? "l" : "L";
    } else if (c === "L" || c === "l") {
      const rel = c === "l";
      while (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
        let px = +toks[i++],
          py = +toks[i++];
        if (rel) {
          cx += px;
          cy += py;
        } else {
          cx = px;
          cy = py;
        }
        pts.push(fn(cx, cy));
      }
      repeatCmd = rel ? "l" : "L";
    } else if (c === "H" || c === "h") {
      const rel = c === "h";
      while (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
        let px = +toks[i++];
        if (rel) cx += px;
        else cx = px;
        pts.push(fn(cx, cy));
      }
      repeatCmd = rel ? "h" : "H";
    } else if (c === "V" || c === "v") {
      const rel = c === "v";
      while (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
        let py = +toks[i++];
        if (rel) cy += py;
        else cy = py;
        pts.push(fn(cx, cy));
      }
      repeatCmd = rel ? "v" : "V";
    } else if (c === "C" || c === "c") {
      const rel = c === "c";
      while (consumeCubic(rel)) {
        /* multi */
      }
      repeatCmd = rel ? "c" : "C";
    } else if (c === "Q" || c === "q") {
      const rel = c === "q";
      while (consumeQuad(rel)) {
        /* multi */
      }
      repeatCmd = rel ? "q" : "Q";
    } else if (c === "S" || c === "s") {
      const rel = c === "s";
      while (consumeSmooth(rel)) {
        /* multi */
      }
      repeatCmd = rel ? "s" : "S";
    } else if (c === "T" || c === "t") {
      const rel = c === "t";
      while (i + 1 < toks.length && NUM_ONLY_RE.test(toks[i]) && NUM_ONLY_RE.test(toks[i + 1])) {
        let x = +toks[i++],
          y = +toks[i++];
        if (rel) {
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        pts.push(fn(cx, cy));
      }
      repeatCmd = rel ? "t" : "T";
    } else if (c === "A" || c === "a") {
      const rel = c === "a";
      while (consumeArc(rel)) {
        /* multi */
      }
      repeatCmd = rel ? "a" : "A";
    } else if (c === "Z" || c === "z") {
      cx = subMx;
      cy = subMy;
      repeatCmd = null;
    }
  }
  return pts;
}

/** path の全頂点を取得（恒等変換）。M,L,H,V,C,Q,S,T,A の終点を収集 */
export function getPathPoints(d: string): [number, number][] {
  return extractPoints(d, (x, y) => [x, y]);
}
