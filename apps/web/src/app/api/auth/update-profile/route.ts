import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "Prénom et nom requis" },
        { status: 400 }
      );
    }

    if (firstName.length < 1 || firstName.length > 100) {
      return NextResponse.json(
        { success: false, error: "Le prénom doit contenir entre 1 et 100 caractères" },
        { status: 400 }
      );
    }

    if (lastName.length < 1 || lastName.length > 100) {
      return NextResponse.json(
        { success: false, error: "Le nom doit contenir entre 1 et 100 caractères" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
    });
  } catch (error) {
    console.error("[Auth] Update profile error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
