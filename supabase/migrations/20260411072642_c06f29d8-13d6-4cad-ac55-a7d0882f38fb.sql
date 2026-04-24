
-- Drop the restrictive policy that's blocking signups
DROP POLICY "Users can create organizations" ON public.organizations;

-- Allow any authenticated user to create an org (safe since real access control is on tasks/roles)
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (true);
