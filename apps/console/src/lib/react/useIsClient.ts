import { useSyncExternalStore } from "react";

/** SSR では false。クライアント初回レンダーも false でサーバー HTML と一致させる。 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
