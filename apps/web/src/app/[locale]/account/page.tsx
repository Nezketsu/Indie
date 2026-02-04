"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, Link } from "@/i18n/navigation";
import { useEffect } from "react";
import { User, ChevronLeft, Heart, Package, Settings, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
    const t = useTranslations();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-pulse text-neutral-400">{t("common.loading")}</div>
            </div>
        );
    }

    const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : "";

    const menuItems = [
        {
            icon: Package,
            label: t("account.profile.orders"),
            description: t("account.profile.ordersDesc"),
            href: "/account/orders",
        },
        {
            icon: Heart,
            label: t("account.profile.wishlist"),
            description: t("account.profile.wishlistDesc"),
            href: "/account/wishlist",
        },
        {
            icon: Settings,
            label: t("account.profile.settings"),
            description: t("account.profile.settingsDesc"),
            href: "/account/settings",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="container mx-auto px-4 py-6">
                <Link
                    href="/products"
                    className="inline-flex items-center text-sm text-neutral-500 hover:text-black transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t("common.backToProducts")}
                </Link>
            </div>

            <div className="container mx-auto px-4 pb-24">
                {/* Title */}
                <div className="mb-12 text-center">
                    <User className="w-8 h-8 mx-auto mb-4 text-neutral-600" strokeWidth={1.5} />
                    <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
                        {t("account.profile.title")}
                    </h1>
                </div>

                <div className="max-w-2xl mx-auto">
                    {/* User Card */}
                    <div className="bg-neutral-50 rounded-xl p-6 mb-8">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-xl font-medium">
                                {initials}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                <h2 className="text-xl font-medium">
                                    {user?.firstName} {user?.lastName}
                                </h2>
                                <p className="text-neutral-500">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-4 p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
                                    <item.icon className="w-5 h-5 text-neutral-600" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium">{item.label}</h3>
                                    <p className="text-sm text-neutral-500">{item.description}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
