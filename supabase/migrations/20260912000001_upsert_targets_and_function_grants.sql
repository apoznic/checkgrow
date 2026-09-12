-- Unique targets used by edge-function upserts
ALTER TABLE public.cluster_invitations
  ADD CONSTRAINT cluster_invitations_cluster_email_unique UNIQUE (cluster_id, email);
ALTER TABLE public.newsletter_contacts
  ADD CONSTRAINT newsletter_contacts_cluster_audience_email_unique UNIQUE (cluster_id, audience_id, email);

-- Helper functions only run inside RLS policies, triggers, and signed-in RPC calls.
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.deal_cluster(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.registry_cluster(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.org_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_manager(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
