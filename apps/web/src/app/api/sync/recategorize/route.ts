import { NextRequest, NextResponse } from "next/server";
import { recategorizeAllProducts, recategorizeBrandProducts } from "@/lib/sync";

// POST /api/sync/recategorize - Re-categorize products
// Pass { brandId: "..." } in body to recategorize only that brand
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { brandId, force } = body;

        const logs: string[] = [];
        const onProgress = (message: string) => {
            console.log(`[Recategorize] ${message}`);
            logs.push(message);
        };

        let result;

        if (brandId) {
            // Recategorize specific brand
            result = await recategorizeBrandProducts(brandId, onProgress, { force: !!force });
        } else {
            // Recategorize all products
            result = await recategorizeAllProducts(onProgress, { force: !!force });
        }

        return NextResponse.json({
            success: true,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors,
            logs,
        });
    } catch (error) {
        console.error("[Recategorize Error]", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
