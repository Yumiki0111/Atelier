"use client";

import type { MutableRefObject } from "react";
import type { GenericDraft } from "./FittingControlsGenericUtils";
import { parseLineRangeInput } from "../generic";
import { DevPanelSection } from "./FittingControlsUI";

export function FittingControlsPathCatalogPanel({
  showMeasureVertexControls,
  genericDraft,
  setGenericDraft,
  measureVertexRangeSectionFocusedRef,
}: {
  showMeasureVertexControls: boolean;
  genericDraft: GenericDraft;
  setGenericDraft: (next: GenericDraft | ((p: GenericDraft) => GenericDraft)) => void;
  measureVertexRangeSectionFocusedRef: MutableRefObject<boolean>;
}) {
  return (
    <DevPanelSection title="連結頂点 #（採寸）">
      <p className="text-[9px] leading-snug text-slate-600">
        袖丈・着丈は連結頂点の区間（例: <strong>8-15</strong>）を入力します。
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
    </DevPanelSection>
  );
}
