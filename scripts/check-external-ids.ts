/**
 * 商品のexternal_product_idを確認するスクリプト
 */

import { createClient } from "@supabase/supabase-js";
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

async function checkExternalIds() {
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("環境変数が設定されていません:");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("商品のexternal_product_idを取得中...\n");

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

  console.log(`見つかった商品数: ${products.length}\n`);
  console.log("=".repeat(80));
  
  products.forEach((product, index) => {
    console.log(`\n商品 ${index + 1}:`);
    console.log(`  ID: ${product.id}`);
    console.log(`  名前: ${product.name}`);
    console.log(`  ショップID: ${product.shop_id}`);
    console.log(`  外部商品ID: ${product.external_product_id || "(未設定)"}`);
  });

  console.log("\n" + "=".repeat(80));
}

checkExternalIds().catch(console.error);
