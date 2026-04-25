import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch workspaces where user has membership
  // In a real hexagonal app, this would be a GetUserWorkspacesUseCase
  const { data: memberships, error: memError } = await supabase
    .from("tenant_memberships")
    .select(`
      role,
      tenants (
        id,
        name,
        slug,
        workspaces (
          id,
          name,
          slug,
          status
        )
      )
    `)
    .eq("user_id", user.id);

  if (memError) {
    return NextResponse.json({ error: memError.message }, { status: 500 });
  }

  // Flatten the result to a list of workspaces
  const workspaces = (memberships ?? []).flatMap(m => {
    const tenant = (m as any).tenants;
    if (!tenant || !tenant.workspaces) return [];
    
    // If it's a 1-to-1 relation (unique constraint), Supabase might return an object instead of an array
    const wsArray = Array.isArray(tenant.workspaces) ? tenant.workspaces : [tenant.workspaces];
    
    return wsArray.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      tenantId: tenant.id,
      role: m.role
    }));
  });

  return NextResponse.json({ workspaces });
}
