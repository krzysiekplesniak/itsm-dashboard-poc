// BRIEF.md generowany z rozmowy — struktura jak w briefie projektu (§1–§10), wypełniona decyzjami
// użytkownika, zatwierdzonym mapowaniem, konfiguracją KPI i specyfikacją dashboardu.
export function buildBrief(p) {
  const by = s => p.decisions.filter(d => d.section === s).map(d => `- ${d.text}`).join('\n') || '- (nie ustalono w rozmowie)';
  const c = p.config;
  const map = Object.entries(p.mappings).map(([k, m]) => `**${k}**\n\n| Pojęcie | Kolumna w pliku |\n|---|---|\n` + Object.entries(m).map(([f, col]) => `| ${f} | ${col || '— (brak)'} |`).join('\n')).join('\n\n') || '(mapowanie nie zostało zatwierdzone)';
  const panels = p.spec.panels.filter(x => x.visible).map(x => `- **${x.title}**: ${x.cards.filter(k => k.visible).map(k => k.label).join(', ')}; wykres: ${x.chart.series.map(s => s.label).join(', ')} (cel ${x.chart.target ?? '—'})`).join('\n');
  const anon = Object.entries(p.files).map(([k, f]) => `- ${k}: usunięto ${f.anonymization.dropped.join(', ') || '—'}; zahaszowano ${f.anonymization.hashed.join(', ') || '—'}`).join('\n');
  return `# Brief: ${p.spec.title}

_Wygenerowano z rozmowy w czacie ITSM Dashboard (${new Date().toISOString().slice(0, 16).replace('T', ' ')}). Struktura zgodna z briefem projektu._

## 1. Cel i odbiorcy
${by('cel')}

## 2. Ograniczenia techniczne
- Jeden samodzielny plik HTML, działa offline (biblioteki wbudowane), bez serwera i bez wysyłania danych.
- Wejście: CSV (incydenty + ankiety), łączone po Incident ID. Dane anonimizowane przed jakąkolwiek analizą.
${anon}
${by('techniczne')}

## 3. Wygląd
${panels}
- Panel "At-risk incidents": ${p.spec.atRisk.visible ? 'widoczny' : 'ukryty'}.
${p.spec.highlight.length ? `- Uwypuklone: ${p.spec.highlight.join(', ')}` : ''}
${by('wyglad')}

## 4. Kalendarz biznesowy
- Pn–pt ${c.calendar.startHour}:00–${c.calendar.endHour}:00; bez weekendów i świąt LU (liczone per rok, łącznie z datami zależnymi od Wielkanocy).
- Czas w statusie Pending odejmowany (jednostka: minuty biznesowe — do potwierdzenia).

## 5. Definicje KPI
- **FCR** (cel ${c.fcr.targetPct}%): populacja = rozwiązane incydenty z początkową grupą ${c.valueRules.serviceDeskGroups.join(' / ')}; sukces = bez przekazania i rozwiązanie < ${c.fcr.maxBusinessMinutes} min biznesowych.
- **P3 SLA** (cel ${c.sla.targetPct}%): rozwiązane P3 w ≤ ${c.sla.P3.hours} h biznesowych.
- **P4 SLA** (cel ${c.sla.targetPct}%): rozwiązane P4 w ≤ ${c.sla.P4.hours} h biznesowych.
- **P3 & P4 SLA**: (P3 w SLA + P4 w SLA) ÷ (wszystkie rozwiązane P3 + P4).
- **CSAT** (cel ≥ ${c.csat.targetAvg}): średnia ocena 1–5 z ankiet z odpowiedzią${p.normalized?.ratingScale === '2-10' ? ' (oceny 2–10 dzielone przez 2, jak w raporcie Vendor "Average out of 5")' : ''}; karty: wysłane, z odpowiedzią, wskaźnik odpowiedzi.
${by('kpi')}

## 6. Okresy
- Karty: domyślnie ostatni pełny miesiąc (${p.computed?.defaultMonth ?? '—'}); wybór miesiąca w nagłówku; trendy 12 miesięcy.
${by('okresy')}

## 7. Incydenty zagrożone
- Otwarte P3/P4 wg czasu biznesowego; "Breached" > progu, "At risk" ≥ ${Math.round(c.sla.atRiskShare * 100)}% progu.

## 8. Walidacja i przejrzystość
- Podsumowanie wczytania, oznaczenie "low volume" (< ${c.lowVolume}), ikona "jak liczone" na każdej karcie, zakładka weryfikacji z niezależnym przeliczeniem.
${p.verification ? `- Ostatnia weryfikacja (${p.verification.month}): ${p.verification.allMatch ? 'wszystkie liczby zgodne' : 'ROZBIEŻNOŚCI — do wyjaśnienia'}.` : ''}

## 9. Mapowanie pól
${map}

## 10. Otwarte pytania
${by('pytania')}

## Założenia
${p.assumptions().map(a => `- ${a}`).join('\n')}
`;
}
