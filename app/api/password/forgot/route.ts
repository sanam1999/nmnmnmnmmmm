import { prisma } from "@/app/libs/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import {ResetPasswordConfirmation} from '../../nodemiler/Nodemiler'

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { message: "Valid email is required" },
        { status: 400 }
      );
    }

    // // Only allow pearl group emails in production
    // if (!email.endsWith("@pearlgrouphotels.com")) {
    //   return NextResponse.json({ message: "Email not allowed" }, { status: 403 });
    // }

    const user = await prisma.user.findUnique({ where: { email } });

   if (!user) {
  return NextResponse.json({
    message: "invalid email",
  });
}


    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    try {
      ResetPasswordConfirmation(resetUrl,email)
    } catch (err) {
      console.error("Resend email failed:", err);
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
