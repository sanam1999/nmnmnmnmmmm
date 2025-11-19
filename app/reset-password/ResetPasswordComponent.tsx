"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordComponent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage(
        "Password reset successfully! You can now login with your new password."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="p-6 border rounded w-96">
          <h1 className="text-xl mb-4">Invalid Reset Link</h1>
          <p>Please use the reset link from your email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleSubmit} className="p-6 border rounded w-96">
        <h1 className="text-xl mb-4">Reset Password</h1>

        <input
          type="password"
          name="password"
          className="border p-2 w-full mb-3"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          name="confirmPassword"
          className="border p-2 w-full mb-3"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white p-2 w-full rounded disabled:bg-blue-400"
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>

        {message && (
          <p
            className={`mt-3 ${
              message.includes("successfully") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
