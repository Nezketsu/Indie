"use client";

import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ChevronLeft, Trash2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Link
          href="/products"
          className="inline-flex items-center text-sm text-neutral-500 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour aux produits
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-24">
        {/* Title */}
        <div className="mb-12 text-center">
          <Heart className="w-8 h-8 mx-auto mb-4 text-red-500" strokeWidth={1.5} />
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
            Ma liste d'envies
          </h1>
          <p className="mt-2 text-neutral-500">
            {items.length} {items.length === 1 ? "article" : "articles"}
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-neutral-200 aspect-[3/4] mb-4" />
                <div className="h-3 bg-neutral-200 rounded mb-2" />
                <div className="h-4 bg-neutral-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto mb-6 text-neutral-300" strokeWidth={1} />
            <h2 className="text-xl font-medium mb-2">Votre liste d'envies est vide</h2>
            <p className="text-neutral-500 mb-8">
              Parcourez nos produits et ajoutez vos favoris en cliquant sur le coeur
            </p>
            <Button asChild>
              <Link href="/products">Découvrir nos produits</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="group">
                <Link href={`/products/${item.product.slug}`} className="block">
                  {/* Image */}
                  <div className="relative overflow-hidden bg-neutral-100 mb-4">
                    <AspectRatio ratio={3 / 4}>
                      {item.product.images[0]?.src ? (
                        <Image
                          src={item.product.images[0].src}
                          alt={item.product.images[0]?.alt || item.product.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                          <span className="text-neutral-400 text-xs uppercase tracking-widest">
                            No Image
                          </span>
                        </div>
                      )}
                    </AspectRatio>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromWishlist(item.productId);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm transition-all hover:scale-110 hover:bg-red-50"
                      aria-label="Retirer de la liste d'envies"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                    </button>

                    {/* Out of stock overlay */}
                    {!item.product.isAvailable && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <span className="text-xs uppercase tracking-widest text-neutral-500">
                          Épuisé
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-widest text-neutral-500">
                      {item.product.brand.name}
                    </p>
                    <h3 className="text-sm font-medium truncate group-hover:underline underline-offset-4">
                      {item.product.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {item.product.priceMin === item.product.priceMax
                          ? `${item.product.priceMin} ${item.product.currency}`
                          : `${item.product.priceMin} - ${item.product.priceMax} ${item.product.currency}`}
                      </span>
                      {item.product.compareAtPrice &&
                        item.product.compareAtPrice > item.product.priceMin && (
                          <span className="text-sm text-neutral-400 line-through">
                            {item.product.compareAtPrice} {item.product.currency}
                          </span>
                        )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
