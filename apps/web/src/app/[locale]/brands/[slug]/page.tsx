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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';
  const localePrefix = locale === 'fr' ? '' : `/${locale}`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'fr' ? 'Accueil' : 'Home',
        item: `${baseUrl}${localePrefix}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'fr' ? 'Marques' : 'Brands',
        item: `${baseUrl}${localePrefix}/brands`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: brand.name,
        item: `${baseUrl}${localePrefix}/brands/${slug}`,
      },
    ],
  };

  const brandJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: brand.name,
    url: `${baseUrl}${localePrefix}/brands/${slug}`,
    ...(brand.description && { description: brand.description }),
    ...(brand.country && {
      address: {
        '@type': 'PostalAddress',
        addressCountry: brand.country,
      }
    }),
    ...(brand.websiteUrl && { sameAs: [brand.websiteUrl] }),
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, brandJsonLd]) }}
      />
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
          {brand.productCount > 0 && (
            <span>{t('productsCount', { count: brand.productCount })}</span>
          )}
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
  const { slug, locale } = await params;
  const brand = await getBrandBySlug(slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';

  if (!brand) {
    return {
      title: "Brand Not Found",
    };
  }

  const localePrefix = locale === 'fr' ? '' : `/${locale}`;
  const url = `${baseUrl}${localePrefix}/brands/${slug}`;

  const title = locale === 'fr'
    ? `${brand.name} - Marque indépendante`
    : `${brand.name} - Independent Brand`;

  const description = brand.description
    || (locale === 'fr'
      ? `Découvrez les produits de ${brand.name}, marque indépendante sur IndieMarket.`
      : `Discover products from ${brand.name}, independent brand on IndieMarket.`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        'fr': `${baseUrl}/brands/${slug}`,
        'en': `${baseUrl}/en/brands/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
  };
}
