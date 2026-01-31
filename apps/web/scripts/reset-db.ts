import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products, productVariants, productImages, productCategories, syncLogs, brands } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

async function resetDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ DATABASE_URL is not set");
        process.exit(1);
    }

    console.log("🔄 Connecting to database...");
    const client = postgres(connectionString);
    const db = drizzle(client);

    try {
        console.log("\n🗑️  Cleaning database...\n");

        // Delete in order respecting foreign key constraints
        // Even with cascade, explicit order is cleaner

        console.log("  → Deleting product_categories...");
        const deletedProductCategories = await db.delete(productCategories).returning();
        console.log(`    ✓ Deleted ${deletedProductCategories.length} product-category relations`);

        console.log("  → Deleting product_images...");
        const deletedImages = await db.delete(productImages).returning();
        console.log(`    ✓ Deleted ${deletedImages.length} images`);

        console.log("  → Deleting product_variants...");
        const deletedVariants = await db.delete(productVariants).returning();
        console.log(`    ✓ Deleted ${deletedVariants.length} variants`);

        console.log("  → Deleting products...");
        const deletedProducts = await db.delete(products).returning();
        console.log(`    ✓ Deleted ${deletedProducts.length} products`);

        console.log("  → Deleting sync_logs...");
        const deletedLogs = await db.delete(syncLogs).returning();
        console.log(`    ✓ Deleted ${deletedLogs.length} sync logs`);

        // Reset lastSyncedAt on all brands
        console.log("  → Resetting brand sync timestamps...");
        await db.update(brands).set({ lastSyncedAt: null });
        console.log("    ✓ Reset all brand lastSyncedAt timestamps");

        console.log("\n✅ Database cleaned successfully!\n");

        // Show remaining brands
        const remainingBrands = await db.select().from(brands);
        console.log(`📋 Remaining brands (${remainingBrands.length}):`);
        for (const brand of remainingBrands) {
            console.log(`   - ${brand.name} (${brand.shopifyDomain})`);
        }

    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

resetDatabase();
