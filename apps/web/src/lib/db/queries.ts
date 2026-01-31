import { db } from "./index";
import { products, brands, productImages, productVariants, categories, productCategories } from "./schema";
import { desc, eq, sql, and, gte, lte, inArray } from "drizzle-orm";

export async function getProducts(options?: {
  limit?: number;
  offset?: number;
  brandSlug?: string;
  category?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
}) {
  const {
    limit = 20,
    offset = 0,
    brandSlug,
    category,
    size,
    minPrice,
    maxPrice,
    inStock,
    sortBy = "newest",
  } = options || {};

  // Build where conditions
  const conditions = [];

  if (brandSlug) {
    const brand = await db.query.brands.findFirst({
      where: eq(brands.slug, brandSlug),
    });
    if (brand) {
      conditions.push(eq(products.brandId, brand.id));
    }
  }

  // Filter by category (productType)
  if (category) {
    // Categories can be comma-separated for multiple selection
    const categoryNames = category.split(",").map(c => c.trim());
    if (categoryNames.length === 1) {
      // Match the category name (case-insensitive via slug comparison)
      conditions.push(
        sql`LOWER(REPLACE(${products.productType}, ' ', '-')) = LOWER(${categoryNames[0]})`
      );
    } else {
      // Multiple categories
      const categoryConditions = categoryNames.map(
        c => sql`LOWER(REPLACE(${products.productType}, ' ', '-')) = LOWER(${c})`
      );
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }
  }

  // Filter by size (check if product has available variant with this size)
  if (size) {
    const sizes = size.split(",").map(s => s.trim().toUpperCase());
    if (sizes.length === 1) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = ${products.id}
          AND pv.is_available = true
          AND UPPER(pv.option1) = ${sizes[0]}
        )`
      );
    } else {
      // Multiple sizes (OR condition)
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = ${products.id}
          AND pv.is_available = true
          AND UPPER(pv.option1) IN (${sql.join(sizes.map(s => sql`${s}`), sql`, `)})
        )`
      );
    }
  }

  if (minPrice !== undefined) {
    conditions.push(gte(products.priceMin, minPrice.toString()));
  }

  if (maxPrice !== undefined) {
    conditions.push(lte(products.priceMax, maxPrice.toString()));
  }

  if (inStock) {
    conditions.push(eq(products.isAvailable, true));
  }

  // Build order by
  let orderBy;
  switch (sortBy) {
    case "price-asc":
      orderBy = sql`CAST(${products.priceMin} AS DECIMAL) ASC`;
      break;
    case "price-desc":
      orderBy = sql`CAST(${products.priceMin} AS DECIMAL) DESC`;
      break;
    case "name-asc":
      orderBy = sql`${products.title} ASC`;
      break;
    case "name-desc":
      orderBy = sql`${products.title} DESC`;
      break;
    case "newest":
    default:
      orderBy = desc(products.createdAt);
  }

  // Get products with brand info
  const result = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      priceMin: products.priceMin,
      priceMax: products.priceMax,
      compareAtPrice: products.compareAtPrice,
      currency: products.currency,
      isAvailable: products.isAvailable,
      productType: products.productType,
      createdAt: products.createdAt,
      brandId: products.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Get images for these products
  const productIds = result.map((p) => p.id);

  const images =
    productIds.length > 0
      ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(productImages.position)
      : [];

  // Group images by product
  const imagesByProduct = images.reduce((acc, img) => {
    if (!acc[img.productId]) acc[img.productId] = [];
    acc[img.productId].push(img);
    return acc;
  }, {} as Record<string, typeof images>);

  // Format products
  const formattedProducts = result.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    priceMin: parseFloat(p.priceMin || "0"),
    priceMax: parseFloat(p.priceMax || "0"),
    compareAtPrice: p.compareAtPrice ? parseFloat(p.compareAtPrice) : null,
    currency: p.currency || "EUR",
    isAvailable: p.isAvailable ?? true,
    productType: p.productType,
    brand: {
      name: p.brandName || "",
      slug: p.brandSlug || "",
    },
    images: (imagesByProduct[p.id] || []).map((img) => ({
      src: img.src,
      alt: img.altText || p.title,
    })),
    isNew:
      p.createdAt
        ? new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : undefined,
  }));

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = Number(countResult[0]?.count || 0);

  return {
    products: formattedProducts,
    total,
    limit,
    offset,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      brand: true,
      images: {
        orderBy: (images, { asc }) => [asc(images.position)],
      },
      variants: true,
    },
  });

  if (!product) return null;

  return {
    ...product,
    priceMin: parseFloat(product.priceMin || "0"),
    priceMax: parseFloat(product.priceMax || "0"),
    compareAtPrice: product.compareAtPrice
      ? parseFloat(product.compareAtPrice)
      : null,
  };
}

export async function getBrands() {
  const result = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      description: brands.description,
      logoUrl: brands.logoUrl,
      websiteUrl: brands.websiteUrl,
      country: brands.country,
      productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id)`,
    })
    .from(brands)
    .where(eq(brands.isActive, true))
    .orderBy(brands.name);

  return result.map((b) => ({
    ...b,
    productCount: Number(b.productCount),
  }));
}

export async function getBrandBySlug(slug: string) {
  const result = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      description: brands.description,
      logoUrl: brands.logoUrl,
      websiteUrl: brands.websiteUrl,
      country: brands.country,
      productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id)`,
    })
    .from(brands)
    .where(and(eq(brands.slug, slug), eq(brands.isActive, true)))
    .limit(1);

  if (result.length === 0) return null;

  return {
    ...result[0],
    productCount: Number(result[0].productCount),
  };
}

