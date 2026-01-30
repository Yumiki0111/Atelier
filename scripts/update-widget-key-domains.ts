/**
 * Widget Keyの許可ドメインを更新するスクリプト
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

async function updateWidgetKeyDomains() {
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("環境変数が設定されていません");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const publicKey = "pub_live_030b64caa84e2995672163c125d600bd";
  
  console.log(`Widget Keyの許可ドメインを更新中...\n`);
  console.log(`Public Key: ${publicKey}\n`);

  // 現在の設定を取得
  const { data: currentKey, error: fetchError } = await supabase
    .from("widget_keys")
    .select("id, allowed_domains")
    .eq("public_key", publicKey)
    .single();

  if (fetchError || !currentKey) {
    console.error("Widget Keyが見つかりませんでした:", fetchError);
    process.exit(1);
  }

  console.log(`現在の許可ドメイン: ${JSON.stringify(currentKey.allowed_domains || [])}`);

  // 新しい許可ドメインリストを作成
  const currentDomains: string[] = currentKey.allowed_domains || [];
  const newDomains = [...new Set([...currentDomains, "localhost:5174", "localhost:3000"])];

  console.log(`新しい許可ドメイン: ${JSON.stringify(newDomains)}\n`);

  // 更新
  const { data: updatedKey, error: updateError } = await supabase
    .from("widget_keys")
    .update({ allowed_domains: newDomains })
    .eq("id", currentKey.id)
    .select()
    .single();

  if (updateError) {
    console.error("更新エラー:", updateError);
    process.exit(1);
  }

  console.log("✅ 許可ドメインを更新しました:");
  console.log(JSON.stringify(updatedKey.allowed_domains, null, 2));
}

updateWidgetKeyDomains().catch(console.error);
