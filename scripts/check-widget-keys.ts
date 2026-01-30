/**
 * Widget Keysの設定を確認するスクリプト
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

async function checkWidgetKeys() {
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("環境変数が設定されていません");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("Widget Keysを取得中...\n");

  const { data: widgetKeys, error } = await supabase
    .from("widget_keys")
    .select("id, shop_id, public_key, allowed_domains, enabled, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("エラー:", error);
    process.exit(1);
  }

  if (!widgetKeys || widgetKeys.length === 0) {
    console.log("Widget Keyが見つかりませんでした。");
    return;
  }

  console.log(`見つかったWidget Key数: ${widgetKeys.length}\n`);
  console.log("=".repeat(80));
  
  widgetKeys.forEach((key, index) => {
    console.log(`\nWidget Key ${index + 1}:`);
    console.log(`  ID: ${key.id}`);
    console.log(`  ショップID: ${key.shop_id}`);
    console.log(`  Public Key: ${key.public_key}`);
    console.log(`  有効: ${key.enabled ? "はい" : "いいえ"}`);
    console.log(`  許可ドメイン: ${JSON.stringify(key.allowed_domains || [])}`);
    console.log(`  作成日時: ${key.created_at}`);
  });

  console.log("\n" + "=".repeat(80));
  
  // テスト用のPublic Keyを確認
  const testPublicKey = "pub_live_030b64caa84e2995672163c125d600bd";
  const foundKey = widgetKeys.find(k => k.public_key === testPublicKey);
  
  if (foundKey) {
    console.log(`\n✅ テスト用Public Keyが見つかりました:`);
    console.log(`  有効: ${foundKey.enabled ? "はい" : "いいえ"}`);
    console.log(`  許可ドメイン: ${JSON.stringify(foundKey.allowed_domains || [])}`);
    
    if (!foundKey.enabled) {
      console.log(`\n⚠️  Widget Keyが無効になっています。`);
    }
    
    const allowedDomains = foundKey.allowed_domains || [];
    if (allowedDomains.length === 0) {
      console.log(`\n⚠️  許可ドメインが設定されていません。`);
    } else if (!allowedDomains.includes("localhost:5174") && !allowedDomains.includes("localhost")) {
      console.log(`\n⚠️  localhost:5174 が許可ドメインに含まれていません。`);
      console.log(`   現在の許可ドメイン: ${JSON.stringify(allowedDomains)}`);
    }
  } else {
    console.log(`\n⚠️  テスト用Public Key (${testPublicKey}) が見つかりませんでした。`);
  }
}

checkWidgetKeys().catch(console.error);
