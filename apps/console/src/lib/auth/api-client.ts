"use client";

import { supabase } from "@/lib/supabase/client";

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

  return fetch(url, {
    ...options,
    headers,
  });
}
