import { db } from "./db";
import { products, productImages, productVariants, brands, syncLogs } from "./db/schema";
import { scrapeShopifyStore, ScrapedProduct } from "./scraper";
import { eq, and } from "drizzle-orm";

export interface SyncResult {
    brandId: string;
    brandName: string;
    productsFound: number;
    productsCreated: number;
    productsUpdated: number;
    errors: string[];
}

/**
 * Sync products from a single brand's Shopify store
 */
export async function syncBrandProducts(
    brandId: string,
    onProgress?: (message: string) => void
): Promise<SyncResult> {
    const errors: string[] = [];
    let productsCreated = 0;
    let productsUpdated = 0;

    // Get brand info
    const brand = await db.query.brands.findFirst({
        where: eq(brands.id, brandId),
    });

    if (!brand) {
        throw new Error(`Brand not found: ${brandId}`);
    }

    onProgress?.(`Syncing products for ${brand.name}...`);

    // Create sync log entry
    const [syncLog] = await db
        .insert(syncLogs)
        .values({
            brandId: brand.id,
            status: "running",
            productsFound: 0,
            productsCreated: 0,
            productsUpdated: 0,
        })
        .returning();

    try {
        // Clear isNew status from all existing products for this brand
        // This ensures only the newest scraped products will have isNew = true
        await db
            .update(products)
            .set({ isNew: false })
            .where(eq(products.brandId, brand.id));

        onProgress?.(`Cleared 'new' status from existing products`);

        // Scrape products from Shopify
        const scrapedProducts = await scrapeShopifyStore(
            brand.shopifyDomain,
            "EUR",
            onProgress
        );

        onProgress?.(`Processing ${scrapedProducts.length} products...`);

        // Process each product
        for (const scraped of scrapedProducts) {
            try {
                await upsertProduct(brand.id, scraped);

                // Check if product existed
                const existingProduct = await db.query.products.findFirst({
                    where: and(
                        eq(products.brandId, brand.id),
                        eq(products.shopifyId, scraped.shopifyId)
                    ),
                });

                if (existingProduct) {
                    productsUpdated++;
                } else {
                    productsCreated++;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`Failed to process product ${scraped.title}: ${errorMessage}`);
            }
        }

        // Update sync log
        await db
            .update(syncLogs)
            .set({
                status: errors.length > 0 ? "completed_with_errors" : "completed",
                productsFound: scrapedProducts.length,
                productsCreated,
                productsUpdated,
                errorMessage: errors.length > 0 ? errors.join("\n") : null,
                completedAt: new Date(),
            })
            .where(eq(syncLogs.id, syncLog.id));

        // Update brand's last synced timestamp
        await db
            .update(brands)
            .set({ lastSyncedAt: new Date() })
            .where(eq(brands.id, brand.id));

        onProgress?.(`Sync complete: ${productsCreated} created, ${productsUpdated} updated`);

        return {
            brandId: brand.id,
            brandName: brand.name,
            productsFound: scrapedProducts.length,
            productsCreated,
            productsUpdated,
            errors,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Update sync log with failure
        await db
            .update(syncLogs)
            .set({
                status: "failed",
                errorMessage,
                completedAt: new Date(),
            })
            .where(eq(syncLogs.id, syncLog.id));

        throw error;
    }
}

/**
 * Upsert a product and its related data
 *
 * IMPORTANT RULES:
 * - Never delete existing products
 * - Never change productType if already set (protected field)
 * - Only update isAvailable for existing products
 * - New products get isNew = true status
 */
async function upsertProduct(brandId: string, scraped: ScrapedProduct): Promise<void> {
    // Check if product exists
    const existingProduct = await db.query.products.findFirst({
        where: and(
            eq(products.brandId, brandId),
            eq(products.shopifyId, scraped.shopifyId)
        ),
    });

    let productId: string;

    if (existingProduct) {
        // EXISTING PRODUCT: Only update isAvailable status
        // productType is NEVER modified for existing products
        await db
            .update(products)
            .set({
                isAvailable: scraped.isAvailable,
                updatedAt: new Date(),
            })
            .where(eq(products.id, existingProduct.id));

        productId = existingProduct.id;

        // Delete old variants and images to refresh them
        await db.delete(productVariants).where(eq(productVariants.productId, productId));
        await db.delete(productImages).where(eq(productImages.productId, productId));
    } else {
        // NEW PRODUCT: use the category from the scraper and mark as new
        const productType = scraped.productType;

        // Create new product with isNew = true
        const [newProduct] = await db
            .insert(products)
            .values({
                brandId,
                shopifyId: scraped.shopifyId,
                title: scraped.title,
                slug: scraped.slug,
                description: scraped.description,
                productType,
                vendor: scraped.vendor,
                tags: scraped.tags,
                priceMin: scraped.priceMin,
                priceMax: scraped.priceMax,
                compareAtPrice: scraped.compareAtPrice,
                currency: scraped.currency,
                isAvailable: scraped.isAvailable,
                isNew: true,
                publishedAt: scraped.publishedAt,
            })
            .returning();

        productId = newProduct.id;
    }

    // Insert variants
    if (scraped.variants.length > 0) {
        await db.insert(productVariants).values(
            scraped.variants.map((v) => ({
                productId,
                shopifyId: v.shopifyId,
                title: v.title,
                sku: v.sku,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                inventoryQuantity: v.inventoryQuantity,
                option1: v.option1,
                option2: v.option2,
                option3: v.option3,
                isAvailable: v.isAvailable,
            }))
        );
    }

    // Insert images
    if (scraped.images.length > 0) {
        await db.insert(productImages).values(
            scraped.images.map((img) => ({
                productId,
                shopifyId: img.shopifyId,
                src: img.src,
                altText: img.altText,
                width: img.width,
                height: img.height,
                position: img.position,
            }))
        );
    }
}

/**
 * Sync all active brands
 */
export async function syncAllBrands(
    onProgress?: (message: string) => void
): Promise<SyncResult[]> {
    const activeBrands = await db.query.brands.findMany({
        where: eq(brands.isActive, true),
    });

    onProgress?.(`Found ${activeBrands.length} active brands to sync`);

    const results: SyncResult[] = [];

    for (const brand of activeBrands) {
        try {
            const result = await syncBrandProducts(brand.id, onProgress);
            results.push(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            onProgress?.(`Failed to sync ${brand.name}: ${errorMessage}`);
            results.push({
                brandId: brand.id,
                brandName: brand.name,
                productsFound: 0,
                productsCreated: 0,
                productsUpdated: 0,
                errors: [errorMessage],
            });
        }
    }

    return results;
}

/**
 * Re-categorize products for a specific brand
 *
 * IMPORTANT: Only re-categorizes products that don't have a productType set yet.
 * Products with an existing productType are NEVER modified by the classifier.
 */
export async function recategorizeBrandProducts(
    brandId: string,
    onProgress?: (message: string) => void,
    options?: { force?: boolean }
): Promise<{ updated: number; skipped: number; errors: string[] }> {
    const { categorizeProduct } = await import("./categorization");
    const force = options?.force ?? false;

    const brandProducts = await db.query.products.findMany({
        where: eq(products.brandId, brandId),
    });
    onProgress?.(`Checking ${brandProducts.length} products for brand...${force ? " (force mode)" : ""}`);

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of brandProducts) {
        // Skip already-categorized products unless force mode is enabled
        if (!force && product.productType && product.productType.trim() !== "") {
            skipped++;
            continue;
        }

        try {
            const categorization = categorizeProduct(product.title, product.description);

            await db
                .update(products)
                .set({
                    productType: categorization.productType,
                    updatedAt: new Date(),
                })
                .where(eq(products.id, product.id));

            updated++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to categorize ${product.title}: ${errorMessage}`);
        }
    }

    onProgress?.(`Re-categorization complete: ${updated} updated, ${skipped} skipped (already categorized)`);

    return { updated, skipped, errors };
}

/**
 * Re-categorize all existing products
 *
 * By default, only re-categorizes products that don't have a productType set yet.
 * Use { force: true } to re-categorize ALL products, including already classified ones.
 */
export async function recategorizeAllProducts(
    onProgress?: (message: string) => void,
    options?: { force?: boolean }
): Promise<{ updated: number; skipped: number; errors: string[] }> {
    const { categorizeProduct } = await import("./categorization");
    const force = options?.force ?? false;

    const allProducts = await db.query.products.findMany();
    onProgress?.(`Checking ${allProducts.length} products...${force ? " (force mode - reclassifying all)" : ""}`);

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of allProducts) {
        // Skip already-categorized products unless force mode is enabled
        if (!force && product.productType && product.productType.trim() !== "") {
            skipped++;
            continue;
        }

        try {
            const categorization = categorizeProduct(product.title, product.description);

            await db
                .update(products)
                .set({
                    productType: categorization.productType,
                    updatedAt: new Date(),
                })
                .where(eq(products.id, product.id));

            updated++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to categorize ${product.title}: ${errorMessage}`);
        }
    }

    onProgress?.(`Re-categorization complete: ${updated} updated, ${skipped} skipped (already categorized)`);

    return { updated, skipped, errors };
}
