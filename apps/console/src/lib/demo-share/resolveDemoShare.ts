import { supabaseAdmin } from "@/lib/supabase/server";

export type ResolvedDemoShare = {
  publicKey: string;
  externalProductId: string;
  productName: string;
  thumbnailUrl?: string;
};

/**
 * /share/[token] 用。トークンが有効ならウィジェット表示に必要な情報を返す。
 */
export async function resolveDemoShareToken(token: string): Promise<ResolvedDemoShare | null> {
  if (!token || !supabaseAdmin) return null;

  const { data: link, error: linkErr } = await supabaseAdmin
    .from("demo_share_links")
    .select("id, shop_id, product_id, expires_at")
    .eq("token", token.trim())
    .maybeSingle();

  if (linkErr || !link) return null;
  if (link.expires_at && new Date(link.expires_at as string) < new Date()) return null;

  const { data: product, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("external_product_id, name, thumbnail_url")
    .eq("id", link.product_id)
    .eq("shop_id", link.shop_id)
    .maybeSingle();

  if (prodErr || !product) return null;
  const ext = typeof product.external_product_id === "string" ? product.external_product_id.trim() : "";
  if (!ext) return null;

  const { data: keys, error: keyErr } = await supabaseAdmin
    .from("widget_keys")
    .select("public_key")
    .eq("shop_id", link.shop_id)
    .eq("enabled", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (keyErr || !keys?.length) return null;
  const publicKey = keys[0]?.public_key as string | undefined;
  if (!publicKey) return null;

  return {
    publicKey,
    externalProductId: ext,
    productName: (product.name as string) || "商品",
    thumbnailUrl: (product.thumbnail_url as string) || undefined,
  };
}
