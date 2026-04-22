/**
 * 商品のサイズ別アセット行を確認するスクリプト
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

async function checkAssets() {
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("環境変数が設定されていません");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("商品とアセットを取得中...\n");

  // 商品を取得
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, external_product_id, shop_id")
    .order("created_at", { ascending: false });

  if (productsError) {
    console.error("商品取得エラー:", productsError);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("商品が見つかりませんでした。");
    return;
  }

  console.log(`見つかった商品数: ${products.length}\n`);
  console.log("=".repeat(80));

  // 各商品のアセットを確認
  for (const product of products) {
    console.log(`\n商品: ${product.name}`);
    console.log(`  ID: ${product.id}`);
    console.log(`  外部商品ID: ${product.external_product_id || "(未設定)"}`);
    
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("id, size, thumbnail_url, version, is_active, created_at")
      .eq("product_id", product.id)
      .order("size", { ascending: true })
      .order("version", { ascending: false });

    if (assetsError) {
      console.error(`  アセット取得エラー: ${assetsError.message}`);
      continue;
    }

    if (!assets || assets.length === 0) {
      console.log(`  ⚠️  アセット: なし`);
    } else {
      console.log(`  ✅ アセット数: ${assets.length}`);
      assets.forEach((asset) => {
        console.log(`    - サイズ: ${asset.size}, バージョン: ${asset.version}, アクティブ: ${asset.is_active ? "はい" : "いいえ"}`);
        console.log(`      サムネ URL: ${asset.thumbnail_url ?? "—"}`);
      });
    }
  }

  console.log("\n" + "=".repeat(80));
}

checkAssets().catch(console.error);
