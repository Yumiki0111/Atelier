"use client";

import type { MutableRefObject } from "react";
import type { GenericDraft } from "./FittingControlsGenericUtils";
import {
  parseLineRangeInput,
  parseSleeveMeasureVertexInput,
  parseSleeveMeasureVertexList,
} from "../generic";
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
        入力は <strong>8-15</strong>（両端）か <strong>37,38,39</strong>（順番どおり）。プロット ON で # にホバーして{" "}
        <kbd className="rounded bg-slate-200 px-0.5 font-mono">r</kbd> で列に足せます。
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
              <span>赤線の折れ線</span>
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
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span className="font-medium text-slate-700">目標の長さだけ別の列（任意・カンマのみ）</span>
              <span className="leading-snug text-slate-500">
                空欄＝上と同じ。例 <strong>37,38,39</strong> だけ書くと、cm 合わせはこの短い列の長さだけ見る（赤線はそのまま）。
              </span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-red-300/50"
                placeholder="例: 37,38,39 / 空欄"
                value={genericDraft.sleeveMeasureArcTargetRange}
                onChange={(e) =>
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveMeasureArcTargetRange: e.target.value,
                  }))
                }
              />
            </label>
            {(() => {
              const raw = genericDraft.sleeveMeasureArcTargetRange.trim();
              const list = parseSleeveMeasureVertexList(raw);
              if (list != null && list.length >= 2 && list[0] !== list[list.length - 1]) {
                return (
                  <p className="font-mono text-[9px] text-slate-700">
                    → 目標弧長: #{list.join(" → #")}
                  </p>
                );
              }
              return raw !== "" && list == null ? (
                <p className="text-[9px] text-amber-800">カンマ区切りで 2 点以上（8-15 形式は不可）</p>
              ) : null;
            })()}
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span className="font-medium text-slate-700">長さを変える1本の辺（隣り合う2つの #）</span>
              <span className="leading-snug text-slate-500">
                例 <strong>36-37</strong>。同じ袖 path 上で隣同士。空欄は自動（ずれることがあります）。
              </span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-red-300/50"
                placeholder="例: 8-9 / 空欄"
                value={genericDraft.sleeveFirstEdgeGlobalPairRange}
                onChange={(e) =>
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveFirstEdgeGlobalPairRange: e.target.value,
                  }))
                }
              />
            </label>
            {(() => {
              const t = parseLineRangeInput(genericDraft.sleeveFirstEdgeGlobalPairRange.trim());
              return t && t[0] !== t[1] ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → 辺 #{Math.min(t[0], t[1])}–#{Math.max(t[0], t[1])}
                </p>
              ) : genericDraft.sleeveFirstEdgeGlobalPairRange.trim() !== "" && t == null ? (
                <p className="text-[9px] text-amber-800">形式を確認（8-15）</p>
              ) : null;
            })()}
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span className="font-medium text-slate-700">下袖の # 範囲（任意）</span>
              <span className="leading-snug text-slate-500">
                例 <strong>32-36</strong>。袖下の折れ線。上の「辺」を動かすとこの範囲も追随。胴に止めたい端は商品データのスナップ設定で指定できます。
              </span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-red-300/50"
                placeholder="例: 16-24 / 空欄で従来どおり"
                value={genericDraft.lowerSleeveMeasureRange}
                onChange={(e) => {
                  const raw = e.target.value;
                  const t = parseLineRangeInput(raw);
                  const degenerate = t != null && t[0] === t[1];
                  setGenericDraft((p) => ({
                    ...p,
                    lowerSleeveMeasureRange: raw,
                    lowerSleeveVertexStart: t && !degenerate ? Math.min(t[0], t[1]) : undefined,
                    lowerSleeveVertexEnd: t && !degenerate ? Math.max(t[0], t[1]) : undefined,
                  }));
                }}
              />
            </label>
            {(() => {
              const t = parseLineRangeInput(genericDraft.lowerSleeveMeasureRange.trim());
              return t && t[0] !== t[1] ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → #{Math.min(t[0], t[1])}〜#{Math.max(t[0], t[1])}
                </p>
              ) : genericDraft.lowerSleeveMeasureRange.trim() !== "" && t == null ? (
                <p className="text-[9px] text-amber-800">形式を確認（8-15）</p>
              ) : null;
            })()}
          </div>

          <div className="space-y-1.5 rounded-md border border-orange-200/80 bg-orange-50/50 px-2 py-1.5">
            <p className="text-[9px] font-semibold text-orange-900">反対側の袖（ミラー）</p>
            <p className="text-[9px] leading-snug text-slate-600">
              右袖用。書き方は左と同じ。入れると<strong>両袖</strong>に袖丈処理が乗り、胴の縦グレードから両袖 path が外れます。
            </p>
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span>袖丈（赤線）</span>
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
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span className="font-medium text-slate-700">目標の長さだけ別の列（任意）</span>
              <span className="leading-snug text-slate-500">空欄＝上の赤線と同じ。左の「目標列」と同じ意味。</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-orange-300/50"
                placeholder="例: 50,51,52 / 空欄"
                value={genericDraft.sleeveMirrorMeasureArcTargetRange}
                onChange={(e) =>
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveMirrorMeasureArcTargetRange: e.target.value,
                  }))
                }
              />
            </label>
            {(() => {
              const raw = genericDraft.sleeveMirrorMeasureArcTargetRange.trim();
              const list = parseSleeveMeasureVertexList(raw);
              if (list != null && list.length >= 2 && list[0] !== list[list.length - 1]) {
                return (
                  <p className="font-mono text-[9px] text-slate-700">
                    → ミラー目標弧長: #{list.join(" → #")}
                  </p>
                );
              }
              return raw !== "" && list == null ? (
                <p className="text-[9px] text-amber-800">カンマ区切りで 2 点以上</p>
              ) : null;
            })()}
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span className="font-medium text-slate-700">長さを変える1本の辺（隣り合う2つの #）</span>
              <span className="leading-snug text-slate-500">例 <strong>93-94</strong>。空欄は自動。</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-orange-300/50"
                placeholder="例: 30-31 / 空欄"
                value={genericDraft.sleeveMirrorFirstEdgeGlobalPairRange}
                onChange={(e) =>
                  setGenericDraft((p) => ({
                    ...p,
                    sleeveMirrorFirstEdgeGlobalPairRange: e.target.value,
                  }))
                }
              />
            </label>
            {(() => {
              const t = parseLineRangeInput(genericDraft.sleeveMirrorFirstEdgeGlobalPairRange.trim());
              return t && t[0] !== t[1] ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → 辺 #{Math.min(t[0], t[1])}–#{Math.max(t[0], t[1])}
                </p>
              ) : genericDraft.sleeveMirrorFirstEdgeGlobalPairRange.trim() !== "" && t == null ? (
                <p className="text-[9px] text-amber-800">形式を確認（8-15）</p>
              ) : null;
            })()}
            <label className="flex flex-col gap-0.5 text-[9px] text-slate-600">
              <span className="font-medium text-slate-700">下袖の # 範囲（任意）</span>
              <span className="leading-snug text-slate-500">左の下袖と同じ意味。空欄のときは左の値やガイド推定に従います。</span>
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-orange-300/50"
                placeholder="例: 44-50 / 空欄"
                value={genericDraft.lowerSleeveMirrorMeasureRange}
                onChange={(e) => {
                  const raw = e.target.value;
                  const t = parseLineRangeInput(raw);
                  const degenerate = t != null && t[0] === t[1];
                  setGenericDraft((p) => ({
                    ...p,
                    lowerSleeveMirrorMeasureRange: raw,
                    lowerSleeveMirrorVertexStart: t && !degenerate ? Math.min(t[0], t[1]) : undefined,
                    lowerSleeveMirrorVertexEnd: t && !degenerate ? Math.max(t[0], t[1]) : undefined,
                  }));
                }}
              />
            </label>
            {(() => {
              const t = parseLineRangeInput(genericDraft.lowerSleeveMirrorMeasureRange.trim());
              return t && t[0] !== t[1] ? (
                <p className="font-mono text-[9px] text-slate-700">
                  → #{Math.min(t[0], t[1])}〜#{Math.max(t[0], t[1])}
                </p>
              ) : genericDraft.lowerSleeveMirrorMeasureRange.trim() !== "" && t == null ? (
                <p className="text-[9px] text-amber-800">形式を確認（8-15）</p>
              ) : null;
            })()}
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
          </div>
        </div>
      ) : null}
    </DevPanelSection>
  );
}
