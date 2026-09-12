// Mirror of supabase/functions/_shared/newsletter-templates.ts for live previews.
export type TemplateId = 'minimal';

const LOGO_URL = 'https://ai.checkgrow.com/checkgrow-logo.png';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paragraphs = (s: string) =>
  escape(s || '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

interface Input {
  subject: string;
  content: string;
  senderName: string;
}

export const NEWSLETTER_TEMPLATES: { id: TemplateId; name: string; description: string; render: (i: Input) => string }[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean white card · neutral type',
    render: ({ subject, content, senderName }) =>
      `<div style="font-family:Inter,sans-serif;background:#fafafa;padding:32px 16px"><div style="max-width:600px;margin:0 auto"><div style="text-align:center;margin-bottom:24px"><img src="${LOGO_URL}" alt="${escape(senderName)}" width="56" height="56" style="display:inline-block;width:56px;height:56px"/></div><div style="background:#fff;border-radius:14px;padding:40px;border:1px solid #ececec"><h1 style="font-size:24px;font-weight:600;color:#1A1612;margin:0 0 24px;letter-spacing:-0.01em">${escape(subject || 'Your subject here')}</h1><div style="font-size:15px;color:#333;line-height:1.7">${paragraphs(content || 'Write your message…')}</div><hr style="margin:32px 0 16px;border:none;border-top:1px solid #eee"/><p style="font-size:12px;color:#999;margin:0">Sent via ${escape(senderName)}</p></div></div></div>`,
  },
];
