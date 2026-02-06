"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
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
  categories: { id: string; slug: string; name: string; count: number }[];
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
  isAdmin?: boolean;
  searchQuery?: string;
}

export function ProductsClientWrapper({
  initialProducts,
  total,
  filterOptions,
  currentPage,
  totalPages,
  currentSort,
  isAdmin = false,
  searchQuery,
}: ProductsClientWrapperProps) {
  const t = useTranslations('products');
  const tSearch = useTranslations('search');
  const router = useRouter();
  const searchParams = useSearchParams();

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const [filters, setFilters] = useState<FilterState>({
    categories: searchParams.get("category")?.split(",").filter(Boolean) || [],
    brands: searchParams.get("brand")?.split(",").filter(Boolean) || [],
    sizes: searchParams.get("size")?.split(",").filter(Boolean) || [],
    priceRange: [
      filterOptions.priceRange.min,
      filterOptions.priceRange.max,
    ] as [number, number],
    tags: [],
    inStock: searchParams.get("inStock") !== "false",
  });

  const [sort, setSort] = useState<SortOption>(currentSort);

  const updateURL = (newFilters: FilterState, newSort: SortOption) => {
    const params = new URLSearchParams();

    // Preserve search query if present
    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      params.set("search", searchQuery);
    }

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

    if (!newFilters.inStock) {
      params.set("inStock", "false");
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
      <FilterSidebar
        categories={filterOptions.categories}
        brands={filterOptions.brands}
        sizes={filterOptions.sizes}
        priceRange={filterOptions.priceRange}
        activeFilters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="flex-1">
        {searchQuery && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-neutral-50 rounded-lg">
            <span className="text-sm text-neutral-600">
              {tSearch('resultsFound')}: &quot;{searchQuery}&quot;
            </span>
            <button
              onClick={clearSearch}
              className="ml-auto text-xs text-neutral-500 hover:text-neutral-800 underline"
            >
              {tSearch('clearSearch')}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-neutral-500">{t('count', { count: total })}</p>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-widest text-neutral-500">
              {t('sortBy')}
            </span>
            <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
              <SelectTrigger className="w-48 border-neutral-200 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="newest">{t('sortNewest')}</SelectItem>
                <SelectItem value="price-asc">{t('sortPriceLowHigh')}</SelectItem>
                <SelectItem value="price-desc">{t('sortPriceHighLow')}</SelectItem>
                <SelectItem value="name-asc">{t('sortNameAZ')}</SelectItem>
                <SelectItem value="name-desc">{t('sortNameZA')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ProductGrid products={initialProducts} isAdmin={isAdmin} categories={filterOptions.categories} />

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
              {t('previous')}
            </Button>
            <span className="flex items-center px-4 text-sm text-neutral-500">
              {t('pageOf', { current: currentPage, total: totalPages })}
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
              {t('next')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
