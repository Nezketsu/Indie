import { MetadataRoute } from 'next';
import { getBrands } from '@/lib/db/queries';
import { routing } from '@/i18n/routing';

// Force dynamic rendering at runtime (not during build)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://indiemarket.co';

    // Fetch brands with error handling for build time
    let brandsData: { slug: string }[] = [];
    try {
        brandsData = await getBrands();
    } catch {
        // DB not available during build - return static routes only
    }

    const staticRoutes = [
        '',
        '/brands',
        '/products',
        '/new-arrivals',
        '/login',
        '/register'
    ];

    const routes: MetadataRoute.Sitemap = [];

    for (const locale of routing.locales) {
        // Add static routes
        for (const route of staticRoutes) {
            routes.push({
                url: `${baseUrl}/${locale}${route}`,
                lastModified: new Date(),
                changeFrequency: route === '' ? 'daily' : 'weekly',
                priority: route === '' ? 1 : 0.8,
            });
        }

        // Add brand routes
        for (const brand of brandsData) {
            routes.push({
                url: `${baseUrl}/${locale}/brands/${brand.slug}`,
                lastModified: new Date(), // Ideally we'd have a last updated date on the brand
                changeFrequency: 'weekly',
                priority: 0.7,
            });
        }
    }

    return routes;
}
