import {
  GARMENT_FLAT_CM_PATH_ZONES,
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  type GarmentFlatCmZone,
} from "./garmentFlatCmGradingConstants";

const GARMENT_FLAT_CM_BACK_LAYER_ID_SET: ReadonlySet<string> = new Set(GARMENT_FLAT_CM_BACK_LAYER_IDS);

/** `GARMENT_FLAT_CM_BACK_LAYER_IDS`（背面専用・前面 canvas からは除去される path） */
export function isGarmentFlatCmBackLayerOutlinePath(p: SVGPathElement): boolean {
  const id = p.getAttribute("id")?.trim();
  return id != null && GARMENT_FLAT_CM_BACK_LAYER_ID_SET.has(id);
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
    const el = root.querySelector(`#${CSS.escape(id)}`);
    if (!el) continue;
    if (el.tagName.toLowerCase() === "path") {
      pathEls.push(el as SVGPathElement);
    } else if (el.tagName.toLowerCase() === "g") {
      /** `querySelectorAll("path")` は孫以下も拾い index 契約が壊れる。背面 id 直下の path のみ */
      for (const child of el.children) {
        if (child.tagName.toLowerCase() === "path") {
          pathEls.push(child as SVGPathElement);
        }
      }
    }
  }
  return pathEls;
}

/** `#rig` / `#measures` 以外で、d ありのガーメント輪郭 path を document 順に列挙 */
export function collectGarmentFlatCmOutlinePathElements(root: SVGSVGElement): SVGPathElement[] {
  const out: SVGPathElement[] = [];
  root.querySelectorAll("path").forEach((node) => {
    const p = node as SVGPathElement;
    if (p.closest("#rig") || p.closest("#measures")) return;
    const d = p.getAttribute("d");
    if (d != null && d.trim().length > 0) {
      out.push(p);
    }
  });
  return out;
}

/**
 * 平置き cm 変形ゾーンを決定する。
 * 1. 祖先 `<g id>` … `sleeve_L` / `sleeve_R` / `body` / `collar` / `button_L` / `button_R` / `button_R_detail`（`button_R_detail` は右パーツ追加グループ用）
 * 2. `GARMENT_FLAT_CM_PATH_ZONES[pathId]` … **背面 back-stroke** だけ（前面から切り離され祖先 g が無いとき）
 * 3. `#garment` 内なら `body`（上記で決まらない path 用フォールバック）
 */
export function resolveGarmentFlatCmDeformZone(
  pathEl: Element,
  pathId: string | null | undefined
): GarmentFlatCmZone | null {
  if (pathEl.closest("#rig") || pathEl.closest("#measures")) return null;
  let el: Element | null = pathEl.parentElement;
  while (el) {
    if (el.tagName.toLowerCase() === "g") {
      const gid = el.getAttribute("id");
      if (gid === "sleeve_L") return "sleeve_L";
      if (gid === "sleeve_R") return "sleeve_R";
      if (gid === "body") return "body";
      if (gid === "collar") return "collar";
      if (gid === "button_L") return "button_L";
      if (gid === "button_R" || gid === "button_R_detail") return "button_R";
      if (gid && GARMENT_FLAT_CM_PATH_ZONES[gid]) {
        return GARMENT_FLAT_CM_PATH_ZONES[gid];
      }
    }
    el = el.parentElement;
  }
  const id = pathId?.trim();
  if (id && GARMENT_FLAT_CM_PATH_ZONES[id]) {
    return GARMENT_FLAT_CM_PATH_ZONES[id];
  }
  if (pathEl.closest('[id="garment"]')) {
    return "body";
  }
  return null;
}
