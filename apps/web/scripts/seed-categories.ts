import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { categories } from "../src/lib/db/schema";

/**
 * Seed categories matching the HuggingFace model (dima806/clothes_image_detection)
 * These 15 categories are the direct output of the ML classification model
 */

// Categories from the HuggingFace model - must match exactly
const HF_CATEGORIES = [
    { name: "Blazer", slug: "blazer", description: "Blazers and formal jackets" },
    { name: "Coat", slug: "coat", description: "Coats and overcoats" },
    { name: "Denim Jacket", slug: "denim-jacket", description: "Denim and jean jackets" },
    { name: "Dresses", slug: "dresses", description: "Dresses of all styles" },
    { name: "Hoodie", slug: "hoodie", description: "Hoodies and hooded sweatshirts" },
    { name: "Jacket", slug: "jacket", description: "General jackets (bomber, track, etc.)" },
    { name: "Jeans", slug: "jeans", description: "Jeans and denim pants" },
    { name: "Long Pants", slug: "long-pants", description: "Pants, trousers, and chinos" },
    { name: "Polo", slug: "polo", description: "Polo shirts" },
    { name: "Shirt", slug: "shirt", description: "Button-up shirts and dress shirts" },
    { name: "Shorts", slug: "shorts", description: "Shorts of all styles" },
    { name: "Skirt", slug: "skirt", description: "Skirts of all styles" },
    { name: "Sports Jacket", slug: "sports-jacket", description: "Sports and athletic jackets" },
    { name: "Sweater", slug: "sweater", description: "Sweaters, pullovers, and knitwear" },
    { name: "T-shirt", slug: "t-shirt", description: "T-shirts and casual tops" },
];

// Additional categories not from HF model (for scraper fallback)
const EXTRA_CATEGORIES = [
    { name: "Footwear", slug: "footwear", description: "Shoes, sneakers, boots, and sandals" },
    { name: "Accessories", slug: "accessories", description: "Bags, hats, belts, jewelry, etc." },
    { name: "Other", slug: "other", description: "Uncategorized items" },
];

async function seedCategories() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("DATABASE_URL is not set");
        process.exit(1);
    }

    console.log("Connecting to database...");
    const client = postgres(connectionString);
    const db = drizzle(client);

    try {
        console.log("\nSeeding categories...\n");

        const allCategories = [...HF_CATEGORIES, ...EXTRA_CATEGORIES];

        for (const cat of allCategories) {
            // Use upsert to avoid duplicates
            await db
                .insert(categories)
                .values({
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description,
                })
                .onConflictDoUpdate({
                    target: categories.slug,
                    set: {
                        name: cat.name,
                        description: cat.description,
                    },
                });

            console.log(`  + ${cat.name} (${cat.slug})`);
        }

        console.log(`\nSeeded ${allCategories.length} categories successfully!\n`);

        // List all categories
        const allCats = await db.select().from(categories);
        console.log(`Total categories in database: ${allCats.length}`);

    } catch (error) {
        console.error("\nError:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedCategories();
