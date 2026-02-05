import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { WishlistButton } from "./WishlistButton";
import { AdminProductTypeEditor } from "@/components/admin/AdminProductTypeEditor";
import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    brand: { name: string; slug: string };
    priceMin: number;
    priceMax: number;
    compareAtPrice?: number | null;
    currency: string;
    images: { src: string; alt: string }[];
    isAvailable: boolean;
    isNew?: boolean;
    productType?: string | null;
  };
  isAdmin?: boolean;
}

export function ProductCard({ product, isAdmin = false }: ProductCardProps) {
  const hasDiscount = Boolean(
    product.compareAtPrice && product.compareAtPrice > product.priceMin
  );
  const discountPercent = hasDiscount
    ? Math.round((1 - product.priceMin / product.compareAtPrice!) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image container */}
      <div className="relative overflow-hidden bg-neutral-100">
        {/* Wishlist button */}
        <WishlistButton productId={product.id} variant="card" />

        <AspectRatio ratio={3 / 4}>
          {product.images[0]?.src ? (
            <Image
              src={product.images[0].src}
              alt={product.images[0]?.alt || product.title}
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

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isNew && (
            <Badge
              variant="default"
              className="bg-black text-white text-[10px] tracking-widest rounded-none"
            >
              NEW
            </Badge>
          )}
          {hasDiscount && (
            <Badge
              variant="outline"
              className="bg-white text-black text-[10px] tracking-widest rounded-none"
            >
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Admin controls at bottom left */}
        {isAdmin && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1">
            <AdminProductTypeEditor
              productId={product.id}
              currentType={product.productType || null}
            />
            <AdminDeleteButton
              productId={product.id}
              productTitle={product.title}
            />
          </div>
        )}

        {/* Quick add - appears on hover */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          <button className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors">
            Quick View
          </button>
        </div>

        {/* Out of stock overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-neutral-500">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="mt-4 space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-neutral-500">
          {product.brand.name}
        </p>
        <h3 className="text-sm font-medium truncate group-hover:underline underline-offset-4">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {product.priceMin === product.priceMax
              ? `${product.priceMin} ${product.currency}`
              : `${product.priceMin} - ${product.priceMax} ${product.currency}`}
          </span>
          {hasDiscount && (
            <span className="text-sm text-neutral-400 line-through">
              {product.compareAtPrice} {product.currency}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
