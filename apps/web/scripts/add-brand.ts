import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { brands } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

interface BrandInput {
    name: string;
    slug: string;
    shopifyDomain: string;
    websiteUrl: string;
    description?: string;
    country?: string;
    logoUrl?: string;
}

async function addBrand(brand: BrandInput) {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);

    try {
        // Check if brand already exists
        const existing = await db
            .select()
            .from(brands)
            .where(eq(brands.shopifyDomain, brand.shopifyDomain));

        if (existing.length > 0) {
            console.log(`⚠️  Brand "${brand.name}" already exists`);
            return existing[0];
        }

        // Insert new brand
        const [newBrand] = await db
            .insert(brands)
            .values({
                name: brand.name,
                slug: brand.slug,
                shopifyDomain: brand.shopifyDomain,
                websiteUrl: brand.websiteUrl,
                description: brand.description,
                country: brand.country,
                logoUrl: brand.logoUrl,
                isActive: true,
            })
            .returning();

        console.log(`✅ Brand "${brand.name}" added successfully!`);
        console.log(`   ID: ${newBrand.id}`);
        console.log(`   Domain: ${newBrand.shopifyDomain}`);

        return newBrand;
    } finally {
        await client.end();
    }
}

// Add Davril Supply
addBrand({
    name: "Davril Supply",
    slug: "davril-supply",
    shopifyDomain: "davrilsupply.com",
    websiteUrl: "https://davrilsupply.com",
    description: "French streetwear brand",
    country: "France",
});
