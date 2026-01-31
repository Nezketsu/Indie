import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, wishlist, products, productImages, brands } from "@/lib/db";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET - Get all wishlist items for the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Get wishlist items
    const wishlistItems = await db
      .select()
      .from(wishlist)
      .where(eq(wishlist.userId, user.id))
      .orderBy(desc(wishlist.createdAt));

    if (wishlistItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const productIds = wishlistItems.map((item) => item.productId);

    // Get products with brands
    const productsWithBrands = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        priceMin: products.priceMin,
        priceMax: products.priceMax,
        compareAtPrice: products.compareAtPrice,
        currency: products.currency,
        isAvailable: products.isAvailable,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(inArray(products.id, productIds));

    // Get images
    const images = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.position);

    // Group images by product
    const imagesByProduct = images.reduce((acc, img) => {
      if (!acc[img.productId]) acc[img.productId] = [];
      acc[img.productId].push(img);
      return acc;
    }, {} as Record<string, typeof images>);

    // Create product map
    const productMap = productsWithBrands.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, (typeof productsWithBrands)[0]>);

    const formattedItems = wishlistItems
      .filter((item) => productMap[item.productId])
      .map((item) => {
        const product = productMap[item.productId];
        const productImages = imagesByProduct[item.productId] || [];

        return {
          id: item.id,
          productId: item.productId,
          createdAt: item.createdAt,
          product: {
            id: product.id,
            title: product.title,
            slug: product.slug,
            priceMin: Number(product.priceMin),
            priceMax: Number(product.priceMax),
            compareAtPrice: product.compareAtPrice
              ? Number(product.compareAtPrice)
              : null,
            currency: product.currency || "EUR",
            isAvailable: product.isAvailable,
            brand: {
              name: product.brandName || "",
              slug: product.brandSlug || "",
            },
            images: productImages.map((img) => ({
              src: img.src,
              alt: img.altText || product.title,
            })),
          },
        };
      });

    return NextResponse.json({
      success: true,
      data: formattedItems,
    });
  } catch (error) {
    console.error("[Wishlist] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Add a product to wishlist
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId requis" },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Check if already in wishlist
    const existing = await db.query.wishlist.findFirst({
      where: and(
        eq(wishlist.userId, user.id),
        eq(wishlist.productId, productId)
      ),
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { id: existing.id },
        message: "Déjà dans la liste d'envies",
      });
    }

    // Add to wishlist
    const [newItem] = await db
      .insert(wishlist)
      .values({
        userId: user.id,
        productId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: { id: newItem.id },
    });
  } catch (error) {
    console.error("[Wishlist] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a product from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId requis" },
        { status: 400 }
      );
    }

    await db
      .delete(wishlist)
      .where(
        and(eq(wishlist.userId, user.id), eq(wishlist.productId, productId))
      );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[Wishlist] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
