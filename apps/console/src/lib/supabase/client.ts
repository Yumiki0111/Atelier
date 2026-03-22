import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/** Called once when an auth token/refresh request fails so we can clear session and stop retry storm */
let authFetchFailureCallback: (() => void) | null = null;
let authFetchFailureHandled = false;

export function setAuthFetchFailureCallback(cb: (() => void) | null) {
  authFetchFailureCallback = cb;
  authFetchFailureHandled = false;
}

function isAuthTokenRefreshRequest(url: string, init?: RequestInit): boolean {
  try {
    const u = new URL(url, supabaseUrl);
    if (!u.pathname.includes("/auth/v1/token")) return false;
  } catch {
    if (!url.includes("token")) return false;
  }
  // リフレッシュ時のみ 401 を返す。ログイン (grant_type=password) の失敗はそのまま throw する
  const body = init?.body;
  if (body == null) return false;
  const raw = typeof body === "string" ? body : (body as URLSearchParams)?.toString?.() ?? "";
  return raw.includes("grant_type=refresh_token") || raw.includes("refresh_token=");
}

const supabaseFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
  try {
    return await fetch(input, init);
  } catch (err) {
    if (isAuthTokenRefreshRequest(url, init) && authFetchFailureCallback && !authFetchFailureHandled) {
      authFetchFailureHandled = true;
      try {
        authFetchFailureCallback();
      } catch (_) {
        // ignore so we don't mask the original error
      }
      // リフレッシュ失敗時のみ 401 を返してリトライを止める。ログイン失敗は throw のまま
      return new Response(
        JSON.stringify({ error: "session_refresh_failed", message: "Failed to fetch" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: supabaseFetch },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
