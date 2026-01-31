import { NextResponse } from "next/server";
import { getCurrentUser, getSessionToken, clearSessionCookie } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Delete user (cascade will delete sessions and wishlist)
    await db.delete(users).where(eq(users.id, user.id));

    // Clear session cookie
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[Auth] Delete account error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
