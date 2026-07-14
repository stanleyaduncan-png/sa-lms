"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { acceptInvitation } from "@/actions/invitations";
import { btnPrimary, input, errorText } from "@/lib/ui";

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AcceptInviteClient({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = formSchema.safeParse({ name, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const result = await acceptInvitation({ token, name, password, confirmPassword });

    if (result && "error" in result) {
      setSubmitting(false);
      setError(String(result.error));
      return;
    }

    const signInResult = await signIn("credentials", {
      email: result.email,
      password,
      redirect: false,
    });
    setSubmitting(false);

    if (!signInResult || signInResult.error) {
      setError("Account created, but automatic sign-in failed. Please log in manually.");
      return;
    }

    window.location.href = "/learner";
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-navy-700">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-navy-700">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-navy-700">
        Confirm password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className={input}
        />
      </label>
      {error && <p className={errorText}>{error}</p>}
      <button type="submit" disabled={submitting} className={btnPrimary}>
        {submitting ? "Creating account..." : "Set password & continue"}
      </button>
    </form>
  );
}
