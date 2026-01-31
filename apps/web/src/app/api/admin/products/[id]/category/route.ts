import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateProductCategory } from "@/lib/db/queries";

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
        const { categoryId } = body;

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        await updateProductCategory(productId, categoryId || null);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating product category:", error);
        return NextResponse.json(
            { error: "Failed to update product category" },
            { status: 500 }
        );
    }
}
