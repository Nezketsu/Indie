import { NextRequest, NextResponse } from "next/server";
import { syncAllBrands, syncBrandProducts } from "@/lib/sync";

// POST /api/sync - Trigger product sync
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { brandId } = body;

        const logs: string[] = [];
        const onProgress = (message: string) => {
            console.log(`[Sync] ${message}`);
            logs.push(message);
        };

        let results;

        if (brandId) {
            // Sync specific brand
            const result = await syncBrandProducts(brandId, onProgress);
            results = [result];
        } else {
            // Sync all brands
            results = await syncAllBrands(onProgress);
        }

        return NextResponse.json({
            success: true,
            results,
            logs,
        });
    } catch (error) {
        console.error("[Sync Error]", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

// GET /api/sync - Get sync status info
export async function GET() {
    return NextResponse.json({
        message: "Sync API",
        endpoints: {
            "POST /api/sync": "Sync all brands or a specific brand (pass brandId in body)",
            "POST /api/sync/recategorize": "Re-categorize all existing products",
        },
    });
}
