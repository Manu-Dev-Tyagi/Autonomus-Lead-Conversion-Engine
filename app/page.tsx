import { cookies } from "next/headers";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main style={{ maxWidth: 720, margin: "48px auto", padding: 16 }}>
        <p>Sign in to view tenant todos.</p>
        <Link href="/auth/sign-in">Go to sign in</Link>
      </main>
    );
  }

  const { data: todos, error } = await supabase
    .from("todos")
    .select("id, name")
    .order("created_at", { ascending: false });

  const activeTenant = (user.app_metadata?.tenant_id as string | undefined) ?? "";

  if (error) {
    return <p>Failed to load todos.</p>;
  }

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: 16 }}>
      <h1>ALE Workspace</h1>
      <p>Signed in as: {user.email}</p>
      <p>Active tenant claim: {activeTenant || "not set"}</p>
      <p>
        Tenant claim changes are restricted to admins. Use{" "}
        <Link href="/admin/tenant-claims">tenant claim admin</Link>.
      </p>
      <p>
        Operations metrics by tenant are available at{" "}
        <Link href="/admin/operations">operations dashboard</Link>.
      </p>

      <h2>Todos</h2>
      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>

      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
