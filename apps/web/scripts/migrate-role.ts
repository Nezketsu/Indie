import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ DATABASE_URL is not set");
        process.exit(1);
    }

    console.log("🔄 Running migration...");
    const sql = postgres(connectionString);

    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`;
        console.log("✅ Migration completed: Added role column to users table");
    } catch (error) {
        console.error("❌ Migration error:", error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

runMigration();
