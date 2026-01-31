import { NextRequest, NextResponse } from "next/server";
import { syncAllBrands } from "@/lib/sync";

// Vercel cron jobs require GET requests
// This route is protected by CRON_SECRET
export const maxDuration = 300; // 5 minutes max (Vercel Pro plan)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error("[Cron Sync] CRON_SECRET is not configured");
        return NextResponse.json(
            { error: "CRON_SECRET not configured" },
            { status: 500 }
        );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[Cron Sync] Unauthorized request");
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    console.log("[Cron Sync] Starting scheduled sync at", new Date().toISOString());

    try {
        const logs: string[] = [];
        const onProgress = (message: string) => {
            console.log(`[Cron Sync] ${message}`);
            logs.push(message);
        };

        const results = await syncAllBrands(onProgress);

        const summary = {
            success: true,
            timestamp: new Date().toISOString(),
            brandsProcessed: results.length,
            totalProductsFound: results.reduce((sum, r) => sum + r.productsFound, 0),
            totalProductsCreated: results.reduce((sum, r) => sum + r.productsCreated, 0),
            totalProductsUpdated: results.reduce((sum, r) => sum + r.productsUpdated, 0),
            errors: results.flatMap((r) => r.errors),
        };

        console.log("[Cron Sync] Completed:", JSON.stringify(summary, null, 2));

        return NextResponse.json(summary);
    } catch (error) {
        console.error("[Cron Sync] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
