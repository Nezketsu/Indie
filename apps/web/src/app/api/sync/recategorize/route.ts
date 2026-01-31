import { NextResponse } from "next/server";
import { recategorizeAllProducts } from "@/lib/sync";

// POST /api/sync/recategorize - Re-categorize all existing products
export async function POST() {
    try {
        const logs: string[] = [];
        const onProgress = (message: string) => {
            console.log(`[Recategorize] ${message}`);
            logs.push(message);
        };

        const result = await recategorizeAllProducts(onProgress);

        return NextResponse.json({
            success: true,
            updated: result.updated,
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
