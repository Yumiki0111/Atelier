/**
 * 身体測定値の型定義
 */
export interface BodyMeasurements {
  // 必須測定値
  height: number;        // 身長 (cm)
  chest: number;         // 胸囲 (cm)
  waist: number;         // ウエスト (cm)
  hip: number;           // ヒップ (cm)
  shoulder: number;      // 肩幅 (cm)
  armLength: number;     // 腕の長さ (cm)
  legLength: number;     // 脚の長さ (cm)
  
  // オプション測定値
  neck?: number;         // 首周り (cm)
  sleeve?: number;       // 袖丈 (cm)
  inseam?: number;       // 股下 (cm)
}
