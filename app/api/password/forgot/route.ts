//app/api/password/forgot/route.ts
import { prisma } from "@/app/libs/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { message: "Valid email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success even if user doesn't exist (for security)
    if (!user) {
      return NextResponse.json({ 
        message: "If an account with that email exists, a reset link has been sent." 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires
      }
    });

    // For development, log the reset link
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset?token=${resetToken}`;
    console.log('Password reset link:', resetUrl);

    return NextResponse.json({ 
      message: "If an account with that email exists, a reset link has been sent." 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}