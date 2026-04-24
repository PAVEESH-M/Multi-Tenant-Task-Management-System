
-- Drop the overly permissive policy
DROP POLICY "Users can create organizations" ON public.organizations;

-- Create a more restrictive policy: only allow org creation if user doesn't already belong to one
CREATE POLICY "Users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_org_id(auth.uid()) IS NULL
);
