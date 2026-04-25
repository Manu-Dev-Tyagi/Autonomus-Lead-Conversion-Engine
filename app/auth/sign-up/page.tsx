import Link from "next/link";
import { signUpWithMagicLink } from "@/app/actions/auth";

type SearchParams = Promise<{ error?: string; check_email?: string }>;

export default async function SignUpPage({
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
        <h1>Create your ALE account</h1>
        <p className="ale-muted">
          Get started with the Autonomous Lead Engine. We&apos;ll send you a magic link.
        </p>

        {hasError ? (
          <p style={{ color: "crimson" }}>
            Unable to create account. Please try again.
          </p>
        ) : null}
        {checkEmail ? (
          <p style={{ color: "#00875a" }}>
            ✅ Check your inbox! Click the magic link to finish setup.
          </p>
        ) : null}

        <form action={signUpWithMagicLink}>
          <label htmlFor="email">Work email</label>
          <br />
          <input
            className="ale-input"
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
          />
          <br />
          <label htmlFor="fullName">Full name</label>
          <br />
          <input
            className="ale-input"
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Jane Smith"
          />
          <br />
          <button className="ale-button" type="submit">
            Create account
          </button>
        </form>

        <p style={{ marginTop: 24 }}>
          Already have an account?{" "}
          <Link href="/auth/sign-in">Sign in</Link>.
        </p>
      </section>
    </main>
  );
}
