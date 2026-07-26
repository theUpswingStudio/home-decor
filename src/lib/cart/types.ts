export const CART_STORAGE_KEY = "vestrel-house:cart";
export const CART_STORAGE_VERSION = 1 as const;
export const CART_RETENTION_DAYS = 30;
export const CART_TTL_MS = CART_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const MAX_CART_LINES = 50;
export const MIN_CART_QUANTITY = 1;
export const MAX_CART_QUANTITY = 99;

export interface CartItem {
  readonly variantId: string;
  readonly quantity: number;
}

export interface CartStorageEnvelope {
  readonly version: typeof CART_STORAGE_VERSION;
  readonly updatedAt: number;
  readonly items: readonly CartItem[];
}

export type CartPersistence = "local" | "memory";

export interface CartSnapshot {
  readonly status: "loading" | "ready";
  readonly updatedAt: number | null;
  readonly items: readonly CartItem[];
  readonly persistence: CartPersistence;
}

export type CartAction =
  | { readonly type: "add"; readonly variantId: string; readonly quantity: number }
  | {
      readonly type: "set-quantity";
      readonly variantId: string;
      readonly quantity: number;
    }
  | { readonly type: "remove"; readonly variantId: string }
  | { readonly type: "remove-many"; readonly variantIds: readonly string[] }
  | { readonly type: "clear" };

export type AddCartItemResult =
  | {
      readonly changed: true;
      readonly quantity: number;
      readonly itemCount: number;
    }
  | {
      readonly changed: false;
      readonly reason:
        | "invalid"
        | "unavailable"
        | "line-limit"
        | "quantity-limit";
      readonly quantity: number | null;
      readonly itemCount: number;
    };
