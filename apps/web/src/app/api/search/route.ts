import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: { products: [], total: 0 },
      });
    }

    const result = await getProducts({
      search: query,
      limit: 8,
    });

    return NextResponse.json({
      success: true,
      data: {
        products: result.products,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("[Search] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
