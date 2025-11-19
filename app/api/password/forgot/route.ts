import { prisma } from "@/app/libs/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset?token=${resetToken}`;

    try {
      const emailRes = await resend.emails.send({
        from: "no-reply@pearlgrouphotels.com",
        to: email,
        subject: "Password Reset Request",
        html: `
          <p>Hello,</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
        `,
      });
      console.log("Resend email response:", JSON.stringify(emailRes, null, 2));
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
