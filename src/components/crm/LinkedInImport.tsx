import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Linkedin, X, Loader2, UserPlus, Check, Link2, ExternalLink,
  Building, Briefcase, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';
import { GlassInput } from '@/components/GlassCard';
import { ContactType } from './types';
import { Badge } from '@/components/ui/badge';

interface LinkedInImportProps {
  clusterId: string;
  profileId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedContact {
  name: string;
  linkedinUrl?: string;
  headline?: string;
  position?: string;
  company?: string;
  selected: boolean;
}

type ImportMode = 'paste' | 'url';

// Improved parser that extracts name, position, and company from LinkedIn search results
function parseLinkedInSearchResults(rawText: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  const seenNames = new Set<string>();

  // Clean up the text
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Skip patterns for UI elements we should ignore
  const skipPatterns = [
    /^(View|Follow|Connect|Message|Pending|More|See all|Show more|People also viewed|Promoted|Messaging|Notifications|Home|My Network|Jobs|Search|LinkedIn|Results|People|All filters|Connections|Locations|Current compan|Past company|Industry|School|Service categories|Keywords|About|Accessibility|Help Center|Privacy|Ad Choices|Advertising|Business Services|Get the LinkedIn|LinkedIn Corporation|Are these results|Your feedback|Page inboxes|Click to see|Status is online)/i,
    /^\d+\s*(connections?|followers?|following|results?|people|notifications?)$/i,
    /^(1st|2nd|3rd|\d+\+?)$/,
    /^\d+ mutual/i,
    /mutual connection/i,
    /^Profile photo/i,
    /^\.{3,}$/,
    /^(Premium|Open to work|Hiring)/i,
    /^Financial Services$/i,
    /^Advertise$/i,
  ];

  const isSkippable = (line: string) => skipPatterns.some((p) => p.test(line));

  // LinkedIn search result pattern: "Name • 2nd" / "Name · 2nd" / "Name • 3rd+"
  const linkedInNamePattern = /^(.+?)\s*[•·]\s*(?:1st|2nd|3rd\+?|\d+(?:st|nd|rd|th)\+?)\s*$/;

  // Parse position and company from headline
  const parseHeadline = (headline: string): { position: string; company: string } => {
    const normalized = headline.trim();
    if (!normalized) return { position: '', company: '' };

    // Pattern 1: "Position at Company"
    const atMatch = normalized.match(/^(.+?)\s+(?:at|@)\s+(.+?)$/i);
    if (atMatch) {
      return { position: atMatch[1].trim(), company: atMatch[2].trim() };
    }

    // Pattern 2: "Position | Company" or "Position · Company"
    const pipeMatch = normalized.match(/^(.+?)\s*[|·•]\s*(.+?)$/);
    if (pipeMatch) {
      return { position: pipeMatch[1].trim(), company: pipeMatch[2].trim() };
    }

    return { position: normalized, company: '' };
  };

  // Check if line is a location
  const isLocation = (line: string): boolean => {
    const l = line.trim();
    if (!l) return false;
    if (l.length > 80) return false;

    // Standalone country
    if (/^(Croatia|Germany|France|UK|United Kingdom|USA|United States|US|Canada|India|Australia)$/i.test(l)) return true;

    // "City, Region, Country" etc.
    if (/,\s*(Croatia|Germany|France|UK|United Kingdom|USA|United States|US|Canada|India|Australia|Area|Region|County)\b/i.test(l)) return true;
    if (/^[A-ZÀ-ÿ][^,]{1,40},\s*[^,]{1,40},\s*[^,]{2,40}$/.test(l)) return true;
    if (/^[A-ZÀ-ÿ][^,]{1,40},\s*[^,]{2,40}$/.test(l) && /\b(Croatia|Germany|France|UK|USA|US|Canada|India|Australia)\b/i.test(l)) return true;

    return false;
  };

  // 1) Find every "Name • 2nd" line and remember its index
  const anchors: Array<{ index: number; name: string }> = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const match = line.match(linkedInNamePattern);
    if (!match) continue;

    const name = match[1].trim();
    if (name.split(/\s+/).length < 2) continue;
    if (isSkippable(name)) continue;

    anchors.push({ index: idx, name });
  }

