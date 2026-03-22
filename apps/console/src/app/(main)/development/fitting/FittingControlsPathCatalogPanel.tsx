"use client";

import type { MutableRefObject } from "react";
import type { CustomGarmentData } from "./types";
import type { GenericDraft } from "./FittingControlsGenericUtils";
import { parseLineRangeInput } from "./generic";
import { cn } from "@/lib/utils";
import { DevPanelSection } from "./FittingControlsUI";

type PathCatalogRow = {
  i: number;
  n: number;
  f: { width: number; height: number } | null;
  g0: number | null | undefined;
  g1: number | null | undefined;
};

export function FittingControlsPathCatalogPanel({
  pathCatalogRows,
  showMeasureVertexControls,
  customGarmentData,
  genericDraft,
  setGenericDraft,
  measureVertexRangeSectionFocusedRef,
}: {
  pathCatalogRows: PathCatalogRow[];
  showMeasureVertexControls: boolean;
  customGarmentData: CustomGarmentData;
  genericDraft: GenericDraft;
  setGenericDraft: (next: GenericDraft | ((p: GenericDraft) => GenericDraft)) => void;
  measureVertexRangeSectionFocusedRef: MutableRefObject<boolean>;
}) {
  return (
    <DevPanelSection title="連結頂点 #（採寸・参考）">
      <p className="text-[9px] leading-snug text-slate-600">
        袖丈・着丈は下の欄に連結頂点の区間（例: <strong>8-15</strong>）を入力します。下の path
        一覧は番号の対照用です。
      </p>

      {showMeasureVertexControls ? (
        <div
          className="mt-3 space-y-2 rounded-lg border border-slate-300/90 bg-slate-50/80 px-2.5 py-2"
          onFocusCapture={() => {
            measureVertexRangeSectionFocusedRef.current = true;
          }}
          onBlurCapture={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && e.currentTarget.contains(next)) return;
            measureVertexRangeSectionFocusedRef.current = false;
          }}
        >
          <p className="text-[10px] font-bold text-slate-900">着丈・袖丈の連結頂点 #（任意）</p>
          <p className="text-[8px] leading-snug text-slate-600">
            4 本のシームと同じ記法（<strong>単一 #</strong> または <strong>始点-終点</strong>）。服プロットの #
            と同じ 0 起算。袖丈を空にすると汎用では「左・脇〜袖付け」全体で赤線、ブローゾンではプリセット既定の区間を使います。着丈は区間を入れたときだけ紫線で辿ります。
          </p>

          <div className="space-y-1.5 rounded-md border border-red-200/80 bg-red-50/50 px-2 py-1.5">
            <p className="text-[9px] font-semibold text-red-900">袖丈（赤線）</p>
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span>連結 # の区間</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-red-300/50"
                placeholder='例: 8-15 または空欄'
                value={genericDraft.sleeveMeasureRange}
                onChange={(e) => {
                  const raw = e.target.value;
                  const t = parseLineRangeInput(raw);
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveMeasureRange: raw,
                    sleeveMeasureVertexStart: t ? t[0] : undefined,
                    sleeveMeasureVertexEnd: t ? t[1] : undefined,
                  }));
                }}
              />
            </label>
            {(() => {
              const t = parseLineRangeInput(genericDraft.sleeveMeasureRange.trim());
              return t ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → #{t[0]}〜#{t[1]}（{t[0] === t[1] ? "1 頂点" : `${t[1] - t[0] + 1} 頂点`}）
                </p>
              ) : genericDraft.sleeveMeasureRange.trim() !== "" ? (
                <p className="text-[9px] text-amber-800">形式を確認してください（数字と - のみ）</p>
              ) : null;
            })()}
            <button
              type="button"
              onClick={() =>
                setGenericDraft((p) => ({
                  ...p,
                  sleeveMeasureRange: "",
                  sleeveMeasureVertexStart: undefined,
                  sleeveMeasureVertexEnd: undefined,
                }))
              }
              className="rounded bg-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-700 hover:bg-slate-300"
            >
              袖丈区間をクリア
            </button>
          </div>

          <div className="space-y-1.5 rounded-md border border-violet-200/80 bg-violet-50/50 px-2 py-1.5">
            <p className="text-[9px] font-semibold text-violet-900">着丈（紫線）</p>
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span>連結 # の区間</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-violet-300/50"
                placeholder="例: 120-140（未指定なら非表示）"
                value={genericDraft.lengthMeasureRange}
                onChange={(e) => {
                  const raw = e.target.value;
                  const t = parseLineRangeInput(raw);
                  setGenericDraft((p) => ({
                    ...p,
                    lengthMeasureRange: raw,
                    lengthMeasureVertexStart: t ? t[0] : undefined,
                    lengthMeasureVertexEnd: t ? t[1] : undefined,
                  }));
                }}
              />
            </label>
            {(() => {
              const t = parseLineRangeInput(genericDraft.lengthMeasureRange.trim());
              return t ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → #{t[0]}〜#{t[1]}
                  {t[0] !== t[1] ? "" : "（1 点のみのときは紫線は出ません）"}
                </p>
              ) : genericDraft.lengthMeasureRange.trim() !== "" ? (
                <p className="text-[9px] text-amber-800">形式を確認してください</p>
              ) : null;
            })()}
            <button
              type="button"
              onClick={() =>
                setGenericDraft((p) => ({
                  ...p,
                  lengthMeasureRange: "",
                  lengthMeasureVertexStart: undefined,
                  lengthMeasureVertexEnd: undefined,
                }))
              }
              className="rounded bg-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-700 hover:bg-slate-300"
            >
              着丈区間をクリア
            </button>
          </div>
        </div>
      ) : null}

      <details className="mt-3 rounded-lg border border-slate-200/90 bg-slate-50/70 px-2 py-1.5">
        <summary className="cursor-pointer select-none text-[10px] font-semibold text-slate-600">
          SVG path 一覧（参考・番号の対照用）
        </summary>
        <p className="mt-1 text-[8px] leading-snug text-slate-500">
          編集はしません。path の並びと連結頂点の目安だけ表示します。
        </p>
        <div
          className="mt-1 grid max-h-40 grid-cols-[auto_1fr] overflow-y-auto rounded border border-slate-200/80 bg-white/80 text-[9px] leading-tight"
          aria-label="path 一覧（参考）"
        >
          <div className="sticky top-0 z-[1] col-span-2 grid grid-cols-subgrid border-b border-slate-200/90 bg-slate-100/95 px-2 py-1 font-sans font-semibold text-slate-600">
            <span className="w-12 shrink-0">path</span>
            <span>連結頂点・点数</span>
          </div>
          {pathCatalogRows.map(({ i, n, f, g0, g1 }) => (
            <div
              key={i}
              className="col-span-2 grid grid-cols-subgrid border-b border-slate-100/90 px-2 py-1 last:border-b-0"
            >
              <div className="flex w-12 shrink-0 items-start font-mono">
                <span className="text-[8px] font-sans text-slate-400">#</span>
                <span className="ml-0.5 text-[11px] font-bold text-slate-900">{i}</span>
              </div>
              <div className="min-w-0 font-mono text-slate-600">
                {g0 != null && g1 != null ? (
                  <span className="font-semibold text-slate-800">
                    連結 {g0}〜{g1}
                  </span>
                ) : (
                  <span className="text-amber-700">連結 —</span>
                )}
                <span className="text-slate-500"> · {n} 点</span>
                {f ? (
                  <>
                    {" · "}
                    {Math.round(f.width)}×{Math.round(f.height)}
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </details>
    </DevPanelSection>
  );
}
