import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await request.json();
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
  }

  // 1. Verify user belongs to this tenant
  const { data: membership, error: memError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  if (memError || !membership) {
    return NextResponse.json({ error: "Access denied to tenant" }, { status: 403 });
  }

  // 2. Update user metadata with new tenantId using Admin client
  // (In Supabase, app_metadata is what RLS usually looks at)
  const admin = getAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { 
      ...user.app_metadata,
      tenant_id: tenantId 
    }
  });

  if (updateError) {
    return NextResponse.json({ error: `Failed to update tenant claim: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
