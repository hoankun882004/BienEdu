# Native LaTeX topic coverage audit

Audit date: 2026-11-03  
Registry: `assets/js/data/curriculum.js` (39 topics, 361 problem types)  
Runtime coverage: `assets/js/data/content-registry.js`

## Method

The audit compares the real registry and runtime content stores with the internal structure of the supplied LaTeX source. A matching filename alone is not treated as evidence. A topic is eligible only when its registry code and title/concept match the source, the relevant content was missing before the pilot, and the write would not replace existing content.

`K/E/P` below means the number of subtopics with Knowledge, Examples, and Practice available after the pilot. `CD22` was `K 0/9, E 0/9, P 0/9` before the pilot. A partial topic can still have complete Knowledge and Examples when Practice is unavailable.

| Topic | Existing content | LaTeX source | Mapping confidence | Eligible |
|---|---|---|---|---|
| CD01 | Partial — K 10/10, E 10/10, P 0/10; existing PDF source | No matching section | None | No — content already exists |
| CD02 | Partial — K 9/9, E 9/9, P 0/9; existing PDF source | No matching section | None | No — content already exists |
| CD03 | Partial — K 10/10, E 10/10, P 0/10; existing PDF source | No matching section | None | No — content already exists |
| CD04 | Partial — K 11/11, E 11/11, P 0/11; existing PDF source | No matching section | None | No — content already exists |
| CD05 | Partial — K 9/9, E 9/9, P 0/9; existing PDF source | No matching section | None | No — content already exists |
| CD06 | Partial — K 13/13, E 13/13, P 0/13; existing PDF source | No matching section | None | No — content already exists |
| CD07 | Partial — K 9/9, E 9/9, P 0/9; existing PDF source | No matching section | None | No — content already exists |
| CD08 | Partial — K 14/14, E 14/14, P 0/14; existing PDF source | No matching section | None | No — content already exists |
| CD09 | Partial — K 11/11, E 11/11, P 0/11; existing PDF source | No matching section | None | No — content already exists |
| CD10 | Partial — K 10/10, E 10/10, P 0/10; existing PDF source | No matching section | None | No — content already exists |
| CD11 | Partial — K 15/15, E 15/15, P 0/15; existing PDF source | No matching section | None | No — content already exists |
| CD12 | Partial — K 9/9, E 9/9, P 1/9; existing PDF source | No matching section | None | No — content already exists |
| CD13 | Partial — K 8/8, E 8/8, P 0/8; existing PDF source | No matching section | None | No — content already exists |
| CD14 | Partial — K 9/9, E 9/9, P 0/9; existing PDF source | No matching section | None | No — content already exists |
| CD15 | Missing — K/E/P 0/8 | No matching section | None | No — no source mapping |
| CD16 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD17 | Missing — K/E/P 0/5 | No matching section | None | No — no source mapping |
| CD18 | Missing — K/E/P 0/6 | No matching section | None | No — no source mapping |
| CD19 | Missing — K/E/P 0/6 | No matching section | None | No — no source mapping |
| CD20 | Available — K/E/P 17/17; reviewed content and stable progress IDs | Chapter CD20, lines 175–499 | High | **EXCLUDED — EXISTING KNOWLEDGE** |
| CD21 | Available — K/E/P 8/8; reviewed content and stable progress IDs | Chapter CD21, lines 500–630 | High | **EXCLUDED — EXISTING KNOWLEDGE** |
| CD22 | Partial after pilot — K 9/9, E 9/9, P 0/9; missing before pilot | Chapter CD22, lines 631–789; exact 22.1–22.9 registry match | High | **Yes — selected pilot** |
| CD23 | Missing — K/E/P 0/12 | Chapter CD23, lines 790–1006; exact 23.1–23.12 registry match | High | Yes, but not selected because the pilot is limited to one topic |
| CD24 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD25 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD26 | Missing — K/E/P 0/9 | No matching section | None | No — no source mapping |
| CD27 | Missing — K/E/P 0/8 | No matching section | None | No — no source mapping |
| CD28 | Missing — K/E/P 0/8 | No matching section | None | No — no source mapping |
| CD29 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD30 | Missing — K/E/P 0/8 | No matching section | None | No — no source mapping |
| CD31 | Missing — K/E/P 0/9 | No matching section | None | No — no source mapping |
| CD32 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD33 | Missing — K/E/P 0/11 | No matching section | None | No — no source mapping |
| CD34 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD35 | Missing — K/E/P 0/7 | No matching section | None | No — no source mapping |
| CD36 | Missing — K/E/P 0/9 | No matching section | None | No — no source mapping |
| CD37 | Missing — K/E/P 0/10 | No matching section | None | No — no source mapping |
| CD38 | Missing — K/E/P 0/12 | No matching section | None | No — no source mapping |
| CD39 | Missing — K/E/P 0/10 | No matching section | None | No — no source mapping |

## Decision

CD22 is the only topic imported in this pilot. Its nine source sections map one-to-one to registry codes 22.1–22.9, and the source contains nine examples. CD23 is a safe future candidate, but no CD23 runtime content was written. The summary tables after line 1009 were audited as document-wide reference material and were not attached to CD23.12.

The writer rejects CD20 and CD21 at the content-writing layer, rejects topics other than the configured pilot, and rejects any target that already has Knowledge or Examples.
