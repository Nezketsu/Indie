import { NextResponse } from "next/server";
import {
  getSessionToken,
  deleteSession,
  clearSessionCookie,
} from "@/lib/auth";

export async function POST() {
  try {
    const token = await getSessionToken();

    if (token) {
      await deleteSession(token);
      console.log("[Auth] Session deleted");
    }

    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      data: { message: "Déconnexion réussie" },
    });
  } catch (error) {
    console.error("[Auth Logout Error]", error);
    // Still clear the cookie even if DB deletion fails
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      data: { message: "Déconnexion réussie" },
    });
  }
}
