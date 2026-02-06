import { type Metadata } from 'next';
import { getBrands } from "@/lib/db/queries";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';
  const url = locale === 'fr' ? `${baseUrl}/brands` : `${baseUrl}/en/brands`;

  if (locale === 'fr') {
    return {
      title: 'Marques indépendantes - Découvrez nos créateurs',
      description: 'Explorez notre sélection de marques de mode indépendantes et créateurs émergents. Vêtements, accessoires et chaussures éthiques et responsables.',
      alternates: {
        canonical: url,
        languages: { 'fr': `${baseUrl}/brands`, 'en': `${baseUrl}/en/brands` },
      },
      openGraph: {
        title: 'Marques indépendantes - Découvrez nos créateurs',
        description: 'Explorez notre sélection de marques de mode indépendantes et créateurs émergents.',
        url,
        type: 'website',
      },
    };
  }

  return {
    title: 'Independent Brands - Discover Our Designers',
    description: 'Explore our curated selection of independent fashion brands and emerging designers. Ethical and responsible clothing, accessories, and footwear.',
    alternates: {
      canonical: url,
      languages: { 'fr': `${baseUrl}/brands`, 'en': `${baseUrl}/en/brands` },
    },
    openGraph: {
      title: 'Independent Brands - Discover Our Designers',
      description: 'Explore our curated selection of independent fashion brands and emerging designers.',
      url,
      type: 'website',
    },
  };
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('brands');
  const brands = await getBrands();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';
  const localePrefix = locale === 'fr' ? '' : `/${locale}`;

  const brandsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'fr' ? 'Marques indépendantes' : 'Independent Brands',
    description: locale === 'fr'
      ? 'Sélection curatée de marques de mode indépendantes'
      : 'Curated selection of independent fashion brands',
    numberOfItems: brands.length,
    itemListElement: brands.map((brand, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: brand.name,
      url: `${baseUrl}${localePrefix}/brands/${brand.slug}`,
    })),
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandsJsonLd) }}
      />
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">{t('title')}</h1>
        <p className="text-neutral-500">
          {t('subtitle')}
        </p>
      </div>

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
              {brand.productCount > 0 && (
                <p className="text-xs text-neutral-400">
                  {t('productsCount', { count: brand.productCount })}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-500 py-12">
          {t('noBrands')}
        </p>
      )}
    </div>
  );
}
