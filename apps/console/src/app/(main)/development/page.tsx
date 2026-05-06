"use client";

import { useCallback, useRef, useState } from "react";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { DevelopmentProductRegisterPanel } from "./DevelopmentProductRegisterPanel";
import { PageHeader } from "@/components/page-header/PageHeader";
import { ConsoleSectionPanel } from "@/components/console/ConsoleSectionPanel";
import { Package } from "lucide-react";
import { GarmentFlatCmGradingFitting, type GarmentFlatCmGradingFittingHandle } from "@/app/(main)/development/fitting/garmentFlatCmGrading";

export default function DevelopmentPage() {
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(64);
  const garmentFlatCmGradingRef = useRef<GarmentFlatCmGradingFittingHandle>(null);

  const resolveCustomGarmentDataForRegister = useCallback((): CustomGarmentData | null => {
    return garmentFlatCmGradingRef.current?.buildGarmentSpecForProductDb() ?? null;
  }, []);

  return (
    <div className="flex min-h-full flex-col pb-6">
      <div className="flex shrink-0 flex-col gap-4">
        <PageHeader title="開発" />
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          体型・サイズ・服を調整し、商品ライブラリに登録したうえでフィットを確認します。
        </p>
        <ConsoleSectionPanel
          title="商品ライブラリへの登録"
          description="試着用データと画像をまとめて登録します。登録後は商品ライブラリからプレビューできます。"
          icon={Package}
        >
          <DevelopmentProductRegisterPanel
            garment="custom"
            customGarmentData={null}
            resolveCustomGarmentDataForRegister={resolveCustomGarmentDataForRegister}
          />
        </ConsoleSectionPanel>
      </div>
      <div className="mt-3 flex flex-col gap-3 border-t border-[#EEEEEE] bg-background pt-4 lg:gap-4 lg:pt-5">
        <div className="shrink-0">
          <h2 className="text-sm font-semibold text-foreground">フィット調整</h2>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Garment 平置き cm グレード（path id × ゾーンに基づく変形）。プレビュー・ウィジェットは登録済みの{" "}
            <code className="text-[10px]">garment_spec</code> と同じ計算を参照します。
          </p>
        </div>
        <GarmentFlatCmGradingFitting
          ref={garmentFlatCmGradingRef}
          height={height}
          weight={weight}
          onHeightChange={setHeight}
          onWeightChange={setWeight}
        />
      </div>
    </div>
  );
}
