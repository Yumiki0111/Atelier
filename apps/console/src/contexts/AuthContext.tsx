"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  isAuthenticated: boolean;
  shopId: string;
  user: User | null;
  userRole: "owner" | "member" | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shopId, setShopId] = useState<string>("default_shop");
  const [userRole, setUserRole] = useState<"owner" | "member" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ユーザー情報とshop_idを取得
  useEffect(() => {
    let isMounted = true;

    // 初期セッションを取得
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;
      
      console.log("[AuthContext] Initial session retrieved:", { hasSession: !!session, hasError: !!sessionError });
      
      setUser(session?.user ?? null);
      if (session?.user && session?.access_token) {
        // 初回ログイン確定処理（招待メールからのリダイレクト時など）
        try {
          console.log("[AuthContext] Calling post-login API to ensure profile exists...");
          const postLoginResponse = await fetch("/api/auth/post-login", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (postLoginResponse.ok) {
            console.log("[AuthContext] post-login success");
          } else {
            console.log("[AuthContext] post-login not needed or already completed");
          }
        } catch (postLoginError) {
          console.log("[AuthContext] post-login error (may be expected):", postLoginError);
        }

        // shop_id を取得
        fetchShopId(session.user.id, session.access_token);
      } else {
        setIsLoading(false);
      }
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log("[AuthContext] Auth state changed:", event, { hasSession: !!session });
      
      setUser(session?.user ?? null);
      if (session?.user && session?.access_token) {
        try {
          await fetchShopId(session.user.id, session.access_token);
        } catch (error) {
          console.error("[AuthContext] Error in fetchShopId during auth state change:", error);
          setShopId("default_shop");
        } finally {
          setIsLoading(false);
        }
      } else {
        setShopId("default_shop");
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // APIエンドポイント経由でshop_idを取得（RLSをバイパス）
  const fetchShopId = async (userId: string, accessToken: string) => {
    console.log("[AuthContext] fetchShopId called for userId:", userId);
    
    try {
      if (!accessToken) {
        console.warn("[AuthContext] No access token provided, using default shop_id");
        setShopId("default_shop");
        setIsLoading(false);
        return;
      }

      console.log("[AuthContext] Using provided access token, calling API...");

      // タイムアウト付きでAPIエンドポイントを呼び出し
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error("[AuthContext] Request timeout, aborting...");
        controller.abort();
      }, 10000); // 10秒でタイムアウト

      let response: Response;
      try {
        console.log("[AuthContext] Making fetch request to /api/auth/shop-id");
        response = await fetch("/api/auth/shop-id", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });
        console.log("[AuthContext] Fetch completed, status:", response.status);
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error("[AuthContext] Fetch error:", fetchError);
        if (fetchError.name === "AbortError") {
          console.error("[AuthContext] fetchShopId timeout after 10 seconds");
          setShopId("default_shop");
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[AuthContext] Error fetching shop_id:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        // 404エラーは「レコードが見つからない」エラー
        if (response.status === 404) {
          const error = new Error("Profile not found");
          (error as any).status = 404;
          (error as any).response = { status: 404 };
          throw error;
        }
        
        // その他のエラーもスローして、呼び出し元で処理できるようにする
        const error = new Error(errorData.error || "Failed to fetch shop_id");
        (error as any).status = response.status;
        (error as any).response = { status: response.status };
        throw error;
      }

      const data = await response.json();
      console.log("[AuthContext] API response:", data);
      
      if (data.shopId) {
        console.log("[AuthContext] shop_id found:", data.shopId);
        setShopId(String(data.shopId));
      } else {
        console.warn("[AuthContext] No shop_id found in response, data:", data);
        setShopId("default_shop");
      }

      // role を設定
      if (data.role && (data.role === "owner" || data.role === "member")) {
        console.log("[AuthContext] role found:", data.role);
        setUserRole(data.role);
      } else {
        console.warn("[AuthContext] No valid role found in response");
        setUserRole(null);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error) || "Unknown error";
      console.error("[AuthContext] Error in fetchShopId:", errorMessage, error);
      
      // エラーでもデフォルト値を使用して続行
      setShopId("default_shop");
      setUserRole(null);
    } finally {
      // 必ずローディング状態を解除
      console.log("[AuthContext] fetchShopId completed, setting isLoading to false");
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("[AuthContext] Attempting login for email:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AuthContext] Login error:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        setIsLoading(false);
        
        // メール未確認エラーの場合、より分かりやすいメッセージを表示
        if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
          throw new Error("メールアドレスの確認が必要です。サインアップ時に送信されたメールを確認してください。");
        }
        
        throw error;
      }

      if (!data.user || !data.session) {
        console.error("[AuthContext] Login succeeded but no user or session returned");
        setIsLoading(false);
        throw new Error("ログインに失敗しました: ユーザー情報が取得できませんでした");
      }

      console.log("[AuthContext] Login successful, user ID:", data.user.id);
      
      // ユーザー情報を明示的に設定（isAuthenticatedを即座に更新するため）
      setUser(data.user);
      
      // 初回ログイン確定処理（pending_invites → profiles）
      try {
        console.log("[AuthContext] Calling post-login API to confirm invite...");
        const postLoginResponse = await fetch("/api/auth/post-login", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        if (!postLoginResponse.ok) {
          const postLoginError = await postLoginResponse.json();
          console.error("[AuthContext] post-login API error:", postLoginError);
          
          // 招待されていない場合は特別なエラーメッセージ
          if (postLoginResponse.status === 403) {
            setIsLoading(false);
            throw new Error(postLoginError.message || "このメールアドレスは招待されていません。管理者に連絡してください。");
          }
          
          // その他のエラーは警告だけ出して続行
          console.warn("[AuthContext] post-login failed, trying to fetch shop_id directly...");
        } else {
          const postLoginData = await postLoginResponse.json();
          console.log("[AuthContext] post-login success:", postLoginData);
        }
      } catch (postLoginError: any) {
        console.error("[AuthContext] post-login exception:", postLoginError);
        setIsLoading(false);
        throw postLoginError;
      }
      
      // shop_id を取得
      try {
        await fetchShopId(data.user.id, data.session.access_token);
      } catch (shopIdError: any) {
        // shop_idの取得に失敗してもログインは成功させる
        console.warn("[AuthContext] Failed to fetch shop_id, but login succeeded:", shopIdError);
        // profiles が存在しない場合は警告を出す
        if (shopIdError?.status === 404 || shopIdError?.response?.status === 404) {
          console.error(
            "[AuthContext] Profile not found. " +
            "This may indicate that the user was not invited."
          );
        }
        // デフォルトのshop_idを設定
        setShopId("default_shop");
      }
      
      // ローディング状態を確実に解除
      setIsLoading(false);

      // ログイン成功後、即座にリダイレクト
      console.log("[AuthContext] Redirecting to home page");
      // window.locationを使用して確実にリダイレクト
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.replace("/");
      }
    } catch (error: any) {
      console.error("[AuthContext] Login exception:", error);
      setIsLoading(false);
      // エラーメッセージを日本語化
      if (error.message) {
        throw error;
      } else if (error.status === 400) {
        throw new Error("メールアドレスまたはパスワードが正しくありません");
      } else if (error.status === 429) {
        throw new Error("ログイン試行回数が多すぎます。しばらく待ってから再度お試しください");
      } else {
        throw new Error(error.message || "ログインに失敗しました");
      }
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    // API経由でサインアップ（usersテーブルへの登録も含む）
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      let error: any;
      try {
        const text = await response.text();
        console.log("[AuthContext] Signup error response text:", text);
        error = text ? JSON.parse(text) : { error: "Failed to sign up" };
      } catch (e) {
        console.error("[AuthContext] Failed to parse error response:", e);
        error = { error: "Failed to sign up" };
      }
      
      console.error("[AuthContext] Signup error:", {
        status: response.status,
        statusText: response.statusText,
        error: error,
      });
      
      // エラーの詳細を表示
      let errorMessage = error.error || "Failed to sign up";
      if (error.details) {
        errorMessage += `: ${error.details}`;
      }
      if (error.code) {
        errorMessage += ` (code: ${error.code})`;
      }
      if (error.hint) {
        errorMessage += ` (hint: ${error.hint})`;
      }
      throw new Error(errorMessage);
    }

    // サインアップ成功後、ログインページにリダイレクト
    router.push("/login?message=サインアップが完了しました。ログインしてください。");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShopId("default_shop");
    setUserRole(null);
    router.push("/login");
  };

  const isAuthenticated = !!user;

  // デバッグ用ログ
  useEffect(() => {
    console.log("[AuthContext] State update:", {
      hasUser: !!user,
      userId: user?.id,
      isAuthenticated,
      isLoading,
      shopId,
    });
  }, [user, isAuthenticated, isLoading, shopId]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, shopId, user, userRole, login, signup, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
