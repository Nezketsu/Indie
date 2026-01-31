"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import type { FilterState } from "@/types";

interface FilterSidebarProps {
  categories: { slug: string; name: string; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  sizes?: { value: string; label: string; count: number }[];
  priceRange: { min: number; max: number };
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const defaultFilters: FilterState = {
  categories: [],
  brands: [],
  sizes: [],
  priceRange: [0, 1000],
  tags: [],
  inStock: false,
};

function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.categories.length > 0 ||
    filters.brands.length > 0 ||
    (filters.sizes?.length || 0) > 0 ||
    filters.tags.length > 0 ||
    filters.inStock
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-widest font-medium">{title}</h3>
      {children}
    </div>
  );
}

export function FilterSidebar({
  categories,
  brands,
  sizes = [],
  priceRange,
  activeFilters,
  onFilterChange,
}: FilterSidebarProps) {
  const FilterContent = () => (
    <div className="space-y-8">
      {/* Categories */}
      <FilterSection title="Category">
        <div className="space-y-3">
          {categories.map((cat) => (
            <label
              key={cat.slug}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={activeFilters.categories.includes(cat.slug)}
                  onCheckedChange={(checked) => {
                    const newCategories = checked
                      ? [...activeFilters.categories, cat.slug]
                      : activeFilters.categories.filter((c) => c !== cat.slug);
                    onFilterChange({ ...activeFilters, categories: newCategories });
                  }}
                  className="rounded-none border-neutral-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <span className="text-sm group-hover:underline underline-offset-4">
                  {cat.name}
                </span>
              </div>
              <span className="text-xs text-neutral-400">{cat.count}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Sizes */}
      {sizes.length > 0 && (
        <>
          <FilterSection title="Size">
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const isSelected = activeFilters.sizes?.includes(size.value) || false;
                return (
                  <button
                    key={size.value}
                    onClick={() => {
                      const currentSizes = activeFilters.sizes || [];
                      const newSizes = isSelected
                        ? currentSizes.filter((s) => s !== size.value)
                        : [...currentSizes, size.value];
                      onFilterChange({ ...activeFilters, sizes: newSizes });
                    }}
                    className={`px-3 py-1.5 text-sm border transition-colors ${isSelected
                        ? "bg-black text-white border-black"
                        : "border-neutral-300 hover:border-black"
                      }`}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <Separator className="bg-neutral-200" />
        </>
      )}

      {/* Brands */}
      <FilterSection title="Brand">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {brands.map((brand) => (
            <label
              key={brand.slug}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={activeFilters.brands.includes(brand.slug)}
                  onCheckedChange={(checked) => {
                    const newBrands = checked
                      ? [...activeFilters.brands, brand.slug]
                      : activeFilters.brands.filter((b) => b !== brand.slug);
                    onFilterChange({ ...activeFilters, brands: newBrands });
                  }}
                  className="rounded-none border-neutral-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <span className="text-sm group-hover:underline underline-offset-4">
                  {brand.name}
                </span>
              </div>
              <span className="text-xs text-neutral-400">{brand.count}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Price Range */}
      <FilterSection title="Price">
        <div className="space-y-4">
          <Slider
            min={priceRange.min}
            max={priceRange.max}
            step={10}
            value={activeFilters.priceRange}
            onValueChange={(value) =>
              onFilterChange({
                ...activeFilters,
                priceRange: value as [number, number],
              })
            }
            className="[&_[role=slider]]:bg-black [&_[role=slider]]:border-black"
          />
          <div className="flex items-center justify-between text-sm">
            <span>{activeFilters.priceRange[0]}&euro;</span>
            <span>{activeFilters.priceRange[1]}&euro;</span>
          </div>
        </div>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Availability */}
      <FilterSection title="Availability">
        <label className="flex items-center gap-3 cursor-pointer group">
          <Checkbox
            checked={activeFilters.inStock}
            onCheckedChange={(checked) =>
              onFilterChange({ ...activeFilters, inStock: !!checked })
            }
            className="rounded-none border-neutral-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
          />
          <span className="text-sm group-hover:underline underline-offset-4">
            In Stock Only
          </span>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs uppercase tracking-widest">Filters</h2>
            {hasActiveFilters(activeFilters) && (
              <button
                onClick={() => onFilterChange(defaultFilters)}
                className="text-xs underline underline-offset-4 hover:no-underline"
              >
                Clear All
              </button>
            )}
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Mobile filter sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-widest">Filters</h2>
            </div>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
