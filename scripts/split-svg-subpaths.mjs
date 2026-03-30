#!/usr/bin/env node
/**
 * Split each <path> whose `d` contains multiple subpaths (multiple M/m movetos)
 * into separate <path> elements. Paint attributes are copied unchanged.
 *
 * Subpath splitting rules are kept in sync with:
 * `apps/console/src/app/(main)/development/fitting/customGarment/splitSvgSubpaths.ts`
 * (used on SVG upload in the fitting UI).
 *
 * Usage:
 *   node scripts/split-svg-subpaths.mjs input.svg output.svg
 *   node scripts/split-svg-subpaths.mjs input.svg output.svg --guides-first 9
 *
 * --guides-first N   Wrap the first N original <path> elements (before splitting)
 *                    in <g id="atelier-guides">, and the rest in <g id="atelier-paths">.
 *                    After splitting, "guides" stays N paths; the expanded subpaths go
 *                    into the second group.
 */

import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error(`Usage: node ${path.basename(process.argv[1])} <input.svg> <output.svg> [--guides-first N]`);
  process.exit(1);
}

function parseArgs(argv) {
  let guidesFirst = 0;
  const rest = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--guides-first" && argv[i + 1]) {
      guidesFirst = Math.max(0, parseInt(argv[++i], 10) || 0);
    } else {
      rest.push(argv[i]);
    }
  }
  const [input, output] = rest;
  return { input, output, guidesFirst };
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function extractD(attrs) {
  const m1 = attrs.match(/\bd\s*=\s*"([^"]*)"/);
  if (m1) return m1[1];
  const m2 = attrs.match(/\bd\s*=\s*'([^']*)'/);
  if (m2) return m2[1];
  return null;
}

function stripD(attrs) {
  return attrs.replace(/\bd\s*=\s*(?:"[^"]*"|'[^']*')\s*/g, "").trim();
}

/** Split SVG path `d` at each moveto (M or m) starting a new subpath. */
function splitSubpaths(d) {
  const t = String(d).trim();
  if (!t) return [];
  const parts = t.split(/(?=[Mm])/).filter((p) => p.trim().length > 0);
  return parts.map((p) => p.trim());
}

function parsePathTags(svgInner) {
  const paths = [];
  const re = /<path\b([^/]*)\/>/g;
  let m;
  while ((m = re.exec(svgInner))) {
    paths.push({ attrs: m[1].trim(), fullLen: m[0].length, index: m.index });
  }
  return paths;
}

function rebuildSvg(svgText, guidesFirst) {
  const match = svgText.match(/^([\s\S]*?<svg\b[^>]*>)([\s\S]*)(<\/svg>\s*)$/i);
  if (!match) {
    throw new Error("Could not parse SVG (expected a single root <svg>…</svg>).");
  }
  const [, open, inner, close] = match;
  const pathInfos = parsePathTags(inner);
  if (pathInfos.length === 0) {
    throw new Error("No self-closing <path …/> elements found.");
  }

  const rows = [];
  let originalIndex = 0;
  for (const { attrs } of pathInfos) {
    const d = extractD(attrs);
    if (d == null) {
      throw new Error(`<path> missing d= attribute: <path ${attrs.slice(0, 80)}…>`);
    }
    const rest = stripD(attrs);
    const parts = splitSubpaths(d);
    const isGuide = originalIndex < guidesFirst;
    for (const part of parts) {
      rows.push({
        isGuide,
        line: `<path d="${escapeAttr(part)}" ${rest}/>`,
      });
    }
    originalIndex++;
  }

  let body;
  if (guidesFirst > 0) {
    const guides = rows.filter((r) => r.isGuide).map((r) => r.line);
    const rest = rows.filter((r) => !r.isGuide).map((r) => r.line);
    body = `<g id="atelier-guides">\n${guides.join("\n")}\n</g>\n<g id="atelier-paths">\n${rest.join("\n")}\n</g>`;
  } else {
    body = rows.map((r) => r.line).join("\n");
  }

  return `${open}${body}\n${close}`;
}

const { input, output, guidesFirst } = parseArgs(process.argv);
if (!input || !output) usage();

const svg = fs.readFileSync(input, "utf8");
const out = rebuildSvg(svg, guidesFirst);
fs.writeFileSync(output, out, "utf8");
const pathCount = (out.match(/<path\b/g) ?? []).length;
console.error(`Wrote ${output} (${pathCount} <path> elements)`);
