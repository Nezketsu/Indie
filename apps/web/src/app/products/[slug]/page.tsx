import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getProductBySlug, getProducts } from "@/lib/db/queries";
import { ExternalLink, ChevronLeft } from "lucide-react";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { WishlistButton } from "@/components/products/WishlistButton";

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// Generate static params for all products
export async function generateStaticParams() {
    try {
        const { products } = await getProducts({ limit: 100 });
        return products.map((product) => ({
            slug: product.slug,
        }));
    } catch {
        // If database is not available during build, generate pages on-demand
        return [];
    }
}

// Generate metadata for SEO
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        return {
            title: "Product Not Found",
        };
    }

    return {
        title: `${product.title} | Indie Marketplace`,
        description: product.description?.slice(0, 160) || `Shop ${product.title} from ${product.brand?.name}`,
    };
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        notFound();
    }

    const galleryImages = product.images?.map((img) => ({
        id: img.id,
        src: img.src,
        altText: img.altText,
    })) || [];

    // Format price display
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: product.currency || "EUR",
        }).format(price);
    };

    const priceMin = parseFloat(product.priceMin || "0");
    const priceMax = parseFloat(product.priceMax || "0");
    const compareAtPrice = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;

    const priceDisplay =
        priceMin === priceMax
            ? formatPrice(priceMin)
            : `${formatPrice(priceMin)} - ${formatPrice(priceMax)}`;

    // Build the product URL on the brand's site
    const brandProductUrl = product.brand?.websiteUrl
        ? `${product.brand.websiteUrl}/products/${product.slug}`
        : null;

    return (
        <div className="min-h-screen bg-white">
            {/* Breadcrumb */}
            <div className="container mx-auto px-4 py-6">
                <Link
                    href="/products"
                    className="inline-flex items-center text-sm text-neutral-500 hover:text-black transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Products
                </Link>
            </div>

            <div className="container mx-auto px-4 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Images Section */}
                    <ProductImageGallery
                        images={galleryImages}
                        productTitle={product.title}
                    />

                    {/* Product Info Section */}
                    <div className="lg:sticky lg:top-24 lg:self-start space-y-8">
                        {/* Brand */}
                        {product.brand && (
                            <Link
                                href={`/brands/${product.brand.slug}`}
                                className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                            >
                                {product.brand.name}
                            </Link>
                        )}

                        {/* Title */}
                        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight">
                            {product.title}
                        </h1>

                        {/* Price */}
                        <div className="flex items-baseline gap-4">
                            <span className="text-2xl">{priceDisplay}</span>
                            {compareAtPrice && compareAtPrice > priceMin ? (
                                <span className="text-lg text-neutral-400 line-through">
                                    {formatPrice(compareAtPrice)}
                                </span>
                            ) : null}
                        </div>

                        {/* Availability */}
                        <div className="flex items-center gap-2">
                            <span
                                className={`w-2 h-2 rounded-full ${product.isAvailable ? "bg-green-500" : "bg-red-500"
                                    }`}
                            />
                            <span className="text-sm text-neutral-600">
                                {product.isAvailable ? "In Stock" : "Out of Stock"}
                            </span>
                        </div>

                        {/* Variants */}
                        {product.variants && product.variants.length > 1 && (
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase tracking-widest">Available Options</h3>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map((variant) => (
                                        <div
                                            key={variant.id}
                                            className={`px-4 py-2 border text-sm ${variant.isAvailable
                                                ? "border-neutral-300 hover:border-black cursor-pointer"
                                                : "border-neutral-200 text-neutral-400 cursor-not-allowed"
                                                }`}
                                        >
                                            {variant.title || `${variant.option1}${variant.option2 ? ` / ${variant.option2}` : ""}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {/* CTA Button - Link to Brand Site */}
                            {brandProductUrl && (
                                <Button
                                    size="lg"
                                    className="w-full bg-black text-white hover:bg-neutral-800"
                                    asChild
                                >
                                    <a
                                        href={brandProductUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2"
                                    >
                                        Buy on {product.brand?.name}
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </Button>
                            )}

                            {/* Wishlist Button */}
                            <WishlistButton productId={product.id} variant="page" />
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="pt-8 border-t border-neutral-200 space-y-4">
                                <h3 className="text-xs uppercase tracking-widest">Description</h3>
                                <div
                                    className="prose prose-neutral prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: product.description }}
                                />
                            </div>
                        )}

                        {/* Product Details */}
                        <div className="pt-8 border-t border-neutral-200 space-y-4">
                            <h3 className="text-xs uppercase tracking-widest">Details</h3>
                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                {product.productType && (
                                    <>
                                        <dt className="text-neutral-500">Category</dt>
                                        <dd>{product.productType}</dd>
                                    </>
                                )}
                                {product.vendor && (
                                    <>
                                        <dt className="text-neutral-500">Vendor</dt>
                                        <dd>{product.vendor}</dd>
                                    </>
                                )}
                                {product.brand?.country && (
                                    <>
                                        <dt className="text-neutral-500">Origin</dt>
                                        <dd>{product.brand.country}</dd>
                                    </>
                                )}
                            </dl>
                        </div>

                        {/* Brand Info */}
                        {product.brand && (
                            <div className="pt-8 border-t border-neutral-200 space-y-4">
                                <h3 className="text-xs uppercase tracking-widest">About the Brand</h3>
                                <div className="p-6 bg-neutral-50">
                                    <Link
                                        href={`/brands/${product.brand.slug}`}
                                        className="font-serif text-xl hover:underline underline-offset-4"
                                    >
                                        {product.brand.name}
                                    </Link>
                                    {product.brand.description && (
                                        <p className="mt-2 text-sm text-neutral-600 line-clamp-3">
                                            {product.brand.description}
                                        </p>
                                    )}
                                    <div className="mt-4 flex gap-4">
                                        <Link
                                            href={`/brands/${product.brand.slug}`}
                                            className="text-xs uppercase tracking-widest hover:underline underline-offset-4"
                                        >
                                            View All Products
                                        </Link>
                                        {product.brand.websiteUrl && (
                                            <a
                                                href={product.brand.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black inline-flex items-center gap-1"
                                            >
                                                Visit Website
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
