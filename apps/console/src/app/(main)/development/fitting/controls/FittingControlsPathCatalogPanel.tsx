"use client";

import type { MutableRefObject } from "react";
import type { GenericDraft } from "./FittingControlsGenericUtils";
import { parseLineRangeInput, parseSleeveMeasureVertexInput, parseSleeveMeasureVertexList } from "../generic";
import { DevPanelSection } from "./FittingControlsUI";

export function FittingControlsPathCatalogPanel({
  showMeasureVertexControls,
  genericDraft,
  setGenericDraft,
  measureVertexRangeSectionFocusedRef,
  flushMeasureVertexDraftToParent,
  hoveredGarmentVertexIndex,
}: {
  showMeasureVertexControls: boolean;
  genericDraft: GenericDraft;
  setGenericDraft: (next: GenericDraft | ((p: GenericDraft) => GenericDraft)) => void;
  measureVertexRangeSectionFocusedRef: MutableRefObject<boolean>;
  flushMeasureVertexDraftToParent: () => void;
  hoveredGarmentVertexIndex?: number | null;
})
 {
  return (
    <DevPanelSection title="連結頂点 #（採寸）">
      <p className="text-[9px] leading-snug text-slate-600">
        袖丈は区間（<strong>8-15</strong>）またはカンマ区切りで順に（<strong>5,4,3,2,1,9</strong> のように非連続・逆順も可）。服プロット ON
        のとき # をホバーして <kbd className="rounded bg-slate-200 px-0.5 font-mono">r</kbd> で順に追加できます。
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
            flushMeasureVertexDraftToParent();
          }}
        >
          <div className="space-y-1.5 rounded-md border border-red-200/80 bg-red-50/50 px-2 py-1.5">
            <p className="text-[9px] font-semibold text-red-900">袖丈（赤線）</p>
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span>連結 # の区間</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-red-300/50"
                placeholder="例: 8-15 / 8,9,10,11 / 空欄"
                value={genericDraft.sleeveMeasureRange}
                onChange={(e) => {
                  const raw = e.target.value;
                  const t = parseSleeveMeasureVertexInput(raw);
                  const degeneratePair = t != null && t[0] === t[1];
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveMeasureRange: raw,
                    sleeveMeasureVertexStart: t && !degeneratePair ? t[0] : undefined,
                    sleeveMeasureVertexEnd: t && !degeneratePair ? t[1] : undefined,
                  }));
                }}
              />
            </label>
            {hoveredGarmentVertexIndex != null && Number.isFinite(hoveredGarmentVertexIndex) ? (
              <p className="font-mono text-[9px] text-slate-600">
                ホバー中: #{hoveredGarmentVertexIndex}（<kbd className="rounded bg-slate-200 px-0.5">r</kbd> で追加）
              </p>
            ) : null}
            {(() => {
              const raw = genericDraft.sleeveMeasureRange.trim();
              const list = parseSleeveMeasureVertexList(raw);
              const t = parseSleeveMeasureVertexInput(raw);
              if (list != null && list.length >= 2 && list[0] !== list[list.length - 1]) {
                const a = list[0]!;
                const b = list[list.length - 1]!;
                return (
                  <p className="font-mono text-[9px] text-slate-700">
                    → 順: #{list.join(" → #")}（始点 #{a} · 終点 #{b}）
                  </p>
                );
              }
              return t ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → #{t[0]}〜#{t[1]}（{t[0] === t[1] ? "1 頂点" : `${Math.abs(t[1] - t[0]) + 1} 頂点`}）
                </p>
              ) : raw !== "" ? (
                <p className="text-[9px] text-amber-800">
                  形式を確認（8-15、単一数字、またはカンマ 2 点以上）
                </p>
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

          <div className="space-y-1.5 rounded-md border border-orange-200/80 bg-orange-50/50 px-2 py-1.5">
            <p className="text-[9px] font-semibold text-orange-900">反対側の袖（ミラー袖）</p>
            <p className="text-[9px] leading-snug text-slate-600">
              指定すると両袖パスが胴グレードから除外され変形を防ぎます。区間（30-37）またはカンマ連結（30,31,50,51）に対応。
            </p>
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span>連結 # の区間</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-orange-300/50"
                placeholder="例: 30-37 / 30,31,32,33 / 空欄"
                value={genericDraft.sleeveMirrorMeasureRange}
                onChange={(e) => {
                  const raw = e.target.value;
                  const t = parseSleeveMeasureVertexInput(raw);
                  const degeneratePair = t != null && t[0] === t[1];
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveMirrorMeasureRange: raw,
                    sleeveMirrorMeasureVertexStart: t && !degeneratePair ? t[0] : undefined,
                    sleeveMirrorMeasureVertexEnd: t && !degeneratePair ? t[1] : undefined,
                  }));
                }}
              />
            </label>
            {(() => {
              const raw = genericDraft.sleeveMirrorMeasureRange.trim();
              const list = parseSleeveMeasureVertexList(raw);
              const t = parseSleeveMeasureVertexInput(raw);
              if (list != null && list.length >= 2 && list[0] !== list[list.length - 1]) {
                const a = list[0]!;
                const b = list[list.length - 1]!;
                return (
                  <p className="font-mono text-[9px] text-slate-700">
                    → 順: #{list.join(" → #")}（始点 #{a} · 終点 #{b}）
                  </p>
                );
              }
              return t && t[0] !== t[1] ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → #{t[0]}〜#{t[1]}（{Math.abs(t[1] - t[0]) + 1} 頂点）
                </p>
              ) : raw !== "" && t == null ? (
                <p className="text-[9px] text-amber-800">形式を確認</p>
              ) : null;
            })()}
            <button
              type="button"
              onClick={() =>
                setGenericDraft((p) => ({
                  ...p,
                  sleeveMirrorMeasureRange: "",
                  sleeveMirrorMeasureVertexStart: undefined,
                  sleeveMirrorMeasureVertexEnd: undefined,
                }))
              }
              className="rounded bg-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-700 hover:bg-slate-300"
            >
              ミラー袖区間をクリア
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
    </DevPanelSection>
  );
}
