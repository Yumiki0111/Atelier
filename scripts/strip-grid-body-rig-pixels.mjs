#!/usr/bin/env node
/**
 * `grid-body-group-107.svg` は 1×1 の fill `<path>` の格子で、リグ線が **ベクタ stroke ではなくピクセル色として焼き込まれている**。
 * 末尾の stroke path を消しても黒っぽい線が残るのはそのため。
 *
 * 抽出: **距離閾値は使わない**（帯の黒＝髪・パンツが巻き込まれる）。
 * compound はリポジトリの `grid-rig-vector9.svg`（= **Vector (9).svg**）から読み取り、Bresenham で…
 * 頭〜髪・腰〜パンツは Y 帯で保護（`--no-y-guard` 解除）。旧近傍方式は `--legacy-distance`。
 *
 * Usage:
 *   node scripts/strip-grid-body-rig-pixels.mjs [input.svg] [output.svg] [--aggressive] [--no-y-guard] [--legacy-distance]
 * Default: apps/console/public/fitting-models/grid-body-group-107.svg (overwrite in-place if one arg)
 * --aggressive    INK 閾値を緩め、リグラスタを 4 近傍で 1 回だけ膨張（細線取り残し対策。髪に寄りやすいので注意）
 * --no-y-guard    頭頂〜／腰下の帯でも除去（髪・パンツまで削るリスクあり）
 * --legacy-distance  旧: 折れ線からの距離 DIST_PX 以内（面の黒と混同しやすい）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGridRigCompoundDFromRepo } from "./lib/readGridRigVector9CompoundD.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GRID_MODEL_RIG_STROKE_COMPOUND_D = readGridRigCompoundDFromRepo(REPO_ROOT);

function argvHas(flag) {
  return process.argv.includes(flag);
}

const GRID_MODEL_RIG_VIEWBOX_W = 389;
const GRID_MODEL_RIG_VIEWBOX_H = 518;
const GRID_SVG_TOP_Y = 3;
const GRID_SVG_SRC_W = 390;
const GRID_SVG_SRC_H = 521;
/** premultiplied max(rgb)*opacity。これ以下かつリグラスタ上（または legacy 距離内）のみ除去 */
const INK_PREMUL_MAX = argvHas("--aggressive") ? 72 : 38;
/** aggressive 時のみ 1。細線欠けを埋めるが隣接マス（髪）に触れるリスクあり */
const RIG_RASTER_DILATE_STEPS = argvHas("--aggressive") ? 1 : 0;
const LEGACY_DISTANCE_MODE = argvHas("--legacy-distance");
/** legacy のみ使用: リグからこれ px 以内の暗マスを除去 */
const DIST_PX = argvHas("--aggressive") ? 2.6 : 1.15;
/** ピクセル中心 cy がこれ未満＝頭〜髪帯。リグと同色の黒髪を削らない（390×521 本体座標） */
const EXCLUDE_STRIP_TOP_MAX_CY = 122;
/** ピクセル中心 cy がこれより大きい＝腰〜パンツ帯。黒トランクスを脊髄・脚周辺の除去と混同しない */
const EXCLUDE_STRIP_BOTTOM_MIN_CY = 268;
const Y_GUARD = !argvHas("--no-y-guard");

function addRasterCell(set, ix, iy) {
  if (ix < 0 || iy < 0 || ix >= GRID_SVG_SRC_W || iy >= GRID_SVG_SRC_H) return;
  set.add(`${ix},${iy}`);
}

