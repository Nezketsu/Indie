import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Use a singleton pattern to prevent multiple connections in development
const globalForDb = globalThis as unknown as {
    client: ReturnType<typeof postgres> | undefined;
};

const client = globalForDb.client ?? postgres(connectionString, {
    max: 10, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout
});

if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
}

export const db = drizzle(client, { schema });

export * from "./schema";
