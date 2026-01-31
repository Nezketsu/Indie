"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  variant?: "card" | "page";
  className?: string;
}

export function WishlistButton({
  productId,
  variant = "card",
  className,
}: WishlistButtonProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const inWishlist = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setIsLoading(true);
    try {
      if (inWishlist) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "page") {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-4 py-2 border transition-colors",
          inWishlist
            ? "border-red-500 text-red-500 hover:bg-red-50"
            : "border-neutral-300 text-neutral-600 hover:border-black hover:text-black",
          isLoading && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <Heart
          className={cn("w-5 h-5", inWishlist && "fill-red-500")}
          strokeWidth={1.5}
        />
        <span className="text-sm">
          {inWishlist ? "Dans ma liste d'envies" : "Ajouter à ma liste d'envies"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm transition-all hover:scale-110",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={inWishlist ? "Retirer de la liste d'envies" : "Ajouter à la liste d'envies"}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-colors",
          inWishlist ? "fill-red-500 text-red-500" : "text-neutral-600 hover:text-red-500"
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}
