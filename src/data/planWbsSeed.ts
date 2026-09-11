export interface WbsRow {
  code: string;
  task: string;
  owner: string;
  comment?: string;
  /** ISO week numbers marked with an "x" */
  weeks?: number[];
}

/** Monday of ISO week 27, 2026 = 29 June 2026 (plan starts July 2026). */
export const WEEK_START = new Date(Date.UTC(2026, 5, 29));
export const WEEK_COUNT = 35;

export interface WeekCol {
  index: number;
  iso: number;
  monthLabel: string;
  date: Date;
}

export function buildWeeks(): WeekCol[] {
  const cols: WeekCol[] = [];
  for (let i = 0; i < WEEK_COUNT; i++) {
    const d = new Date(WEEK_START.getTime() + i * 7 * 86400000);
    cols.push({
      index: i,
      iso: isoWeek(d),
      monthLabel: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      date: d,
    });
  }
  return cols;
}

export function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Simple work-breakdown structure for the MiCA (CASP) authorisation dossier. */
export const WBS_SEED: WbsRow[] = [
  { code: '1.', task: 'Structure and prerequisites', owner: '' },
  { code: '1.1', task: 'Decision on holding client assets (Art. 10 CDR 2025/305)', owner: 'Management Board', weeks: [1, 2] },
  { code: '1.2', task: 'Final ownership structure and group org chart', owner: 'Management Board, Legal/Compliance', weeks: [1, 2, 3] },
  { code: '1.3', task: 'List of crypto-assets and EMT issuers', owner: 'Legal/Compliance', weeks: [2, 3] },
  { code: '1.4', task: 'Obtaining the LEI code', owner: 'Legal/Compliance', weeks: [3, 4] },
  { code: '1.5', task: 'Request for introductory MiCA meeting with HANFA', owner: 'Management Board', weeks: [3], comment: 'Includes introductory meeting questionnaire' },

  { code: '2.', task: 'Programme of operations and financials', owner: '' },
  { code: '2.1', task: 'Three-year programme of operations (Art. 2 CDR 2025/305)', owner: 'Legal/Compliance', weeks: [5, 6, 7, 8, 9] },
  { code: '2.2', task: 'Financial projections with stress scenarios', owner: 'Analytics (+ external accounting)', weeks: [6, 7, 8, 9] },
  { code: '2.3', task: 'Prudential documentation (Art. 3)', owner: 'Analytics, Risk', weeks: [7, 8, 9] },
  { code: '2.4', task: 'Credit institution confirmation of paid-in capital', owner: 'Management Board', weeks: [9, 10] },

  { code: '3.', task: 'Introductory meeting with HANFA', owner: '' },
  { code: '3.1', task: 'Preparation of business model mapping to MiCA services', owner: 'Legal/Compliance', weeks: [9] },
  { code: '3.2', task: 'Informal introductory meeting', owner: 'Management Board, Legal/Compliance', weeks: [10], comment: 'Feedback recorded and incorporated' },

  { code: '4.', task: 'Policy packages', owner: '' },
  { code: '4.1', task: 'Governance — structure, internal controls, conflicts of interest', owner: 'Legal/Compliance', weeks: [6, 7, 8, 9, 10] },
  { code: '4.2', task: 'Suitability policy (Art. 17 of the Ordinance)', owner: 'Legal/Compliance', weeks: [8, 9] },
  { code: '4.3', task: 'Complaints handling and business continuity plan', owner: 'Legal/Compliance, Risk', weeks: [9, 10] },
  { code: '4.4', task: 'AML/CFT — ML/TF risk assessment, policies, Travel Rule', owner: 'AML officer, Legal/Compliance', weeks: [7, 8, 9, 10, 11] },
  { code: '4.5', task: 'ICT/DORA — risk framework, incidents, third-party register, testing', owner: 'IT/InfoSec lead', weeks: [7, 8, 9, 10, 11, 12], comment: 'Must describe the state at submission, not a plan' },
  { code: '4.6', task: 'Adoption of all policies by the management board', owner: 'Management Board', weeks: [12] },

  { code: '5.', task: 'Management board member files (Checklist B)', owner: '' },
  { code: '5.1', task: 'Internal suitability assessment per adopted policy', owner: 'Legal/Compliance', weeks: [11, 12] },
  { code: '5.2', task: 'Business management programme (Art. 18 of the Ordinance)', owner: 'Candidates', weeks: [11, 12, 13] },
  { code: '5.3', task: 'CVs, proof of experience, references', owner: 'Candidates', weeks: [12, 13] },
  { code: '5.4', task: 'Certificates and notarised statements', owner: 'Candidates', weeks: [13, 14], comment: 'Certificates ≤ 3 months; notarised ≤ 1 month before submission' },

  { code: '6.', task: 'QA and assembly of the dossier', owner: '' },
  { code: '6.1', task: 'Cross-consistency check of all annexes', owner: 'Legal/Compliance, Risk', weeks: [13, 14] },
  { code: '6.2', task: 'Form per Implementing Regulation (EU) 2025/306', owner: 'Legal/Compliance', weeks: [14] },
  { code: '6.3', task: 'Statement of completeness and payment of the fee', owner: 'Management Board', weeks: [14, 15] },

  { code: '7.', task: 'Submission and assessment', owner: '' },
  { code: '7.1', task: 'Submission of the application to HANFA', owner: 'Management Board', weeks: [15], comment: 'pisarnica@hanfa.hr' },
  { code: '7.2', task: 'Acknowledgement of receipt (5 working days)', owner: 'HANFA', weeks: [16] },
  { code: '7.3', task: 'Completeness check (25 working days)', owner: 'HANFA', weeks: [16, 17, 18, 19, 20] },
  { code: '7.4', task: 'Responses to requests for additional information', owner: 'Legal/Compliance', weeks: [20, 21, 22], comment: 'Each RFI suspends assessment min. 20 working days' },
  { code: '7.5', task: 'Substantive assessment (40, exceptionally 60 working days)', owner: 'HANFA', weeks: [21, 22, 23, 24, 25, 26, 27, 28] },
  { code: '7.6', task: 'Presentation of the business management programme', owner: 'Candidates', weeks: [26] },
  { code: '7.7', task: 'Decision of the Management Council', owner: 'HANFA', weeks: [30, 31], comment: 'Notification within 5 working days' },
  { code: '7.8', task: 'Submission of data for the CASP register (30 days)', owner: 'Legal/Compliance', weeks: [32, 33, 34] },
];
