// Newsletter HTML templates. Shared structure so frontend preview matches what's sent.

export type TemplateId = 'minimal';

export interface TemplateInput {
  subject: string;
  content: string;
  senderName: string;
  footerText?: string;
}

const LOGO_URL = 'https://cxkqmlmqlndrehbuenvc.supabase.co/storage/v1/object/public/public-assets/kolektiv-logo.png';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paragraphs = (s: string) => escape(s).split(/\n{2,}/).map(p => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br/>')}</p>`).join('');

export const TEMPLATES: { id: TemplateId; name: string; description: string; render: (i: TemplateInput) => string }[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean white card, neutral type. Safe and elegant.',
    render: ({ subject, content, senderName, footerText }) => `<!doctype html><html><body style="margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;background:#fafafa;padding:32px 16px"><div style="max-width:600px;margin:0 auto"><div style="text-align:center;margin-bottom:24px"><img src="${LOGO_URL}" alt="${escape(senderName)}" width="56" height="56" style="display:inline-block;width:56px;height:56px"/></div><div style="background:#ffffff;border-radius:14px;padding:40px;border:1px solid #ececec"><h1 style="font-size:24px;font-weight:600;color:#1A1612;margin:0 0 24px;letter-spacing:-0.01em">${escape(subject)}</h1><div style="font-size:15px;color:#333;line-height:1.7">${paragraphs(content)}</div><hr style="margin:32px 0 16px;border:none;border-top:1px solid #eee"/><p style="font-size:12px;color:#999;margin:0">${escape(footerText || `Sent via ${senderName}`)}</p></div></div></body></html>`,
  },
];

export function renderTemplate(_id: TemplateId | string, input: TemplateInput): string {
  return TEMPLATES[0].render(input);
}
