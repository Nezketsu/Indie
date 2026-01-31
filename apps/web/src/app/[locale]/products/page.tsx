import { getProducts, getFilterOptions } from "@/lib/db/queries";
import { ProductsClientWrapper } from "./ProductsClientWrapper";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser, isAdmin } from "@/lib/auth";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    sort?: string;
    brand?: string;
    category?: string;
    size?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('products');
  const sp = await searchParams;

  // Check if current user is admin
  const user = await getCurrentUser();
  const userIsAdmin = isAdmin(user);

  const sort = (sp.sort as "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc") || "newest";
  const page = parseInt(sp.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [productsData, filterOptions] = await Promise.all([
    getProducts({
      limit,
      offset,
      brandSlug: sp.brand,
      category: sp.category,
      size: sp.size,
      minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
      maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
      inStock: sp.inStock === "true",
      sortBy: sort,
    }),
    getFilterOptions(),
  ]);

  const totalPages = Math.ceil(productsData.total / limit);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">{t('title')}</h1>
        <p className="text-neutral-500">
          {t('subtitle')}
        </p>
      </div>

      <ProductsClientWrapper
        initialProducts={productsData.products}
        total={productsData.total}
        filterOptions={filterOptions}
        currentPage={page}
        totalPages={totalPages}
        currentSort={sort}
        isAdmin={userIsAdmin}
      />
    </div>
  );
}
