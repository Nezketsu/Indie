import { redirect, notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/db/queries";

export default async function RedirectToProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product || !product.brand?.websiteUrl) {
        notFound();
    }

    // Construct the product URL on the brand's website
    const brandProductUrl = `${product.brand.websiteUrl}/products/${product.slug}`;

    // Redirect to the brand's product page
    redirect(brandProductUrl);
}
