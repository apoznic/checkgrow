-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Organization logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

-- Create policy for org admins to upload logos
CREATE POLICY "Org admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'org-logos' AND auth.role() = 'authenticated');

-- Create policy for org admins to update logos
CREATE POLICY "Org admins can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'org-logos' AND auth.role() = 'authenticated');

-- Create policy for org admins to delete logos  
CREATE POLICY "Org admins can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'org-logos' AND auth.role() = 'authenticated');