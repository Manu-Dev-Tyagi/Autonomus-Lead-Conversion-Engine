-- Fix Schema Permissions for private schema
-- RLS policies often refer to private.current_tenant_id() etc.
-- These roles need usage/execute permissions.

GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- Grant execute on all functions in private schema (current and future)
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT EXECUTE ON FUNCTIONS TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, anon, service_role;

-- Specifically ensure these helper functions are executable
GRANT EXECUTE ON FUNCTION private.current_tenant_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_tenant_member(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated, anon, service_role;
