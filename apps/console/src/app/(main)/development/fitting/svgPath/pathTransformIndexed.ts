import { NUM_ONLY_RE, round10, tokenize } from "./tokenize";

export function tPathWithPointIndex(
  d: string,
  fn: (pointIndex: number, x: number, y: number) => [number, number]
): string {
  const toks = tokenize(d);
  let result = "";
  let i = 0,
    cx = 0,
    cy = 0,
    pointIndex = 0;
  let repeatCmd: string | null = null;
  let subMx = 0,
    subMy = 0;

  const emitCubic = (rel: boolean) => {
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
      const pi = pointIndex;
      const [nx1, ny1] = fn(pi, x1, y1);
      const [nx2, ny2] = fn(pi, x2, y2);
      const [nx, ny] = fn(pi, cx, cy);
      result += `C${round10(nx1)} ${round10(ny1)} ${round10(nx2)} ${round10(ny2)} ${round10(nx)} ${round10(ny)}`;
      pointIndex++;
      return true;
    }
    return false;
  };

  const emitQuad = (rel: boolean) => {
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
      const pi = pointIndex;
      const [nx1, ny1] = fn(pi, x1, y1);
      const [nx, ny] = fn(pi, cx, cy);
      result += `Q${round10(nx1)} ${round10(ny1)} ${round10(nx)} ${round10(ny)}`;
      pointIndex++;
      return true;
    }
    return false;
  };

  const emitSmooth = (rel: boolean) => {
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
      const pi = pointIndex;
      const [nx2, ny2] = fn(pi, x2, y2);
      const [nx, ny] = fn(pi, cx, cy);
      result += `S${round10(nx2)} ${round10(ny2)} ${round10(nx)} ${round10(ny)}`;
      pointIndex++;
      return true;
    }
    return false;
  };

  const emitArc = (rel: boolean) => {
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
      const rx = +toks[i++],
        ry = +toks[i++],
        rot = +toks[i++],
        laf = +toks[i++],
        sf = +toks[i++];
      let x = +toks[i++],
        y = +toks[i++];
      if (rel) {
        x += cx;
        y += cy;
      }
      cx = x;
      cy = y;
      const pi = pointIndex;
      const [nx, ny] = fn(pi, cx, cy);
      result += `A${round10(rx)} ${round10(ry)} ${round10(rot)} ${laf} ${sf} ${round10(nx)} ${round10(ny)}`;
      pointIndex++;
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
          const [nx, ny] = fn(pointIndex, cx, cy);
          result += `L${round10(nx)} ${round10(ny)}`;
          pointIndex++;
        } else {
          i++;
        }
      } else if (rc === "H" || rc === "h") {
        const rel = rc === "h";
        if (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
          let px = +toks[i++];
          if (rel) cx += px;
          else cx = px;
          const [nx, ny] = fn(pointIndex, cx, cy);
          result += `L${round10(nx)} ${round10(ny)}`;
          pointIndex++;
        } else {
          i++;
        }
      } else if (rc === "V" || rc === "v") {
        const rel = rc === "v";
        if (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
          let py = +toks[i++];
          if (rel) cy += py;
          else cy = py;
          const [nx, ny] = fn(pointIndex, cx, cy);
          result += `L${round10(nx)} ${round10(ny)}`;
          pointIndex++;
        } else {
          i++;
        }
      } else if (rc === "C" || rc === "c") {
        if (!emitCubic(rc === "c")) i++;
      } else if (rc === "Q" || rc === "q") {
        if (!emitQuad(rc === "q")) i++;
      } else if (rc === "S" || rc === "s") {
        if (!emitSmooth(rc === "s")) i++;
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
          const pi = pointIndex;
          const [nx, ny] = fn(pi, cx, cy);
          result += `T${round10(nx)} ${round10(ny)}`;
          pointIndex++;
        } else {
          i++;
        }
      } else if (rc === "A" || rc === "a") {
        if (!emitArc(rc === "a")) i++;
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
      const [nx0, ny0] = fn(pointIndex, cx, cy);
      result += `M${round10(nx0)} ${round10(ny0)}`;
      pointIndex++;
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
        const [nx, ny] = fn(pointIndex, cx, cy);
        result += `L${round10(nx)} ${round10(ny)}`;
        pointIndex++;
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
        const [nx, ny] = fn(pointIndex, cx, cy);
        result += `L${round10(nx)} ${round10(ny)}`;
        pointIndex++;
      }
      repeatCmd = rel ? "l" : "L";
    } else if (c === "H" || c === "h") {
      const rel = c === "h";
      while (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
        let px = +toks[i++];
        if (rel) cx += px;
        else cx = px;
        const [nx, ny] = fn(pointIndex, cx, cy);
        result += `L${round10(nx)} ${round10(ny)}`;
        pointIndex++;
      }
      repeatCmd = rel ? "h" : "H";
    } else if (c === "V" || c === "v") {
      const rel = c === "v";
      while (i < toks.length && NUM_ONLY_RE.test(toks[i])) {
        let py = +toks[i++];
        if (rel) cy += py;
        else cy = py;
        const [nx, ny] = fn(pointIndex, cx, cy);
        result += `L${round10(nx)} ${round10(ny)}`;
        pointIndex++;
      }
      repeatCmd = rel ? "v" : "V";
    } else if (c === "C" || c === "c") {
      const rel = c === "c";
      while (emitCubic(rel)) {
        /* multi cubic */
      }
      repeatCmd = rel ? "c" : "C";
    } else if (c === "Q" || c === "q") {
      const rel = c === "q";
      while (emitQuad(rel)) {
        /* multi quad */
      }
      repeatCmd = rel ? "q" : "Q";
    } else if (c === "S" || c === "s") {
      const rel = c === "s";
      while (emitSmooth(rel)) {
        /* multi smooth */
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
        const pi = pointIndex;
        const [nx, ny] = fn(pi, cx, cy);
        result += `T${round10(nx)} ${round10(ny)}`;
        pointIndex++;
      }
      repeatCmd = rel ? "t" : "T";
    } else if (c === "A" || c === "a") {
      const rel = c === "a";
      while (emitArc(rel)) {
        /* multi arc */
      }
      repeatCmd = rel ? "a" : "A";
    } else if (c === "Z" || c === "z") {
      cx = subMx;
      cy = subMy;
      result += "Z";
      repeatCmd = null;
    }
  }
  return result;
}
