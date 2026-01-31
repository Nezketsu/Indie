import { ProductGrid } from "@/components/products/ProductGrid";
import { getProducts, getFilterOptions } from "@/lib/db/queries";
import { ProductsClientWrapper } from "./ProductsClientWrapper";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    sort?: string;
    brand?: string;
    category?: string;
    size?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const sort = (params.sort as "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc") || "newest";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [productsData, filterOptions] = await Promise.all([
    getProducts({
      limit,
      offset,
      brandSlug: params.brand,
      category: params.category,
      size: params.size,
      minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
      maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
      inStock: params.inStock === "true",
      sortBy: sort,
    }),
    getFilterOptions(),
  ]);

  const totalPages = Math.ceil(productsData.total / limit);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page header */}
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">All Products</h1>
        <p className="text-neutral-500">
          Discover our curated selection of products from independent brands.
        </p>
      </div>

      <ProductsClientWrapper
        initialProducts={productsData.products}
        total={productsData.total}
        filterOptions={filterOptions}
        currentPage={page}
        totalPages={totalPages}
        currentSort={sort}
      />
    </div>
  );
}
