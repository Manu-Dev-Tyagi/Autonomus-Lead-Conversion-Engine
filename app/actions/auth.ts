"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminClient } from "@/utils/supabase/admin";
import { recordAuditLog } from "@/utils/audit/log";
import { createClient } from "@/utils/supabase/server";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/auth/sign-in?error=missing_email");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/auth/sign-in?error=auth_failed");
  }

  redirect("/auth/sign-in?check_email=1");
}

export async function signUpWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email) {
    redirect("/auth/sign-up?error=missing_email");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        onboarding_pending: true,
      },
    },
  });

  if (error) {
    redirect("/auth/sign-up?error=auth_failed");
  }

  redirect("/auth/sign-up?check_email=1");
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}

export async function setActiveTenant(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!uuidRegex.test(tenantId)) {
    redirect("/?error=invalid_tenant_id");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/?error=unauthorized_tenant");
  }

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const adminClient = getAdminClient();
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...appMetadata,
      tenant_id: tenantId,
    },
  });

  if (updateError) {
    redirect("/?error=tenant_update_failed");
  }

  await recordAuditLog({
    tenantId,
    actorUserId: user.id,
    action: "tenant.claim.self_update",
    entityType: "user",
    entityId: user.id,
    metadata: { tenantId },
  });

  // Refresh session so JWT contains latest app_metadata claim.
  await supabase.auth.refreshSession();

  revalidatePath("/");
  redirect("/");
}

export async function adminSetUserActiveTenant(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!uuidRegex.test(tenantId) || !uuidRegex.test(targetUserId)) {
    redirect("/admin/tenant-claims?error=invalid_input");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  if (!actor) {
    redirect("/auth/sign-in");
  }

  const { data: actorMembership, error: actorMembershipError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", actor.id)
    .maybeSingle();

  const isAdmin =
    actorMembership?.role === "owner" || actorMembership?.role === "admin";
  if (actorMembershipError || !isAdmin) {
    redirect("/admin/tenant-claims?error=forbidden");
  }

  const { data: targetMembership, error: targetMembershipError } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetMembershipError || !targetMembership) {
    redirect("/admin/tenant-claims?error=target_not_in_tenant");
  }

  const adminClient = getAdminClient();
  const { data: targetUser, error: targetUserError } =
    await adminClient.auth.admin.getUserById(targetUserId);
  if (targetUserError || !targetUser.user) {
    redirect("/admin/tenant-claims?error=user_not_found");
  }

  const appMetadata = (targetUser.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    app_metadata: {
      ...appMetadata,
      tenant_id: tenantId,
    },
  });

  if (updateError) {
    redirect("/admin/tenant-claims?error=update_failed");
  }

  await recordAuditLog({
    tenantId,
    actorUserId: actor.id,
    action: "tenant.claim.admin_update",
    entityType: "user",
    entityId: targetUserId,
    metadata: { targetUserId, tenantId },
  });

  revalidatePath("/admin/tenant-claims");
  redirect("/admin/tenant-claims?updated=1");
}
