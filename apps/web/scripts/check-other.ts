import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);

    const otherProducts = await db
        .select({ title: products.title })
        .from(products)
        .where(eq(products.productType, "Other"));

    console.log(`Produits classés "Other" (${otherProducts.length}):\n`);
    for (const p of otherProducts) {
        console.log(`  - ${p.title}`);
    }

    await client.end();
}

main();
