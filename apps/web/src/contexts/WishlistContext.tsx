"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    priceMin: number;
    priceMax: number;
    compareAtPrice: number | null;
    currency: string;
    isAvailable: boolean;
    brand: {
      name: string;
      slug: string;
    };
    images: {
      src: string;
      alt: string;
    }[];
  };
}

interface WishlistContextType {
  items: WishlistItem[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/wishlist");
      const data = await response.json();

      if (data.success) {
        setItems(data.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("[Wishlist] Failed to refresh:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      refreshWishlist();
    }
  }, [authLoading, refreshWishlist]);

  const isInWishlist = useCallback(
    (productId: string) => {
      return items.some((item) => item.productId === productId);
    },
    [items]
  );

  const addToWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        return false;
      }

      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        const data = await response.json();

        if (data.success) {
          await refreshWishlist();
          return true;
        }
        return false;
      } catch (error) {
        console.error("[Wishlist] Add error:", error);
        return false;
      }
    },
    [isAuthenticated, refreshWishlist]
  );

  const removeFromWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        return false;
      }

      try {
        const response = await fetch(`/api/wishlist?productId=${productId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (data.success) {
          setItems((prev) => prev.filter((item) => item.productId !== productId));
          return true;
        }
        return false;
      } catch (error) {
        console.error("[Wishlist] Remove error:", error);
        return false;
      }
    },
    [isAuthenticated]
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
