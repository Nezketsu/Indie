"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/products/ProductGrid";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FilterState, SortOption } from "@/types";

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

interface FilterOptions {
  categories: { slug: string; name: string; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  sizes: { value: string; label: string; count: number }[];
  priceRange: { min: number; max: number };
}

interface ProductsClientWrapperProps {
  initialProducts: Product[];
  total: number;
  filterOptions: FilterOptions;
  currentPage: number;
  totalPages: number;
  currentSort: SortOption;
}

export function ProductsClientWrapper({
  initialProducts,
  total,
  filterOptions,
  currentPage,
  totalPages,
  currentSort,
}: ProductsClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    categories: searchParams.get("category")?.split(",").filter(Boolean) || [],
    brands: searchParams.get("brand")?.split(",").filter(Boolean) || [],
    sizes: searchParams.get("size")?.split(",").filter(Boolean) || [],
    priceRange: [
      filterOptions.priceRange.min,
      filterOptions.priceRange.max,
    ] as [number, number],
    tags: [],
    inStock: searchParams.get("inStock") === "true",
  });

  const [sort, setSort] = useState<SortOption>(currentSort);

  const updateURL = (newFilters: FilterState, newSort: SortOption) => {
    const params = new URLSearchParams();

    if (newSort !== "newest") {
      params.set("sort", newSort);
    }

    if (newFilters.categories.length > 0) {
      params.set("category", newFilters.categories.join(","));
    }

    if (newFilters.brands.length > 0) {
      params.set("brand", newFilters.brands.join(","));
    }

    if (newFilters.sizes && newFilters.sizes.length > 0) {
      params.set("size", newFilters.sizes.join(","));
    }

    if (newFilters.priceRange[0] > filterOptions.priceRange.min) {
      params.set("minPrice", newFilters.priceRange[0].toString());
    }

    if (newFilters.priceRange[1] < filterOptions.priceRange.max) {
      params.set("maxPrice", newFilters.priceRange[1].toString());
    }

    if (newFilters.inStock) {
      params.set("inStock", "true");
    }

    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ""}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateURL(newFilters, sort);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    updateURL(filters, newSort);
  };

  return (
    <div className="flex gap-12">
      {/* Filters */}
      <FilterSidebar
        categories={filterOptions.categories}
        brands={filterOptions.brands}
        sizes={filterOptions.sizes}
        priceRange={filterOptions.priceRange}
        activeFilters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Products */}
      <div className="flex-1">
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
        <ProductGrid products={initialProducts} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-16 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (currentPage - 1).toString());
                router.push(`/products?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-neutral-500">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (currentPage + 1).toString());
                router.push(`/products?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
