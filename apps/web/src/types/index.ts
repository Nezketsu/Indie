import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  brands,
  categories,
  products,
  productVariants,
  productImages,
  productCategories,
  syncLogs,
} from "@/lib/db/schema";

// Database model types
export type Brand = InferSelectModel<typeof brands>;
export type NewBrand = InferInsertModel<typeof brands>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductVariant = InferSelectModel<typeof productVariants>;
export type NewProductVariant = InferInsertModel<typeof productVariants>;

export type ProductImage = InferSelectModel<typeof productImages>;
export type NewProductImage = InferInsertModel<typeof productImages>;

export type ProductCategory = InferSelectModel<typeof productCategories>;
export type NewProductCategory = InferInsertModel<typeof productCategories>;

export type SyncLog = InferSelectModel<typeof syncLogs>;
export type NewSyncLog = InferInsertModel<typeof syncLogs>;

// Extended types for frontend usage
export interface ProductWithRelations extends Product {
  brand: Brand;
  images: ProductImage[];
  variants: ProductVariant[];
  categories?: Category[];
}

export interface BrandWithProducts extends Brand {
  products: Product[];
  _count?: {
    products: number;
  };
}

export interface CategoryWithParent extends Category {
  parent?: Category | null;
  children?: Category[];
}

// Filter state for catalogue
export interface FilterState {
  categories: string[];
  brands: string[];
  sizes?: string[];
  priceRange: [number, number];
  tags: string[];
  inStock: boolean;
}

// API response types
export interface ProductsResponse {
  products: ProductWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    categories: { slug: string; name: string; count: number }[];
    brands: { slug: string; name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

export interface BrandsResponse {
  brands: BrandWithProducts[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Sort options
export type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
