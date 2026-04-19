import { appendFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

/**
 * ブラウザ内ウィジェットからのデバッグ NDJSON（開発のみ）。
 * リポジトリルートの `.cursor/debug-673bd6.log` に追記する。
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const text = await req.text();
    const logPath = join(process.cwd(), "..", ".cursor", "debug-673bd6.log");
    await appendFile(logPath, `${text}\n`, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[debug-log]", e);
    return NextResponse.json({ error: "write failed" }, { status: 500 });
  }
}
