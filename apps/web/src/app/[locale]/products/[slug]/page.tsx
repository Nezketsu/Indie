import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getProductBySlug, getProducts } from "@/lib/db/queries";
import { ExternalLink, ChevronLeft } from "lucide-react";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { WishlistButton } from "@/components/products/WishlistButton";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const revalidate = 60;

export async function generateStaticParams() {
    try {
        const { products } = await getProducts({ limit: 100 });
        return products.map((product) => ({
            slug: product.slug,
        }));
    } catch {
        return [];
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
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
    params: Promise<{ slug: string; locale: string }>;
}) {
    const { slug, locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('products');
    const tCommon = await getTranslations('common');

    const product = await getProductBySlug(slug);

    if (!product) {
        notFound();
    }

    const galleryImages = product.images?.map((img) => ({
        id: img.id,
        src: img.src,
        altText: img.altText,
    })) || [];

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
            style: "currency",
            currency: product.currency || "EUR",
        }).format(price);
    };

    const priceDisplay =
        product.priceMin === product.priceMax
            ? formatPrice(product.priceMin)
            : `${formatPrice(product.priceMin)} - ${formatPrice(product.priceMax)}`;

    const brandProductUrl = product.brand?.websiteUrl
        ? `${product.brand.websiteUrl}/products/${product.slug}`
        : null;

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-6">
                <Link
                    href="/products"
                    className="inline-flex items-center text-sm text-neutral-500 hover:text-black transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {tCommon('backToProducts')}
                </Link>
            </div>

            <div className="container mx-auto px-4 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    <ProductImageGallery
                        images={galleryImages}
                        productTitle={product.title}
                    />

                    <div className="lg:sticky lg:top-24 lg:self-start space-y-8">
                        {product.brand && (
                            <Link
                                href={`/brands/${product.brand.slug}`}
                                className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                            >
                                {product.brand.name}
                            </Link>
                        )}

                        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight">
                            {product.title}
                        </h1>

                        <div className="flex items-baseline gap-4">
                            <span className="text-2xl">{priceDisplay}</span>
                            {product.compareAtPrice && product.compareAtPrice > product.priceMin && (
                                <span className="text-lg text-neutral-400 line-through">
                                    {formatPrice(product.compareAtPrice)}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span
                                className={`w-2 h-2 rounded-full ${product.isAvailable ? "bg-green-500" : "bg-red-500"
                                    }`}
                            />
                            <span className="text-sm text-neutral-600">
                                {product.isAvailable ? t('inStock') : t('outOfStock')}
                            </span>
                        </div>

                        {product.variants && product.variants.length > 1 && (
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase tracking-widest">{t('availableOptions')}</h3>
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

                        <div className="flex flex-col gap-3">
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
                                        {t('buyOn', { brand: product.brand?.name })}
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </Button>
                            )}

                            <WishlistButton productId={product.id} variant="page" />
                        </div>

                        {product.description && (
                            <div className="pt-8 border-t border-neutral-200 space-y-4">
                                <h3 className="text-xs uppercase tracking-widest">{t('description')}</h3>
                                <div
                                    className="prose prose-neutral prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: product.description }}
                                />
                            </div>
                        )}

                        <div className="pt-8 border-t border-neutral-200 space-y-4">
                            <h3 className="text-xs uppercase tracking-widest">{t('details')}</h3>
                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                {product.productType && (
                                    <>
                                        <dt className="text-neutral-500">{t('category')}</dt>
                                        <dd>{product.productType}</dd>
                                    </>
                                )}
                                {product.vendor && (
                                    <>
                                        <dt className="text-neutral-500">{t('vendor')}</dt>
                                        <dd>{product.vendor}</dd>
                                    </>
                                )}
                                {product.brand?.country && (
                                    <>
                                        <dt className="text-neutral-500">{t('origin')}</dt>
                                        <dd>{product.brand.country}</dd>
                                    </>
                                )}
                            </dl>
                        </div>

                        {product.brand && (
                            <div className="pt-8 border-t border-neutral-200 space-y-4">
                                <h3 className="text-xs uppercase tracking-widest">{t('aboutBrand')}</h3>
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
                                            {t('viewAllProducts')}
                                        </Link>
                                        {product.brand.websiteUrl && (
                                            <a
                                                href={product.brand.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black inline-flex items-center gap-1"
                                            >
                                                {t('visitWebsite')}
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
