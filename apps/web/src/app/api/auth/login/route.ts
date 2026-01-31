import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import {
  findUserByEmail,
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation échouée",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Email ou mot de passe incorrect",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Email ou mot de passe incorrect",
        },
        { status: 401 }
      );
    }

    // Create session
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      undefined;

    const token = await createSession(user.id, userAgent, ipAddress);
    await setSessionCookie(token);

    console.log(`[Auth] User logged in: ${email}`);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("[Auth Login Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connexion échouée",
      },
      { status: 500 }
    );
  }
}
