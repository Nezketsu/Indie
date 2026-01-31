"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, ChevronLeft, User, Lock, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
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
        setMessage({ type: "success", text: "Profil mis à jour avec succès" });
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors de la mise à jour" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur serveur" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
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
        setMessage({ type: "error", text: data.error || "Erreur lors de la suppression" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur serveur" });
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Chargement...</div>
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
          Retour aux produits
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-24">
        {/* Title */}
        <div className="mb-12 text-center">
          <Settings className="w-8 h-8 mx-auto mb-4 text-neutral-600" strokeWidth={1.5} />
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
            Paramètres
          </h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-12">
          {/* Message */}
          {message && (
            <div
              className={`p-4 text-sm ${
                message.type === "success"
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
              <h2 className="text-lg font-medium">Informations personnelles</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm text-neutral-600 mb-1">
                    Prénom
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
                    Nom
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
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-neutral-50 text-neutral-500"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  L'email ne peut pas être modifié
                </p>
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </form>
          </section>

          {/* Security Section */}
          <section className="pt-8 border-t border-neutral-200">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5" strokeWidth={1.5} />
              <h2 className="text-lg font-medium">Sécurité</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h3 className="font-medium mb-1">Modifier le mot de passe</h3>
                <p className="text-sm text-neutral-500 mb-3">
                  Nous vous enverrons un email pour réinitialiser votre mot de passe
                </p>
                <Button variant="outline" size="sm" disabled>
                  Bientôt disponible
                </Button>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="pt-8 border-t border-neutral-200">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <h2 className="text-lg font-medium">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h3 className="font-medium mb-1">Préférences de notification</h3>
                <p className="text-sm text-neutral-500 mb-3">
                  Gérez vos préférences d'emails et notifications
                </p>
                <Button variant="outline" size="sm" disabled>
                  Bientôt disponible
                </Button>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="pt-8 border-t border-red-200">
            <div className="flex items-center gap-2 mb-6">
              <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              <h2 className="text-lg font-medium text-red-600">Zone de danger</h2>
            </div>

            <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
              <h3 className="font-medium mb-1">Supprimer mon compte</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Cette action est irréversible. Toutes vos données seront supprimées définitivement,
                y compris votre liste d'envies et vos informations personnelles.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-100"
                onClick={handleDeleteAccount}
              >
                Supprimer mon compte
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
