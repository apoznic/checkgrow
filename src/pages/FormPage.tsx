import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-form`;

/** Hosted version of an embeddable lead form: /f/:publicId. Also used inside iframes. */
export default function FormPage() {
  const { publicId } = useParams<{ publicId: string }>();

  useEffect(() => {
    if (!publicId) return;
    const script = document.createElement('script');
    script.src = `${FUNCTIONS_BASE}/${publicId}/embed.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [publicId]);

  if (!publicId || !/^frm_[a-f0-9]{24}$/.test(publicId)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">This form does not exist.</div>;
  }
  return (
    <div className="min-h-screen bg-background flex justify-center px-4 py-8">
      <div data-checkgrow-form={publicId} className="w-full max-w-[560px]" />
    </div>
  );
}
