import { useLayoutEffect, useState, type DependencyList } from "react";

type FitSvgStageOptions = {
  /**
   * 親のロゴスプラッシュ中は試着 SVG を stage 0（非表示）に固定しタイマーを止める。
   * 解除後は初回と同じ 0→体型・服→図解→脚注の段階表示を最初から行う。
   */
  embedSplashSuspended?: boolean;
};

/**
 * 試着 SVG: 体型・服 → 図解（ポイント・採寸数値）→ 下段テキストの順でフェード。
 * ウィジェット `widget-modal.ts` の `mountFitSvgStaged` とタイミングを揃える。
 * 依存は「初回だけ段階表示したい軸」に限定し、サイズ・身長・体重の更新では再フェードしない。
 */
export function useFitSvgStage(
  hasDiagram: boolean,
  deps: DependencyList,
  options?: FitSvgStageOptions,
): 0 | 1 | 2 | 3 {
  const suspended = options?.embedSplashSuspended === true;
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

  useLayoutEffect(() => {
    if (suspended) {
      setStage(0);
      return;
    }

    setStage(0);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStage(1));
    });
    let t2: number | undefined;
    let t3: number | undefined;
    if (hasDiagram) {
      t2 = window.setTimeout(() => setStage(2), 420);
      t3 = window.setTimeout(() => setStage(3), 540);
    } else {
      t2 = window.setTimeout(() => setStage(3), 480);
    }
    return () => {
      cancelAnimationFrame(id);
      if (t2 !== undefined) clearTimeout(t2);
      if (t3 !== undefined) clearTimeout(t3);
    };
  }, [...deps, suspended, hasDiagram]);
  return stage;
}
