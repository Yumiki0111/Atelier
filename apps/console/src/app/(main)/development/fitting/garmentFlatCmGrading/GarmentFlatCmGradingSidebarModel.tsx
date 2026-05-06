"use client";

import { GARMENT_FLAT_CM_FITTING_COLORS } from "./garmentFlatCmGradingConstants";

const { ink, rule, accent, muted } = GARMENT_FLAT_CM_FITTING_COLORS;

interface GarmentFlatCmGradingSidebarModelProps {
  height: number;
  weight: number;
  onHeightChange: (cm: number) => void;
  onWeightChange: (kg: number) => void;
  bmi: string;
}

export function GarmentFlatCmGradingSidebarModel({
  height,
  weight,
  onHeightChange,
  onWeightChange,
  bmi,
}: GarmentFlatCmGradingSidebarModelProps) {
  return (
    <div className="flex flex-col gap-5 pb-4 pt-1" style={{ color: ink }}>
      <div>
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
          Height
        </div>
        <div className="mb-1 flex justify-between text-[11px]">
          <span>身長 height</span>
          <span className="font-mono" style={{ color: accent }}>
            {height} cm
          </span>
        </div>
        <input
          type="range"
          min={150}
          max={195}
          step={1}
          value={height}
          className="h-px w-full cursor-pointer appearance-none rounded-none"
          style={{ background: rule }}
          onChange={(e) => onHeightChange(parseInt(e.target.value, 10))}
        />
      </div>
      <div>
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: muted }}>
          Weight
        </div>
        <div className="mb-1 flex justify-between text-[11px]">
          <span>体重 weight</span>
          <span className="font-mono" style={{ color: accent }}>
            {weight} kg
          </span>
        </div>
        <input
          type="range"
          min={45}
          max={100}
          step={1}
          value={weight}
          className="h-px w-full cursor-pointer appearance-none rounded-none"
          style={{ background: rule }}
          onChange={(e) => onWeightChange(parseInt(e.target.value, 10))}
        />
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: muted }}>
          <span>BMI</span>
          <span className="font-mono">{bmi}</span>
        </div>
      </div>
    </div>
  );
}
