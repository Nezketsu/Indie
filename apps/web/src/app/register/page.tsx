"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }

    setIsSubmitting(true);

    const result = await register(formData);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Inscription échouée");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl mb-2">Créer un compte</h1>
          <p className="text-neutral-500 text-sm">
            Rejoignez la communauté IndieMarket
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-xs uppercase tracking-widest font-medium">
                Prénom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="pl-10 h-12 border-neutral-300 focus-visible:border-black focus-visible:ring-black/10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-xs uppercase tracking-widest font-medium">
                Nom
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={handleChange}
                className="h-12 border-neutral-300 focus-visible:border-black focus-visible:ring-black/10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs uppercase tracking-widest font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10 h-12 border-neutral-300 focus-visible:border-black focus-visible:ring-black/10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs uppercase tracking-widest font-medium">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 caractères"
                value={formData.password}
                onChange={handleChange}
                className="pl-10 pr-10 h-12 border-neutral-300 focus-visible:border-black focus-visible:ring-black/10"
                required
                minLength={8}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest font-medium">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmez votre mot de passe"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="pl-10 pr-10 h-12 border-neutral-300 focus-visible:border-black focus-visible:ring-black/10"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              className="rounded border-neutral-300 mt-1"
              required
            />
            <label htmlFor="terms" className="text-sm text-neutral-600">
              J'accepte les{" "}
              <Link href="/terms" className="text-black hover:underline underline-offset-4">
                conditions générales
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" className="text-black hover:underline underline-offset-4">
                politique de confidentialité
              </Link>
            </label>
          </div>

          <Button type="submit" variant="premium" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Création du compte...
              </>
            ) : (
              "Créer mon compte"
            )}
          </Button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-neutral-500">ou</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button variant="premium-outline" className="w-full" disabled>
              S'inscrire avec Google
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-neutral-600">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-black hover:underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
