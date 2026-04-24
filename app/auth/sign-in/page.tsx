import Link from "next/link";

import { signInWithMagicLink } from "@/app/actions/auth";

type SearchParams = Promise<{ error?: string; check_email?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const hasError = Boolean(params.error);
  const checkEmail = params.check_email === "1";

  return (
    <main className="ale-container" style={{ maxWidth: 560 }}>
      <section className="ale-card">
        <h1>Sign in to ALE</h1>
        <p className="ale-muted">Use your work email to access your tenant workspace.</p>

        {hasError ? <p style={{ color: "crimson" }}>Unable to sign in. Please try again.</p> : null}
        {checkEmail ? <p style={{ color: "#00875a" }}>Check your inbox for the sign-in link.</p> : null}

        <form action={signInWithMagicLink}>
          <label htmlFor="email">Work email</label>
          <br />
          <input className="ale-input" id="email" name="email" type="email" required />
          <br />
          <button className="ale-button" type="submit">
            Send magic link
          </button>
        </form>

        <p style={{ marginTop: 24 }}>
          Back to <Link href="/">home</Link>.
        </p>
      </section>
    </main>
  );
}
