"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Locale, routing } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = {
    en: "English",
    fr: "Français",
};

const localeFlags: Record<Locale, string> = {
    en: "🇬🇧",
    fr: "🇫🇷",
};

export function LanguageSelector() {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    const handleLocaleChange = (newLocale: Locale) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors flex items-center gap-1">
                    <Globe className="h-5 w-5" strokeWidth={1.5} />
                    <span className="hidden sm:inline text-xs uppercase tracking-widest">
                        {locale}
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {routing.locales.map((loc) => (
                    <DropdownMenuItem
                        key={loc}
                        onClick={() => handleLocaleChange(loc)}
                        className={`flex items-center gap-2 cursor-pointer ${locale === loc ? "bg-neutral-100" : ""
                            }`}
                    >
                        <span>{localeFlags[loc]}</span>
                        <span>{localeLabels[loc]}</span>
                        {locale === loc && (
                            <span className="ml-auto text-xs text-neutral-500">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
