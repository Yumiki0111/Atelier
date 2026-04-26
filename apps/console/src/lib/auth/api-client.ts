"use client";

import { supabase } from "@/lib/supabase/client";
import {
  FITANDLOOK_OPERATOR_SHOP_HEADER,
  FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY,
} from "@/lib/auth/operatorShop";

/**
 * 認証付きでAPIを呼び出すヘルパー関数
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[authenticatedFetch] Error getting session:", sessionError);
    throw new Error("セッションの取得に失敗しました");
  }

  const headers = new Headers(options.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (typeof window !== "undefined") {
    const op = window.localStorage.getItem(FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY)?.trim();
    if (op) {
      headers.set(FITANDLOOK_OPERATOR_SHOP_HEADER, op);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
