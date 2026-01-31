import { categorizeProduct } from "./categorization";

export interface ShopifyProduct {
    id: number;
    title: string;
    handle: string;
    body_html: string | null;
    vendor: string;
    product_type: string;
    created_at: string;
    updated_at: string;
    published_at: string | null;
    tags: string | string[];
    variants: ShopifyVariant[];
    images: ShopifyImage[];
}

export interface ShopifyVariant {
    id: number;
    product_id: number;
    title: string;
    price: string;
    sku: string | null;
    compare_at_price: string | null;
    inventory_quantity: number;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    available: boolean;
}

export interface ShopifyImage {
    id: number;
    product_id: number;
    src: string;
    alt: string | null;
    width: number;
    height: number;
    position: number;
}

export interface ShopifyCollection {
    id: number;
    title: string;
    handle: string;
    description: string;
    products_count: number;
}

export interface ScrapedProduct {
    shopifyId: number;
    title: string;
    slug: string;
    description: string | null;
    productType: string;
    categoryGroup: string;
    vendor: string | null;
    tags: string[];
    priceMin: string;
    priceMax: string;
    compareAtPrice: string | null;
    currency: string;
    isAvailable: boolean;
    publishedAt: Date | null;
    variants: Array<{
        shopifyId: number;
        title: string | null;
        sku: string | null;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number;
        option1: string | null;
        option2: string | null;
        option3: string | null;
        isAvailable: boolean;
    }>;
    images: Array<{
        shopifyId: number;
        src: string;
        altText: string | null;
        width: number;
        height: number;
        position: number;
    }>;
}

const USER_AGENT = process.env.SCRAPER_USER_AGENT || "IndieMarketBot/1.0";
const REQUEST_DELAY = parseInt(process.env.SCRAPER_REQUEST_DELAY_MS || "1000");

// Collections that represent product categories (not monthly/seasonal collections)
const CATEGORY_COLLECTION_PATTERNS = [
    "accessories", "jacket", "denim", "pants", "knit", "crewneck",
    "hoodie", "sweatshirt", "t-shirt", "tee", "shorts", "bag",
    "jewelry", "hat", "cap", "footwear", "shoe", "sneaker"
];

function isLikelyCategoryCollection(title: string): boolean {
    const titleLower = title.toLowerCase();
    // Skip monthly/seasonal collections like "JANVIER", "FEVRIER", "AVRIL 2025", etc.
    if (/^(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|actif)/i.test(titleLower)) {
        return false;
    }
    // Skip collections with year patterns like "2024", "2025"
    if (/20\d{2}/.test(title) && !CATEGORY_COLLECTION_PATTERNS.some(p => titleLower.includes(p))) {
        return false;
    }
    // Keep collections that match category patterns OR special ones like "LUCKY BOX", "MORE STUFF"
    return CATEGORY_COLLECTION_PATTERNS.some(p => titleLower.includes(p))
        || titleLower.includes("lucky box")
        || titleLower.includes("more stuff");
}

/**
 * Delay execution for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string | null): string | null {
    if (!html) return null;
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Fetch all collections from a Shopify store
 */
