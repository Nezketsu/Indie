import { ProductCard } from "./ProductCard";

interface Product {
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
}

interface ProductGridProps {
  products: Product[];
  isAdmin?: boolean;
}

export function ProductGrid({ products, isAdmin = false }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-neutral-500 text-sm uppercase tracking-widest">
          No products found
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
