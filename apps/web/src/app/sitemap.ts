import { MetadataRoute } from 'next';
import { getBrands } from '@/lib/db/queries';
import { routing } from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';

    // Fetch dynamic data
    // Only fetching brands for now to focus on the user's goal (independent brands)
    // We can add products later if needed, but for "marques indépendantes" queries, 
    // brand pages are the most relevant landing pages.
    const brandsData = await getBrands();

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
