"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { Search, Menu, X, User, LogIn, UserPlus, Settings, Heart, LogOut, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "./LanguageSelector";

export function Header() {
  const t = useTranslations();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const router = useRouter();

  const navigation = [
    { name: t("nav.newArrivals"), href: "/new-arrivals" as const },
    { name: t("nav.allProducts"), href: "/products" as const },
    { name: t("nav.brands"), href: "/brands" as const },
  ];

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    router.push("/");
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Mobile menu */}
          <div className="flex items-center lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-[320px] sm:max-w-[380px] p-0 pt-12">
                <SheetHeader className="border-b border-neutral-200 px-6 py-4">
                  <SheetTitle className="font-serif text-lg tracking-tight text-left">
                    INDIEMARKET
                  </SheetTitle>
                </SheetHeader>

                {/* Main navigation */}
                <nav className="flex flex-col px-6 py-6">
                  {navigation.map((item) => (
                    <SheetClose asChild key={item.name}>
                      <Link
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between py-3 text-base font-medium hover:text-neutral-600 transition-colors border-b border-neutral-100 last:border-b-0"
                      >
                        {item.name}
                        <ChevronRight className="h-4 w-4 text-neutral-400" />
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                {/* User section in mobile menu */}
                <div className="px-6 py-6 border-t border-neutral-200 mt-auto">
                  {isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="pb-3 border-b border-neutral-100">
                        <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                      <SheetClose asChild>
                        <Link
                          href="/account"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-sm hover:text-neutral-600 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          {t("header.myProfile")}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/account/wishlist"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-sm hover:text-neutral-600 transition-colors"
                        >
                          <Heart className="h-4 w-4" />
                          {t("header.myWishlist")}
                          {wishlistItems.length > 0 && (
                            <span className="ml-auto bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded-full">
                              {wishlistItems.length}
                            </span>
                          )}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/account/settings"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-sm hover:text-neutral-600 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          {t("header.settings")}
                        </Link>
                      </SheetClose>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 py-2 text-sm text-red-600 hover:text-red-700 transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("header.logout")}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SheetClose asChild>
                        <Link
                          href="/login"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 transition-colors w-full"
                        >
                          <LogIn className="h-4 w-4" />
                          {t("header.login")}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/register"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors w-full"
                        >
                          <UserPlus className="h-4 w-4" />
                          {t("header.createAccount")}
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-xs uppercase tracking-widest hover:underline underline-offset-4 transition-all"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Logo - centered */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 max-w-[140px] sm:max-w-none truncate"
          >
            <span className="font-serif text-lg sm:text-xl tracking-tight">INDIEMARKET</span>
          </Link>

          {/* Actions: Search + User + Language */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {/* Language Selector */}
            <LanguageSelector />

            {/* Wishlist - hidden on mobile, shown in mobile menu instead */}
            {isAuthenticated && (
              <Link
                href="/account/wishlist"
                className="hidden sm:flex p-1.5 sm:p-2 hover:bg-neutral-100 rounded-full transition-colors relative"
              >
                <Heart className="h-5 w-5" strokeWidth={1.5} />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                    {wishlistItems.length > 9 ? "9+" : wishlistItems.length}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu - hidden on mobile, shown in mobile menu instead */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden sm:flex p-1.5 sm:p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <User className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated && user ? (
                  <>
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        {t("header.myProfile")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/wishlist" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="h-4 w-4" />
                        {t("header.myWishlist")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        {t("header.settings")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t("header.logout")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="flex items-center gap-2 cursor-pointer">
                        <LogIn className="h-4 w-4" />
                        {t("header.login")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register" className="flex items-center gap-2 cursor-pointer">
                        <UserPlus className="h-4 w-4" />
                        {t("header.createAccount")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-serif text-xl tracking-tight">INDIEMARKET</span>
            <button onClick={() => setSearchOpen(false)}>
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-2xl px-4">
              <input
                type="search"
                placeholder={t("header.searchPlaceholder")}
                autoFocus
                className="w-full text-2xl md:text-4xl font-serif border-b border-black pb-4 bg-transparent focus:outline-none placeholder:text-neutral-300"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
