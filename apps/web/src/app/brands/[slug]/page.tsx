import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandBySlug, getProducts } from "@/lib/db/queries";
import { BrandProductsClient } from "./BrandProductsClient";

export const revalidate = 60;

const PRODUCTS_PER_PAGE = 24;

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page, sort } = await searchParams;

  const brand = await getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const currentSort = (sort as SortOption) || "newest";
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE;

  const productsData = await getProducts({
    brandSlug: slug,
    limit: PRODUCTS_PER_PAGE,
    offset,
    sortBy: currentSort,
  });

  const totalPages = Math.ceil(productsData.total / PRODUCTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-neutral-500">
          <li>
            <Link href="/" className="hover:text-black">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/brands" className="hover:text-black">
              Brands
            </Link>
          </li>
          <li>/</li>
          <li className="text-black">{brand.name}</li>
        </ol>
      </nav>

      {/* Brand Header */}
      <div className="mb-12 pb-12 border-b border-neutral-200">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">{brand.name}</h1>
        <div className="flex flex-wrap gap-4 items-center text-sm text-neutral-500 mb-6">
          {brand.country && (
            <span className="uppercase tracking-widest">{brand.country}</span>
          )}
          <span>{brand.productCount} products</span>
          {brand.websiteUrl && (
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black underline underline-offset-4"
            >
              Visit Website
            </a>
          )}
        </div>
        {brand.description && (
          <p className="text-neutral-600 max-w-2xl">{brand.description}</p>
        )}
      </div>

      {/* Products with Pagination */}
      <div>
        <h2 className="text-xs uppercase tracking-widest mb-8">
          All Products from {brand.name}
        </h2>
        <BrandProductsClient
          products={productsData.products}
          total={productsData.total}
          currentPage={currentPage}
          totalPages={totalPages}
          brandSlug={slug}
          currentSort={currentSort}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) {
    return {
      title: "Brand Not Found",
    };
  }

  return {
    title: `${brand.name} - Indie Marketplace`,
    description: brand.description || `Shop products from ${brand.name}`,
  };
}
