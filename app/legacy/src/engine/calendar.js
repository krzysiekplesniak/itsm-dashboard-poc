// Kalendarz biznesowy (brief §4): domyślnie pn–pt 08:00–18:00, bez weekendów i świąt LU; nadpisywany plikiem config/calendar.json.
// Daty traktujemy jako czas lokalny Europe/Luxembourg "na ścianie" (wall-clock):
// komponenty daty zapisujemy w Date.UTC, żeby uniknąć przesunięć DST na maszynie użytkownika.

const DAY = 24 * 60; // minuty

/** Wielkanoc (algorytm Meeusa/Jonesa/Butchera, kalendarz gregoriański). */
export function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

const holidayCache = new Map();
/** Święta LU (brief §4) jako zbiór kluczy 'YYYY-MM-DD'. */
export function luxembourgHolidays(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const e = easterSunday(year);
  const add = (ms, days) => new Date(ms + days * 86400000).toISOString().slice(0, 10);
  const fixed = ['01-01', '05-01', '05-09', '06-23', '08-15', '11-01', '12-25', '12-26'].map(md => `${year}-${md}`);
  const set = new Set([...fixed, add(e, 1) /* Easter Monday */, add(e, 39) /* Ascension */, add(e, 50) /* Whit Monday */]);
  holidayCache.set(year, set);
  return set;
}

export const DEFAULT_CALENDAR = { startHour: 8, endHour: 18, workdays: [1, 2, 3, 4, 5], holidays: 'LU' };

// Święta: 'LU' (reguły luksemburskie) albo obiekt z pliku config/calendar.json:
// { rules: 'LU' | null, dates: ['YYYY-MM-DD', …] } — suma reguł i jawnej listy (ACME może dopisać/zmienić listę).
const setCache = new WeakMap();
export function holidaySet(cal, year) {
  const h = cal.holidays;
  if (h === 'LU') return luxembourgHolidays(year);
  if (!h) return new Set();
  let byYear = setCache.get(h); if (!byYear) { byYear = new Map(); setCache.set(h, byYear); }
  if (!byYear.has(year)) {
    const set = new Set(h.rules === 'LU' ? luxembourgHolidays(year) : []);
    (h.dates || []).filter(d => d.startsWith(String(year))).forEach(d => set.add(d));
    (h.remove || []).forEach(d => set.delete(d));
    byYear.set(year, set);
  }
  return byYear.get(year);
}

export function isBusinessDay(ms, cal = DEFAULT_CALENDAR) {
  const d = new Date(ms);
  if (!cal.workdays.includes(d.getUTCDay())) return false;
  return !holidaySet(cal, d.getUTCFullYear()).has(d.toISOString().slice(0, 10));
}

/** Wczytuje kalendarz z pliku JSON (config/calendar.json). Zwraca obiekt kalendarza albo rzuca czytelny błąd. */
export function parseCalendar(json) {
  const c = typeof json === 'string' ? JSON.parse(json) : json;
  const bad = m => { throw new Error('calendar.json: ' + m); };
  if (!(c.startHour >= 0 && c.startHour < 24 && c.endHour > c.startHour && c.endHour <= 24)) bad('startHour/endHour must be 0–24 and start < end');
  if (!Array.isArray(c.workdays) || !c.workdays.every(d => d >= 0 && d <= 6)) bad('workdays must be numbers 0 (Sun) … 6 (Sat)');
  const dates = c.holidays?.dates || [];
  if (!dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) bad('holidays.dates must be YYYY-MM-DD');
  return { name: c.name || 'custom', timezone: c.timezone || 'Europe/Luxembourg', startHour: c.startHour, endHour: c.endHour, workdays: c.workdays,
    holidays: { rules: c.holidays?.rules ?? null, dates, remove: c.holidays?.remove || [] } };
}

/** Minuty biznesowe między dwoma momentami (ms, wall-clock w UTC). */
export function businessMinutes(startMs, endMs, cal = DEFAULT_CALENDAR) {
  if (startMs == null || endMs == null || endMs <= startMs) return 0;
  let total = 0;
  let dayStart = Date.UTC(new Date(startMs).getUTCFullYear(), new Date(startMs).getUTCMonth(), new Date(startMs).getUTCDate());
  while (dayStart < endMs) {
    if (isBusinessDay(dayStart, cal)) {
      const open = dayStart + cal.startHour * 3600000;
      const close = dayStart + cal.endHour * 3600000;
      const s = Math.max(open, startMs), e = Math.min(close, endMs);
      if (e > s) total += (e - s) / 60000;
    }
    dayStart += 86400000;
  }
  return Math.round(total * 100) / 100;
}

/** Dodaje minuty biznesowe do momentu (używane przez generator mocka). */
export function addBusinessMinutes(startMs, minutes, cal = DEFAULT_CALENDAR) {
  let t = startMs, left = minutes;
  // przesuń do najbliższego czasu pracy
  for (let guard = 0; guard < 4000 && left >= 0; guard++) {
    const d = new Date(t);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const open = dayStart + cal.startHour * 3600000, close = dayStart + cal.endHour * 3600000;
    if (!isBusinessDay(dayStart, cal) || t >= close) { t = dayStart + 86400000 + cal.startHour * 3600000; continue; }
    if (t < open) t = open;
    const avail = (close - t) / 60000;
    if (left <= avail) return t + left * 60000;
    left -= avail; t = dayStart + 86400000 + cal.startHour * 3600000;
  }
  return t;
}

/** Niezależna, "brutalna" implementacja (minuta po minucie) — tylko do weryfikacji. */
export function businessMinutesBruteForce(startMs, endMs, cal = DEFAULT_CALENDAR) {
  if (startMs == null || endMs == null || endMs <= startMs) return 0;
  let n = 0;
  for (let t = startMs; t < endMs; t += 60000) {
    const d = new Date(t);
    const h = d.getUTCHours();
    if (h >= cal.startHour && h < cal.endHour && isBusinessDay(t, cal)) n++;
  }
  return n;
}

export { DAY };
