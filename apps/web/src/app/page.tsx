import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/ProductGrid";
import { getProducts, getBrands } from "@/lib/db/queries";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  // Fetch real data from database
  const [productsData, brandsData] = await Promise.all([
    getProducts({ limit: 8, sortBy: "newest", inStock: true }),
    getBrands(),
  ]);

  const featuredProducts = productsData.products;
  const featuredBrands = brandsData.slice(0, 4);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center">
        {/* Background Image */}
        <Image
          src="/banner.jpg"
          alt="Hero background"
          fill
          priority
          className="object-cover"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6 text-white">
            Discover Independent
            <br />
            Fashion Brands
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Curated selection of clothing, accessories, and footwear from the
            world&apos;s most exciting emerging designers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-black hover:bg-white/90">
              <Link href="/products">Shop All</Link>
            </Button>
            <Button size="lg" asChild className="bg-transparent text-white border border-white hover:bg-white/10">
              <Link href="/brands">Explore Brands</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Brands */}
      {featuredBrands.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-xs uppercase tracking-widest">Featured Brands</h2>
              <Link
                href="/brands"
                className="text-xs uppercase tracking-widest hover:underline underline-offset-4"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/brands/${brand.slug}`}
                  className="group block p-8 border border-neutral-200 hover:border-black transition-colors"
                >
                  <h3 className="font-serif text-xl mb-2 group-hover:underline underline-offset-4">
                    {brand.name}
                  </h3>
                  <p className="text-xs uppercase tracking-widest text-neutral-500">
                    {brand.country || "Independent"}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    {brand.productCount} products
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      <section className="py-24 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-xs uppercase tracking-widest">New Arrivals</h2>
            <Link
              href="/products?sort=newest"
              className="text-xs uppercase tracking-widest hover:underline underline-offset-4"
            >
              View All
            </Link>
          </div>
          {featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <p className="text-center text-neutral-500 py-12">
              No products available yet.
            </p>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-xs uppercase tracking-widest mb-12 text-center">
            Shop by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Clothing", slug: "hoodie,t-shirt,sweater,jacket,jeans,long-pants,shorts,shirt,polo,denim-jacket,sports-jacket,skirt" },
              { name: "Accessories", slug: "accessories" },
              { name: "Footwear", slug: "shoes" },
            ].map((category) => (
              <Link
                key={category.name}
                href={`/products?category=${category.slug}`}
                className="group relative h-80 bg-neutral-100 flex items-center justify-center overflow-hidden"
              >
                <span className="font-serif text-2xl md:text-3xl group-hover:underline underline-offset-8">
                  {category.name}
                </span>
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-black text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-4">Stay Updated</h2>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto">
            Subscribe to our newsletter for new arrivals, exclusive offers, and
            brand stories.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-transparent border border-neutral-700 px-6 py-4 text-sm focus:outline-none focus:border-white transition-colors placeholder:text-neutral-500"
            />
            <Button
              type="submit"
              className="bg-white text-black hover:bg-neutral-200 px-8"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
