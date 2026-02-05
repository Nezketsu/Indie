// Product categorization - Simplified global categories
// Comprehensive keyword matching for streetwear/fashion items

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    // === TOPS (T-shirts, Polos, Shirts, Thermals) ===
    "Tops": [
        // T-shirts
        "t-shirt", "tee", "tshirt", "t shirt", "t-shirts",
        "tank top", "tank", "tanktop", "muscle tee", "sleeveless tee",
        "graphic tee", "printed tee", "oversized tee", "boxy tee",
        "cropped tee", "crop tee", "baby tee",
        "tech tee", "tech t-shirt", "sport tee", "athletic tee", "jersey tee",
        "longsleeve", "long sleeve", "long-sleeve", "ls tee",
        "thermal", "waffle",
        // Polos
        "polo", "polos", "polo shirt", "polo tee",
        "golf shirt", "tennis shirt", "pique polo",
        // Shirts
        "shirt", "button up", "button-up", "button down", "button-down",
        "flannel", "oxford", "dress shirt", "casual shirt",
        "camp shirt", "camp collar", "bowling shirt",
        "work shirt", "utility shirt", "overshirt", "over shirt",
        "hawaiian shirt", "cuban shirt", "resort shirt",
        "denim shirt", "chambray",
    ],

    // === HOODIES & SWEATS (Hoodies, Crewnecks, Zip-ups, Fleece) ===
    "Hoodies & Sweats": [
        // Hoodies
        "hoodie", "hoodies", "hooded", "hood",
        "pullover hoodie", "zip hoodie", "zipup hoodie",
        // Sweatshirts/Crewnecks
        "sweatshirt", "sweat shirt",
        "crewneck", "crew neck", "crew-neck", "crewnecks",
        "pullover", "fleece pullover",
        "overlogo", "straight zip", "raglan",
        // Zip-ups
        "zip up", "zipup", "zip-up", "zip",
        "half zip", "halfzip", "half-zip", "1/4 zip", "quarter zip",
        "full zip", "fullzip",
        // Fleece
        "fleece", "polar", "polar fleece", "sherpa", "teddy",
        "borg", "faux fur",
    ],

    // === KNITWEAR (Sweaters, Knits, Cardigans) ===
    "Knitwear": [
        "knit", "knits", "knitwear", "knitted",
        "sweater", "sweaters",
        "cardigan", "cardi",
        "pullover knit", "cable knit", "chunky knit",
        "mohair", "cashmere", "merino", "wool", "whool",
        "balaclava", "ski mask",
        "turtleneck", "turtle neck", "roll neck", "mock neck",
        "v-neck sweater", "v neck sweater",
    ],

    // === JACKETS & COATS ===
    "Jackets & Coats": [
        // Jackets
        "jacket", "jackets", "jkt",
        "bomber", "bomber jacket", "ma-1", "ma1",
        "varsity", "varsity jacket", "letterman",
        "denim jacket", "jean jacket", "trucker jacket",
        "coach jacket", "coaches jacket",
        "track jacket", "tracksuit jacket", "track top",
        "harrington", "harrington jacket",
        "work jacket", "chore jacket", "workwear jacket",
        "canvas jacket", "canvas work",
        "utility jacket", "field jacket", "military jacket",
        "racing jacket", "moto jacket", "motorcycle jacket",
        "leather jacket", "suede jacket",
        "overshirt jacket", "shirt jacket", "shacket",
        // Outerwear
        "windbreaker", "wind breaker", "windcheater",
        "parka", "anorak",
        "puffer", "puffer jacket", "down jacket", "quilted jacket",
        "coat", "overcoat", "topcoat", "trench", "trench coat",
        "peacoat", "pea coat",
        "raincoat", "rain jacket",
        // Vests
        "vest", "gilet", "bodywarmer", "body warmer",
        // Tech outerwear
        "tech jacket",
        "shell", "soft shell", "softshell", "hard shell",
        "gore-tex", "goretex", "waterproof",
    ],

    // === PANTS (All bottoms except shorts) ===
    "Pants": [
        // Basic terms
        "pants", "pant", "trousers", "trouser", "bottoms",
        // Casual pants
        "chinos", "chino", "khakis", "khaki",
        "cargo", "cargo pants", "cargo pant", "cargos",
        "jogger", "joggers", "jogger pants", "jog pant", "jogging",
        "sweatpants", "sweat pants", "sweatpant",
        "track pants", "trackpants", "track pant",
        "lounge pants", "lounge pant",
        // Workwear
        "work pants", "work pant", "carpenter", "carpenter pants",
        "utility pants", "utility pant",
        "twill pants", "twill pant", "twill work",
        // Tailored
        "dress pants", "dress pant", "slacks",
        "pleated pants", "pleated pant",
        "wide leg", "wide-leg", "baggy pants",
        "straight leg", "straight-leg",
        "tapered", "slim pants", "skinny pants",
        // Other
        "corduroy pants", "cord pants", "cords",
        "fatigue pants", "fatigues",
        // Jeans & Denim
        "jeans", "jean", "denim",
        "denim pants", "denim pant", "denim trousers",
        "skinny jeans", "slim jeans", "straight jeans",
        "relaxed jeans", "loose jeans", "baggy jeans",
        "bootcut", "boot cut", "flare jeans", "wide leg jeans",
        "tapered jeans", "carrot jeans",
        "mom jeans", "dad jeans", "boyfriend jeans",
        "raw denim", "selvedge", "selvage",
        "washed denim", "stonewash", "acid wash",
        "distressed jeans", "ripped jeans",
    ],

    // === SHORTS ===
    "Shorts": [
        "shorts", "short", "shortpants",
        "jort", "jorts", "denim jort",
        "swim shorts", "swim trunk", "swim trunks", "boardshorts", "board shorts",
        "athletic shorts", "sport shorts", "running shorts", "gym shorts",
        "basketball shorts", "mesh shorts",
        "cargo shorts", "chino shorts",
        "sweat shorts", "sweatshorts", "fleece shorts",
        "denim shorts", "jean shorts", "cutoffs", "cut-offs",
        "bermuda", "bermudas",
    ],

    // === FOOTWEAR (All shoes) ===
    "Footwear": [
        // Sneakers
        "sneaker", "sneakers",
        "trainer", "trainers",
        "running shoe", "running shoes",
        "basketball shoe", "basketball shoes",
        "skate shoe", "skate shoes", "skating shoe",
        "tennis shoe", "tennis shoes",
        "athletic shoe", "athletic shoes",
        "sport shoe", "sport shoes",
        "high top", "high-top", "hi-top",
        "low top", "low-top",
        "retro shoe",
        // Boots
        "boot", "boots",
        "chelsea", "chelsea boot",
        "combat boot", "combat boots",
        "work boot", "work boots",
        "hiking boot", "hiking boots",
        "ankle boot", "ankle boots",
        "desert boot", "chukka",
        "lace-up boot", "lace up boot",
        // Sandals & Slides
        "sandal", "sandals",
        "slide", "slides",
        "flip flop", "flip flops", "flip-flop",
        "slipper", "slippers",
        "mule", "mules",
        // Shoes
        "loafer", "loafers",
        "derby", "derbies",
        "oxford shoe", "oxfords",
        "brogue", "brogues",
        "monk strap",
        "boat shoe", "boat shoes",
        "moccasin", "moccasins",
        "espadrille", "espadrilles",
        "clog", "clogs",
    ],

    // === ACCESSORIES (Bags, Hats, Jewelry, Belts, etc.) ===
    "Accessories": [
        // Bags
        "bag", "bags",
        "backpack", "back pack", "rucksack",
        "tote", "tote bag", "shopper",
        "duffel", "duffle", "gym bag", "sports bag",
        "messenger", "messenger bag",
        "crossbody", "cross body", "cross-body", "sling bag",
        "waist bag", "fanny pack", "belt bag", "bum bag",
        "pouch", "clutch",
        "satchel",
        "shoulder bag",
        "weekender",
        "laptop bag", "briefcase",
        "drawstring bag",
        // Hats & Caps
        "hat", "hats",
        "cap", "caps",
        "beanie", "beanies", "knit cap",
        "bucket hat", "bucket",
        "snapback", "snap back",
        "trucker", "trucker hat", "trucker cap",
        "dad hat", "dad cap",
        "fitted cap", "fitted hat",
        "5 panel", "5-panel", "five panel",
        "6 panel", "6-panel", "six panel",
        "visor",
        "beret",
        "fedora",
        // Socks
        "sock", "socks",
        "ankle socks", "crew socks", "no show socks",
        "sport socks", "athletic socks",
        "dress socks",
        "sock pack", "socks pack", "tripack",
        // Jewelry
        "necklace", "necklaces", "chain", "chains",
        "pendant", "pendants",
        "bracelet", "bracelets",
        "ring", "rings", "signet",
        "earring", "earrings", "ear ring",
        "choker",
        "anklet",
        "dog tag", "dog-tag", "dogtag",
        "cuff",
        // Belts
        "belt", "belts",
        "leather belt", "canvas belt", "woven belt",
        "web belt", "webbing belt",
        "d-ring belt", "mechanik",
        // Wallets
        "wallet", "wallets",
        "card holder", "cardholder", "card case",
        "money clip",
        "coin purse",
        "billfold",
        // Sunglasses & Eyewear
        "sunglasses", "sunglass", "sun glasses",
        "glasses", "eyeglasses",
        "eyewear", "eye wear",
        "shades",
        "aviator", "wayfarers",
        "goggles",
        // Scarves & Gloves
        "scarf", "scarves", "scarfs",
        "bandana", "bandanas",
        "neck warmer", "neckwarmer", "neck gaiter",
        "glove", "gloves",
        "mittens", "mitts",
        // Watches
        "watch", "watches",
        "timepiece",
        "wristwatch",
    ],

    // === LIFESTYLE (Objects, Home, etc.) ===
    "Lifestyle": [
        // Home/lifestyle items
        "towel", "beach towel",
        "blanket", "throw",
        "pillow", "cushion",
        "flask", "bottle", "water bottle", "thermo",
        "mug", "cup",
        "candle",
        "poster", "print", "art print",
        "sticker", "stickers", "sticker pack",
        "keychain", "key chain", "keyring",
        "enamel pin", "pin set", "pin pack", "lapel pin",
        "patch", "patches",
        "lighter",
        "ashtray",
        // Sports
        "ball", "football", "foot-ball", "basketball", "soccer ball",
        "skateboard", "deck",
        "frisbee",
        // Plants/decor
        "plant", "amaryllis", "roots",
        "muzzle",
    ],

    // === SPECIAL ===
    "Packs & Boxes": [
        "lucky box", "mystery box", "surprise box",
        "pack x", "bundle", "pack",
    ],
};

