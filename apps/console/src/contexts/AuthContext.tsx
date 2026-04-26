"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase, setAuthFetchFailureCallback } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  isPlatformAdminEmailClient,
  isProvisionAdminEmailClient,
} from "@/lib/auth/platformAdmin";
import { FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY } from "@/lib/auth/operatorShop";

interface AuthContextType {
  isAuthenticated: boolean;
  shopId: string;
  /** 発行管理者がショップ一覧から選んだ代理表示先（未選択時は null） */
  operatorShopId: string | null;
  setOperatorShopId: (shopId: string | null) => void;
  user: User | null;
  userRole: "owner" | "member" | null;
  /** 運営メール。開発タブなどフルコンソール権限の表示用（PLATFORM_ADMIN_EMAILS）。 */
  isPlatformAdmin: boolean;
  /** ブランド（ショップ）発行・/admin/* のみ（既定は info@ のみ、PROVISION_ADMIN_EMAILS） */
  isProvisionAdmin: boolean;
  /** 開発ナビ・/development: ブランド側オーナー or 非発行のプラットフォーム管理者（発行専用アカウントは除外） */
  canAccessDevelopment: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileShopId, setProfileShopId] = useState<string>("default_shop");
  const [profileUserRole, setProfileUserRole] = useState<"owner" | "member" | null>(null);
  const [operatorShopId, setOperatorShopIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const setOperatorShopId = useCallback((id: string | null) => {
    if (typeof window !== "undefined") {
      if (id) {
        window.localStorage.setItem(FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY, id);
      } else {
        window.localStorage.removeItem(FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY);
      }
    }
    setOperatorShopIdState(id);
  }, []);

  // 発行管理者: ブラウザに保存した代理表示ショップを復元（非発行ユーザーではストレージを消す）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.email) {
      setOperatorShopIdState(null);
      return;
    }
    if (!isProvisionAdminEmailClient(user.email)) {
      setOperatorShopIdState(null);
      window.localStorage.removeItem(FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY);
      return;
    }
    const stored = window.localStorage.getItem(FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY)?.trim();
    setOperatorShopIdState(stored && stored.length > 0 ? stored : null);
  }, [user?.email]);

  // 認証トークン取得失敗時にセッションをクリアし、リトライの連鎖を止める
  useEffect(() => {
    setAuthFetchFailureCallback(() => {
      supabase.auth.signOut();
    });
    return () => setAuthFetchFailureCallback(null);
  }, []);

  // ユーザー情報とshop_idを取得
  useEffect(() => {
    let isMounted = true;

    // 初期セッションを取得
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;
      
      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Initial session retrieved:", { hasSession: !!session, hasError: !!sessionError });
      }
      
      setUser(session?.user ?? null);
      if (session?.user && session?.access_token) {
        // 初回ログイン確定処理（招待メールからのリダイレクト時など）
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("[AuthContext] Calling post-login API to ensure profile exists...");
          }
          const postLoginResponse = await fetch("/api/auth/post-login", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (process.env.NODE_ENV === "development") {
            if (postLoginResponse.ok) {
              console.log("[AuthContext] post-login success");
            } else {
              console.log("[AuthContext] post-login not needed or already completed");
            }
          }
        } catch (postLoginError) {
          if (process.env.NODE_ENV === "development") {
            console.log("[AuthContext] post-login error (may be expected):", postLoginError);
          }
        }

        // shop_id を取得（await して reject を捕捉し、未処理の "Failed to fetch" を防ぐ）
        try {
          await fetchShopId(session.user.id, session.access_token);
        } catch (shopIdError) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[AuthContext] fetchShopId failed on init:", shopIdError);
          }
          setProfileShopId("default_shop");
          setProfileUserRole(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      if (!isMounted) return;
      console.warn("[AuthContext] Initial session handling failed:", err);
      setProfileShopId("default_shop");
      setProfileUserRole(null);
      setIsLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Auth state changed:", event, { hasSession: !!session });
      }
      
      setUser(session?.user ?? null);
      if (session?.user && session?.access_token) {
        try {
          await fetchShopId(session.user.id, session.access_token);
        } catch (error) {
          console.error("[AuthContext] Error in fetchShopId during auth state change:", error);
          setProfileShopId("default_shop");
        } finally {
          setIsLoading(false);
        }
      } else {
        setProfileShopId("default_shop");
        setProfileUserRole(null);
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
    if (process.env.NODE_ENV === "development") {
      console.log("[AuthContext] fetchShopId called for userId:", userId);
    }
    
    try {
      if (!accessToken) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AuthContext] No access token provided, using default shop_id");
        }
        setProfileShopId("default_shop");
        setIsLoading(false);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Using provided access token, calling API...");
      }

      const response = await fetch("/api/auth/shop-id", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Fetch completed, status:", response.status);
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
      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] API response:", data);
      }
      
      if (data.shopId) {
        if (process.env.NODE_ENV === "development") {
          console.log("[AuthContext] shop_id found:", data.shopId);
        }
        setProfileShopId(String(data.shopId));
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AuthContext] No shop_id found in response, data:", data);
        }
        setProfileShopId("default_shop");
      }

      // role を設定
      if (data.role && (data.role === "owner" || data.role === "member")) {
        if (process.env.NODE_ENV === "development") {
          console.log("[AuthContext] role found:", data.role);
        }
        setProfileUserRole(data.role);
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AuthContext] No valid role found in response");
        }
        setProfileUserRole(null);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error) || "Unknown error";
      console.error("[AuthContext] Error in fetchShopId:", errorMessage, error);
      
      // エラーでもデフォルト値を使用して続行
      setProfileShopId("default_shop");
      setProfileUserRole(null);
    } finally {
      // 必ずローディング状態を解除
      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] fetchShopId completed, setting isLoading to false");
      }
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Attempting login for email:", email);
      }
      let data: { user: any; session: any } | null = null;
      let error: any = null;
      try {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        data = result.data;
        error = result.error;
      } catch (supabaseError: any) {
        // ネットワークエラー・Abort・Supabase の AuthRetryableFetchError を捕捉
        const msg = String(supabaseError?.message ?? "");
        const name = String(supabaseError?.name ?? "");
        const isNetworkError =
          name === "AuthRetryableFetchError" ||
          name === "TypeError" ||
          msg === "Failed to fetch" ||
          name === "AbortError" ||
          msg.toLowerCase().includes("fetch") ||
          msg.toLowerCase().includes("network");
        if (isNetworkError) {
          throw new Error(
            "Supabase に接続できません。NEXT_PUBLIC_SUPABASE_URL とネットワークを確認してください。"
          );
        }
        throw supabaseError;
      }

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AuthContext] Login error:", {
            message: error.message,
            status: error.status,
            name: error.name,
          });
        }
        setIsLoading(false);

        // 接続エラー（Supabase が throw せず result.error で返す場合）
        const msg = String(error?.message ?? "");
        const name = String(error?.name ?? "");
        if (
          name === "AuthRetryableFetchError" ||
          name === "TypeError" ||
          msg === "Failed to fetch" ||
          msg.toLowerCase().includes("fetch") ||
          msg.toLowerCase().includes("network")
        ) {
          throw new Error(
            "Supabase に接続できません。NEXT_PUBLIC_SUPABASE_URL とネットワークを確認してください。"
          );
        }
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

      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Login successful, user ID:", data.user.id);
      }
      
      // ユーザー情報を明示的に設定（isAuthenticatedを即座に更新するため）
      setUser(data.user);
      
      // 初回ログイン確定処理（pending_invites → profiles）
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("[AuthContext] Calling post-login API to confirm invite...");
        }
        const postLoginResponse = await fetch("/api/auth/post-login", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        if (!postLoginResponse.ok) {
          const postLoginError = await postLoginResponse.json().catch(() => ({}));
          const errorMessage = postLoginError?.message || postLoginError?.error;

          // 招待されていない場合は特別なエラーメッセージ
          if (postLoginResponse.status === 403) {
            setIsLoading(false);
            throw new Error(errorMessage || "このメールアドレスは招待されていません。管理者に連絡してください。");
          }

          if (process.env.NODE_ENV === "development" && postLoginResponse.status !== 403) {
            console.warn("[AuthContext] post-login failed:", postLoginResponse.status, postLoginError);
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            const postLoginData = await postLoginResponse.json();
            console.log("[AuthContext] post-login success:", postLoginData);
          }
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
        if (process.env.NODE_ENV === "development") {
          console.warn("[AuthContext] Failed to fetch shop_id, but login succeeded:", shopIdError);
        }
        // profiles が存在しない場合は警告を出す
        if (shopIdError?.status === 404 || shopIdError?.response?.status === 404) {
          console.error(
            "[AuthContext] Profile not found. " +
            "This may indicate that the user was not invited."
          );
        }
        // デフォルトのshop_idを設定
        setProfileShopId("default_shop");
      }
      
      // ローディング状態を確実に解除
      setIsLoading(false);

      // ログイン成功後、即座にリダイレクト（発行管理者はアカウント発行画面へ）
      const dest = isProvisionAdminEmailClient(data.user.email)
        ? "/admin/provision-shop"
        : "/";
      if (process.env.NODE_ENV === "development") {
        console.log("[AuthContext] Redirecting to", dest);
      }
      if (typeof window !== "undefined") {
        window.location.href = dest;
      } else {
        router.replace(dest);
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
        if (process.env.NODE_ENV === "development") {
          console.log("[AuthContext] Signup error response text:", text);
        }
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
    setProfileShopId("default_shop");
    setProfileUserRole(null);
    setOperatorShopIdState(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FITANDLOOK_OPERATOR_SHOP_STORAGE_KEY);
    }
    router.push("/login");
  };

  const isAuthenticated = !!user;

  const isPlatformAdmin = useMemo(
    () => isPlatformAdminEmailClient(user?.email),
    [user?.email]
  );

  const isProvisionAdmin = useMemo(
    () => isProvisionAdminEmailClient(user?.email),
    [user?.email]
  );

  const shopId = useMemo(
    () => (isProvisionAdmin && operatorShopId ? operatorShopId : profileShopId),
    [isProvisionAdmin, operatorShopId, profileShopId]
  );

  const userRole = useMemo(
    (): "owner" | "member" | null =>
      isProvisionAdmin && operatorShopId ? "owner" : profileUserRole,
    [isProvisionAdmin, operatorShopId, profileUserRole]
  );

  const canAccessDevelopment = useMemo(
    () =>
      (isProvisionAdmin && !!operatorShopId) ||
      (!isProvisionAdmin && (profileUserRole === "owner" || isPlatformAdmin)),
    [isProvisionAdmin, operatorShopId, profileUserRole, isPlatformAdmin]
  );

  // デバッグ用ログ（開発環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[AuthContext] State update:", {
        hasUser: !!user,
        userId: user?.id,
        isAuthenticated,
        isLoading,
        shopId,
      });
    }
  }, [user, isAuthenticated, isLoading, shopId]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        shopId,
        operatorShopId,
        setOperatorShopId,
        user,
        userRole,
        isPlatformAdmin,
        isProvisionAdmin,
        canAccessDevelopment,
        login,
        signup,
        logout,
        isLoading,
      }}
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
