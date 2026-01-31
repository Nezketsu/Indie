import "dotenv/config";
import postgres from "postgres";

async function checkTables() {
    const sql = postgres(process.env.DATABASE_URL!);

    try {
        // List all tables
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `;
        console.log("Tables in database:");
        tables.forEach(t => console.log(`  - ${t.table_name}`));

        // Check categories table
        const cats = await sql`SELECT COUNT(*) as count FROM categories`;
        console.log(`\nCategories count: ${cats[0].count}`);

        // Sample some categories if any
        const sampleCats = await sql`SELECT * FROM categories LIMIT 5`;
        console.log("Sample categories:", sampleCats);

        // Check product_type values in products
        const productTypes = await sql`
            SELECT DISTINCT product_type, COUNT(*) as count 
            FROM products 
            WHERE product_type IS NOT NULL 
            GROUP BY product_type 
            ORDER BY count DESC
            LIMIT 10
        `;
        console.log("\nProduct types in products table:");
        productTypes.forEach(t => console.log(`  - ${t.product_type}: ${t.count}`));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sql.end();
    }
}

checkTables();
