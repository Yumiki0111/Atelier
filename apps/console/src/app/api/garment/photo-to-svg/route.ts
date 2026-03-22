import { NextRequest, NextResponse } from "next/server";

/**
 * 写真 → SVG 変換 API（一括用。推奨は「背景除去 API → クライアント輪郭トレース」）。
 *
 * POST: FormData { image: File }
 * 200: { svg: string }
 * 501: 未実装時はクライアントで「背景除去 → 輪郭トレース」が使われる。
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "image file required" },
        { status: 400 }
      );
    }

    // TODO: ここでバックエンド処理を実装する例:
    // - 画像を Buffer に読み込み
    // - rembg / Segment Anything 等で服装領域をマスク
    // - OpenCV 等で輪郭抽出 → 簡略化 → SVG path に変換
    // - return NextResponse.json({ svg: resultSvg });

    return NextResponse.json(
      {
        error: "Not implemented",
        hint: "Backend で rembg + opencv 等の輪郭抽出を実装するか、クライアント側フォールバック（簡易 bbox）が使われます。",
      },
      { status: 501 }
    );
  } catch (e) {
    console.error("photo-to-svg:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
