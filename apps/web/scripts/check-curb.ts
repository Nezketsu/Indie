import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products } from "../src/lib/db/schema";
import { like } from "drizzle-orm";

async function main() {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);

    const curbProducts = await db
        .select({ title: products.title, productType: products.productType })
        .from(products)
        .where(like(products.title, "%CURB%"));

    console.log("Produits CURB:");
    for (const p of curbProducts) {
        console.log(`  [${p.productType}] ${p.title}`);
    }

    await client.end();
}

main();
