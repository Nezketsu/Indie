import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateProductType } from "@/lib/db/queries";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user || !isAdmin(user)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: productId } = await params;
        const body = await request.json();
        const { productType } = body;

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        if (!productType) {
            return NextResponse.json(
                { error: "Product type is required" },
                { status: 400 }
            );
        }

        await updateProductType(productId, productType);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating product type:", error);
        console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json(
            { error: "Failed to update product type", details: String(error) },
            { status: 500 }
        );
    }
}