  // 2) For each anchor, inspect the lines until the next anchor to pick the *right* role
  for (let a = 0; a < anchors.length; a++) {
    const { index, name } = anchors[a];
    const nameLower = name.toLowerCase();
    if (seenNames.has(nameLower)) continue;

    const nextAnchorIndex = anchors[a + 1]?.index ?? lines.length;
    const segment = lines.slice(index + 1, nextAnchorIndex);

    let roleLine: string | null = null;
    let companyLine: string | null = null;
    let linkedinUrl: string | undefined;

    // First pass: capture role + URL
    for (const segLine of segment) {
      if (!segLine) continue;
      if (isSkippable(segLine)) continue;
      if (isLocation(segLine)) continue;

      const urlMatch = segLine.match(/(https?:\/\/[^\s]*linkedin\.com\/in\/[^\s)]+)/);
      if (urlMatch) {
        linkedinUrl = urlMatch[1];
        continue;
      }

      // First non-skipped, non-location line is the role (in LinkedIn ctrl+a format)
      if (!roleLine && segLine.length >= 2 && segLine.length <= 160) {
        roleLine = segLine;
        continue;
      }

      // If role didn't include a company, sometimes company appears on a following line
      if (roleLine && !companyLine && segLine.length >= 2 && segLine.length <= 120) {
        companyLine = segLine;
        break;
      }
    }

    const { position, company } = roleLine ? parseHeadline(roleLine) : { position: '', company: '' };

    const finalCompany = company || (companyLine && !isLocation(companyLine) ? companyLine : '');

    seenNames.add(nameLower);
    contacts.push({
      name,
      linkedinUrl,
      position: position || undefined,
      company: finalCompany || undefined,
      headline: position ? (finalCompany ? `${position} at ${finalCompany}` : position) : undefined,
      selected: true,
    });
  }

  // Fallback: try to find names without the "• 2nd" pattern
  if (contacts.length === 0) {
    const simpleNamePattern = /^([A-ZÀ-ÿ][a-zA-ZÀ-ÿ\-']+(?:\s+[A-ZÀ-ÿ][a-zA-ZÀ-ÿ\-']+){1,4})$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isSkippable(line)) continue;

      const nameMatch = line.match(simpleNamePattern);
      if (!nameMatch || line.length >= 60) continue;

      const name = nameMatch[1].trim();
      const nameLower = name.toLowerCase();
      if (seenNames.has(nameLower)) continue;

      let position = '';
      let company = '';
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nextLine = lines[j];
        if (isSkippable(nextLine) || isLocation(nextLine)) continue;
        if (nextLine.length < 4) continue;
        const parsed = parseHeadline(nextLine);
        position = parsed.position;
        company = parsed.company;
        break;
      }

      seenNames.add(nameLower);
      contacts.push({
        name,
        position: position || undefined,
        company: company || undefined,
        headline: position || undefined,
        selected: true,
      });
    }
  }

  return contacts;
}

