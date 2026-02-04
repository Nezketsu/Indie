"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  inStock: true,
};

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
  const t = useTranslations("filters");
  const [pendingFilters, setPendingFilters] = useState<FilterState>(activeFilters);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync pending filters when active filters change externally
  useEffect(() => {
    setPendingFilters(activeFilters);
  }, [activeFilters]);

  const handleApply = () => {
    onFilterChange(pendingFilters);
    setMobileOpen(false);
  };

  const handleClear = () => {
    setPendingFilters(defaultFilters);
  };

  const hasChanges = JSON.stringify(pendingFilters) !== JSON.stringify(activeFilters);

  const FilterContent = () => (
    <div className="space-y-8">
      {/* Categories */}
      <FilterSection title={t("category")}>
        <div className="space-y-3">
          {categories.map((cat) => (
            <label
              key={cat.slug}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={pendingFilters.categories.includes(cat.slug)}
                  onCheckedChange={(checked) => {
                    const newCategories = checked
                      ? [...pendingFilters.categories, cat.slug]
                      : pendingFilters.categories.filter((c) => c !== cat.slug);
                    setPendingFilters({ ...pendingFilters, categories: newCategories });
                  }}
                  className="rounded-none border-neutral-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <span className="text-sm group-hover:underline underline-offset-4">
                  {cat.name}
                </span>
              </div>
              {cat.count > 0 && <span className="text-xs text-neutral-400">{cat.count}</span>}
            </label>
          ))}
        </div>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Sizes */}
      {sizes.length > 0 && (
        <>
          <FilterSection title={t("size")}>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const isSelected = pendingFilters.sizes?.includes(size.value) || false;
                return (
                  <button
                    key={size.value}
                    onClick={() => {
                      const currentSizes = pendingFilters.sizes || [];
                      const newSizes = isSelected
                        ? currentSizes.filter((s) => s !== size.value)
                        : [...currentSizes, size.value];
                      setPendingFilters({ ...pendingFilters, sizes: newSizes });
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
      <FilterSection title={t("brand")}>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {brands.map((brand) => (
            <label
              key={brand.slug}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={pendingFilters.brands.includes(brand.slug)}
                  onCheckedChange={(checked) => {
                    const newBrands = checked
                      ? [...pendingFilters.brands, brand.slug]
                      : pendingFilters.brands.filter((b) => b !== brand.slug);
                    setPendingFilters({ ...pendingFilters, brands: newBrands });
                  }}
                  className="rounded-none border-neutral-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <span className="text-sm group-hover:underline underline-offset-4">
                  {brand.name}
                </span>
              </div>
              {brand.count > 0 && <span className="text-xs text-neutral-400">{brand.count}</span>}
            </label>
          ))}
        </div>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Price Range */}
      <FilterSection title={t("price")}>
        <div className="space-y-4 py-2">
          <Slider
            min={priceRange.min}
            max={priceRange.max}
            step={10}
            value={pendingFilters.priceRange}
            onValueChange={(value) =>
              setPendingFilters({
                ...pendingFilters,
                priceRange: value as [number, number],
              })
            }
            className="**:data-[slot=slider-thumb]:border-black **:data-[slot=slider-track]:bg-neutral-200 **:data-[slot=slider-range]:bg-black"
          />
          <div className="flex items-center justify-between text-sm">
            <span>{pendingFilters.priceRange[0]}&euro;</span>
            <span>{pendingFilters.priceRange[1]}&euro;</span>
          </div>
        </div>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Availability */}
      <FilterSection title={t("availability")}>
        <label className="flex items-center gap-3 cursor-pointer group">
          <Checkbox
            checked={pendingFilters.inStock}
            onCheckedChange={(checked) =>
              setPendingFilters({ ...pendingFilters, inStock: !!checked })
            }
            className="rounded-none border-neutral-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
          />
          <span className="text-sm group-hover:underline underline-offset-4">
            {t("inStockOnly")}
          </span>
        </label>
      </FilterSection>

      <Separator className="bg-neutral-200" />

      {/* Apply / Clear buttons */}
      <div className="flex flex-col gap-2 pt-4">
        <Button
          onClick={handleApply}
          className="w-full bg-black text-white hover:bg-neutral-800"
          disabled={!hasChanges}
        >
          {t("apply")}
        </Button>
        <Button
          onClick={handleClear}
          variant="outline"
          className="w-full"
        >
          {t("clearAll")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs uppercase tracking-widest">{t("title")}</h2>
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Mobile filter sheet */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              {t("title")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-widest">{t("title")}</h2>
            </div>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
