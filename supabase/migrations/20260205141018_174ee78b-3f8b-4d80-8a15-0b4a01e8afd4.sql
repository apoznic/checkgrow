-- Create service pricing table for organizations
CREATE TABLE public.cluster_service_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  estimated_hours INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, service_type)
);

-- Enable RLS
ALTER TABLE public.cluster_service_pricing ENABLE ROW LEVEL SECURITY;

-- Policies: Org members can view, admins/owners can manage
CREATE POLICY "Org members can view service pricing"
ON public.cluster_service_pricing
FOR SELECT
USING (
  public.is_org_member(cluster_id, auth.uid())
);

CREATE POLICY "Org admins can manage service pricing"
ON public.cluster_service_pricing
FOR ALL
USING (
  public.is_cluster_admin(cluster_id, auth.uid())
);

-- Insert default service types for existing clusters
INSERT INTO public.cluster_service_pricing (cluster_id, service_type, service_name, base_price, estimated_hours, description)
SELECT 
  c.id,
  unnest(ARRAY[
    'webshop',
    'website',
    'landing_page',
    'ai_agent',
    'automation',
    'mobile_app',
    'api_integration',
    'data_analytics',
    'branding',
    'seo_optimization'
  ]),
  unnest(ARRAY[
    'E-commerce Webshop',
    'Corporate Website',
    'Landing Page',
    'AI Agent / Chatbot',
    'Business Automation',
    'Mobile Application',
    'API Integration',
    'Data Analytics Dashboard',
    'Brand Identity Package',
    'SEO Optimization'
  ]),
  unnest(ARRAY[
    5000.00,
    3000.00,
    1500.00,
    4000.00,
    2500.00,
    8000.00,
    2000.00,
    3500.00,
    2500.00,
    1500.00
  ]::NUMERIC[]),
  unnest(ARRAY[
    80,
    50,
    20,
    60,
    40,
    120,
    30,
    55,
    40,
    25
  ]),
  unnest(ARRAY[
    'Full e-commerce solution with payment integration',
    'Professional multi-page website with CMS',
    'Single-page marketing or product landing',
    'Custom AI assistant or chatbot solution',
    'Workflow automation and process optimization',
    'Native or cross-platform mobile application',
    'Third-party API connections and integrations',
    'Business intelligence and reporting dashboards',
    'Logo, visual identity, and brand guidelines',
    'Search engine optimization and content strategy'
  ])
FROM public.clusters c;