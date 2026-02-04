import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { scrapeShopifyStore, ScrapedProduct } from "../src/lib/scraper";
import { categorizeProduct } from "../src/lib/categorization";

const { products, productImages, productVariants, brands, syncLogs } = schema;

// Force exit after 10 minutes max
const TIMEOUT_MS = 10 * 60 * 1000;
setTimeout(() => {
    console.log("\n⏰ Timeout reached, forcing exit...");
    process.exit(0);
}, TIMEOUT_MS).unref();

async function syncAll() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ DATABASE_URL is not set");
        process.exit(1);
    }

    console.log("🔄 Connecting to database...");
    const client = postgres(connectionString, {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 10,
    });
    const db = drizzle(client, { schema });

    try {
        // Get all active brands
        const activeBrands = await db.query.brands.findMany({
            where: eq(brands.isActive, true),
        });

        console.log(`\n📋 Found ${activeBrands.length} active brand(s) to sync\n`);

        for (const brand of activeBrands) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`🏷️  Syncing: ${brand.name} (${brand.shopifyDomain})`);
            console.log("=".repeat(60));

            // Create sync log
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

            let productsCreated = 0;
            let productsUpdated = 0;
            const errors: string[] = [];

            try {
                // Scrape products
                console.log("\n  📥 Scraping products from Shopify...");
                const scrapedProducts = await scrapeShopifyStore(
                    brand.shopifyDomain,
                    "EUR",
                    (msg) => console.log(`     ${msg}`)
                );

                console.log(`\n  ✓ Found ${scrapedProducts.length} products`);
                console.log("  📦 Processing products with categorization...\n");

                for (const scraped of scrapedProducts) {
                    try {
                        // Check if product exists
                        const existingProduct = await db.query.products.findFirst({
                            where: and(
                                eq(products.brandId, brand.id),
                                eq(products.shopifyId, scraped.shopifyId)
                            ),
                        });

                        let productId: string;
                        let productType: string;

                        if (existingProduct) {
                            // Only categorize if not already categorized (null, empty, or "Other")
                            const needsCategorization = !existingProduct.productType || existingProduct.productType === "Other";
                            productType = needsCategorization
                                ? categorizeProduct(scraped.title, scraped.description).productType
                                : existingProduct.productType ?? categorizeProduct(scraped.title, scraped.description).productType;

                            // Update existing product
                            await db
                                .update(products)
                                .set({
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
                                    publishedAt: scraped.publishedAt,
                                    updatedAt: new Date(),
                                })
                                .where(eq(products.id, existingProduct.id));

                            productId = existingProduct.id;
                            productsUpdated++;

                            // Delete old variants and images
                            await db.delete(productVariants).where(eq(productVariants.productId, productId));
                            await db.delete(productImages).where(eq(productImages.productId, productId));
                        } else {
                            // New product: categorize it
                            productType = categorizeProduct(scraped.title, scraped.description).productType;

                            // Create new product
                            const [newProduct] = await db
                                .insert(products)
                                .values({
                                    brandId: brand.id,
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
                                    publishedAt: scraped.publishedAt,
                                })
                                .returning();

                            productId = newProduct.id;
                            productsCreated++;
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

                        // Log progress with category
                        const status = existingProduct ? "Updated" : "Created";
                        console.log(`     [${productType}] ${scraped.title.substring(0, 40)}... (${status})`);

                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`Failed to process product ${scraped.title}: ${errorMessage}`);
                        console.error(`     ❌ Error: ${scraped.title} - ${errorMessage}`);
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

                console.log(`\n  ✅ Sync complete for ${brand.name}:`);
                console.log(`     - Products found: ${scrapedProducts.length}`);
                console.log(`     - Created: ${productsCreated}`);
                console.log(`     - Updated: ${productsUpdated}`);
                if (errors.length > 0) {
                    console.log(`     - Errors: ${errors.length}`);
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`\n  ❌ Failed to sync ${brand.name}: ${errorMessage}`);

                await db
                    .update(syncLogs)
                    .set({
                        status: "failed",
                        errorMessage,
                        completedAt: new Date(),
                    })
                    .where(eq(syncLogs.id, syncLog.id));
            }
        }

        // Print summary by category
        console.log(`\n\n${"=".repeat(60)}`);
        console.log("📊 CATEGORY SUMMARY");
        console.log("=".repeat(60));

        const allProducts = await db.query.products.findMany();
        const categoryCounts: Record<string, number> = {};

        for (const product of allProducts) {
            const type = product.productType || "Uncategorized";
            categoryCounts[type] = (categoryCounts[type] || 0) + 1;
        }

        const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
        for (const [category, count] of sortedCategories) {
            console.log(`  ${category}: ${count} products`);
        }

        console.log(`\n✅ Total products in database: ${allProducts.length}`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        await client.end();
        process.exit(1);
    }

    // Close connection and exit
    await client.end();
    console.log("\n🏁 Done!");
    process.exit(0);
}

syncAll();
