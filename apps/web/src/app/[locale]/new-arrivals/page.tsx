import { getProducts } from "@/lib/db/queries";
import { ProductGrid } from "@/components/products/ProductGrid";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from "@/i18n/navigation";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function NewArrivalsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('newArrivals');
  const tCommon = await getTranslations('common');
  const sp = await searchParams;

  const page = parseInt(sp.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get newest products (sorted by createdAt desc)
  const productsData = await getProducts({
    limit,
    offset,
    sortBy: "newest",
  });

  const totalPages = Math.ceil(productsData.total / limit);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Link
          href="/products"
          className="inline-flex items-center text-sm text-neutral-500 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {tCommon("backToProducts")}
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-24">
        {/* Title Section */}
        <div className="mb-12 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-amber-500" strokeWidth={1.5} />
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight mb-2">
            {t('title')}
          </h1>
          <p className="text-neutral-500 max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Product Count */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-neutral-500">
            {t('count', { count: productsData.total })}
          </p>
        </div>

        {/* Products Grid */}
        {productsData.products.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 mx-auto mb-6 text-neutral-300" strokeWidth={1} />
            <h2 className="text-xl font-medium mb-2">{t('emptyTitle')}</h2>
            <p className="text-neutral-500 mb-8">
              {t('emptyDescription')}
            </p>
            <Button asChild>
              <Link href="/products">{t('browseAll')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ProductGrid products={productsData.products} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  asChild={page > 1}
                >
                  {page > 1 ? (
                    <Link href={`/new-arrivals?page=${page - 1}`}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t('previous')}
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t('previous')}
                    </span>
                  )}
                </Button>
                <span className="flex items-center px-4 text-sm text-neutral-500">
                  {t('pageOf', { current: page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  asChild={page < totalPages}
                >
                  {page < totalPages ? (
                    <Link href={`/new-arrivals?page=${page + 1}`}>
                      {t('next')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  ) : (
                    <span>
                      {t('next')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