function bresenhamLineToSet(x0f, y0f, x1f, y1f, set) {
  let x0 = Math.round(x0f);
  let y0 = Math.round(y0f);
  let x1 = Math.round(x1f);
  let y1 = Math.round(y1f);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    addRasterCell(set, x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function dilateRaster4(set, steps) {
  for (let t = 0; t < steps; t++) {
    const snap = [...set];
    for (const k of snap) {
      const [ix, iy] = k.split(",").map(Number);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        addRasterCell(set, ix + dx, iy + dy);
      }
    }
  }
}

function buildRigRasterCellSet(segs, dilateSteps) {
  const set = new Set();
  for (const [x1, y1, x2, y2] of segs) {
    bresenhamLineToSet(x1, y1, x2, y2, set);
  }
  dilateRaster4(set, dilateSteps);
  return set;
}

// --- sync: apps/console/.../svgPath/tokenize.ts ---
const SVG_NUMBER_PATTERN = String.raw`[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?`;
const TOKEN_RE = new RegExp(String.raw`([MmLlHhVvCcSsQqTtAaZz])|(${SVG_NUMBER_PATTERN})`, "gi");
const NUM_ONLY_RE = new RegExp(String.raw`^${SVG_NUMBER_PATTERN}$`, "i");

function tokenize(d) {
  const normalized = d.replace(/,/g, " ");
  const toks = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(normalized)) !== null) toks.push(m[0]);
  return toks;
}

