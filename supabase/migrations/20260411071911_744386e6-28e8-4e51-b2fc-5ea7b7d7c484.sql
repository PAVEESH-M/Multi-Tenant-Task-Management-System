
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

-- Create audit action enum
CREATE TYPE public.audit_action AS ENUM ('created', 'updated', 'deleted');

-- Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (links users to orgs with roles)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's org
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Organizations: users can view their own org
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (id = public.get_user_org_id(auth.uid()));

-- User roles: users can view roles in their org
CREATE POLICY "Users can view org roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

-- User roles: allow insert during registration (no org yet)
CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Tasks: users can view tasks in their org
CREATE POLICY "Users can view org tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

-- Tasks: users can create tasks in their org
CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id(auth.uid())
  AND created_by = auth.uid()
);

-- Tasks: admins can update any task, members only their own
CREATE POLICY "Users can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Tasks: admins can delete any task, members only their own
CREATE POLICY "Users can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Audit logs: users can view logs in their org
CREATE POLICY "Users can view org audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

-- Audit logs: system can insert (via authenticated users)
CREATE POLICY "Users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id(auth.uid())
  AND performed_by = auth.uid()
);

-- Organizations: allow insert for creating new orgs during registration
CREATE POLICY "Users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