export async function getFilterOptions() {
  // Get categories (product types)
  const productTypes = await db
    .select({
      name: products.productType,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .where(sql`${products.productType} IS NOT NULL AND ${products.productType} != ''`)
    .groupBy(products.productType);

  // Get brands with counts
  const brandsWithCount = await db
    .select({
      slug: brands.slug,
      name: brands.name,
      count: sql<number>`count(${products.id})`,
    })
    .from(brands)
    .leftJoin(products, eq(brands.id, products.brandId))
    .where(eq(brands.isActive, true))
    .groupBy(brands.id, brands.slug, brands.name);

  // Get price range
  const priceRange = await db
    .select({
      min: sql<number>`MIN(CAST(${products.priceMin} AS DECIMAL))`,
      max: sql<number>`MAX(CAST(${products.priceMax} AS DECIMAL))`,
    })
    .from(products);

  // Get available sizes (from product variants)
  const sizes = await db
    .select({
      size: productVariants.option1,
      count: sql<number>`COUNT(DISTINCT ${productVariants.productId})`,
    })
    .from(productVariants)
    .where(
      sql`${productVariants.option1} IS NOT NULL
          AND ${productVariants.option1} != ''
          AND ${productVariants.option1} != 'Default Title'
          AND ${productVariants.isAvailable} = true`
    )
    .groupBy(productVariants.option1)
    .orderBy(sql`COUNT(DISTINCT ${productVariants.productId}) DESC`);

  // Standard size order for clothing
  const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

  const standardSizes = sizes
    .filter(s => s.size && sizeOrder.includes(s.size.toUpperCase()))
    .sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.size!.toUpperCase());
      const bIndex = sizeOrder.indexOf(b.size!.toUpperCase());
      return aIndex - bIndex;
    });

  return {
    categories: productTypes.map((pt) => ({
      slug: pt.name?.toLowerCase().replace(/\s+/g, "-") || "",
      name: pt.name || "",
      count: Number(pt.count),
    })),
    brands: brandsWithCount.map((b) => ({
      slug: b.slug,
      name: b.name,
      count: Number(b.count),
    })),
    priceRange: {
      min: Math.floor(Number(priceRange[0]?.min || 0)),
      max: Math.ceil(Number(priceRange[0]?.max || 1000)),
    },
    sizes: standardSizes.map((s) => ({
      value: s.size!.toUpperCase(),
      label: s.size!.toUpperCase(),
      count: Number(s.count),
    })),
  };
}

// ============ ADMIN QUERIES ============

export async function getAdminProducts(options?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = options || {};

  // Get all products with brand info
  const result = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      productType: products.productType,
      priceMin: products.priceMin,
      isAvailable: products.isAvailable,
      brandId: products.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  // Get product IDs
  const productIds = result.map((p) => p.id);

  // Get images for products
  const images =
    productIds.length > 0
      ? await db
        .select({
          productId: productImages.productId,
          src: productImages.src,
          position: productImages.position,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(productImages.position)
      : [];

  // Get categories for products
  const productCats =
    productIds.length > 0
      ? await db
        .select({
          productId: productCategories.productId,
          categoryId: categories.id,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(productCategories)
        .leftJoin(categories, eq(productCategories.categoryId, categories.id))
        .where(inArray(productCategories.productId, productIds))
      : [];

  // Get all categories for matching by productType
  const allCats = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories);

  // Create a map of category name (lowercase) to category
  const catByName: Record<string, { id: string; name: string; slug: string }> = {};
  for (const cat of allCats) {
    catByName[cat.name.toLowerCase()] = cat;
  }

  // Group by product
  const imagesByProduct: Record<string, string> = {};
  for (const img of images) {
    if (!imagesByProduct[img.productId]) {
      imagesByProduct[img.productId] = img.src;
    }
  }

  const catsByProduct: Record<string, { id: string; name: string; slug: string } | null> = {};
  for (const cat of productCats) {
    if (cat.categoryId && !catsByProduct[cat.productId]) {
      catsByProduct[cat.productId] = {
        id: cat.categoryId,
        name: cat.categoryName || "",
        slug: cat.categorySlug || "",
      };
    }
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products);

  const formattedProducts = result.map((p) => {
    // First check if product has explicit category link
    let category = catsByProduct[p.id] || null;

    // If no category link, try to match by productType name
    if (!category && p.productType) {
      const matchedCat = catByName[p.productType.toLowerCase()];
      if (matchedCat) {
        category = matchedCat;
      }
    }

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      productType: p.productType,
      priceMin: parseFloat(p.priceMin || "0"),
      isAvailable: p.isAvailable ?? true,
      brand: {
        name: p.brandName || "",
        slug: p.brandSlug || "",
      },
      image: imagesByProduct[p.id] || null,
      category,
    };
  });

  return {
    products: formattedProducts,
    total: Number(countResult[0]?.count || 0),
    limit,
    offset,
  };
}

export async function getAllCategories() {
  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
    })
    .from(categories)
    .orderBy(categories.name);

  return result;
}

export async function updateProductCategory(
  productId: string,
  categoryId: string | null
) {
  // Delete existing category associations for this product
  await db
    .delete(productCategories)
    .where(eq(productCategories.productId, productId));

  // If categoryId is provided, insert new association
  if (categoryId) {
    await db.insert(productCategories).values({
      productId,
      categoryId,
    });
  }

  return { success: true };
}

export async function updateProductType(
  productId: string,
  productType: string
) {
  await db
    .update(products)
    .set({ productType })
    .where(eq(products.id, productId));

  return { success: true };
}
