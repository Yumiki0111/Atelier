import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isProvisionAdminEmail } from "@/lib/auth/platformAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 内部管理 API の認可: ADMIN_TOKEN（ヘッダ x-admin-token）または
 * ログイン中の「発行管理者」メール（Bearer）。発行管理者は既定で info@fitandlook.com のみ（PROVISION_ADMIN_EMAILS で追加可）。
 * 移行中: 環境変数 Atelier_ADMIN_TOKEN・ヘッダ x-Atelier-admin-token も受け付ける。
 */
export async function authorizeInternalAdminRequest(request: NextRequest): Promise<boolean> {
  const expectedToken =
    process.env.ADMIN_TOKEN ?? process.env.Atelier_ADMIN_TOKEN;
  const adminHeader =
    request.headers.get("x-admin-token") ??
    request.headers.get("x-Atelier-admin-token");
  if (expectedToken && adminHeader === expectedToken) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const jwt = authHeader.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);

  if (error || !user?.email) {
    return false;
  }

  return isProvisionAdminEmail(user.email);
}
