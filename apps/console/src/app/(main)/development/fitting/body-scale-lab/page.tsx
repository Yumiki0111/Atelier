"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useFittingCanvasData } from "@/app/(main)/development/fitting/canvas/useFittingCanvasData";
import { GarmentFlatCmGradingFittingFitSnapSvg } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingFittingFitSnapSvg";
import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import {
  GRID_BODY_HEIGHT_GROWTH_FRACTION_TO_STATURE,
  GRID_BODY_HEIGHT_GROWTH_SEGMENT_LABELS_JA,
} from "@/lib/fitting-compute/fittingCanvasGridLinearWarp";

/** ラボ用。テンプレ上のパーツ境界（BZ 結び目＝肩・股など）はワープ結び目と同一で維持する */
const BODY_SCALE_LAB_HEIGHT_MIN_CM = 150;
const BODY_SCALE_LAB_HEIGHT_MAX_CM = 190;

type LiveWarpMode = "default" | "ref" | "live";

function resolveDebugLiveWarp(mode: LiveWarpMode): boolean | undefined {
  if (mode === "default") return undefined;
  return mode === "live";
}

export default function BodyScaleLabPage() {
  const idBase = useId();
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(64);
  const [bodyVariant, setBodyVariant] = useState<BodyModelVariant>("gridSvgBody");
  /** ラボ目的で既定オン。オフのときは本番 shirt 同様に格子ボディは REF 身長のまま（スライダーは主に服・腕側）。 */
  const [liveWarpMode, setLiveWarpMode] = useState<LiveWarpMode>("live");

  const debugFlatCmGridBodyLiveHeightWarp = useMemo(
    () => resolveDebugLiveWarp(liveWarpMode),
    [liveWarpMode]
  );

  const snap = useFittingCanvasData({
    height,
    weight,
    garment: "shirt",
    shirtSize: "48",
    jacketSize: "4",
    customGarmentData: null,
    animProgress: 1,
    fromSize: null,
    toSize: null,
    bodyModelVariant: bodyVariant,
    debugFlatCmGridBodyLiveHeightWarp,
  });

  const dbg = snap.rigArmAngleDebug;
  const diagram = snap.rigRedLineArmDiagram;

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader title="体型ワープ・ラボ（開発）" />
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        格子ボディの身長／体重スライダーと、平置き cm と同種の「モデルだけ現在身長ワープ」を
        切り離して試せます。服は shirt ブランチのみ（path なし）でシルエットと赤リグに集中します。
      </p>
      <aside className="max-w-3xl rounded-md border border-dashed border-muted-foreground/35 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <div className="mb-2 font-medium text-foreground">身長ワープ（頭下〜足先）</div>
        <p className="mb-1 text-[10px] text-muted-foreground">
          ラボの身長スライダーは 150–190 cm。パーツ境界はテンプレの BZ 結び目とワープ結び目を一致させたまま（同じテンプレ Y は常に同じ出力 Y）。
        </p>
        <p className="mb-2">
          全身を一様に伸ばすのではなく、テンプレの結び目（首下・肩・股・足先）で折れ線を入れ、
          「身長の増分がどの帯に何割割り当たるか」を人体計測の一般的な傾向（下肢の寄与が大きい）に沿って配分しています。
          増分の合計は従来と同じく <code className="text-foreground">yScale</code> の一様スケールと一致するので、
          全体の身長比は変わりません。
          サイドバーで「モデル＝現在身長」がオフだとボディは REF 固定のままなので、差は出ません（本番 shirt モードと同じ切り分け）。
        </p>
        <ul className="list-inside list-disc space-y-0.5">
          {GRID_BODY_HEIGHT_GROWTH_SEGMENT_LABELS_JA.map((label, i) => (
            <li key={label}>
              {label}: 増分の {(GRID_BODY_HEIGHT_GROWTH_FRACTION_TO_STATURE[i]! * 100).toFixed(0)}%（
              <code className="text-foreground">fittingCanvasGridLinearWarp</code> 定数）
            </li>
          ))}
        </ul>
      </aside>
      <p className="text-[11px] text-muted-foreground">
        <Link href="/development" className="underline underline-offset-2">
          開発トップへ戻る
        </Link>
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <aside className="flex flex-col gap-4 rounded-lg border border-[#EEEEEE] bg-card p-4 text-xs">
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium text-foreground">ボディ</legend>
            <label htmlFor={`${idBase}-bv`} className="text-muted-foreground">
              テンプレ
            </label>
            <select
              id={`${idBase}-bv`}
              value={bodyVariant}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => setBodyVariant(e.target.value as BodyModelVariant)}
            >
              <option value="gridSvgBody">格子・前面</option>
              <option value="gridSvgBodyBack">格子・背面</option>
            </select>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="font-medium text-foreground">身長・体重</legend>
            <label htmlFor={`${idBase}-h`}>
              身長 {height} cm（{BODY_SCALE_LAB_HEIGHT_MIN_CM}–{BODY_SCALE_LAB_HEIGHT_MAX_CM}）
            </label>
            <input
              id={`${idBase}-h`}
              type="range"
              min={BODY_SCALE_LAB_HEIGHT_MIN_CM}
              max={BODY_SCALE_LAB_HEIGHT_MAX_CM}
              step={1}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
            <label htmlFor={`${idBase}-w`}>体重 {weight} kg</label>
            <input
              id={`${idBase}-w`}
              type="range"
              min={40}
              max={130}
              step={1}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium text-foreground">
              モデルのみ「現在身長」線形ワープ（debug）
            </legend>
            <p className="leading-relaxed text-muted-foreground">
              本番で garment が shirt のとき、平置き cm でない限り格子シルエット・赤リグは REF 身長に固定され、身長スライダーは「服の置き」などに主に効きます。
              このラボは既定でモデルを現在身長に追従させます。「既定」にするとその本番相当（＋平置き cm プリセット時は従来どおり）へ戻せます。
            </p>
            <select
              aria-label="ライブ体型ワープモード"
              value={liveWarpMode}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => setLiveWarpMode(e.target.value as LiveWarpMode)}
            >
              <option value="live">ラボ既定：モデル＝現在身長（部位配分ワープあり）</option>
              <option value="default">本番相当（平置き cm プリセット時のみオン）</option>
              <option value="ref">強制オフ（REF 線形のみ）</option>
            </select>
          </fieldset>
        </aside>

        <div className="flex min-h-[420px] flex-col gap-3 rounded-lg border border-[#EEEEEE] bg-background p-3">
          <GarmentFlatCmGradingFittingFitSnapSvg fitSnap={snap} showModelRig />
          <div className="grid gap-2 rounded border border-dashed border-muted-foreground/40 p-3 font-mono text-[11px] leading-snug text-muted-foreground lg:grid-cols-2">
            <div>
              <div className="font-sans text-[10px] font-semibold text-foreground">rigArmAngleDebug</div>
              <div>warpedArmAxisDeg L/R: {dbg.warpedArmAxisDegL.toFixed(2)} / {dbg.warpedArmAxisDegR.toFixed(2)}</div>
              <div>refWarpedArmAxisDeg L/R: {dbg.refWarpedArmAxisDegL.toFixed(2)} / {dbg.refWarpedArmAxisDegR.toFixed(2)}</div>
              <div>deltaVsRefDeg L/R: {dbg.deltaVsRefDegL.toFixed(2)} / {dbg.deltaVsRefDegR.toFixed(2)}</div>
              <div>sleeveRootHorizontalDeg L/R: {dbg.sleeveRootHorizontalDegL.toFixed(2)} / {dbg.sleeveRootHorizontalDegR.toFixed(2)}</div>
            </div>
            {diagram ? (
              <div>
                <div className="font-sans text-[10px] font-semibold text-foreground">rigRedLineArmDiagram</div>
                <div>warpedArmAxisDeg L/R: {diagram.warpedArmAxisDegL.toFixed(2)} / {diagram.warpedArmAxisDegR.toFixed(2)}</div>
                <div>interiorClavicleArmDeg L/R: {diagram.interiorClavicleArmDegL.toFixed(2)} / {diagram.interiorClavicleArmDegR.toFixed(2)}</div>
              </div>
            ) : (
              <div>rigRedLineArmDiagram: （リグ本数不足）</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
