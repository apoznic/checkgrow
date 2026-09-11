-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all roles in their cluster" ON public.user_roles;

-- Recreate using the security definer function to avoid recursion
CREATE POLICY "Admins can view all roles in their cluster"
ON public.user_roles
FOR SELECT
USING (
  public.is_cluster_admin(auth.uid(), cluster_id)
  OR user_id = auth.uid()
);