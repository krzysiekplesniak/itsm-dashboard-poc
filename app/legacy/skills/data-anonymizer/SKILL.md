---
name: data-anonymizer
description: How personal data is detected and handled before any analysis — certain PII removed, person identifiers hashed, uncertain columns put ON HOLD until the user decides. Use when files are uploaded, when the user asks what was removed, or when a column is on hold.
---

# Data anonymizer

**Hard rule:** nothing reaches the language model before anonymisation. The engine classifies **every column
by name and by content** (a sample of up to 1,000 rows) when the file is uploaded.

| Result | When | What happens |
|---|---|---|
| **drop** (certain) | name looks personal (name, e-mail, phone, address, requester, free-text notes) **or** ≥ 20 % of values are e-mails / phone numbers / IP addresses / bank accounts, **or** long free text | the column is removed immediately |
| **hash** | identifies a person: login, assignee, owner, agent | values replaced by `anon_xxxxxxxx` (the same person gets the same code) |
| **review** (uncertain) | ≥ 40 % of values look like person names or host names, some values look like contact data, or an unknown free-text column | **ON HOLD**: not in the data, the profile or tool answers until the user decides |
| **keep** | operational fields (IDs, dates, priority, group, status, service, category, channel, SLA, rating) | kept |

## Conversation (step 2b)
1. Call `anonymisation_review`. If nothing is pending, say in one line what was removed and hashed, then continue.
2. If columns are on hold, show a table: *file · column · why · masked examples* (examples are masked by the engine, e.g. `A••• M•••••`; never ask for or show raw values).
3. Ask per column: **keep** (not personal and needed for a KPI), **hash** (needed for counting, not for reading), **drop** (default, safest). Recommend drop unless a KPI needs the column.
4. Apply only what the user said, with `decide_anonymisation`. Record it in the brief (done automatically).

## Never
- Guess a decision or keep an on-hold column “to be helpful”.
- Quote raw personal data even if the user pastes it: refer to it as “the value you pasted”.
- Promise that anonymisation is perfect. Say that uncertain columns are held for review and that the user stays in control.
