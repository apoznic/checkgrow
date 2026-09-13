import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Public lead forms.
 *
 *   GET  /crm-form/<public_id>            form definition (JSON)
 *   GET  /crm-form/<public_id>/embed.js   script that renders the form into
 *                                         <div data-checkgrow-form="<public_id>"></div>
 *   GET  /crm-form/<public_id>/page       hosted page (link to it, or put it in an iframe)
 *   POST /crm-form/<public_id>/submit     JSON or form-encoded submission
 *
 * Submissions are validated (required fields, honeypot, minimum fill time),
 * mapped to lead fields and handed to the form's inbound webhook, so they get
 * the same contact matching, source, stage, owner and automations as any lead.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

interface Field {
  id: string; type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "hidden";
  label: string; placeholder?: string; required?: boolean; options?: string[]; map_to?: string; value?: string; width?: "full" | "half";
}
interface Settings {
  title?: string; description?: string; submit_label?: string; success_message?: string; redirect_url?: string;
  accent?: string; campaign?: string; consent_text?: string; background?: "card" | "transparent";
}
interface FormRow {
  id: string; cluster_id: string; webhook_id: string; public_id: string; name: string; enabled: boolean;
  fields: Field[]; settings: Settings;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";

const publicDefinition = (f: FormRow) => ({
  id: f.public_id,
  name: f.name,
  enabled: f.enabled,
  fields: (f.fields || []).map((x) => ({ id: x.id, type: x.type, label: x.label, placeholder: x.placeholder || "", required: !!x.required, options: x.options || [], width: x.width || "full", ...(x.type === "hidden" ? { value: x.value || "" } : {}) })),
  settings: {
    title: f.settings?.title || "", description: f.settings?.description || "", submit_label: f.settings?.submit_label || "Send",
    success_message: f.settings?.success_message || "Thanks! We'll be in touch shortly.", redirect_url: f.settings?.redirect_url || "",
    accent: f.settings?.accent || "#2A2722", consent_text: f.settings?.consent_text || "", background: f.settings?.background || "card",
  },
  issued_at: Date.now(),
});

// The embed script. Self-contained; the form definition is inlined by the server.
const embedScript = (def: ReturnType<typeof publicDefinition>, base: string) => `(function(){
var DEF=${JSON.stringify(def)};var BASE=${JSON.stringify(base)};
if(!document.getElementById('cg-form-css')){var st=document.createElement('style');st.id='cg-form-css';st.textContent=".cg-form{font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2A2722;box-sizing:border-box;max-width:560px}.cg-form *{box-sizing:border-box}.cg-form.cg-card{background:#fff;border:1px solid #E6E6E1;border-radius:16px;padding:24px}.cg-form h3{margin:0 0 4px;font-size:20px;font-weight:600}.cg-form .cg-desc{margin:0 0 16px;color:#6B6B66;font-size:14px}.cg-form .cg-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cg-form .cg-f{display:flex;flex-direction:column;gap:5px;grid-column:span 2}.cg-form .cg-f.cg-half{grid-column:span 1}@media(max-width:480px){.cg-form .cg-f.cg-half{grid-column:span 2}}.cg-form label{font-size:13px;font-weight:500}.cg-form .cg-req{color:#C0392B}.cg-form input,.cg-form select,.cg-form textarea{width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid #D9D9D3;border-radius:8px;background:#fff;color:#2A2722;outline:none}.cg-form input:focus,.cg-form select:focus,.cg-form textarea:focus{border-color:var(--cg-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cg-accent) 20%,transparent)}.cg-form textarea{min-height:96px;resize:vertical}.cg-form .cg-check{flex-direction:row;align-items:flex-start;gap:8px;font-size:13px}.cg-form .cg-check input{width:16px;height:16px;margin-top:2px}.cg-form button{grid-column:span 2;font:inherit;font-size:14px;font-weight:600;padding:11px 18px;border:0;border-radius:8px;background:var(--cg-accent);color:#fff;cursor:pointer;margin-top:4px}.cg-form button:disabled{opacity:.6;cursor:default}.cg-form .cg-err{grid-column:span 2;color:#C0392B;font-size:13px}.cg-form .cg-ok{padding:16px;border-radius:8px;background:#EAF7EE;color:#1F6B3A;font-size:14px}.cg-form .cg-consent{grid-column:span 2;font-size:12px;color:#6B6B66}.cg-form .cg-hp{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}";document.head.appendChild(st);}
function utm(){var o={};try{var q=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(function(k){var v=q.get(k);if(v)o['page_'+k]=v;});}catch(e){}return o;}
function render(el){if(el.getAttribute('data-cg-rendered'))return;el.setAttribute('data-cg-rendered','1');
var s=DEF.settings;var wrap=document.createElement('div');wrap.className='cg-form'+(s.background==='transparent'?'':' cg-card');wrap.style.setProperty('--cg-accent',s.accent||'#2A2722');
if(!DEF.enabled){wrap.innerHTML='<p class="cg-desc">This form is currently closed.</p>';el.appendChild(wrap);return;}
var h='';if(s.title)h+='<h3>'+esc(s.title)+'</h3>';if(s.description)h+='<p class="cg-desc">'+esc(s.description)+'</p>';
h+='<form class="cg-grid" novalidate>';var started=Date.now();
DEF.fields.forEach(function(f){var id='cg_'+DEF.id+'_'+f.id;var req=f.required?'<span class="cg-req"> *</span>':'';var attrs=' id="'+id+'" name="'+esc(f.id)+'"'+(f.required?' required':'')+(f.placeholder?' placeholder="'+esc(f.placeholder)+'"':'');
if(f.type==='hidden'){h+='<input type="hidden" name="'+esc(f.id)+'" value="'+esc(f.value||'')+'">';return;}
var cls='cg-f'+(f.width==='half'?' cg-half':'');
if(f.type==='checkbox'){h+='<div class="'+cls+' cg-check"><input type="checkbox"'+attrs+'><label for="'+id+'">'+esc(f.label)+req+'</label></div>';return;}
h+='<div class="'+cls+'"><label for="'+id+'">'+esc(f.label)+req+'</label>';
if(f.type==='textarea')h+='<textarea'+attrs+'></textarea>';
else if(f.type==='select'){h+='<select'+attrs+'><option value="">'+esc(f.placeholder||'Choose…')+'</option>';(f.options||[]).forEach(function(o){h+='<option value="'+esc(o)+'">'+esc(o)+'</option>';});h+='</select>';}
else h+='<input type="'+(f.type==='email'?'email':f.type==='phone'?'tel':'text')+'"'+attrs+'>';
h+='</div>';});
h+='<div class="cg-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
if(s.consent_text)h+='<p class="cg-consent">'+esc(s.consent_text)+'</p>';
h+='<div class="cg-err" hidden></div><button type="submit">'+esc(s.submit_label||'Send')+'</button></form>';
wrap.innerHTML=h;el.appendChild(wrap);
var form=wrap.querySelector('form'),err=wrap.querySelector('.cg-err'),btn=wrap.querySelector('button');
form.addEventListener('submit',function(ev){ev.preventDefault();err.hidden=true;
var data={};var missing=[];DEF.fields.forEach(function(f){var inp=form.querySelector('[name="'+f.id+'"]');if(!inp)return;var v=f.type==='checkbox'?(inp.checked?'yes':''):inp.value.trim();if(f.required&&!v)missing.push(f.label);data[f.id]=v;});
if(missing.length){err.textContent='Please fill in: '+missing.join(', ');err.hidden=false;return;}
data.website=form.querySelector('[name="website"]').value;data._started=started;data.page_url=location.href;data.page_title=document.title;data.referrer=document.referrer;Object.assign(data,utm());
btn.disabled=true;var lbl=btn.textContent;btn.textContent='Sending…';
fetch(BASE+'/'+DEF.id+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});}).then(function(res){
if(!res.ok){err.textContent=(res.j&&res.j.error)||'Something went wrong. Please try again.';err.hidden=false;btn.disabled=false;btn.textContent=lbl;return;}
if(s.redirect_url){location.href=s.redirect_url;return;}
wrap.innerHTML=(s.title?'<h3>'+esc(s.title)+'</h3>':'')+'<div class="cg-ok">'+esc(s.success_message||'Thanks!')+'</div>';
try{window.dispatchEvent(new CustomEvent('checkgrow:lead',{detail:{form:DEF.id,lead:res.j}}));}catch(e){}
}).catch(function(){err.textContent='Network error. Please try again.';err.hidden=false;btn.disabled=false;btn.textContent=lbl;});});}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function boot(){var els=document.querySelectorAll('[data-checkgrow-form="'+DEF.id+'"]');if(!els.length){var sc=document.currentScript;if(sc){var d=document.createElement('div');d.setAttribute('data-checkgrow-form',DEF.id);sc.parentNode.insertBefore(d,sc);els=[d];}}
Array.prototype.forEach.call(els,render);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();`;

const hostedPage = (f: FormRow, base: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(f.settings?.title || f.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>body{margin:0;background:#F7F7F5;font-family:Geist,-apple-system,sans-serif;display:flex;justify-content:center;padding:32px 16px}</style>
</head><body><div data-checkgrow-form="${esc(f.public_id)}" style="width:100%;max-width:560px"></div>
<script src="${base}/${esc(f.public_id)}/embed.js"></script></body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const fnIndex = parts.indexOf("crm-form");
  const publicId = parts[fnIndex + 1];
  const action = parts[fnIndex + 2] || "";
  if (!publicId || !/^frm_[a-f0-9]{24}$/.test(publicId)) return json({ error: "Unknown form" }, 404);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: form } = await admin.from("crm_forms")
    .select("id, cluster_id, webhook_id, public_id, name, enabled, fields, settings")
    .eq("public_id", publicId).maybeSingle();
  if (!form) return json({ error: "Unknown form" }, 404);
  const f = form as FormRow;
  // Public address of this function (the request URL seen inside the runtime is internal)
  const base = `${supabaseUrl}/functions/v1/crm-form`;

  if (req.method === "GET") {
    if (action === "embed.js") {
      return new Response(embedScript(publicDefinition(f), base), {
        headers: { ...cors, "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=60" },
      });
    }
    if (action === "page") {
      return new Response(hostedPage(f, base), { headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    }
    return json(publicDefinition(f), 200, { "Cache-Control": "public, max-age=60" });
  }

  if (req.method !== "POST" || action !== "submit") return json({ error: "Not found" }, 404);
  if (!f.enabled) return json({ error: "This form is closed" }, 403);

  // ---- Parse submission ----
  let data: Record<string, unknown> = {};
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) data = await req.json();
    else if (ctype.includes("multipart/form-data")) { const fd = await req.formData(); for (const [k, v] of fd.entries()) data[k] = typeof v === "string" ? v : (v as File).name; }
    else { for (const [k, v] of new URLSearchParams(await req.text()).entries()) data[k] = v; }
  } catch { return json({ error: "Could not read the submission" }, 400); }

  // ---- Spam checks ----
  if (typeof data.website === "string" && data.website.trim()) return json({ ok: true, ignored: true });
  const started = Number(data._started);
  if (Number.isFinite(started) && Date.now() - started < 1500) return json({ ok: true, ignored: true });

  // ---- Validate and map fields ----
  const payload: Record<string, unknown> = {};
  const missing: string[] = [];
  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
  for (const field of f.fields || []) {
    const raw = field.type === "hidden" ? (field.value ?? data[field.id] ?? "") : data[field.id];
    const value = str(raw);
    if (field.required && !value) missing.push(field.label);
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return json({ error: `"${field.label}" must be a valid email address` }, 422);
    if (field.type === "select" && value && field.options?.length && !field.options.includes(value)) return json({ error: `"${field.label}" has an invalid choice` }, 422);
    const key = field.map_to && field.map_to !== "custom" ? field.map_to : slug(field.label);
    if (value) payload[key] = value;
  }
  if (missing.length) return json({ error: `Please fill in: ${missing.join(", ")}` }, 422);
  if (!payload.name && (payload.first_name || payload.last_name)) payload.name = [payload.first_name, payload.last_name].filter(Boolean).join(" ");
  if (!payload.name && !payload.email && !payload.phone && !payload.company) return json({ error: "Please tell us who you are" }, 422);

  // Context from the page (never overrides the form's own source label)
  payload.form_name = f.name;
  if (f.settings?.campaign) payload.campaign = f.settings.campaign;
  for (const k of ["page_url", "page_title", "referrer", "page_utm_source", "page_utm_medium", "page_utm_campaign", "page_utm_term", "page_utm_content", "page_gclid", "page_fbclid"]) {
    const v = str(data[k]); if (v) payload[k] = v.slice(0, 500);
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) payload.ip = ip;
  const ua = req.headers.get("user-agent"); if (ua) payload.user_agent = ua.slice(0, 200);
  payload.external_id = `form:${f.public_id}:${crypto.randomUUID()}`;

  // ---- Hand to the form's inbound webhook (same pipeline as every other lead) ----
  const { data: hook } = await admin.from("crm_webhooks").select("token, signing_secret, enabled").eq("id", f.webhook_id).maybeSingle();
  if (!hook) return json({ error: "This form is not connected to the CRM" }, 500);
  if (!hook.enabled) return json({ error: "This form is paused" }, 403);
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-webhook-token": hook.token };
  if (hook.signing_secret) headers["x-webhook-secret"] = hook.signing_secret;
  const res = await fetch(`${supabaseUrl}/functions/v1/crm-lead-webhook`, { method: "POST", headers, body: JSON.stringify(payload) });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: result?.error || "Could not save the lead" }, 502);
  await admin.rpc("bump_form_counter", { _form_id: f.id });
  return json({ ok: true, lead_id: result.deal_id ?? null });
});
