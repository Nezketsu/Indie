import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/ProductGrid";
import { getProducts, getBrands } from "@/lib/db/queries";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tNav = await getTranslations('nav');

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
        <Image
          src="/banner.jpg"
          alt="Hero background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6 text-white">
            <span className="block">{t('heroTitleLine1')}</span>
            <span className="block">{t('heroTitleLine2')}</span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-black hover:bg-white/90">
              <Link href="/products">{t('shopAll')}</Link>
            </Button>
            <Button size="lg" asChild className="bg-transparent text-white border border-white hover:bg-white/10">
              <Link href="/brands">{t('exploreBrands')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Brands */}
      {featuredBrands.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-xs uppercase tracking-widest">{t('featuredBrands')}</h2>
              <Link
                href="/brands"
                className="text-xs uppercase tracking-widest hover:underline underline-offset-4"
              >
                {t('viewAll')}
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
                    {t('productsCount', { count: brand.productCount })}
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
            <h2 className="text-xs uppercase tracking-widest">{t('newArrivals')}</h2>
            <Link
              href="/products?sort=newest"
              className="text-xs uppercase tracking-widest hover:underline underline-offset-4"
            >
              {t('viewAll')}
            </Link>
          </div>
          {featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <p className="text-center text-neutral-500 py-12">
              {t('noProducts')}
            </p>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-xs uppercase tracking-widest mb-12 text-center">
            {t('shopByCategory')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: tNav('clothing'), slug: "hoodie,t-shirt,sweater,jacket,jeans,long-pants,shorts,shirt,polo,denim-jacket,sports-jacket,skirt" },
              { name: tNav('accessories'), slug: "accessories" },
              { name: tNav('footwear'), slug: "shoes" },
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
          <h2 className="font-serif text-3xl md:text-4xl mb-4">{t('stayUpdated')}</h2>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto">
            {t('newsletterText')}
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t('emailPlaceholder')}
              className="flex-1 bg-transparent border border-neutral-700 px-6 py-4 text-sm focus:outline-none focus:border-white transition-colors placeholder:text-neutral-500"
            />
            <Button
              type="submit"
              className="bg-white text-black hover:bg-neutral-200 px-8"
            >
              {t('subscribe')}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
