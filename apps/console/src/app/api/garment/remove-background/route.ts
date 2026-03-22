import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

/**
 * 写真 → 背景除去（商品切り抜き）API。
 *
 * POST: FormData { image: File }
 * 200: 切り抜き済み PNG（Body が binary）
 * 501: Python rembg が未インストール
 *
 * rembg は CLI ではなくライブラリとして import して実行（python3 -m rembg が使えない環境対応）。
 */
export async function POST(request: NextRequest) {
  let tmpDir: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "image file required" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";

    tmpDir = await mkdtemp(join(tmpdir(), "rembg-"));
    const inputPath = join(tmpDir, `input.${safeExt}`);
    const outputPath = join(tmpDir, "output.png");

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    const pythonCmd = await runRembg(inputPath, outputPath);

    try {
      const outBuffer = await readFile(outputPath);
      return new NextResponse(outBuffer, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(outBuffer.length),
        },
      });
    } catch (readErr) {
      console.error("rembg output read failed:", readErr);
      return NextResponse.json(
        {
          error: "Background removal failed",
          hint: `Python rembg は実行されましたが出力の読み取りに失敗しました。${pythonCmd} が正常終了しているか確認してください。`,
        },
        { status: 502 }
      );
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { code?: number };
    const msg = err?.message ?? String(e);
    if (err?.code === "ENOENT" || msg.includes("spawn")) {
      return NextResponse.json(
        {
          error: "Not implemented",
          hint: "背景除去には Python と rembg が必要です。ターミナルで: pip install rembg を実行してください。",
        },
        { status: 501 }
      );
    }
    if (typeof err?.code === "number" && err.code !== 0) {
      return NextResponse.json(
        { error: "Background removal failed", detail: msg },
        { status: 502 }
      );
    }
    console.error("remove-background:", e);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  } finally {
    if (tmpDir) {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/** rembg を import して実行する Python スクリプト（CLI __main__ が無い環境用） */
const REMBG_SCRIPT = [
  "import sys",
  "from rembg import remove",
  "with open(sys.argv[1], 'rb') as f: inp = f.read()",
  "out = remove(inp)",
  "with open(sys.argv[2], 'wb') as f: f.write(out)",
].join("\n");

function runRembg(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const py = process.platform === "win32" ? "py" : "python3";
    const args = ["-c", REMBG_SCRIPT, inputPath, outputPath];
    const proc = spawn(py, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const cmd = `${py} -c "..." ${inputPath} ${outputPath}`;
    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(cmd);
      } else {
        const err = new Error(
          `rembg exited ${code}${stderr ? `: ${stderr.slice(0, 300)}` : ""}`
        );
        (err as Error & { code?: number }).code = code;
        reject(err);
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}
