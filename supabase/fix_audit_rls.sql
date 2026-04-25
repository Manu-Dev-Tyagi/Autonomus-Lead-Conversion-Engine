-- Fix RLS for audit_logs
-- Allow authenticated users to insert audit logs if they belong to the tenant

-- 1. Policy for INSERT
DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Members can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = private.current_tenant_id()
  AND private.is_tenant_member(tenant_id)
);

-- 2. Ensure actor_user_id is set to user's UID on insert
-- This is a safety trigger to prevent spoofing the actor_user_id
CREATE OR REPLACE FUNCTION private.enforce_audit_actor()
RETURNS TRIGGER AS $$
BEGIN
  -- If not platform_admin, force current user ID
  IF NOT (private.is_platform_admin()) THEN
    NEW.actor_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_audit_actor ON public.audit_logs;
CREATE TRIGGER tr_enforce_audit_actor
BEFORE INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION private.enforce_audit_actor();
