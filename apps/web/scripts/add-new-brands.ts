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

async function addBrand(db: ReturnType<typeof drizzle>, brand: BrandInput) {
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
    } catch (error) {
        console.error(`❌ Error adding brand "${brand.name}":`, error);
        throw error;
    }
}

async function main() {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);

    const newBrands: BrandInput[] = [
        {
            name: "Amoses Clothing",
            slug: "amoses-clothing",
            shopifyDomain: "amosesclothing.com",
            websiteUrl: "https://amosesclothing.com/en",
            description: "Fashion brand",
            country: "France",
        },
        {
            name: "Supraw",
            slug: "supraw",
            shopifyDomain: "supraw.com",
            websiteUrl: "https://supraw.com/",
            description: "Streetwear brand",
            country: "France",
        },
        {
            name: "In.Tern.Et",
            slug: "internet",
            shopifyDomain: "in.tern.et",
            websiteUrl: "https://in.tern.et/",
            description: "Fashion brand",
            country: "France",
        },
        {
            name: "Taliri",
            slug: "taliri",
            shopifyDomain: "taliri.fr",
            websiteUrl: "https://taliri.fr/",
            description: "French fashion brand",
            country: "France",
        },
        {
            name: "Wave of Art",
            slug: "wave-of-art",
            shopifyDomain: "waveofart.fr",
            websiteUrl: "https://waveofart.fr/",
            description: "Art-inspired fashion brand",
            country: "France",
        },
        {
            name: "No Clout",
            slug: "no-clout",
            shopifyDomain: "noclout.fr",
            websiteUrl: "https://noclout.fr/",
            description: "French streetwear brand",
            country: "France",
        },
        {
            name: "Nubes Studio",
            slug: "nubes-studio",
            shopifyDomain: "nubes-studio.com",
            websiteUrl: "https://www.nubes-studio.com/",
            description: "Design studio brand",
            country: "France",
        },
    ];

    console.log(`🚀 Adding ${newBrands.length} new brands...\n`);

    for (const brand of newBrands) {
        await addBrand(db, brand);
        console.log("");
    }

    console.log("✨ Done!");
    await client.end();
}

main().catch(console.error);
