import "dotenv/config";
import postgres from "postgres";

async function setUserAsAdmin() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ DATABASE_URL is not set");
        process.exit(1);
    }

    const sql = postgres(connectionString);

    try {
        // Get the first user
        const users = await sql`SELECT id, email, role FROM users LIMIT 1`;

        if (users.length === 0) {
            console.log("❌ No users found in database");
            process.exit(1);
        }

        const user = users[0];
        console.log(`Found user: ${user.email} (current role: ${user.role})`);

        // Update to admin
        await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;
        console.log(`✅ User ${user.email} is now an admin`);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

setUserAsAdmin();
