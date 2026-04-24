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
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
      <h1>Sign in</h1>
      <p>Use a magic link to access your tenant workspace.</p>

      {hasError ? <p>Unable to sign in. Please try again.</p> : null}
      {checkEmail ? <p>Check your inbox for the sign-in link.</p> : null}

      <form action={signInWithMagicLink}>
        <label htmlFor="email">Work email</label>
        <br />
        <input id="email" name="email" type="email" required />
        <br />
        <button type="submit">Send magic link</button>
      </form>

      <p style={{ marginTop: 24 }}>
        Back to <Link href="/">home</Link>.
      </p>
    </main>
  );
}