export function LinkedInImport({ clusterId, profileId, onClose, onSuccess }: LinkedInImportProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<ImportMode>('paste');
  const [rawText, setRawText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [isImporting, setIsImporting] = useState(false);
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [contactType, setContactType] = useState<ContactType>('lead');
  const [leadStatus, setLeadStatus] = useState('new');

  const parseLinkedInText = () => {
    if (!rawText.trim()) return;

    const contacts = parseLinkedInSearchResults(rawText);

    if (contacts.length === 0) {
      toast({
        title: 'No contacts found',
        description: 'Try copying the full search results including names and titles.',
        variant: 'destructive',
      });
      return;
    }

    setParsedContacts(contacts);
    setStep('review');
  };

  const scrapeLinkedInUrl = async () => {
    if (!urlInput.trim() || !urlInput.includes('linkedin.com')) {
      toast({ title: 'Please enter a valid LinkedIn URL', variant: 'destructive' });
      return;
    }

    setIsScrapingUrl(true);

    try {
      const { data, error } = await supabase.functions.invoke('linkedin-scrape', {
        body: { url: urlInput.trim() },
      });

      if (error) throw error;

      if (data?.data) {
        // LinkedIn frequently blocks non-browser scraping; avoid importing placeholder-only results.
        const looksBlocked = !data.data.headline && !data.data.company;
        if (looksBlocked) {
          toast({
            title: 'LinkedIn blocked scraping',
            description: 'For reliable imports, use the paste method (Ctrl+A → copy results). URL scraping is limited without a dedicated scraping provider.',
            variant: 'destructive',
          });
          return;
        }

        const contact: ParsedContact = {
          name: data.data.name,
          headline: data.data.headline,
          position: data.data.headline,
          company: data.data.company,
          linkedinUrl: data.data.linkedinUrl,
          selected: true,
        };
        setParsedContacts([contact]);
        setStep('review');
      }
    } catch (err: any) {
      toast({ 
        title: 'Could not scrape URL', 
        description: 'LinkedIn may be blocking access. Try using the paste method instead.',
        variant: 'destructive' 
      });
    }

    setIsScrapingUrl(false);
  };

  const openLinkedInSearch = () => {
    window.open('https://www.linkedin.com/search/results/people/', '_blank');
  };

  const toggleContact = (index: number) => {
    setParsedContacts(prev => 
      prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c)
    );
  };

  const selectAll = () => {
    setParsedContacts(prev => prev.map(c => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setParsedContacts(prev => prev.map(c => ({ ...c, selected: false })));
  };

  const importContacts = async () => {
    const selected = parsedContacts.filter(c => c.selected);
    if (selected.length === 0) {
      toast({ title: 'No contacts selected' });
      return;
    }

    setIsImporting(true);

    const inserts = selected.map(c => ({
      cluster_id: clusterId,
      created_by: profileId,
      name: c.name,
      company: c.company || null,
      position: c.position || c.headline || null,
      contact_type: contactType,
      notes: c.linkedinUrl ? `LinkedIn: ${c.linkedinUrl}` : 'Imported from LinkedIn',
      tags: ['linkedin-import'],
      source: 'linkedin',
      lead_status: leadStatus,
    }));

    const batchSize = 50;
    let successCount = 0;
    
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize);
      const { error } = await supabase.from('crm_contacts').insert(batch);
      
      if (!error) {
        successCount += batch.length;
      }
    }

    setIsImporting(false);

    if (successCount > 0) {
      toast({
        title: `${successCount} contacts imported`,
        description: 'Contacts have been added with lead tracking enabled.',
      });
      onSuccess();
      onClose();
    } else {
      toast({
        title: 'Import failed',
        description: 'Could not import contacts. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedCount = parsedContacts.filter(c => c.selected).length;

  const leadStatusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-[10vh] overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">Import from LinkedIn</h2>
              <p className="text-sm text-muted-foreground">
                {step === 'input' ? 'Paste search results to extract contacts' : `${selectedCount} contacts ready`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick LinkedIn Search Button */}
            <GlassButtonNew
              variant="outline"
              size="sm"
              onClick={openLinkedInSearch}
              leftIcon={<ExternalLink className="w-3 h-3" />}
              className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
            >
              Open LinkedIn Search
            </GlassButtonNew>
            <button onClick={onClose} className="p-2 hover:bg-secondary/50 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Mode Tabs - hide URL mode to reduce confusion; paste is the main flow */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setMode('paste')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  Paste Search Results
                </button>
              </div>

              {mode === 'paste' ? (
                <>
                  {/* Info Banner */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-3">
                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-300/90">
                      <p className="font-medium mb-1">How to import:</p>
                      <ol className="list-decimal list-inside text-xs space-y-1 text-muted-foreground">
                        <li>Click "Open LinkedIn Search" above</li>
                        <li>Search for people you want to add</li>
                        <li>Select all (Ctrl+A) and copy the results</li>
                        <li>Paste below - we'll extract names, positions & companies</li>
                      </ol>
                    </div>
                  </div>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Paste LinkedIn search results here...

Example text that will be parsed:

John Smith
CEO at TechCorp
San Francisco, CA

Jane Doe
Product Manager | Acme Inc
New York, NY"
                    className="flex-1 min-h-[200px] w-full bg-secondary/30 border border-border/40 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  />
                  <GlassButtonNew
                    variant="primary"
                    onClick={parseLinkedInText}
                    disabled={!rawText.trim()}
                    className="mt-4 w-full"
                  >
                    Parse & Extract Contacts
                  </GlassButtonNew>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter a LinkedIn profile URL to extract contact information.
                  </p>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <GlassInput
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="pl-10"
                    />
                  </div>
                  <GlassButtonNew
                    variant="primary"
                    onClick={scrapeLinkedInUrl}
                    disabled={!urlInput.trim() || isScrapingUrl}
                    isLoading={isScrapingUrl}
                    className="mt-4 w-full"
                  >
                    Scrape Profile
                  </GlassButtonNew>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Note: LinkedIn may block direct scraping. If this fails, try the paste method.
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Import Settings */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-secondary/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <GlassSelect
                    value={contactType}
                    onChange={v => setContactType(v as ContactType)}
                    options={[
                      { value: 'lead', label: 'Lead' },
                      { value: 'prospect', label: 'Prospect' },
                      { value: 'client', label: 'Client' },
                      { value: 'partner', label: 'Partner' },
                    ]}
                    className="w-28"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <GlassSelect
                    value={leadStatus}
                    onChange={setLeadStatus}
                    options={leadStatusOptions}
                    className="w-32"
                  />
                </div>
                <div className="flex-1" />
                <button onClick={selectAll} className="text-xs text-primary hover:underline">
                  Select all
                </button>
                <span className="text-muted-foreground text-xs">|</span>
                <button onClick={deselectAll} className="text-xs text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              </div>

              {/* Extraction Summary Header */}
              <div className="mb-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{parsedContacts.length} contacts found</p>
                      <p className="text-xs text-muted-foreground">
                        {parsedContacts.filter(c => c.position).length} with roles • {parsedContacts.filter(c => c.company).length} with companies
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                    Ready to import
                  </Badge>
                </div>
              </div>

              {/* Contacts List - Table-like layout */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/30 sticky top-0 bg-card z-10">
                  <div className="col-span-1"></div>
                  <div className="col-span-3">NAME</div>
                  <div className="col-span-4">ROLE / POSITION</div>
                  <div className="col-span-4">COMPANY</div>
                </div>
                
                {/* Contact Rows */}
                <div className="divide-y divide-border/20">
                  {parsedContacts.map((contact, index) => (
                    <button
                      key={index}
                      onClick={() => toggleContact(index)}
                      className={`w-full text-left grid grid-cols-12 gap-2 px-4 py-3 transition-all hover:bg-secondary/30 ${
                        contact.selected
                          ? 'bg-primary/5'
                          : 'bg-transparent'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1 flex items-center">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          contact.selected 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'border-muted-foreground/30 bg-transparent'
                        }`}>
                          {contact.selected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{contact.name}</span>
                        {contact.linkedinUrl && (
                          <Linkedin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      {/* Position */}
                      <div className="col-span-4 flex items-center min-w-0">
                        {contact.position ? (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                            <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
                            <span className="truncate">{contact.position}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic">Not detected</span>
                        )}
                      </div>
                      
                      {/* Company */}
                      <div className="col-span-4 flex items-center min-w-0">
                        {contact.company ? (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                            <Building className="w-3.5 h-3.5 flex-shrink-0 text-accent/60" />
                            <span className="truncate">{contact.company}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic">Not detected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selection Summary Bar */}
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">{selectedCount} selected</span>
                  <span className="text-muted-foreground">of {parsedContacts.length} contacts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {contactType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {leadStatus}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                <GlassButtonNew
                  variant="ghost"
                  onClick={() => { setStep('input'); setParsedContacts([]); }}
                  className="flex-1"
                >
                  Back
                </GlassButtonNew>
                <GlassButtonNew
                  variant="primary"
                  onClick={importContacts}
                  disabled={selectedCount === 0}
                  isLoading={isImporting}
                  leftIcon={!isImporting ? <UserPlus className="w-4 h-4" /> : undefined}
                  className="flex-1"
                >
                  Import {selectedCount} with Lead Tracking
                </GlassButtonNew>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
