import { MetadataRoute } from 'next';
import { getBrands, getProducts } from '@/lib/db/queries';
import { routing } from '@/i18n/routing';

// Force dynamic rendering at runtime (not during build)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://indiemarket.co';

    // Fetch data with error handling for build time
    let brandsData: { slug: string }[] = [];
    let productsData: { slug: string }[] = [];
    try {
        const [brands, products] = await Promise.all([
            getBrands(),
            getProducts({ limit: 1000 }),
        ]);
        brandsData = brands;
        productsData = products.products;
    } catch {
        // DB not available during build - return static routes only
    }

    const staticRoutes = [
        '',
        '/brands',
        '/products',
        '/new-arrivals',
        '/about',
        '/contact',
        '/privacy',
    ];

    const routes: MetadataRoute.Sitemap = [];

    for (const locale of routing.locales) {
        // French (default) has no prefix, English has /en
        const localePrefix = locale === 'fr' ? '' : `/${locale}`;

        // Add static routes
        for (const route of staticRoutes) {
            routes.push({
                url: `${baseUrl}${localePrefix}${route}`,
                lastModified: new Date(),
                changeFrequency: route === '' ? 'daily' : 'weekly',
                priority: route === '' ? 1 : 0.8,
            });
        }

        // Add brand routes
        for (const brand of brandsData) {
            routes.push({
                url: `${baseUrl}${localePrefix}/brands/${brand.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            });
        }

        // Add product routes
        for (const product of productsData) {
            routes.push({
                url: `${baseUrl}${localePrefix}/products/${product.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
    }

    return routes;
}