// Words that should NOT trigger certain categories (exclusions)
const CATEGORY_EXCLUSIONS: Record<string, string[]> = {
    "Accessories": ["chain link", "stormchaser", "windchaser", "chainsaw"],
    "Tops": ["hoodie", "jacket", "pants", "shorts", "coat", "sweatshirt", "fleece"],
    "Hoodies & Sweats": ["jacket", "coat", "parka", "vest", "gilet"],
    "Knitwear": ["jacket", "coat"],
    "Jackets & Coats": ["coat-of-arms"],
    "Shorts": ["longsleeve", "long sleeve", "shortcut"],
};

// Category groups for broader categorization (for filtering UI)
const CATEGORY_GROUPS: Record<string, string[]> = {
    "Clothing": [
        "Tops", "Hoodies & Sweats", "Knitwear", "Jackets & Coats",
        "Pants", "Shorts", "Packs & Boxes"
    ],
    "Footwear": [
        "Footwear"
    ],
    "Accessories": [
        "Accessories"
    ],
    "Lifestyle": [
        "Lifestyle"
    ],
};

// Priority order - higher priority categories are checked first
const CATEGORY_PRIORITY: string[] = [
    // Special items first
    "Packs & Boxes",
    "Lifestyle",

    // Specific before generic
    "Knitwear",          // mohair, knit before hoodie/sweater confusion
    "Shorts",            // Before pants (more specific)

    // Main clothing
    "Hoodies & Sweats",  // Combined category
    "Tops",
    "Jackets & Coats",
    "Pants",

    // Other
    "Footwear",
    "Accessories",
];

