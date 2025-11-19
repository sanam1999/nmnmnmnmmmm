"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      console.log("🔄 Sending request to:", "/api/password/forgot");
      console.log("📧 With email:", email);

      const res = await fetch("/api/password/forgot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email })
      });

      console.log("📨 Response status:", res.status);
      console.log("📨 Response ok:", res.ok);

      // Get the raw response text first
      const responseText = await res.text();
      console.log("📨 Raw response:", responseText);

      // Check if it's HTML (starts with <!DOCTYPE)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error("Server returned HTML error page. Check if API route exists.");
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!res.ok) {
        throw new Error(data.message || `Server error: ${res.status}`);
      }
      
      setMessage(data.message);
      console.log("✅ Success:", data.message);

    } catch (error) {
      console.error("❌ Request failed:", error);
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={sendRequest} className="p-6 border rounded w-96">
        <h1 className="text-xl mb-4">Forgot Password</h1>

        <input
          type="email"
          name="email"
          className="border p-2 w-full mb-3"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button 
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground p-2 w-full rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>

        {message && (
          <p className={`mt-3 text-sm ${
            message.includes('error') || message.includes('Error') 
              ? 'text-red-600' 
              : 'text-green-600'
          }`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}