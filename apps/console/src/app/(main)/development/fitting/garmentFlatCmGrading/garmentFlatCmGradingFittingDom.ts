import type { MutableRefObject } from "react";
import { toast } from "sonner";
import {
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  GARMENT_FLAT_CM_VIEWBOX,
} from "./garmentFlatCmGradingConstants";
import {
  collectGarmentFlatCmBackLayerPathElementsByIdOrder,
  collectGarmentFlatCmFrontOutlinePathElements,
} from "./garmentFlatCmGradingSvgOutline";
import {
  ensureGarmentFlatCmRigGroupOnClonedSvg,
  garmentFlatCmRigMarkupValidationError,
} from "./buildGarmentFlatCmGradingSpecForProductDb";

const SVG_NS = "http://www.w3.org/2000/svg";

export function appendSerializedSvgChildren(
  parent: SVGGElement | SVGSVGElement,
  serializedFragments: string
): void {
  if (!serializedFragments) return;
  const holder = document.createElement("div");
  holder.innerHTML = `<svg xmlns="${SVG_NS}">${serializedFragments}</svg>`;
  const tmpSvg = holder.querySelector("svg");
  if (!tmpSvg) return;
  while (tmpSvg.firstChild) {
    parent.appendChild(tmpSvg.firstChild);
  }
}

export function ensureBackPathDefaultFill(svg: SVGSVGElement): void {
  svg.querySelectorAll("path").forEach((p) => {
    if (p.getAttribute("fill") == null) p.setAttribute("fill", "none");
  });
}

/** viewBox を比較用に正規化（連続空白 → 単一スペース） */
export function normalizeViewBox(v: string | null | undefined): string | null {
  if (!v?.trim()) return null;
  return v.trim().replace(/\s+/g, " ");
}

export function validateUploadedGarmentFlatCmMarkup(markup: string): string | null {
  return garmentFlatCmRigMarkupValidationError(markup);
}

export function maybeWarnGarmentFlatCmViewBox(markup: string): void {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return;
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return;
  const vb = normalizeViewBox(root.getAttribute("viewBox"));
  const expectedVb = normalizeViewBox(GARMENT_FLAT_CM_VIEWBOX);
  if (!vb) {
    toast.warning("ガーメント SVG に viewBox がありません。プレビューのスケールがずれる可能性があります。");
    return;
  }
  if (expectedVb != null && vb !== expectedVb) {
    toast.warning(
      `viewBox が標準 (${GARMENT_FLAT_CM_VIEWBOX}) と異なります（${vb}）。背面レイヤや試着との位置合わせがずれる場合があります。`
    );
  }
}

export function collectGarmentOriginalPathDs(srcRoot: Element): Record<string, string> {
  const garmentOriginalDs: Record<string, string> = {};
  srcRoot.querySelectorAll("path").forEach((p) => {
    const id = p.getAttribute("id");
    const d = p.getAttribute("d");
    if (id && d) {
      garmentOriginalDs[id] = d;
    }
  });
  return garmentOriginalDs;
}

/** 前面キャンバスと同じ本数・順序（`back-stroke*` は背面へ移すため除外） */
export function collectGarmentFlatCmOutlineBaseDsInOrder(srcRoot: Element): string[] {
  const svg = srcRoot as SVGSVGElement;
  return collectGarmentFlatCmFrontOutlinePathElements(svg).map((p) => {
    const d = p.getAttribute("d");
    return (d ?? "").trim();
  });
}

/**
 * 背面レイヤ試着用の S 基準 `d`（`GARMENT_FLAT_CM_BACK_LAYER_IDS` 順。`collectGarmentFlatCmBackLayerPathElementsByIdOrder` と同じ本数・順）。
 */
export function collectGarmentFlatCmBehindOutlineBaseDsInOrder(srcRoot: Element): string[] {
  const out: string[] = [];
  for (const p of collectGarmentFlatCmBackLayerPathElementsByIdOrder(srcRoot)) {
    const d = (p.getAttribute("d") ?? "").trim();
    if (d.length > 0) out.push(d);
  }
  return out;
}

/**
 * 前面・背面レイヤおよび S 基準 path を、与えられたガーメント SVG の内容で置き換える。
 * `GARMENT_FLAT_CM_BACK_LAYER_IDS` はメイン SVG から hidden 背面に載せ、試着でボディ裏に積む（ID が無ければ空）。
 */
export function installGradedGarmentDomFromMarkup(
  garmentSvgMarkup: string,
  garmentFrontSvg: SVGSVGElement,
  garmentBackSvg: SVGSVGElement,
  garmentOriginalOutlineDs: MutableRefObject<string[]>,
  garmentOriginalBehindOutlineDs: MutableRefObject<string[]>
): boolean {
  const gDoc = new DOMParser().parseFromString(garmentSvgMarkup, "image/svg+xml");
  const srcRoot = gDoc.documentElement;
  const parseFailed =
    gDoc.getElementsByTagName("parsererror").length > 0 || srcRoot.tagName.toLowerCase() !== "svg";
  if (parseFailed) {
    return false;
  }

  garmentOriginalOutlineDs.current = collectGarmentFlatCmOutlineBaseDsInOrder(srcRoot);
  garmentOriginalBehindOutlineDs.current = collectGarmentFlatCmBehindOutlineBaseDsInOrder(srcRoot);

  const cloneFront = srcRoot.cloneNode(true) as SVGSVGElement;
  ensureGarmentFlatCmRigGroupOnClonedSvg(cloneFront);
  for (const id of GARMENT_FLAT_CM_BACK_LAYER_IDS) {
    cloneFront.querySelector(`#${CSS.escape(id)}`)?.remove();
  }
  garmentFrontSvg.replaceChildren(...Array.from(cloneFront.children).map((n) => document.importNode(n, true)));

  const ser = new XMLSerializer();
  const serializeIds = (ids: readonly string[]) =>
    ids
      .map((id) => {
        const node = srcRoot.querySelector(`#${CSS.escape(id)}`);
        return node ? ser.serializeToString(node) : "";
      })
      .join("");
  const backFragments = serializeIds(GARMENT_FLAT_CM_BACK_LAYER_IDS);
  installGarmentBackBehindModelOnly(garmentBackSvg, backFragments);
  garmentFrontSvg.querySelector("#rig")?.setAttribute("display", "none");
  return true;
}

/**
 * 背面ガーメントのみ（マスクなし）。試着レイヤ順でボディより下。
 */
export function installGarmentBackBehindModelOnly(
  svg: SVGSVGElement,
  serializedFragments: string
): void {
  svg.replaceChildren();
  const wrap = document.createElementNS(SVG_NS, "g");
  wrap.setAttribute("fill", "none");
  appendSerializedSvgChildren(wrap, serializedFragments);
  svg.appendChild(wrap);
  ensureBackPathDefaultFill(svg);
}
