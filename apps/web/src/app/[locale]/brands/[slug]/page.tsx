import { notFound } from "next/navigation";
import { getBrandBySlug, getProducts } from "@/lib/db/queries";
import { BrandProductsClient } from "./BrandProductsClient";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const revalidate = 60;

const PRODUCTS_PER_PAGE = 24;

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { slug, locale } = await params;
  const { page, sort } = await searchParams;

  setRequestLocale(locale);

  const t = await getTranslations('brands');
  const tNav = await getTranslations('nav');
  const tProducts = await getTranslations('products');

  const brand = await getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const currentSort = (sort as SortOption) || "newest";
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE;

  const productsData = await getProducts({
    brandSlug: slug,
    limit: PRODUCTS_PER_PAGE,
    offset,
    sortBy: currentSort,
  });

  const totalPages = Math.ceil(productsData.total / PRODUCTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-12">
      <nav className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-neutral-500">
          <li>
            <Link href="/" className="hover:text-black">
              {tNav('home')}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/brands" className="hover:text-black">
              {tNav('brands')}
            </Link>
          </li>
          <li>/</li>
          <li className="text-black">{brand.name}</li>
        </ol>
      </nav>

      <div className="mb-12 pb-12 border-b border-neutral-200">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">{brand.name}</h1>
        <div className="flex flex-wrap gap-4 items-center text-sm text-neutral-500 mb-6">
          {brand.country && (
            <span className="uppercase tracking-widest">{brand.country}</span>
          )}
          <span>{t('productsCount', { count: brand.productCount })}</span>
          {brand.websiteUrl && (
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black underline underline-offset-4"
            >
              {tProducts('visitWebsite')}
            </a>
          )}
        </div>
        {brand.description && (
          <p className="text-neutral-600 max-w-2xl">{brand.description}</p>
        )}
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest mb-8">
          {t('allProductsFrom', { brand: brand.name })}
        </h2>
        <BrandProductsClient
          products={productsData.products}
          total={productsData.total}
          currentPage={currentPage}
          totalPages={totalPages}
          brandSlug={slug}
          currentSort={currentSort}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) {
    return {
      title: "Brand Not Found",
    };
  }

  return {
    title: `${brand.name} - Indie Marketplace`,
    description: brand.description || `Shop products from ${brand.name}`,
  };
}
