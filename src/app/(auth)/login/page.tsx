"use client";

// Login page (AUTH-01).
// No redirect-if-already-logged-in here - middleware/root page handle that.

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import AuthShell from "@/components/AuthShell";
import { btnPrimary, input, errorText, pageHeading } from "@/lib/ui";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const result = credentialsSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });
    setSubmitting(false);

    if (!res || res.error) {
      setError("Invalid email or password");
      return;
    }

    window.location.href = res.url ?? "/";
  }

  return (
    <AuthShell>
      <h1 className={pageHeading}>Log in</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-navy-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-navy-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={input}
          />
        </label>
        {error && <p className={errorText}>{error}</p>}
        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
