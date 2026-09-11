export type Phase = 'work' | 'buffer' | 'event' | 'target';

export interface Milestone {
  id: string;
  period: string;
  title: string;
  body: string;
  owner: string;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'M0',
    period: 'July 2026 (weeks 3–4)',
    title: 'Decisions and prerequisites before drafting',
    body: 'Scope of holding client assets (triggers or disapplies Art. 10 CDR 2025/305), final ownership structure and group org chart, list of crypto-assets and EMT issuers, obtaining the LEI code. Request an introductory MiCA meeting with HANFA + completed introductory meeting questionnaire. Outcome: all decisions from item 4 of the checklist closed and documented.',
    owner: 'Management Board + Legal, Compliance',
  },
  {
    id: 'M1',
    period: 'August – early September',
    title: 'Core of the dossier — programme of operations and projections',
    body: 'Three-year programme of operations (Art. 2 CDR 2025/305), financial projections with stress scenarios, and prudential documentation (Art. 3), incl. credit institution confirmation of paid-in capital. The programme of operations is the reference point for all other annexes. Outcome: v1.0 of the programme of operations and projections.',
    owner: 'Legal, Compliance; Risk (+ external accounting)',
  },
  {
    id: 'M2',
    period: 'Late August / early September',
    title: 'Informal introductory meeting with HANFA',
    body: 'Business model and its mapping to MiCA services, open proportionality questions (combining control functions, outsourcing). Outcome: HANFA feedback recorded and incorporated into the documents under preparation.',
    owner: 'Management Board + Legal, Compliance',
  },
  {
    id: 'M3',
    period: 'August – September (in parallel)',
    title: 'Three parallel policy packages',
    body: '(a) Governance — organisational structure, internal controls, conflicts of interest, suitability policy (Art. 17 of the Ordinance), complaints handling, business continuity plan; (b) AML/CFT — ML/TF risk assessment, policies and procedures, appointed officer, Travel Rule; (c) ICT/DORA — ICT risk framework, incident management, register of third-party contracts, security testing. DORA readiness must exist at the moment of submission, not as a plan. Outcome: all policies adopted by the management board.',
    owner: 'Legal, Compliance, Risk; IT/InfoSec lead',
  },
  {
    id: 'M4',
    period: 'September',
    title: 'Management board member files (Checklist B)',
    body: 'Internal suitability assessment under the adopted policy, business management programme (Art. 18 of the Ordinance), CVs, proof of experience, references. Documents with validity periods (certificates ≤ 3 months; notarised questionnaire and statements ≤ 1 month) are obtained backwards from the target submission date. Outcome: a complete separate approval request per candidate.',
    owner: 'Candidates',
  },
  {
    id: 'M5',
    period: 'Second half of September – early October',
    title: 'QA and assembly of the dossier',
    body: 'Cross-consistency check (programme of operations ↔ projections ↔ prudential ↔ org charts ↔ policies), completion of the form from Implementing Regulation (EU) 2025/306, statement of completeness, truthfulness, accuracy and currency, payment of the fee. Outcome: dossier ready for submission.',
    owner: 'Legal, Compliance, Risk',
  },
  {
    id: 'M6',
    period: 'Late September / October',
    title: 'Submission of the application to HANFA',
    body: 'Submission to pisarnica@hanfa.hr (company + approvals for management board members + data on qualifying shareholders). Acknowledgement of receipt within 5 working days; completeness check within 25 working days. Responses to requests for additional information within days, not weeks.',
    owner: 'Management Board + Legal, Compliance',
  },
  {
    id: 'M7',
    period: 'November 2026 – January/February 2027',
    title: 'Substantive assessment and decision',
    body: 'Substantive assessment (40, exceptionally 60 working days from completeness), possible presentation of the business management programme before HANFA. Decision by the Management Council; notification within 5 working days. After authorisation: submission of data for the CASP register within 30 days (Arts. 6–7 of the Ordinance).',
    owner: 'Management Board + Legal, Compliance',
  },
];

