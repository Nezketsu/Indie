import Link from "next/link";
import { getBrands } from "@/lib/db/queries";

export const revalidate = 60;

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page header */}
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">Our Brands</h1>
        <p className="text-neutral-500">
          Discover our curated selection of independent fashion brands.
        </p>
      </div>

      {/* Brands Grid */}
      {brands.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="group block p-8 border border-neutral-200 hover:border-black transition-colors"
            >
              <h2 className="font-serif text-2xl mb-2 group-hover:underline underline-offset-4">
                {brand.name}
              </h2>
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-4">
                {brand.country || "Independent"}
              </p>
              {brand.description && (
                <p className="text-sm text-neutral-600 line-clamp-2 mb-4">
                  {brand.description}
                </p>
              )}
              <p className="text-xs text-neutral-400">
                {brand.productCount} {brand.productCount === 1 ? "product" : "products"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-500 py-12">
          No brands available yet.
        </p>
      )}
    </div>
  );
}
