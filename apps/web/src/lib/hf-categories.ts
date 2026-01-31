/**
 * HuggingFace Model Categories
 *
 * These are the 15 categories output by the dima806/clothes_image_detection model.
 * This file serves as the single source of truth for category mapping.
 */

// The exact labels from the HuggingFace model
export const HF_MODEL_LABELS = [
    "Blazer",
    "Coat",
    "Denim Jacket",
    "Dresses",
    "Hoodie",
    "Jacket",
    "Jeans",
    "Long Pants",
    "Polo",
    "Shirt",
    "Shorts",
    "Skirt",
    "Sports Jacket",
    "Sweater",
    "T-shirt",
] as const;

export type HFModelLabel = typeof HF_MODEL_LABELS[number];

// Slug versions (URL-friendly) matching the database
export const HF_CATEGORY_SLUGS = {
    "Blazer": "blazer",
    "Coat": "coat",
    "Denim Jacket": "denim-jacket",
    "Dresses": "dresses",
    "Hoodie": "hoodie",
    "Jacket": "jacket",
    "Jeans": "jeans",
    "Long Pants": "long-pants",
    "Polo": "polo",
    "Shirt": "shirt",
    "Shorts": "shorts",
    "Skirt": "skirt",
    "Sports Jacket": "sports-jacket",
    "Sweater": "sweater",
    "T-shirt": "t-shirt",
} as const;

export type HFCategorySlug = typeof HF_CATEGORY_SLUGS[HFModelLabel];

// Reverse mapping: slug -> display name
export const SLUG_TO_DISPLAY: Record<HFCategorySlug, HFModelLabel> = {
    "blazer": "Blazer",
    "coat": "Coat",
    "denim-jacket": "Denim Jacket",
    "dresses": "Dresses",
    "hoodie": "Hoodie",
    "jacket": "Jacket",
    "jeans": "Jeans",
    "long-pants": "Long Pants",
    "polo": "Polo",
    "shirt": "Shirt",
    "shorts": "Shorts",
    "skirt": "Skirt",
    "sports-jacket": "Sports Jacket",
    "sweater": "Sweater",
    "t-shirt": "T-shirt",
};

// Category groupings for UI filtering
export const CATEGORY_GROUPS = {
    "Tops": ["t-shirt", "polo", "shirt"] as HFCategorySlug[],
    "Sweats & Knitwear": ["hoodie", "sweater"] as HFCategorySlug[],
    "Outerwear": ["blazer", "coat", "denim-jacket", "jacket", "sports-jacket"] as HFCategorySlug[],
    "Bottoms": ["jeans", "long-pants", "shorts", "skirt"] as HFCategorySlug[],
    "Dresses": ["dresses"] as HFCategorySlug[],
} as const;

export type CategoryGroup = keyof typeof CATEGORY_GROUPS;

// Helper functions
export function getDisplayName(slug: string): string {
    return SLUG_TO_DISPLAY[slug as HFCategorySlug] || slug;
}

export function getSlug(label: string): HFCategorySlug | null {
    return HF_CATEGORY_SLUGS[label as HFModelLabel] || null;
}

export function getCategoryGroup(slug: HFCategorySlug): CategoryGroup | null {
    for (const [group, slugs] of Object.entries(CATEGORY_GROUPS)) {
        if ((slugs as readonly string[]).includes(slug)) {
            return group as CategoryGroup;
        }
    }
    return null;
}

export function getAllCategorySlugs(): HFCategorySlug[] {
    return Object.values(HF_CATEGORY_SLUGS);
}
