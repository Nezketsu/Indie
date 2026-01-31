import "dotenv/config";
import postgres from "postgres";

async function printProduct() {
    const sql = postgres(process.env.DATABASE_URL!);

    try {
        const product = await sql`SELECT * FROM products LIMIT 1`;
        console.log("=== PRODUCT TABLE STRUCTURE ===");
        console.log(JSON.stringify(product[0], null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sql.end();
    }
}

printProduct();
