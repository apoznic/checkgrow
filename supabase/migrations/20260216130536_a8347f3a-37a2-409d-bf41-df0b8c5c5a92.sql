
-- Create task_attachments table for document uploads per task
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Org members can view attachments (same access as the task)
CREATE POLICY "Org members can view task attachments"
ON public.task_attachments FOR SELECT
USING (task_id IN (
  SELECT t.id FROM crm_tasks t
  WHERE is_org_member(auth.uid(), t.cluster_id) OR is_cluster_admin(auth.uid(), t.cluster_id)
));

-- Org members can upload attachments
CREATE POLICY "Org members can create task attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (
  (uploaded_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND task_id IN (
    SELECT t.id FROM crm_tasks t
    WHERE is_org_member(auth.uid(), t.cluster_id) OR is_cluster_admin(auth.uid(), t.cluster_id)
  )
);

-- Uploaders can delete own attachments
CREATE POLICY "Users can delete own attachments"
ON public.task_attachments FOR DELETE
USING (uploaded_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
