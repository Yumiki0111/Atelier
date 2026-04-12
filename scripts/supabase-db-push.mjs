#!/usr/bin/env node
/**
 * Load apps/console/.env.local and run `supabase db push` with -p (non-interactive).
 * Requires: Supabase CLI (`supabase`), linked project (`supabase link`).
 *
 * Dashboard → Project Settings → Database → Database password → set SUPABASE_DB_PASSWORD in .env.local
 */
import { config } from "dotenv";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, "apps/console/.env.local") });

const password = process.env.SUPABASE_DB_PASSWORD?.trim();
if (!password) {
  console.error(
    "SUPABASE_DB_PASSWORD is empty. Set it in apps/console/.env.local (Supabase Dashboard → Database)."
  );
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
try {
  // --yes は global フラグなのでサブコマンドより前に置く（確認プロンプトを抑止）
  execFileSync("supabase", ["--yes", "db", "push", "-p", password, ...extraArgs], {
    cwd: root,
    stdio: "inherit",
  });
} catch {
  // Avoid Node echoing argv (password) in Error#message
  process.exit(1);
}