export async function fetchShopifyCollections(
    shopifyDomain: string
): Promise<ShopifyCollection[]> {
    const url = `https://${shopifyDomain}/collections.json`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    });

    if (!response.ok) {
        console.warn(`Could not fetch collections from ${shopifyDomain}: ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    return data.collections || [];
}

/**
 * Fetch products from a specific collection
 */
export async function fetchCollectionProducts(
    shopifyDomain: string,
    collectionHandle: string,
    limit: number = 250
): Promise<ShopifyProduct[]> {
    const url = `https://${shopifyDomain}/collections/${collectionHandle}/products.json?limit=${limit}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    });

    if (!response.ok) {
        console.warn(`Could not fetch products from collection ${collectionHandle}: ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    return data.products || [];
}

/**
 * Fetch products by collection and build a mapping of product ID to category
 * Uses Shopify collection titles directly as categories
 */
export async function buildProductCategoryMap(
    shopifyDomain: string,
    onProgress?: (message: string) => void
): Promise<Map<number, { productType: string; categoryGroup: string }>> {
    const productCategories = new Map<number, { productType: string; categoryGroup: string }>();

    onProgress?.(`Fetching collections from ${shopifyDomain}...`);
    const collections = await fetchShopifyCollections(shopifyDomain);

    // Filter to category-relevant collections (skip monthly/seasonal ones)
    const categoryCollections = collections.filter(c => isLikelyCategoryCollection(c.title));

    onProgress?.(`Found ${categoryCollections.length} category collections`);

    for (const collection of categoryCollections) {
        onProgress?.(`Fetching products from "${collection.title}"...`);
        const products = await fetchCollectionProducts(shopifyDomain, collection.handle);

        for (const product of products) {
            // Only set if not already set (first match wins = more specific)
            if (!productCategories.has(product.id)) {
                // Use the collection title directly as the category
                productCategories.set(product.id, {
                    productType: collection.title.toUpperCase(),
                    categoryGroup: "Clothing", // Default group
                });
            }
        }

        await delay(REQUEST_DELAY);
    }

    onProgress?.(`Mapped ${productCategories.size} products to categories from collections`);
    return productCategories;
}

/**
 * Fetch products from a Shopify store using their public API
 */
export async function fetchShopifyProducts(
    shopifyDomain: string,
    options: {
        limit?: number;
        page?: number;
    } = {}
): Promise<ShopifyProduct[]> {
    const { limit = 250, page = 1 } = options;

    const url = `https://${shopifyDomain}/products.json?limit=${limit}&page=${page}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch products from ${shopifyDomain}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.products || [];
}

/**
 * Fetch all products from a Shopify store (handles pagination)
 */
export async function fetchAllShopifyProducts(
    shopifyDomain: string,
    onProgress?: (fetched: number, total: number | null) => void
): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const products = await fetchShopifyProducts(shopifyDomain, { page, limit: 250 });

        if (products.length === 0) {
            hasMore = false;
        } else {
            allProducts.push(...products);
            onProgress?.(allProducts.length, null);
            page++;

            if (hasMore) {
                await delay(REQUEST_DELAY);
            }
        }
    }

    return allProducts;
}

/**
 * Transform a Shopify product into our internal format
 */
export function transformShopifyProduct(
    shopifyProduct: ShopifyProduct,
    currency: string = "EUR",
    categoryOverride?: { productType: string; categoryGroup: string }
): ScrapedProduct {
    const prices = shopifyProduct.variants.map((v) => parseFloat(v.price));
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);

    const compareAtPrices = shopifyProduct.variants
        .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : null))
        .filter((p): p is number => p !== null);
    const compareAtPrice = compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : null;

    const isAvailable = shopifyProduct.variants.some((v) => v.available);
    const description = stripHtml(shopifyProduct.body_html);

    // Use category from collections if available, otherwise fall back to categorization
    let productType: string;
    let categoryGroup: string;

    if (categoryOverride) {
        productType = categoryOverride.productType;
        categoryGroup = categoryOverride.categoryGroup;
    } else if (shopifyProduct.product_type && shopifyProduct.product_type.trim() !== "") {
        productType = shopifyProduct.product_type;
        const categorization = categorizeProduct(productType, null);
        categoryGroup = categorization.categoryGroup !== "Other"
            ? categorization.categoryGroup
            : "Clothing";
    } else {
        const categorization = categorizeProduct(shopifyProduct.title, description);
        productType = categorization.productType;
        categoryGroup = categorization.categoryGroup;
    }

    // Handle tags - can be string or array depending on Shopify version
    let tags: string[] = [];
    if (shopifyProduct.tags) {
        if (typeof shopifyProduct.tags === "string") {
            tags = shopifyProduct.tags.split(",").map((t) => t.trim()).filter(Boolean);
        } else if (Array.isArray(shopifyProduct.tags)) {
            tags = shopifyProduct.tags.filter(Boolean);
        }
    }

    return {
        shopifyId: shopifyProduct.id,
        title: shopifyProduct.title,
        slug: shopifyProduct.handle,
        description,
        productType,
        categoryGroup,
        vendor: shopifyProduct.vendor || null,
        tags,
        priceMin: priceMin.toFixed(2),
        priceMax: priceMax.toFixed(2),
        compareAtPrice: compareAtPrice?.toFixed(2) || null,
        currency,
        isAvailable,
        publishedAt: shopifyProduct.published_at ? new Date(shopifyProduct.published_at) : null,
        variants: shopifyProduct.variants.map((v) => ({
            shopifyId: v.id,
            title: v.title !== "Default Title" ? v.title : null,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compare_at_price,
            inventoryQuantity: v.inventory_quantity,
            option1: v.option1,
            option2: v.option2,
            option3: v.option3,
            isAvailable: v.available,
        })),
        images: shopifyProduct.images.map((img) => ({
            shopifyId: img.id,
            src: img.src,
            altText: img.alt,
            width: img.width,
            height: img.height,
            position: img.position,
        })),
    };
}

/**
 * Scrape and transform all products from a Shopify store
 * Uses collections for accurate categorization when available
 */
export async function scrapeShopifyStore(
    shopifyDomain: string,
    currency: string = "EUR",
    onProgress?: (message: string) => void
): Promise<ScrapedProduct[]> {
    onProgress?.(`Starting to scrape ${shopifyDomain}...`);

    // First, build category map from collections
    const categoryMap = await buildProductCategoryMap(shopifyDomain, onProgress);

    // Then fetch all products
    const shopifyProducts = await fetchAllShopifyProducts(
        shopifyDomain,
        (fetched) => onProgress?.(`Fetched ${fetched} products...`)
    );

    onProgress?.(`Transforming ${shopifyProducts.length} products...`);

    // Transform products with category overrides from collections
    const scrapedProducts = shopifyProducts.map((p) => {
        const categoryOverride = categoryMap.get(p.id);
        return transformShopifyProduct(p, currency, categoryOverride);
    });

    // Log categorization stats
    const categoryStats = new Map<string, number>();
    const fromCollections = scrapedProducts.filter(p => categoryMap.has(p.shopifyId)).length;

    for (const product of scrapedProducts) {
        const count = categoryStats.get(product.productType) || 0;
        categoryStats.set(product.productType, count + 1);
    }

    onProgress?.(`Categorization complete. ${fromCollections}/${scrapedProducts.length} from collections. Categories: ${JSON.stringify(Object.fromEntries(categoryStats))}`);

    return scrapedProducts;
}
