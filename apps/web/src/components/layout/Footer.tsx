import Link from "next/link";

const footerLinks = {
  shop: [
    { name: "New Arrivals", href: "/new-arrivals" },
    { name: "All Products", href: "/products" },
    { name: "Brands", href: "/brands" },
  ],
  categories: [
    { name: "Clothing", href: "/products?category=clothing" },
    { name: "Accessories", href: "/products?category=accessories" },
    { name: "Footwear", href: "/products?category=footwear" },
  ],
  info: [
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Privacy Policy", href: "/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 mt-24">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="font-serif text-xl tracking-tight">
              INDIEMARKET
            </Link>
            <p className="mt-4 text-sm text-neutral-500 leading-relaxed">
              Discover curated products from the best independent brands.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-medium mb-6">
              Shop
            </h3>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-medium mb-6">
              Categories
            </h3>
            <ul className="space-y-3">
              {footerLinks.categories.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-medium mb-6">
              Information
            </h3>
            <ul className="space-y-3">
              {footerLinks.info.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-neutral-200">
          <p className="text-xs text-neutral-400 text-center uppercase tracking-widest">
            &copy; {new Date().getFullYear()} IndieMarket. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
