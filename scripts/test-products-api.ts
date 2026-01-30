/**
 * 商品APIのレスポンスを確認するスクリプト
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

async function testProductsAPI() {
  const env = loadEnvFile();
  const baseUrl = process.env.NEXT_PUBLIC_CONSOLE_URL || "http://localhost:3000";
  
  console.log(`商品APIをテスト中: ${baseUrl}/api/products\n`);
  
  // 注意: 実際のAPIは認証が必要なので、ここではデータベースから直接確認
  // 代わりに、データベースから直接取得してAPI形式で表示
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("環境変数が設定されていません");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, external_product_id, shop_id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("エラー:", error);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("商品が見つかりませんでした。");
    return;
  }

  console.log("APIレスポンス形式で表示:\n");
  console.log(JSON.stringify(
    products.map((p) => ({
      id: p.id,
      shopId: p.shop_id,
      externalProductId: p.external_product_id,
      name: p.name,
    })),
    null,
    2
  ));
}

testProductsAPI().catch(console.error);