export interface CategoryResult {
    productType: string;      // Specific category (e.g., "Tops")
    categoryGroup: string;    // Broader category (e.g., "Clothing")
    confidence: "high" | "medium" | "low";
}

function checkExclusions(text: string, category: string): boolean {
    const exclusions = CATEGORY_EXCLUSIONS[category];
    if (!exclusions) return false;

    return exclusions.some(exclusion => text.includes(exclusion.toLowerCase()));
}

/**
 * Categorize a product based on its title and description
 */
export function categorizeProduct(
    title: string,
    description?: string | null
): CategoryResult {
    const titleLower = title.toLowerCase();
    const textToAnalyze = `${title} ${description || ""}`.toLowerCase();

    // Check categories in priority order
    for (const category of CATEGORY_PRIORITY) {
        const keywords = CATEGORY_KEYWORDS[category];
        if (!keywords) continue;

        // Check if any exclusion applies
        if (checkExclusions(titleLower, category)) {
            continue;
        }

        // Check for keyword matches in title (higher confidence)
        for (const keyword of keywords) {
            if (titleLower.includes(keyword.toLowerCase())) {
                // Find which group this category belongs to
                let group = "Other";
                for (const [groupName, categories] of Object.entries(CATEGORY_GROUPS)) {
                    if (categories.includes(category)) {
                        group = groupName;
                        break;
                    }
                }

                return {
                    productType: category,
                    categoryGroup: group,
                    confidence: "high",
                };
            }
        }
    }

    // Second pass: check description (lower confidence)
    for (const category of CATEGORY_PRIORITY) {
        const keywords = CATEGORY_KEYWORDS[category];
        if (!keywords) continue;

        if (checkExclusions(textToAnalyze, category)) {
            continue;
        }

        for (const keyword of keywords) {
            if (textToAnalyze.includes(keyword.toLowerCase())) {
                let group = "Other";
                for (const [groupName, categories] of Object.entries(CATEGORY_GROUPS)) {
                    if (categories.includes(category)) {
                        group = groupName;
                        break;
                    }
                }

                return {
                    productType: category,
                    categoryGroup: group,
                    confidence: "medium",
                };
            }
        }
    }

    // Default to "Other" in Clothing group
    return {
        productType: "Other",
        categoryGroup: "Clothing",
        confidence: "low",
    };
}

/**
 * Batch categorize multiple products
 */
export function categorizeProducts(
    products: Array<{ id: string; title: string; description?: string | null }>
): Map<string, CategoryResult> {
    const results = new Map<string, CategoryResult>();

    for (const product of products) {
        results.set(product.id, categorizeProduct(product.title, product.description));
    }

    return results;
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
    return Object.keys(CATEGORY_KEYWORDS);
}

/**
 * Get all category groups
 */
export function getCategoryGroups(): Record<string, string[]> {
    return CATEGORY_GROUPS;
}
