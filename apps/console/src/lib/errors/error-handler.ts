/**
 * エラーハンドリング用のヘルパー関数
 */

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
}

/**
 * APIレスポンスからエラーメッセージを抽出
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data.error) {
      return data.error;
    }
    if (data.message) {
      return data.message;
    }
  } catch {
    // JSON解析に失敗した場合は、ステータスコードからメッセージを生成
  }

  // ステータスコードに基づいてデフォルトメッセージを返す
  switch (response.status) {
    case 400:
      return "リクエストが無効です";
    case 401:
      return "認証が必要です。再度ログインしてください";
    case 403:
      return "この操作を実行する権限がありません";
    case 404:
      return "リソースが見つかりませんでした";
    case 409:
      return "競合が発生しました。既に存在する可能性があります";
    case 422:
      return "入力データが無効です";
    case 500:
      return "サーバーエラーが発生しました。しばらくしてから再度お試しください";
    case 503:
      return "サービスが一時的に利用できません";
    default:
      return "エラーが発生しました";
  }
}

/**
 * エラーオブジェクトからユーザーフレンドリーなメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "error" in error) {
    const apiError = error as ApiError;
    return apiError.error || "エラーが発生しました";
  }

  return "予期しないエラーが発生しました";
}

/**
 * エラーの種類を判定
 */
export function getErrorType(error: unknown): "network" | "validation" | "auth" | "server" | "unknown" {
  if (error instanceof Error) {
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return "network";
    }
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      return "auth";
    }
    if (error.message.includes("400") || error.message.includes("validation")) {
      return "validation";
    }
    if (error.message.includes("500") || error.message.includes("server")) {
      return "server";
    }
  }

  return "unknown";
}

/**
 * エラーメッセージを日本語に翻訳（必要に応じて）
 */
export function translateErrorMessage(message: string): string {
  const translations: Record<string, string> = {
    "Unauthorized": "認証が必要です",
    "Not Found": "見つかりませんでした",
    "Internal Server Error": "サーバーエラーが発生しました",
    "Bad Request": "リクエストが無効です",
    "Database not configured": "データベースが設定されていません",
    "Current password is incorrect": "現在のパスワードが正しくありません",
    "New password must be at least 6 characters": "新しいパスワードは6文字以上である必要があります",
    "Invalid email format": "メールアドレスの形式が正しくありません",
  };

  return translations[message] || message;
}
