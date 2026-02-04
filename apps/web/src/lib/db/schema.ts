import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  bigint,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Brands table
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    description: text("description"),
    logoUrl: varchar("logo_url", { length: 500 }),
    websiteUrl: varchar("website_url", { length: 500 }).notNull(),
    shopifyDomain: varchar("shopify_domain", { length: 255 }).unique().notNull(),
    country: varchar("country", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
  },
  (table) => [
    index("idx_brands_slug").on(table.slug),
  ]
);

// Categories table
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    parentId: uuid("parent_id"), // Self-reference will be handled via relations
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_categories_slug").on(table.slug),
    index("idx_categories_parent_id").on(table.parentId),
  ]
);

// Products table
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    shopifyId: bigint("shopify_id", { mode: "number" }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    description: text("description"),
    productType: varchar("product_type", { length: 255 }),
    vendor: varchar("vendor", { length: 255 }),
    tags: text("tags").array(),
    priceMin: decimal("price_min", { precision: 10, scale: 2 }),
    priceMax: decimal("price_max", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("EUR"),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    isAvailable: boolean("is_available").default(true),
    isNew: boolean("is_new").default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_products_brand_id").on(table.brandId),
    index("idx_products_product_type").on(table.productType),
    index("idx_products_price").on(table.priceMin, table.priceMax),
    index("idx_products_slug").on(table.slug),
    index("idx_products_is_new").on(table.isNew),
    unique("products_brand_shopify_unique").on(table.brandId, table.shopifyId),
  ]
);

// Product variants table
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    shopifyId: bigint("shopify_id", { mode: "number" }).notNull(),
    title: varchar("title", { length: 255 }),
    sku: varchar("sku", { length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    inventoryQuantity: integer("inventory_quantity"),
    option1: varchar("option1", { length: 255 }),
    option2: varchar("option2", { length: 255 }),
    option3: varchar("option3", { length: 255 }),
    isAvailable: boolean("is_available").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_product_variants_product_id").on(table.productId),
  ]
);

// Product images table
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    shopifyId: bigint("shopify_id", { mode: "number" }),
    src: varchar("src", { length: 1000 }).notNull(),
    altText: varchar("alt_text", { length: 500 }),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_product_images_product_id").on(table.productId),
  ]
);

// Product categories (many-to-many)
export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
  ]
);

// Sync logs table
export const syncLogs = pgTable(
  "sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id").references(() => brands.id),
    status: varchar("status", { length: 50 }).notNull(), // 'pending', 'running', 'completed', 'failed'
    productsFound: integer("products_found").default(0),
    productsCreated: integer("products_created").default(0),
    productsUpdated: integer("products_updated").default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_sync_logs_brand_id").on(table.brandId),
    index("idx_sync_logs_status").on(table.status),
  ]
);

// Relations
export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
  syncLogs: many(syncLogs),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  variants: many(productVariants),
  images: many(productImages),
  productCategories: many(productCategories),
  wishlist: many(wishlist),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  brand: one(brands, {
    fields: [syncLogs.brandId],
    references: [brands.id],
  }),
}));

// Users table for authentication
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    role: varchar("role", { length: 20 }).default("user").notNull(), // "admin" | "user"
    emailVerified: boolean("email_verified").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
  ]
);

// Sessions table for session management
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).unique().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    userAgent: varchar("user_agent", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 45 }),
  },
  (table) => [
    index("idx_sessions_token").on(table.token),
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ]
);

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  wishlist: many(wishlist),
}));

// Sessions relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Wishlist table
export const wishlist = pgTable(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_wishlist_user_id").on(table.userId),
    index("idx_wishlist_product_id").on(table.productId),
    unique("wishlist_user_product_unique").on(table.userId, table.productId),
  ]
);

// Wishlist relations
export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, {
    fields: [wishlist.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlist.productId],
    references: [products.id],
  }),
}));


