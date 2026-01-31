"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface Product {
  id: string;
  title: string;
  slug: string;
  brand: { name: string; slug: string };
  priceMin: number;
  priceMax: number;
  compareAtPrice: number | null;
  currency: string;
  images: { src: string; alt: string }[];
  isAvailable: boolean;
  isNew?: boolean;
}

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

interface BrandProductsClientProps {
  products: Product[];
  total: number;
  currentPage: number;
  totalPages: number;
  brandSlug: string;
  currentSort: SortOption;
}

export function BrandProductsClient({
  products,
  total,
  currentPage,
  totalPages,
  brandSlug,
  currentSort,
}: BrandProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<SortOption>(currentSort);

  const updateURL = (newSort: SortOption, page?: number) => {
    const params = new URLSearchParams();

    if (newSort !== "newest") {
      params.set("sort", newSort);
    }

    if (page && page > 1) {
      params.set("page", page.toString());
    }

    const queryString = params.toString();
    router.push(`/brands/${brandSlug}${queryString ? `?${queryString}` : ""}`);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    updateURL(newSort, 1); // Reset to page 1 when sorting changes
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    router.push(`/brands/${brandSlug}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-neutral-500">{total} products</p>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            Sort by
          </span>
          <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
            <SelectTrigger className="w-48 border-neutral-200 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <p className="text-center text-neutral-500 py-12">
          No products available from this brand yet.
        </p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-16 flex justify-center items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page, index) => (
              typeof page === "number" ? (
                <Button
                  key={index}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="rounded-none w-10"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2 text-neutral-400">
                  {page}
                </span>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
