
-- Migrate existing participants to member
UPDATE public.cluster_enrollments SET role = 'member' WHERE role = 'participant';

-- Delete any role_permissions rows for participant
DELETE FROM public.role_permissions WHERE role = 'participant';
