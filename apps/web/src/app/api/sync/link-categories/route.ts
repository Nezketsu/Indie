import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories, productCategories } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { categorizeProduct } from "@/lib/categorization";

// POST /api/sync/link-categories
// This endpoint links all products to categories based on their productType or title
// Pass ?force=true to clear all existing links and re-link everything
export async function POST(request: NextRequest) {
    try {
        // Verify authorization
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "true";

        // Get all categories
        const allCategories = await db
            .select({
                id: categories.id,
                name: categories.name,
                slug: categories.slug,
            })
            .from(categories);

        // Create a map of category name (lowercase) to category
        const categoryByName: Record<string, { id: string; name: string; slug: string }> = {};
        const categoryBySlug: Record<string, { id: string; name: string; slug: string }> = {};
        for (const cat of allCategories) {
            categoryByName[cat.name.toLowerCase()] = cat;
            categoryBySlug[cat.slug.toLowerCase()] = cat;
        }

        // If force mode, clear all existing product-category links
        if (force) {
            await db.delete(productCategories);
            console.log("[Link Categories] Force mode: cleared all existing links");
        }

        // Get all products
        const allProducts = await db
            .select({
                id: products.id,
                title: products.title,
                productType: products.productType,
                tags: products.tags,
            })
            .from(products);

        let linked = 0;
        let skipped = 0;
        let errors = 0;

        for (const product of allProducts) {
            try {
                let categoryId: string | null = null;

                // First try to match by productType
                if (product.productType) {
                    const productTypeLower = product.productType.toLowerCase();

                    // Direct match by name
                    if (categoryByName[productTypeLower]) {
                        categoryId = categoryByName[productTypeLower].id;
                    }
                    // Match by slug (convert productType to slug format)
                    else {
                        const productTypeSlug = productTypeLower.replace(/\s+/g, "-").replace(/&/g, "-");
                        if (categoryBySlug[productTypeSlug]) {
                            categoryId = categoryBySlug[productTypeSlug].id;
                        }
                    }
                }

                // If no match by productType, use the categorization function
                if (!categoryId) {
                    const categorization = categorizeProduct(product.title, product.productType || undefined);
                    if (categorization) {
                        const catName = categorization.productType.toLowerCase();
                        if (categoryByName[catName]) {
                            categoryId = categoryByName[catName].id;
                        }
                    }
                }

                // If we found a category, link the product
                if (categoryId) {
                    // Check if link already exists (unless force mode)
                    if (!force) {
                        const existingLink = await db
                            .select()
                            .from(productCategories)
                            .where(eq(productCategories.productId, product.id))
                            .limit(1);

                        if (existingLink.length > 0) {
                            skipped++;
                            continue;
                        }
                    }

                    await db.insert(productCategories).values({
                        productId: product.id,
                        categoryId: categoryId,
                    });
                    linked++;
                } else {
                    // No category found, link to "Other"
                    const otherCategory = categoryBySlug["other"];
                    if (otherCategory) {
                        if (!force) {
                            const existingLink = await db
                                .select()
                                .from(productCategories)
                                .where(eq(productCategories.productId, product.id))
                                .limit(1);

                            if (existingLink.length > 0) {
                                skipped++;
                                continue;
                            }
                        }

                        await db.insert(productCategories).values({
                            productId: product.id,
                            categoryId: otherCategory.id,
                        });
                        linked++;
                    } else {
                        skipped++;
                    }
                }
            } catch (e) {
                console.error(`Error processing product ${product.id}:`, e);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Linked ${linked} products to categories, skipped ${skipped}, ${errors} errors`,
            force,
            total: allProducts.length,
            linked,
            skipped,
            errors,
        });
    } catch (error) {
        console.error("Error linking categories:", error);
        return NextResponse.json(
            { error: "Failed to link categories" },
            { status: 500 }
        );
    }
}
