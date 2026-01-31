import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string | string[];
  variants: {
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    sku: string;
    available: boolean;
    option1: string;
    option2: string | null;
    option3: string | null;
    inventory_quantity?: number;
  }[];
  images: {
    id: number;
    src: string;
    alt: string | null;
    width: number;
    height: number;
    position: number;
  }[];
  published_at: string;
}

async function fetchAllProducts(domain: string): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let page = 1;
  const limit = 250;

  console.log(`Fetching products from ${domain}...`);

  while (true) {
    const url = `https://${domain}/products.json?limit=${limit}&page=${page}`;
    console.log(`  Fetching page ${page}...`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "IndieMarketBot/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.products as ShopifyProduct[];

    if (products.length === 0) break;

    allProducts.push(...products);
    console.log(`  Found ${products.length} products (total: ${allProducts.length})`);

    if (products.length < limit) break;
    page++;

    // Rate limiting - wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allProducts;
}

async function upsertBrand(
  name: string,
  slug: string,
  domain: string,
  websiteUrl: string,
  country: string
): Promise<string> {
  const existing = await db.query.brands.findFirst({
    where: (brands, { eq }) => eq(brands.shopifyDomain, domain),
  });

  if (existing) {
    console.log(`Brand "${name}" already exists with ID: ${existing.id}`);
    return existing.id;
  }

  const [brand] = await db
    .insert(schema.brands)
    .values({
      name,
      slug,
      shopifyDomain: domain,
      websiteUrl,
      country,
      isActive: true,
    })
    .returning();

  console.log(`Created brand "${name}" with ID: ${brand.id}`);
  return brand.id;
}

async function upsertProduct(brandId: string, product: ShopifyProduct) {
  // Calculate price range
  const prices = product.variants.map((v) => parseFloat(v.price));
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);

  // Get compare at price (highest)
  const compareAtPrices = product.variants
    .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : 0))
    .filter((p) => p > 0);
  const compareAtPrice = compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : null;

  // Check availability
  const isAvailable = product.variants.some((v) => v.available);

  // Parse tags
  const tags = Array.isArray(product.tags)
    ? product.tags
    : typeof product.tags === "string"
    ? product.tags.split(", ").filter(Boolean)
    : [];

  // Upsert product
  const [upsertedProduct] = await db
    .insert(schema.products)
    .values({
      brandId,
      shopifyId: product.id,
      title: product.title,
      slug: product.handle,
      description: product.body_html,
      productType: product.product_type || null,
      vendor: product.vendor || null,
      tags,
      priceMin: priceMin.toFixed(2),
      priceMax: priceMax.toFixed(2),
      currency: "EUR",
      compareAtPrice: compareAtPrice?.toFixed(2) || null,
      isAvailable,
      publishedAt: product.published_at ? new Date(product.published_at) : null,
    })
    .onConflictDoUpdate({
      target: [schema.products.brandId, schema.products.shopifyId],
      set: {
        title: product.title,
        slug: product.handle,
        description: product.body_html,
        productType: product.product_type || null,
        vendor: product.vendor || null,
        tags,
        priceMin: priceMin.toFixed(2),
        priceMax: priceMax.toFixed(2),
        compareAtPrice: compareAtPrice?.toFixed(2) || null,
        isAvailable,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Delete existing variants and images
  await db
    .delete(schema.productVariants)
    .where(
      require("drizzle-orm").eq(schema.productVariants.productId, upsertedProduct.id)
    );
  await db
    .delete(schema.productImages)
    .where(
      require("drizzle-orm").eq(schema.productImages.productId, upsertedProduct.id)
    );

  // Insert variants
  if (product.variants.length > 0) {
    await db.insert(schema.productVariants).values(
      product.variants.map((v) => ({
        productId: upsertedProduct.id,
        shopifyId: v.id,
        title: v.title,
        sku: v.sku || null,
        price: v.price,
        compareAtPrice: v.compare_at_price || null,
        inventoryQuantity: v.inventory_quantity || null,
        option1: v.option1 || null,
        option2: v.option2 || null,
        option3: v.option3 || null,
        isAvailable: v.available,
      }))
    );
  }

  // Insert images
  if (product.images.length > 0) {
    await db.insert(schema.productImages).values(
      product.images.map((img) => ({
        productId: upsertedProduct.id,
        shopifyId: img.id,
        src: img.src,
        altText: img.alt || null,
        width: img.width,
        height: img.height,
        position: img.position,
      }))
    );
  }

  return upsertedProduct;
}

async function scrapeBrand(config: {
  name: string;
  slug: string;
  domain: string;
  websiteUrl: string;
  country: string;
}) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Scraping: ${config.name}`);
  console.log(`${"=".repeat(50)}\n`);

  try {
    // Create or get brand
    const brandId = await upsertBrand(
      config.name,
      config.slug,
      config.domain,
      config.websiteUrl,
      config.country
    );

    // Fetch products
    const products = await fetchAllProducts(config.domain);
    console.log(`\nFound ${products.length} products total\n`);

    // Upsert each product
    let created = 0;
    let updated = 0;

    for (const product of products) {
      try {
        await upsertProduct(brandId, product);
        console.log(`  ✓ ${product.title}`);
        created++;
      } catch (error) {
        console.error(`  ✗ Failed: ${product.title}`, error);
      }
    }

    // Update last synced
    await db
      .update(schema.brands)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(require("drizzle-orm").eq(schema.brands.id, brandId));

    console.log(`\n✅ Completed: ${created} products imported\n`);
  } catch (error) {
    console.error(`\n❌ Error scraping ${config.name}:`, error);
  }
}

// Main execution
async function main() {
  // Divin by Divin configuration
  await scrapeBrand({
    name: "Divin by Divin",
    slug: "divin-by-divin",
    domain: "divinbydivin.com",
    websiteUrl: "https://divinbydivin.com",
    country: "France",
  });

  // 808VISION configuration
  await scrapeBrand({
    name: "808VISION",
    slug: "808vision",
    domain: "808.vision",
    websiteUrl: "https://808.vision",
    country: "France",
  });

  // Close connection
  await client.end();
  console.log("Done!");
}

main().catch(console.error);
