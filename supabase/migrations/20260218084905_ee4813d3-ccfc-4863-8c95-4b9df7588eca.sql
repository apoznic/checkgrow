
CREATE TABLE public.deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view deal comments"
ON public.deal_comments FOR SELECT
USING (deal_id IN (
  SELECT d.id FROM crm_deals d
  WHERE is_org_member(auth.uid(), d.cluster_id) OR is_cluster_admin(auth.uid(), d.cluster_id)
));

CREATE POLICY "Org members can add deal comments"
ON public.deal_comments FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND deal_id IN (
    SELECT d.id FROM crm_deals d
    WHERE is_org_member(auth.uid(), d.cluster_id) OR is_cluster_admin(auth.uid(), d.cluster_id)
  )
);

CREATE POLICY "Authors can delete own deal comments"
ON public.deal_comments FOR DELETE
USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Org admins can delete deal comments"
ON public.deal_comments FOR DELETE
USING (deal_id IN (
  SELECT d.id FROM crm_deals d
  WHERE has_org_role(auth.uid(), d.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
));