// --- sync: apps/console/.../svgPath/extractPoints.ts (extractPoints + getPathPoints) ---
function extractPoints(d, fn) {
  const toks = tokenize(d);
  const pts = [];
  let i = 0,
    cx = 0,
    cy = 0;
  let repeatCmd = null;
  let subMx = 0,
    subMy = 0;

  const consumeCubic = (rel) => {
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

  const consumeQuad = (rel) => {
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

  const consumeSmooth = (rel) => {
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

  const consumeArc = (rel) => {
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
      i += 5;
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

function getPathPoints(d) {
  return extractPoints(d, (x, y) => [x, y]);
}

function splitSvgPathDByMoveCommands(d) {
  return d
    .split(/(?=[Mm])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function rigVecToBodySvg(sx, sy) {
  const xb = (sx * GRID_SVG_SRC_W) / GRID_MODEL_RIG_VIEWBOX_W;
  const yb = GRID_SVG_TOP_Y + (sy * (GRID_SVG_SRC_H - GRID_SVG_TOP_Y)) / GRID_MODEL_RIG_VIEWBOX_H;
  return [xb, yb];
}

function distPointSeg(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const t = c1 / c2;
  const projx = x1 + t * vx;
  const projy = y1 + t * vy;
  return Math.hypot(px - projx, py - projy);
}

function buildRigSegments() {
  const sub = splitSvgPathDByMoveCommands(GRID_MODEL_RIG_STROKE_COMPOUND_D);
  const segs = [];
  const pushPolyline = (pts) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const [x1, y1] = rigVecToBodySvg(a[0], a[1]);
      const [x2, y2] = rigVecToBodySvg(b[0], b[1]);
      segs.push([x1, y1, x2, y2]);
    }
  };

  const spinePts = getPathPoints(sub[0]);
  const spineXAvg = spinePts.map(([x]) => x).reduce((s, x) => s + x, 0) / spinePts.length;
  const spineXFile = (spineXAvg * GRID_SVG_SRC_W) / GRID_MODEL_RIG_VIEWBOX_W;
  const yLegStartRig = Math.max(...spinePts.map(([, y]) => y));
  const yBotFile = GRID_SVG_TOP_Y + (yLegStartRig * (GRID_SVG_SRC_H - GRID_SVG_TOP_Y)) / GRID_MODEL_RIG_VIEWBOX_H;
  /** ピクセル SVG は y=0 から表示。脊髄は頭頂付近から同じ x で載せる */
  segs.push([spineXFile, 0, spineXFile, yBotFile]);

  for (let si = 1; si < sub.length; si++) {
    pushPolyline(getPathPoints(sub[si]));
  }
  /** 脚補助の縦線は compound に無い。ここで使うと胴に余計な「削除帯」ができるため入れない */
  return segs;
}

function minDistToRig(px, py, segs) {
  let m = Infinity;
  for (const [x1, y1, x2, y2] of segs) {
    const d = distPointSeg(px, py, x1, y1, x2, y2);
    if (d < m) m = d;
  }
  return m;
}

function pathBBoxCenter(d) {
  const pts = getPathPoints(d);
  if (pts.length === 0) return [0, 0];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function parseInkPremul(attrs) {
  const fm = attrs.match(/\bfill="([^"]*)"/i) ?? attrs.match(/\bfill='([^']*)'/i);
  const fill = fm ? fm[1].trim() : "";
  if (!fill || /^none$/i.test(fill)) return null;
  const om = attrs.match(/\bfill-opacity="([^"]*)"/i) ?? attrs.match(/\bfill-opacity='([^']*)'/i);
  const op = om ? parseFloat(om[1]) : 1;
  if (Number.isNaN(op)) return null;
  let r, g, b;
  const fl = fill.toLowerCase();
  if (fl === "black" || fl === "#000" || fl === "#000000") {
    r = g = b = 0;
  } else {
    let m = /^#([0-9a-f]{3})$/i.exec(fill);
    if (m) {
      const h = m[1];
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else {
      m = /^#([0-9a-f]{6})$/i.exec(fill);
      if (!m) return null;
      const h = m[1];
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    }
  }
  return Math.max(r, g, b) * op;
}

function extractD(attrs) {
  const m1 = attrs.match(/\bd\s*=\s*"([^"]*)"/i);
  if (m1) return m1[1];
  const m2 = attrs.match(/\bd\s*=\s*'([^']*)'/i);
  if (m2) return m2[1];
  return null;
}

function main() {
  const repoRoot = REPO_ROOT;
  const defaultIn = path.join(repoRoot, "apps/console/public/fitting-models/grid-body-group-107.svg");
  const args = process.argv.slice(2).filter(
    (x) => x !== "--aggressive" && x !== "--no-y-guard" && x !== "--legacy-distance"
  );
  const inputPath = path.resolve(args[0] || defaultIn);
  const outputPath = path.resolve(args[1] || args[0] || defaultIn);

  const segs = buildRigSegments();
  const rigCells = LEGACY_DISTANCE_MODE ? null : buildRigRasterCellSet(segs, RIG_RASTER_DILATE_STEPS);
  const svg = fs.readFileSync(inputPath, "utf8");

  const lines = svg.split(/\n/);
  let removed = 0;
  let kept = 0;
  const outLines = [];
  const pathRe = /^<path\b/;

  for (const line of lines) {
    if (!pathRe.test(line)) {
      outLines.push(line);
      continue;
    }
    const inner = line.match(/^<path\s([^/]+?)\s*\/>$/);
    if (!inner) {
      outLines.push(line);
      continue;
    }
    const attrs = inner[1];
    if (/\bstroke\s*=/i.test(attrs) && !/\bfill\s*=\s*["']none["']/i.test(attrs)) {
      outLines.push(line);
      kept++;
      continue;
    }
    const d = extractD(attrs);
    if (!d) {
      outLines.push(line);
      kept++;
      continue;
    }
    const premul = parseInkPremul(attrs);
    if (premul == null || premul > INK_PREMUL_MAX) {
      outLines.push(line);
      kept++;
      continue;
    }
    const [cx, cy] = pathBBoxCenter(d);
    if (Y_GUARD && (cy < EXCLUDE_STRIP_TOP_MAX_CY || cy > EXCLUDE_STRIP_BOTTOM_MIN_CY)) {
      outLines.push(line);
      kept++;
      continue;
    }
    if (LEGACY_DISTANCE_MODE) {
      if (minDistToRig(cx, cy, segs) > DIST_PX) {
        outLines.push(line);
        kept++;
        continue;
      }
    } else {
      const ix = Math.round(cx);
      const iy = Math.round(cy);
      if (!rigCells.has(`${ix},${iy}`)) {
        outLines.push(line);
        kept++;
        continue;
      }
    }
    removed++;
  }

  fs.writeFileSync(outputPath, outLines.join("\n"), "utf8");
  const mode = LEGACY_DISTANCE_MODE
    ? `legacy_DIST<=${DIST_PX}`
    : `raster_cells=${rigCells.size} dilate=${RIG_RASTER_DILATE_STEPS}`;
  console.error(
    `strip-grid-body-rig-pixels: removed ${removed}, kept ${kept} (${mode} INK_MAX=${INK_PREMUL_MAX} Y_GUARD=${Y_GUARD} top<${EXCLUDE_STRIP_TOP_MAX_CY} bottom>${EXCLUDE_STRIP_BOTTOM_MIN_CY}) -> ${outputPath}`
  );
}

main();
