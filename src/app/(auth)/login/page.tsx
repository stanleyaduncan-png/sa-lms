// Placeholder login page (AUTH-01).
// Wire this up to next-auth's signIn("credentials", { email, password })
// client-side once the form/UI design is finalized.

export default function LoginPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Log in</h1>
      <p>
        Placeholder login page. Implement the credentials form here, calling
        next-auth&apos;s <code>signIn(&quot;credentials&quot;, {"{"} email, password {"}"})</code>.
      </p>
    </main>
  );
}
