import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getCmForActive,
  loadGarmentFlatCmPresetsState,
  saveGarmentFlatCmPresetsState,
  type GarmentFlatCmPresetsState,
} from "./garmentFlatCmGradingPresetsStorage";
import { presetNameDraftForState } from "./garmentFlatCmGradingFittingMeasureFormat";
import type { GarmentFlatCm } from "./garmentFlatCmGradingMeasurements";

export function useGarmentFlatCmPresets({
  setGarmentCm,
  onPresetApply,
}: {
  setGarmentCm: React.Dispatch<React.SetStateAction<GarmentFlatCm>>;
  /** プリセット適用・削除・上書き時に呼ばれる（編集中フィールドをクリアする） */
  onPresetApply: () => void;
}) {
  const [presetsState, setPresetsState] = useState<GarmentFlatCmPresetsState | null>(null);
  const [presetNameDraft, setPresetNameDraft] = useState("");
  // 常に最新の presetsState にアクセスするための ref（コールバック内の stale closure を防ぐ）
  const presetsRef = useRef(presetsState);
  presetsRef.current = presetsState;

  const initPresetsState = useCallback(() => {
    const s = loadGarmentFlatCmPresetsState();
    setPresetsState(s);
    setGarmentCm(getCmForActive(s));
    setPresetNameDraft(presetNameDraftForState(s));
  }, [setGarmentCm]);

  const applyUserPreset = useCallback(
    (id: string) => {
      const current = presetsRef.current;
      if (!current) return;
      const p = current.userPresets.find((x) => x.id === id);
      if (!p) return;
      onPresetApply();
      const next: GarmentFlatCmPresetsState = { ...current, activeUserPresetId: id };
      saveGarmentFlatCmPresetsState(next);
      setPresetsState(next);
      setGarmentCm({ ...p.cm });
      setPresetNameDraft(p.name);
    },
    [onPresetApply, setGarmentCm]
  );

  const deleteUserPreset = useCallback(
    (id: string) => {
      const current = presetsRef.current;
      if (!current) return;
      const victim = current.userPresets.find((x) => x.id === id);
      if (!victim) return;
      onPresetApply();
      const userPresets = current.userPresets.filter((x) => x.id !== id);
      const activeUserPresetId =
        current.activeUserPresetId === id ? (userPresets[0]?.id ?? null) : current.activeUserPresetId;
      const next: GarmentFlatCmPresetsState = { activeUserPresetId, userPresets };
      saveGarmentFlatCmPresetsState(next);
      setPresetsState(next);
      setGarmentCm(getCmForActive(next));
      setPresetNameDraft(presetNameDraftForState(next));
      toast.success(`「${victim.name}」を削除しました`);
    },
    [onPresetApply, setGarmentCm]
  );

  const persistGarmentCm = useCallback(
    (garmentCm: GarmentFlatCm, presetNameDraftVal: string) => {
      const current = presetsRef.current;
      if (!current) return;
      const idx = current.userPresets.length + 1;
      const name = presetNameDraftVal.trim() || `サイズ${idx}`;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `preset-${Date.now()}`;
      const next: GarmentFlatCmPresetsState = {
        activeUserPresetId: id,
        userPresets: [...current.userPresets, { id, name, cm: { ...garmentCm } }],
      };
      saveGarmentFlatCmPresetsState(next);
      setPresetsState(next);
      setPresetNameDraft(presetNameDraftForState(next));
      toast.success(`「${name}」を保存し、画面に反映しました`);
    },
    []
  );

  const overwriteActivePreset = useCallback(
    (garmentCm: GarmentFlatCm, presetNameDraftVal: string) => {
      const current = presetsRef.current;
      if (!current?.activeUserPresetId) return;
      const id = current.activeUserPresetId;
      const prevP = current.userPresets.find((x) => x.id === id);
      if (!prevP) return;
      onPresetApply();
      const name = presetNameDraftVal.trim() || prevP.name;
      const userPresets = current.userPresets.map((p) =>
        p.id === id ? { ...p, name, cm: { ...garmentCm } } : p
      );
      const next: GarmentFlatCmPresetsState = { ...current, userPresets };
      saveGarmentFlatCmPresetsState(next);
      setPresetsState(next);
      setPresetNameDraft(name);
      toast.success(`「${name}」の登録内容を更新しました`);
    },
    [onPresetApply]
  );

  const loadGarmentCm = useCallback(() => {
    onPresetApply();
    const s = loadGarmentFlatCmPresetsState();
    setPresetsState(s);
    setGarmentCm(getCmForActive(s));
    setPresetNameDraft(presetNameDraftForState(s));
    toast.success("保存済みの選択・プリセットを読み込みました");
  }, [onPresetApply, setGarmentCm]);

  return {
    presetsState,
    presetNameDraft,
    setPresetNameDraft,
    initPresetsState,
    applyUserPreset,
    deleteUserPreset,
    persistGarmentCm,
    overwriteActivePreset,
    loadGarmentCm,
  };
}
