"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex justify-center items-start min-h-screen pt-20 bg-gray-50">
       <Card className="w-96 min-h-[24rem] max-h-screen flex flex-col justify-between shadow-lg">
        <form onSubmit={handleLogin} className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col space-y-4 flex-1">
            <input
              className="border p-3 rounded w-full text-base"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="border p-3 rounded w-full text-base"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <button className="bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground p-2 w-full rounded disabled:opacity-50 disabled:cursor-not-allowed">
              Login
            </button>

            <a
              href="/forgot-password"
              className="text-sm text-blue-600 text-center"
            >
              Forgot password?
            </a>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
