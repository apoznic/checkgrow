-- Reset permissions across the platform.
-- 1. Migrate any 'participant' enrollments to 'member' so we only keep
--    owner / admin / project_manager / member.
UPDATE public.cluster_enrollments SET role = 'member' WHERE role = 'participant';

-- 2. Wipe all custom role_permissions so every cluster falls back to the new defaults.
DELETE FROM public.role_permissions;