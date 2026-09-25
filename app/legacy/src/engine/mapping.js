// Mapowanie kolumn źródłowych na pojęcia kanoniczne (model danych dashboardu).
// Silnik PROPONUJE mapowanie (dopasowanie nazw + wartości), LLM może je skorygować,
// a użytkownik ZATWIERDZA. Bez zatwierdzenia KPI się nie liczą.

export const CANONICAL = {
  incidents: {
    incident_id:      { label: 'Incident ID', required: true,  synonyms: ['incident id', 'incident number', 'incident', 'ticket id', 'id', 'number'] },
    submit_date:      { label: 'Submit date', required: true,  synonyms: ['submit date', 'reported date', 'opened', 'open date', 'created', 'create date', 'created on', 'submitted'] },
    resolved_date:    { label: 'Resolved date', required: true,  synonyms: ['last resolved date', 'resolved date', 'resolution date', 'resolved on', 'resolved'] },
    closed_date:      { label: 'Closed date', required: false, synonyms: ['closed date', 'close date', 'closed on'] },
    priority:         { label: 'Priority', required: true,  synonyms: ['priority', 'prio', 'urgency priority'] },
    status:           { label: 'Status', required: true,  synonyms: ['status', 'state', 'incident status'] },
    initial_group:    { label: 'Initial group (for FCR)', required: false, synonyms: ['initial assigned group', 'first assigned group', 'owner group', 'initial group', 'first group'] },
    assigned_group:   { label: 'Resolving group', required: false, synonyms: ['assigned group', 'resolver group', 'support group', 'assignment group', 'resolved by group'] },
    transfer_count:   { label: 'Number of group transfers', required: false, synonyms: ['group transfers', 'reassignment count', 'reassignments', 'transfers', 'group transfer count'] },
    pending_minutes:  { label: 'Time in Pending (min)', required: false, synonyms: ['total pending duration', 'pending duration', 'pending time', 'total pending time'] },
    sla_status:       { label: 'SLA status from BMC (optional)', required: false, synonyms: ['sla status', 'slm status', 'sla met'] },
    service:          { label: 'Service', required: false, synonyms: ['service', 'business service', 'product'] },
    category:         { label: 'Category', required: false, synonyms: ['categorization tier 1', 'category', 'operational categorization tier 1'] },
    source:           { label: 'Reported source', required: false, synonyms: ['reported source', 'source', 'channel', 'contact type'] },
  },
  surveys: {
    survey_id:     { label: 'Survey ID', required: false, synonyms: ['survey id', 'survey number', 'id'] },
    incident_id:   { label: 'Incident ID (join key)', required: true, synonyms: ['incident id', 'incident number', 'ticket id', 'request id'] },
    sent_date:     { label: 'Sent date', required: true, synonyms: ['sent date', 'send date', 'survey sent', 'sent on'] },
    response_date: { label: 'Response date', required: true, synonyms: ['response date', 'responded date', 'answered date', 'completed date'] },
    rating:        { label: 'Rating', required: true, synonyms: ['rating', 'score', 'satisfaction', 'rating value', 'answer'] },
  },
};

const norm = s => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Proponuje mapowanie na podstawie nazw kolumn i profilu. */
export function proposeMapping(kind, prof) {
  const schema = CANONICAL[kind];
  const used = new Set();
  const mapping = {}, confidence = {}, reasons = {};
  for (const [field, def] of Object.entries(schema)) {
    let best = null, bestScore = 0;
    for (const col of prof.columns) {
      if (used.has(col.name)) continue;
      const n = norm(col.name);
      let score = 0;
      for (const syn of def.synonyms) {
        if (n === syn) score = Math.max(score, 1);
        else if (n.includes(syn) || syn.includes(n)) score = Math.max(score, n.length > 2 ? 0.75 : 0.3);
      }
      if (/date/.test(field) && col.type !== 'date') score *= 0.3;
      if (field === 'transfer_count' && col.type !== 'number') score *= 0.5;
      if (score > bestScore) { bestScore = score; best = col.name; }
    }
    if (best && bestScore >= 0.5) { mapping[field] = best; confidence[field] = Math.round(bestScore * 100) / 100; reasons[field] = `nazwa kolumny "${best}"`; used.add(best); }
    else { mapping[field] = null; confidence[field] = 0; reasons[field] = def.required ? 'BRAK — pole wymagane' : 'brak (opcjonalne)'; }
  }
  const missingRequired = Object.entries(schema).filter(([f, d]) => d.required && !mapping[f]).map(([f]) => f);
  return { mapping, confidence, reasons, missingRequired, unmappedColumns: prof.columns.map(c => c.name).filter(c => !used.has(c)) };
}

// --- Normalizacja wartości -------------------------------------------------------
export const DEFAULT_VALUE_RULES = {
  priority: { P1: ['critical', '1-critical', '1', 'p1'], P2: ['high', '2-high', '2', 'p2'], P3: ['medium', '3-medium', '3', 'p3'], P4: ['low', '4-low', '4', 'p4'] },
  status: {
    resolved: ['resolved', 'closed'],
    cancelled: ['cancelled', 'canceled', 'rejected', 'duplicate'],
    pending: ['pending'],
    open: ['new', 'assigned', 'in progress', 'work in progress', 'open'],
  },
  serviceDeskGroups: ['IT-Service Desk'],
  ratingScale: 'auto', // 'auto' | '1-5' | '2-10' (Vendor: Terrible 2 … Excellent 10, średnia "out of 5" = ocena/2)
};

export function normalizeValue(kind, value, rules = DEFAULT_VALUE_RULES) {
  const v = String(value ?? '').toLowerCase().trim();
  for (const [key, list] of Object.entries(rules[kind] || {})) if (list.includes(v)) return key;
  return kind === 'status' ? (v ? 'open' : 'unknown') : null;
}
