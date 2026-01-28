"use client";

import { supabase } from "@/lib/supabase/client";

/**
 * 認証付きでAPIを呼び出すヘルパー関数
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    console.log("[authenticatedFetch] Starting, url:", url);
    
    console.log("[authenticatedFetch] Getting session...");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log("[authenticatedFetch] Session retrieved:", { hasSession: !!session, hasError: !!sessionError });

    if (sessionError) {
      console.error("[authenticatedFetch] Error getting session:", sessionError);
      throw new Error("セッションの取得に失敗しました");
    }

    const headers = new Headers(options.headers);

    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
      console.log("[authenticatedFetch] Authorization header set");
    } else {
      console.warn("[authenticatedFetch] No session found, making request without auth token");
    }

    console.log("[authenticatedFetch] Making fetch request to:", url);
    const response = await fetch(url, {
      ...options,
      headers,
    });
    console.log("[authenticatedFetch] Fetch completed, status:", response.status);
    
    return response;
  } catch (error: any) {
    console.error("[authenticatedFetch] Error:", error);
    throw error;
  }
}
