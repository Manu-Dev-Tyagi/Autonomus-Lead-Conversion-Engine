import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Infrastructure error: SUPABASE_SERVICE_ROLE_KEY is missing. Please contact support or set this in your .env file." },
      { status: 500 }
    );
  }

  // 1. Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check if user already has a tenant (prevent duplicate onboarding)
  const existingTenant = user.app_metadata?.tenant_id;
  if (existingTenant) {
    return NextResponse.json(
      { error: "You already have a workspace. Redirecting..." },
      { status: 409 }
    );
  }

  // 3. Parse the request body
  const body = await request.json().catch(() => ({}));
  const companyName = String(body.companyName || "").trim();
  const slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const industry = String(body.industry || "").trim();
  const companySize = String(body.companySize || "").trim();

  if (!companyName || !slug) {
    return NextResponse.json(
      { error: "Company name and workspace URL are required." },
      { status: 400 }
    );
  }

  const adminClient = getAdminClient();

  // 4. Check if slug is already taken (check both tables)
  const { data: existingTenantSlug } = await adminClient
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const { data: existingWs } = await adminClient
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingTenantSlug || existingWs) {
    return NextResponse.json(
      { error: `The workspace URL "${slug}" is already taken. Please choose another.` },
      { status: 409 }
    );
  }

  // 5. Create the tenant (now includes industry and company_size for business context)
  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .insert({
      name: companyName,
      slug,
      industry: industry || null,
      company_size: companySize || null,
      plan: "free",
      status: "active",
    })
    .select("id")
    .single();

  if (tenantError) {
    console.error("[Onboarding] Tenant creation failed:", tenantError);
    return NextResponse.json(
      { error: `Failed to create tenant: ${tenantError.message}` },
      { status: 500 }
    );
  }

  const tenantId = tenant.id;

  // 6. Create the workspace (industry & company_size live here too)
  const { data: workspace, error: wsError } = await adminClient
    .from("workspaces")
    .insert({
      tenant_id: tenantId,
      name: companyName,
      slug,
      owner_user_id: user.id,
      status: "active",
      industry: industry || null,
      company_size: companySize || null,
    })
    .select("id")
    .single();

  if (wsError) {
    console.error("[Onboarding] Workspace creation failed:", wsError);
    // Rollback: delete the tenant we just created
    await adminClient.from("tenants").delete().eq("id", tenantId);
    return NextResponse.json(
      { error: `Failed to create workspace: ${wsError.message}` },
      { status: 500 }
    );
  }

  // 7. Create the membership (user is the owner)
  const { error: memError } = await adminClient
    .from("tenant_memberships")
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      role: "owner",
    });

  if (memError) {
    console.error("[Onboarding] Membership creation failed:", memError);
    return NextResponse.json(
      { error: `Failed to create membership: ${memError.message}` },
      { status: 500 }
    );
  }

  // 8. Set the user's JWT claims (tenant_id + role)
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const { error: claimError } = await adminClient.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        ...appMetadata,
        tenant_id: tenantId,
        role: "owner",
      },
    }
  );

  if (claimError) {
    console.error("[Onboarding] Claim update failed:", claimError);
    return NextResponse.json(
      { error: `Failed to set user claims: ${claimError.message}` },
      { status: 500 }
    );
  }

  // 9. Refresh session so JWT picks up the new claims
  await supabase.auth.refreshSession();

  return NextResponse.json({
    success: true,
    tenantId,
    workspaceId: workspace.id,
    slug,
  });
}
