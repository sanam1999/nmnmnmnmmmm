import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER, 
    pass: process.env.NODEMAILER_PASS,
  },
});

export const ResetPasswordConfirmation = async (resetUrl: string, email: string ): Promise<void> => {

  try {
     const info = await transporter.sendMail({
      from: `"Pearl Group Hotels" <no-reply@pearlgrouphotels.com>`,
      to: email,
      subject: "Password Reset Request",
      text: "If you did not request this, please ignore this email.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Reset your password</h2>
          <p>Need to reset your password? No problem! Just click the button below and you'll be on your way. If you did not make this request, please ignore this email.</p>
          <a href="${resetUrl}" target="_blank" style="
            display: inline-block;
            padding: 12px 24px;
            margin-top: 20px;
            font-size: 16px;
            color: #ffffff;
            background-color: #093582ff;
            text-decoration: none;
            border-radius: 4px;
          ">Reset your password</a>
          <p style="margin-top: 20px;">This link will expire in 1 hour.</p>
        </div>
      `,
    });

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("Email error:", error);
  }
};

