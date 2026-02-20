"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BodyMeasurements } from "@/hooks/useModelGeneration";

interface MeasurementFormProps {
  onSubmit: (measurements: BodyMeasurements) => Promise<void>;
  isLoading?: boolean;
}

export function MeasurementForm({ onSubmit, isLoading }: MeasurementFormProps) {
  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    height: 170,
    chest: 90,
    waist: 80,
    hip: 90,
    shoulder: 40,
    armLength: 60,
    legLength: 80,
    skinTone: 0.5, // デフォルトの肌色（中間値）
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(measurements);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>身体測定値入力</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>身長 (cm)</Label>
              <Input
                type="number"
                value={measurements.height}
                onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>胸囲 (cm)</Label>
              <Input
                type="number"
                value={measurements.chest}
                onChange={(e) => setMeasurements({ ...measurements, chest: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>ウエスト (cm)</Label>
              <Input
                type="number"
                value={measurements.waist}
                onChange={(e) => setMeasurements({ ...measurements, waist: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>ヒップ (cm)</Label>
              <Input
                type="number"
                value={measurements.hip}
                onChange={(e) => setMeasurements({ ...measurements, hip: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>肩幅 (cm)</Label>
              <Input
                type="number"
                value={measurements.shoulder}
                onChange={(e) => setMeasurements({ ...measurements, shoulder: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>腕の長さ (cm)</Label>
              <Input
                type="number"
                value={measurements.armLength}
                onChange={(e) => setMeasurements({ ...measurements, armLength: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>脚の長さ (cm)</Label>
              <Input
                type="number"
                value={measurements.legLength}
                onChange={(e) => setMeasurements({ ...measurements, legLength: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "モデル生成中..." : "モデルを生成"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
