import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminSetUserActiveTenant } from "@/app/actions/auth";
import { createClient } from "@/utils/supabase/server";

type SearchParams = Promise<{ error?: string; updated?: string }>;

const errorMessage: Record<string, string> = {
  invalid_input: "Invalid tenant or user ID.",
  forbidden: "You must be tenant admin/owner for this action.",
  target_not_in_tenant: "Target user is not a member of that tenant.",
  user_not_found: "Target user does not exist.",
  update_failed: "Failed to update user metadata.",
};

export default async function TenantClaimsAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: 16 }}>
      <h1>Tenant Claim Admin</h1>
      <p>
        Set <code>app_metadata.tenant_id</code> for a user. This page enforces tenant
        owner/admin checks.
      </p>

      {params.error ? <p>{errorMessage[params.error] ?? "Unknown error."}</p> : null}
      {params.updated === "1" ? <p>Claim updated successfully.</p> : null}

      <form action={adminSetUserActiveTenant}>
        <label htmlFor="tenantId">Tenant ID (UUID)</label>
        <br />
        <input id="tenantId" name="tenantId" required />
        <br />
        <label htmlFor="targetUserId">Target User ID (UUID)</label>
        <br />
        <input id="targetUserId" name="targetUserId" required />
        <br />
        <button type="submit">Set active tenant claim</button>
      </form>

      <p style={{ marginTop: 24 }}>
        Back to <Link href="/">workspace</Link>.
      </p>
    </main>
  );
}
