import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "Le prénom est requis")
      .max(100, "Le prénom doit faire moins de 100 caractères"),
    lastName: z
      .string()
      .min(1, "Le nom est requis")
      .max(100, "Le nom doit faire moins de 100 caractères"),
    email: z
      .string()
      .email("Adresse email invalide")
      .max(255, "L'email doit faire moins de 255 caractères"),
    password: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caractères")
      .max(100, "Le mot de passe doit faire moins de 100 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
