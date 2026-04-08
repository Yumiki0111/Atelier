/**
 * widget-config APIのレスポンスをテストするスクリプト
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// .env.localファイルを読み込む
function loadEnvFile() {
  const envPath = resolve(__dirname, "../apps/console/.env.local");
  const envContent = readFileSync(envPath, "utf-8");
  
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
  
  return env;
}

async function testWidgetConfigAPI() {
  const env = loadEnvFile();
  const baseUrl = process.env.CONSOLE_URL || "http://localhost:3000";
  const publicKey = "pub_live_030b64caa84e2995672163c125d600bd";

  // テストする商品ID
  const testProducts = [
    {
      name: "ウールコート",
      externalProductId: "a6b494eb-a68a-45af-b868-9eb9ac03add7",
    },
    {
      name: "ダブルジャケット",
      externalProductId: "e489b59b-e06e-4e3f-b403-823c85efd6f7",
    },
  ];

  console.log(`widget-config APIをテスト中: ${baseUrl}/api/public/widget-config\n`);

  for (const product of testProducts) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`商品: ${product.name}`);
    console.log(`外部商品ID: ${product.externalProductId}`);
    console.log(`${"=".repeat(80)}\n`);

    const url = `${baseUrl}/api/public/widget-config?publicKey=${encodeURIComponent(publicKey)}&externalProductId=${encodeURIComponent(product.externalProductId)}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "Origin": "http://localhost:3000",
        },
      });

      const data = await response.json();
      
      console.log(`ステータス: ${response.status}`);
      console.log(`レスポンス:\n${JSON.stringify(data, null, 2)}`);

      if (data.enabled && data.asset) {
        console.log(`\n✅ 有効: はい`);
        console.log(`デフォルトサイズ: ${data.asset.defaultSize}`);
        console.log(`サイズ別GLB URL:`);
        if (data.asset.sizes) {
          Object.entries(data.asset.sizes).forEach(([size, sizeData]: [string, any]) => {
            console.log(`  ${size}: ${sizeData.glbUrl}`);
          });
        }
      } else {
        console.log(`\n⚠️  有効: いいえ`);
        if (data.error) {
          console.log(`エラー: ${data.error}`);
        }
      }
    } catch (error) {
      console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

testWidgetConfigAPI().catch(console.error);
