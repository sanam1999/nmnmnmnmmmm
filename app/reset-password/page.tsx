"use client";

import dynamic from "next/dynamic";

// Disable SSR for this page
const ResetPasswordPage = dynamic(
  () => import("./ResetPasswordComponent"),
  { ssr: false }
);

export default ResetPasswordPage;
