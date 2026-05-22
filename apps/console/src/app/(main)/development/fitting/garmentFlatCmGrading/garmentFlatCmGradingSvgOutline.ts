import {
  GARMENT_FLAT_CM_PATH_ZONES,
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  type GarmentFlatCmZone,
} from "./garmentFlatCmGradingConstants";

/** テンプレ計測・Figma 出力で多い「純赤」ストローク（#measures 外のルーズな計測線用） */
export function isGarmentFlatCmMeasureConstructionStroke(stroke: string | null | undefined): boolean {
  const s = (stroke ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!s || s === "none") return false;
  if (s === "red") return true;
  if (s === "#f00" || s === "#ff0000") return true;
  if (s.startsWith("#") && /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(s)) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.toLowerCase();
    if (full === "ff0000") return true;
  }
  const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(s);
  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    if (r === 255 && g === 0 && b === 0) return true;
  }
  return false;
}

/** Designer 由来の id の大文字小文字ゆれを吸収（`Sleeve_L` / `GARMENT` / `Back-Stroke` 等） */
export function normalizeGarmentFlatCmId(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * 祖先 `<g id>` → 平置き cm 変形ゾーン。
 * 新標準: `clothes` / `arm_L` / `arm_R` / `body`（Figma: FIREMAN JACKET 系）。
 * 旧テンプレ: `garment` / `sleeve_L` / `sleeve_R` / … も併記。
 */
const ZONE_BY_PARENT_G_ID_LOWER: Readonly<Record<string, GarmentFlatCmZone>> = {
  body: "body",
  arm_l: "sleeve_L",
  arm_r: "sleeve_R",
  sleeve_l: "sleeve_L",
  sleeve_r: "sleeve_R",
  collar: "collar",
  button_l: "button_L",
  button_r: "button_R",
  button_r_detail: "button_R",
};

/** Figma 複製で `arm_L_2` / `arm_R_2` になるケース（リグの `arm_L`/`arm_R` と id 衝突回避） */
function zoneFromClothesChildGroupId(gNorm: string): GarmentFlatCmZone | undefined {
  const direct = ZONE_BY_PARENT_G_ID_LOWER[gNorm];
  if (direct) return direct;
  if (/^arm_l(_\d+)?$/.test(gNorm)) return "sleeve_L";
  if (/^arm_r(_\d+)?$/.test(gNorm)) return "sleeve_R";
  return undefined;
}

const PATH_ZONES_BY_ID_LOWER: Readonly<Record<string, GarmentFlatCmZone>> = (() => {
  const out: Record<string, GarmentFlatCmZone> = {};
  for (const [k, v] of Object.entries(GARMENT_FLAT_CM_PATH_ZONES)) {
    out[normalizeGarmentFlatCmId(k)] = v;
  }
  return out;
})();

/**
 * `back-stroke` / `back_stroke` / `BackStroke` を同一視（エクスート先の区切り文字ゆれ）。
 */
export function normalizeGarmentFlatCmBackLayerIdKey(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

const BACK_LAYER_ID_KEY_SET: ReadonlySet<string> = new Set(
  (GARMENT_FLAT_CM_BACK_LAYER_IDS as readonly string[]).map((id) =>
    normalizeGarmentFlatCmBackLayerIdKey(id)
  )
);

const BACK_LAYER_ZONE_BY_NORMALIZED_KEY: ReadonlyMap<string, GarmentFlatCmZone> = (() => {
  const m = new Map<string, GarmentFlatCmZone>();
  for (const [k, z] of Object.entries(GARMENT_FLAT_CM_PATH_ZONES)) {
    m.set(normalizeGarmentFlatCmBackLayerIdKey(k), z);
  }
  return m;
})();

function elementMatchesCanonicalBackLayerKey(node: Element, wantKey: string): boolean {
  if (!wantKey) return false;
  return (
    normalizeGarmentFlatCmBackLayerIdKey(node.getAttribute("id")) === wantKey ||
    normalizeGarmentFlatCmBackLayerIdKey(node.getAttribute("data-name")) === wantKey
  );
}

/**
 * 背面レイヤ要素（path または path 持ち g）。id / `data-name`（Figma 等）／区切りゆれを解決する。
 */
export function firstGarmentFlatCmBackLayerElement(root: Element, canonicalBackLayerId: string): Element | null {
  const exact = firstElementWithIdCaseInsensitive(root, canonicalBackLayerId);
  if (exact) return exact;
  const want = normalizeGarmentFlatCmBackLayerIdKey(canonicalBackLayerId);
  if (!want) return null;
  for (const node of root.querySelectorAll("[id], [data-name]")) {
    if (elementMatchesCanonicalBackLayerKey(node, want)) return node;
  }
  return null;
}

/**
 * `querySelector("#id")` は id の大文字小文字が一致しないと失敗する（XML／SVG）。
 * `back-stroke` 等の背面レイヤ・除去用に、ツリー上の最初の一致を返す。
 */
export function firstElementWithIdCaseInsensitive(root: Element, targetId: string): Element | null {
  const t = normalizeGarmentFlatCmId(targetId);
  if (!t) return null;
  for (const node of root.querySelectorAll("[id]")) {
    if (normalizeGarmentFlatCmId(node.getAttribute("id")) === t) return node;
  }
  return null;
}

/** 試着／スライス抽出用 SVG から計測装飾を除去（`Measures` グループ・ルーズな measure_*・純赤ストロークのみの線） */
export function stripGarmentFlatCmMeasureDecorations(root: SVGSVGElement): void {
  const measureGroups: Element[] = [];
  root.querySelectorAll("g[id]").forEach((g) => {
    if (/^measures$/i.test((g.getAttribute("id") ?? "").trim())) measureGroups.push(g);
  });
  measureGroups.forEach((g) => g.remove());
  const loose: Element[] = [];
  root.querySelectorAll("path[id], line[id], polyline[id], polygon[id]").forEach((el) => {
    if (/^measure_/i.test((el.getAttribute("id") ?? "").trim())) loose.push(el);
  });
  loose.forEach((el) => el.remove());
  const redStrokes: Element[] = [];
  root.querySelectorAll("path, line, polyline, polygon").forEach((el) => {
    if (isInsideRigGroupCaseInsensitive(el)) return;
    if (isGarmentFlatCmMeasureConstructionStroke(el.getAttribute("stroke"))) redStrokes.push(el);
  });
  redStrokes.forEach((el) => el.remove());
}

/** 服アートのルート `<g>`（`clothes` または旧 `garment`）の内側か */
function isUnderClothesOrGarmentGroupCaseInsensitive(pathEl: Element): boolean {
  let el: Element | null = pathEl.parentElement;
  while (el) {
    if (el.tagName.toLowerCase() === "g") {
      const gNorm = normalizeGarmentFlatCmId(el.getAttribute("id"));
      if (gNorm === "clothes" || gNorm === "garment") return true;
    }
    el = el.parentElement;
  }
  return false;
}

/** ルート直下などの `<g id="rig">`（大文字小文字無視） */
export function findGarmentFlatCmRigGroupElement(root: Element): SVGGElement | null {
  for (const g of root.querySelectorAll("g[id]")) {
    if (/^rig$/i.test((g.getAttribute("id") ?? "").trim())) {
      return g as SVGGElement;
    }
  }
  return null;
}

/** `#rig` / `Rig` 等の id ゆれを吸収 */
export function isInsideRigGroupCaseInsensitive(el: Element): boolean {
  let cur: Element | null = el.parentElement;
  while (cur) {
    if (cur.tagName.toLowerCase() === "g") {
      const gid = (cur.getAttribute("id") ?? "").trim();
      if (/^rig$/i.test(gid)) return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

/** 試着・グレード対象外（`#measures` 内、または id が measure_* の計測装飾、純赤ストロークの計測線） */
export function isGarmentFlatCmOutlineExcludedPath(p: SVGPathElement): boolean {
  if (isInsideMeasuresGroupCaseInsensitive(p)) return true;
  const id = p.getAttribute("id")?.trim() ?? "";
  if (/^measure_/i.test(id)) return true;
  if (isGarmentFlatCmMeasureConstructionStroke(p.getAttribute("stroke"))) return true;
  return false;
}

function isInsideMeasuresGroupCaseInsensitive(el: Element): boolean {
  let cur: Element | null = el.parentElement;
  while (cur) {
    if (cur.tagName.toLowerCase() === "g") {
      const gid = (cur.getAttribute("id") ?? "").trim();
      if (/^measures$/i.test(gid)) return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

/** `GARMENT_FLAT_CM_BACK_LAYER_IDS`（背面専用・前面 canvas からは除去される path）。祖先 g の data-name も見る */
export function isGarmentFlatCmBackLayerOutlinePath(p: SVGPathElement): boolean {
  let cur: Element | null = p;
  while (cur) {
    const idK = normalizeGarmentFlatCmBackLayerIdKey(cur.getAttribute("id"));
    if (idK && BACK_LAYER_ID_KEY_SET.has(idK)) return true;
    const dnK = normalizeGarmentFlatCmBackLayerIdKey(cur.getAttribute("data-name"));
    if (dnK && BACK_LAYER_ID_KEY_SET.has(dnK)) return true;
    cur = cur.parentElement;
  }
  return false;
}

/** 試着「前面」と同一: 背面 back-stroke 系を除いた輪郭 path（document 順） */
export function collectGarmentFlatCmFrontOutlinePathElements(root: SVGSVGElement): SVGPathElement[] {
  return collectGarmentFlatCmOutlinePathElements(root).filter((p) => !isGarmentFlatCmBackLayerOutlinePath(p));
}

/**
 * `GARMENT_FLAT_CM_BACK_LAYER_IDS` の定義順で背面レイヤ path を列挙（マークアップ内 document 順とは一致しないことがある）。
 * 取り込み SVG・背面キャンバス・S 基準 `garmentOriginalBehindOutlineDs` の index 契約はこの順である。
 */
export function collectGarmentFlatCmBackLayerPathElementsByIdOrder(root: Element): SVGPathElement[] {
  const pathEls: SVGPathElement[] = [];
  for (const id of GARMENT_FLAT_CM_BACK_LAYER_IDS) {
    const el = firstGarmentFlatCmBackLayerElement(root, id);
    if (!el) continue;
    if (el.tagName.toLowerCase() === "path") {
      pathEls.push(el as SVGPathElement);
    } else if (el.tagName.toLowerCase() === "g") {
      const nested = Array.from(el.querySelectorAll("path")).filter(
        (p) =>
          !isInsideRigGroupCaseInsensitive(p) &&
          !(p instanceof SVGPathElement && isGarmentFlatCmOutlineExcludedPath(p))
      );
      for (const dp of nested) pathEls.push(dp);
    }
  }
  return pathEls;
}

/** `#rig` / `#measures` / 定義系コンテナ以外で、d ありのガーメント輪郭 path を document 順に列挙（`clothes` 配下） */
export function collectGarmentFlatCmOutlinePathElements(root: SVGSVGElement): SVGPathElement[] {
  const out: SVGPathElement[] = [];
  root.querySelectorAll("path").forEach((node) => {
    const p = node as SVGPathElement;
    if (isInsideRigGroupCaseInsensitive(p) || isGarmentFlatCmOutlineExcludedPath(p)) return;
    if (p.closest("defs") || p.closest("clipPath") || p.closest("mask")) return;
    const d = p.getAttribute("d");
    if (d != null && d.trim().length > 0) {
      out.push(p);
    }
  });
  return out;
}

/**
 * 平置き cm 変形ゾーンを決定する。
 * 1. 祖先 `<g id>` … `clothes/arm_L` / `clothes/arm_R` / `clothes/body`（新標準）または `sleeve_L` / `body` / …（旧テンプレ）
 * 2. `GARMENT_FLAT_CM_PATH_ZONES[pathId]` … **背面 back-stroke** だけ（前面から切り取りで祖先 `<g>` を失うとき）
 * 3. `clothes` または `garment` 内で上記が無い path は `body`
 * 4. 上記いずれも無いフラットな出力では **`body` に丸め**
 */
export function resolveGarmentFlatCmDeformZone(
  pathEl: Element,
  pathId: string | null | undefined
): GarmentFlatCmZone | null {
  if (isInsideRigGroupCaseInsensitive(pathEl)) return null;
  if (pathEl.closest("defs") || pathEl.closest("clipPath") || pathEl.closest("mask")) return null;
  if (pathEl instanceof SVGPathElement && isGarmentFlatCmOutlineExcludedPath(pathEl)) return null;
  let el: Element | null = pathEl.parentElement;
  while (el) {
    if (el.tagName.toLowerCase() === "g") {
      const gidRaw = el.getAttribute("id");
      const gNorm = normalizeGarmentFlatCmId(gidRaw);
      if (gNorm) {
        const byZone = zoneFromClothesChildGroupId(gNorm);
        if (byZone) return byZone;
        const byPathKey = PATH_ZONES_BY_ID_LOWER[gNorm];
        if (byPathKey) return byPathKey;
      }
      const gBack = normalizeGarmentFlatCmBackLayerIdKey(el.getAttribute("data-name"));
      if (gBack) {
        const z = BACK_LAYER_ZONE_BY_NORMALIZED_KEY.get(gBack);
        if (z) return z;
      }
    }
    el = el.parentElement;
  }
  const idNorm = normalizeGarmentFlatCmId(pathId);
  if (idNorm && PATH_ZONES_BY_ID_LOWER[idNorm]) {
    return PATH_ZONES_BY_ID_LOWER[idNorm];
  }
  const backLayerKey =
    normalizeGarmentFlatCmBackLayerIdKey(pathId) ||
    normalizeGarmentFlatCmBackLayerIdKey(pathEl.getAttribute("data-name"));
  if (backLayerKey) {
    const byBackKey = BACK_LAYER_ZONE_BY_NORMALIZED_KEY.get(backLayerKey);
    if (byBackKey) return byBackKey;
  }
  if (isUnderClothesOrGarmentGroupCaseInsensitive(pathEl)) {
    return "body";
  }
  return "body";
}
