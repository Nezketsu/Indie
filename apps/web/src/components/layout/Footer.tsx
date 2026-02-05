import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

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
              {t("tagline")}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-medium mb-6">
              {t("shop")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/new-arrivals"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {tNav("newArrivals")}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {tNav("allProducts")}
                </Link>
              </li>
              <li>
                <Link
                  href="/brands"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {tNav("brands")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-medium mb-6">
              {t("categories")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/products?category=clothing"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {tNav("clothing")}
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=accessories"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {tNav("accessories")}
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=footwear"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {tNav("footwear")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xs uppercase tracking-widest font-medium mb-6">
              {t("information")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {t("aboutUs")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-neutral-500 hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  {t("privacyPolicy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-neutral-200">
          <p className="text-xs text-neutral-400 text-center uppercase tracking-widest">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
