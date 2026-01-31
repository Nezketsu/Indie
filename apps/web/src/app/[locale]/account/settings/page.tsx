"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Settings, ChevronLeft, User, Lock, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
    const t = useTranslations();
    const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName);
            setLastName(user.lastName);
            setEmail(user.email);
        }
    }, [user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const response = await fetch("/api/auth/update-profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: "success", text: t("account.profileUpdated") });
            } else {
                setMessage({ type: "error", text: data.error || t("account.updateError") });
            }
        } catch {
            setMessage({ type: "error", text: t("account.serverError") });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t("account.deleteConfirmation"))) {
            return;
        }

        try {
            const response = await fetch("/api/auth/delete-account", {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                await logout();
                router.push("/");
            } else {
                setMessage({ type: "error", text: data.error || t("account.deleteError") });
            }
        } catch {
            setMessage({ type: "error", text: t("account.serverError") });
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-pulse text-neutral-400">{t("common.loading")}</div>
            </div>
        );
    }

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
                    <Settings className="w-8 h-8 mx-auto mb-4 text-neutral-600" strokeWidth={1.5} />
                    <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
                        {t("account.settingsTitle")}
                    </h1>
                </div>

                <div className="max-w-2xl mx-auto space-y-12">
                    {/* Message */}
                    {message && (
                        <div
                            className={`p-4 text-sm ${message.type === "success"
                                    ? "bg-green-50 text-green-800 border border-green-200"
                                    : "bg-red-50 text-red-800 border border-red-200"
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {/* Profile Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-6">
                            <User className="w-5 h-5" strokeWidth={1.5} />
                            <h2 className="text-lg font-medium">{t("account.personalInfo")}</h2>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm text-neutral-600 mb-1">
                                        {t("auth.firstName")}
                                    </label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm text-neutral-600 mb-1">
                                        {t("auth.lastName")}
                                    </label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm text-neutral-600 mb-1">
                                    {t("auth.email")}
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    disabled
                                    className="bg-neutral-50 text-neutral-500"
                                />
                                <p className="mt-1 text-xs text-neutral-400">
                                    {t("account.emailCannotChange")}
                                </p>
                            </div>

                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? t("account.saving") : t("account.saveChanges")}
                            </Button>
                        </form>
                    </section>

                    {/* Security Section */}
                    <section className="pt-8 border-t border-neutral-200">
                        <div className="flex items-center gap-2 mb-6">
                            <Lock className="w-5 h-5" strokeWidth={1.5} />
                            <h2 className="text-lg font-medium">{t("account.security")}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-50 rounded-lg">
                                <h3 className="font-medium mb-1">{t("account.changePassword")}</h3>
                                <p className="text-sm text-neutral-500 mb-3">
                                    {t("account.changePasswordDesc")}
                                </p>
                                <Button variant="outline" size="sm" disabled>
                                    {t("common.comingSoon")}
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* Notifications Section */}
                    <section className="pt-8 border-t border-neutral-200">
                        <div className="flex items-center gap-2 mb-6">
                            <Bell className="w-5 h-5" strokeWidth={1.5} />
                            <h2 className="text-lg font-medium">{t("account.notifications")}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-50 rounded-lg">
                                <h3 className="font-medium mb-1">{t("account.notificationPrefs")}</h3>
                                <p className="text-sm text-neutral-500 mb-3">
                                    {t("account.notificationPrefsDesc")}
                                </p>
                                <Button variant="outline" size="sm" disabled>
                                    {t("common.comingSoon")}
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="pt-8 border-t border-red-200">
                        <div className="flex items-center gap-2 mb-6">
                            <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            <h2 className="text-lg font-medium text-red-600">{t("account.dangerZone")}</h2>
                        </div>

                        <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                            <h3 className="font-medium mb-1">{t("account.deleteAccount")}</h3>
                            <p className="text-sm text-neutral-600 mb-4">
                                {t("account.deleteAccountWarning")}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-600 hover:bg-red-100"
                                onClick={handleDeleteAccount}
                            >
                                {t("account.deleteAccount")}
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
