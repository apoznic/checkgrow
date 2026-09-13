/**
 * Small CSV parser for lead imports. Handles quoted fields, escaped quotes,
 * CR/LF line endings, a UTF-8 BOM, and comma / semicolon / tab delimiters
 * (auto-detected from the header line).
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

const detectDelimiter = (headerLine: string): string => {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    let count = 0;
    let inQuotes = false;
    for (const ch of headerLine) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count++;
    }
    if (count > bestCount) { best = d; bestCount = count; }
  }
  return best;
};

const parseRecords = (text: string, delimiter: string): string[][] => {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { record.push(field); field = ''; continue; }
    if (ch === '\r') { continue; }
    if (ch === '\n') { record.push(field); records.push(record); record = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || record.length > 0) { record.push(field); records.push(record); }
  return records.filter(r => r.some(v => v.trim() !== ''));
};

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, '');
  const firstLineEnd = text.search(/\r?\n/);
  const headerLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(headerLine);
  const records = parseRecords(text, delimiter);
  if (records.length === 0) return { headers: [], rows: [], delimiter };
  const headers = records[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const rows = records.slice(1).map(rec => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (rec[i] ?? '').trim(); });
    return row;
  });
  return { headers, rows, delimiter };
}