export const MONTHS = ['JUL 26', 'AUG 26', 'SEP 26', 'OCT 26', 'NOV 26', 'DEC 26', 'JAN 27', 'FEB 27'];

export const GANTT: { label: string; cells: (Phase | null)[] }[] = [
  { label: 'M0 · Decisions, LEI, meeting request', cells: ['work', null, null, null, null, null, null, null] },
  { label: 'M1 · Programme, projections, prudential', cells: [null, 'work', 'buffer', null, null, null, null, null] },
  { label: 'M2 · Introductory HANFA meeting', cells: [null, null, 'event', null, null, null, null, null] },
  { label: 'M3 · Governance / AML-CFT / ICT-DORA', cells: [null, 'work', 'work', null, null, null, null, null] },
  { label: 'M4 · Board member files (Checklist B)', cells: [null, null, 'work', 'buffer', null, null, null, null] },
  { label: 'M5 · QA and dossier assembly', cells: [null, null, 'buffer', 'work', null, null, null, null] },
  { label: 'M6 · Submission of the application', cells: [null, null, null, 'event', null, null, null, null] },
  { label: 'Acknowledgement and completeness (5 + 25 wd)', cells: [null, null, null, 'work', 'work', null, null, null] },
  { label: 'Substantive assessment (40/60 wd) and RFIs', cells: [null, null, null, null, 'work', 'work', 'work', 'buffer'] },
  { label: 'Authorisation decision', cells: [null, null, null, null, null, null, 'buffer', 'target'] },
];

export const DELEGATION: { pkg: string; owner: string; support: string }[] = [
  {
    pkg: 'Programme of operations and business model description (M1)',
    owner: 'Legal/Compliance',
    support: 'Analytics (market data, target clients, volumes); Management Board (strategy)',
  },
  {
    pkg: 'Financial projections, stress scenarios and prudential documentation (M1)',
    owner: 'Analytics (+ external accounting)',
    support: 'Risk (stress scenario design); Legal/Compliance (assumptions, legal basis)',
  },
  {
    pkg: 'Governance package — controls, conflicts of interest, suitability, complaints, BCP (M3a)',
    owner: 'Legal/Compliance',
    support: 'Risk (BCP scenarios, risk maps); Management Board (adoption)',
  },
  {
    pkg: 'AML/CFT package (M3b)',
    owner: 'Legal/Compliance + appointed officer',
    support: 'AML officer (ML/TF risk assessment)',
  },
  {
    pkg: 'ICT/DORA package (M3c)',
    owner: 'IT/InfoSec lead',
    support: 'Risk (ICT risk framework); Legal/Compliance (Art. 73 MiCA, Chapter V DORA)',
  },
  {
    pkg: 'Board member files and business management programmes (M4)',
    owner: 'Candidates',
    support: 'Legal/Compliance (structure per Art. 18 of the Ordinance)',
  },
  {
    pkg: 'Communication with HANFA and meeting preparation (M2, M6–M7)',
    owner: 'Management Board + Legal/Compliance',
    support: 'F. Šaravanja — advisory, outside the regulated structure',
  },
  {
    pkg: 'QA, consistency and dossier assembly (M5)',
    owner: 'Legal/Compliance',
    support: 'All owners — final versions at the latest 2 weeks before submission',
  },
];

export const RISKS = [
  'Sequence: decisions first (M0), then the programme of operations (M1) — drafting policies before the programme is finalised creates inconsistencies that HANFA penalises with requests for additional information.',
  'Documents with validity periods (certificates ≤ 3 months; notarised questionnaire and statements ≤ 1 month) are timed backwards from the submission date — do not obtain them in August.',
  'Every request for additional information suspends the assessment for a minimum of 20 working days; the January/February 2027 target allows at most one round of RFIs. The introductory meeting (M2) is the main tool for reducing that risk.',
  'DORA documentation must describe the state as it exists at the moment of submission — the ICT risk framework, contract register and incident management must not be phrased as planned.',
  'These milestones cover the MiCA (CASP) track only; the DLT TSS track (Art. 10 DLTR) follows a separate schedule.',
];

