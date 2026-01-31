import "dotenv/config";
import postgres from "postgres";

async function main() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);

    const client = postgres(process.env.DATABASE_URL!);

    const products = await client`SELECT COUNT(*) as count FROM products`;
    const brands = await client`SELECT COUNT(*) as count FROM brands`;

    console.log("Products count:", products[0].count);
    console.log("Brands count:", brands[0].count);

    await client.end();
}

main().catch(console.error);
