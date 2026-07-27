# Personal website redesign — design spec

**Date:** 2026-07-27
**Repo:** `hugoriosneto.github.io`
**Status:** Approved design, ready for implementation planning

---

## 1. Problem

The current site is a lightly-edited fork of [al-folio](https://github.com/alshedivat/al-folio), an academic Jekyll template. Three things are wrong with it:

1. **The content is stale or fake.** The homepage says Hugo works at Gemini and is "now doing a Master's". The `/cv/` page is still Albert Einstein, complete with a 1921 Nobel Prize and a 2029 Max Planck Medal, live on the public internet. The news feed's last entry is July 2023. Jekyll Scholar is configured for author "Albert Einstein". Roughly twenty template demo assets ship with the site.
2. **It is positioned for the wrong reader.** al-folio is built for academics. Hugo's audience is the football industry.
3. **It says nothing about the last two years.** Orlando City SC, RSC Anderlecht, the defended Master's thesis, and a second year co-organizing MLSA are all absent.

## 2. Who the site is for

**Primary reader: a sporting director, club executive, or senior practitioner**, most likely checking Hugo out before a conversation, a hire, or a collaboration.

**Secondary goal: signal readiness for technical director / football director roles.** This is *never stated*. It is carried entirely by evidence and emphasis — see §4.

Research, talks and writing all stay, but they serve the primary reader rather than leading.

## 3. Positioning strategy

Three rules govern all copy on the site.

**Rule 1 — No self-declared superlatives.** Self-declared superlatives are the one claim a sporting director discounts on sight. The site never says "best", "leading", or "pioneering". It states three checkable facts and lets the reader reach the conclusion:

> Brazil's **first** club analytics department. Its **first** sports analytics lab. Its **first** football analytics conference.

**Rule 2 — Institutions built, not analytics done.** Those three firsts are a department, a lab and a conference — each one an institution Hugo built and then ran. That is a director's CV, not a specialist's. The emphasis throughout is on *what building them required*, not what they were about. Same facts, different reading.

**Rule 3 — Nothing forward-looking.** No ambition statement, no "what's next", no Seleção reference, no stated interest in director roles. The trajectory does the work unaided. *(Explicitly decided; may be revisited later.)*

An upcoming, scheduled event that Hugo is organizing — FAME '26 on 28 September 2026 — is a **fact, not an aspiration**, and is featured as such. This is not an exception to Rule 3.

### Rules for describing roles

- **State remit. Never state headcount.** "Owned the club's insights and analytics function" works whether the team is one person or five. "A team of one" makes the reader size the operation instead of reading the remit.
- **No reporting lines.** *(Decided 2026-07-27, reversing an earlier recommendation.)* Reporting lines are omitted for every role, including the two that are known.
- **No plans stated as achievements.** Approved hires and forthcoming interns stay off the site until they start. When they do, that becomes "built out the team".

## 4. Information architecture

Five pages. No blog pillar, no news feed.

| Path | Page | Purpose |
|---|---|---|
| `/` | Home | Hero, career trajectory, SALab & FAME teaser, research and talks teasers, "Why Brazil" |
| `/research/` | Research | Papers, thesis, MLSA service, plus one long-form post |
| `/salab-fame/` | SALab & FAME | The lab, and FAME's five editions |
| `/talks/` | Talks & media | Six talks/podcasts/webinars, lazily embedded |
| `/cv/` | CV | Full CV, print-styled |
| `/writing/<slug>/` | Individual posts | Two existing posts, each keeping its own URL |

### Where the two blog posts go

The blog is not a pillar. The two existing posts are folded in by subject:

- **"The Tactical Influence of Analytics in Soccer"** (2020) → a *Writing* section on `/research/`
- **"FAME '23 Recap"** (2023) → surfaced on `/salab-fame/`, under the 2023 edition

Both keep their own permalink under `/writing/`. The Distill layout's author/affiliation apparatus is dropped — which also removes the existing inconsistency where the 2020 post carries an Atlético affiliation Hugo did not hold until 04/2021.

### Redirects

Old permalinks must not break. Minimum redirect map:

| Old | New |
|---|---|
| `/papers/` | `/research/` |
| `/blog/:year/:title/` | `/writing/<slug>/` — one redirect per post |
| `/blog/` | `/` |
| `/writing/` | `/` — there is no writing index; the two posts are reached from their pillar pages |
| `/repositories/` | `/` |
| `/news/*` | `/` |
| `/talks/`, `/cv/` | unchanged |

## 5. Visual system

### Colour

Base is **cream `#FBF3D5`** — not white. A tinted page makes white cards genuinely float, which removes the need for heavy borders and shadows everywhere.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBF3D5` | Page background |
| `--ink` | `#151a15` | Body text |
| `--dim` | `#6a6b5f` | Secondary text |
| `--faint` | `#9a9481` | Metadata, years |
| `--acc` | `#0a7d33` | **Text and links** — 4.7:1 on cream, passes WCAG AA |
| `--accfill` | `#009739` | **Fills and graphics only** — flag green is 3.8:1 on white and must never be text |
| `--acc2` | `#012169` | Secondary accent — kickers, tags |
| `--mark` | `#FEDD00` | **Highlighter fill only** — 1.3:1 on white, never text on a light background |
| `--card` | `#fffdf7` | Card surfaces |
| `--hair` / `--hair2` | `#eee3bd` / `#ddd0a4` | Dividers, borders |

Flag yellow appears as a `linear-gradient(transparent 60%, rgba(254,221,0,.85) 60%)` highlighter behind **one word per line**, and only in the hero. A fourth use on the page tips it into loud.

**Tricolour rule motif** — a 3px green/yellow/blue bar, used under the nav, on section rules, and on the favicon. This is the only place all three colours appear together.

### Typography

Two self-hosted families, no external CDN requests.

- **Display serif** for the hero claims, page titles and pull-quotes — an editorial serif (e.g. Source Serif 4 or Newsreader), 400 weight, tight tracking (`-0.02em`)
- **Sans** for UI, body and metadata (e.g. Inter), 400/500/600/650

### Dark mode

**Deferred.** *(Decided 2026-07-27 — "later".)* The current site has dark mode, so this is a removal, not an omission.

**Implementation requirement:** all colours ship as CSS custom properties on a single root selector from day one, so adding a dark theme later is a variables block rather than a refactor. A prototyped warm dark counterpart exists and is recorded here so the later work has a starting point:

`--bg:#14180F` · `--ink:#F2EBD2` · `--acc:#4FBE7A` (7.7:1) · `--acc2:#8FAAEE` · `--card:#1B2014`

Two things invert rather than translate: the yellow highlighter cannot survive on a dark page and becomes yellow **text** at 13.3:1, and the greens must lighten from `#0a7d33` to `#4FBE7A`.

### Favicon

Replace the current SALab logo — a lab's mark on a personal site. Use the tricolour rule motif or a monogram.

## 6. Interaction design

Level **B + C**: one signature moment, plus a page-appropriate interaction everywhere else. No live analytics playground — nothing that depends on data Hugo would need permission to publish.

### The signature moment — the accumulating trajectory (Home)

Five stops across 2021–2026. Clicking a stop shows that role's detail; **capabilities accumulate below and stay visible**, so by the final stop the reader sees the full set at once. A `▶ play` control walks through all five.

A timeline that simply *ascends* was designed and rejected: Orlando City was a broader remit at a smaller club and Anderlecht a narrower remit at a bigger one, so a rising line would fake a ladder that does not exist. Cumulative breadth is the thing that honestly only ever increases.

| Stop | Verb | Capabilities added |
|---|---|---|
| Atlético Mineiro | Built | Built a department from zero · Inside a top-flight club · Working to coaching staff |
| SALab & FAME | Founded | Founded a lasting institution · Ran a 5-edition event · Sponsors and partners · Developed people |
| Gemini | Scaled | Worked across many clubs · Research → shipped product · Facing club decision-makers |
| Orlando City SC | Owned | Owned a club function · North American market |
| RSC Anderlecht | Leads | Recruitment decision-making · European first division · Squad-building input |

### Per-page interactions

Filters were considered and rejected: four papers and six talks do not justify them. A filter over four items makes a site look interactive without helping anyone, and would need redesigning at fifteen papers anyway.

- **Research** — rows expand in place to reveal co-authors and links, so nobody leaves the page to find a PDF.
- **SALab & FAME** — a five-edition switcher for FAME. The growth *is* the argument; clicking 2022 → 2026 makes a reader feel it.
- **Talks** — embeds stay as posters until clicked. Six autoloading iframes across YouTube, Vimeo and Spotify would be the heaviest thing on the site by a wide margin. Language (EN/PT) and format are **tags, not filters**.
- **CV** — print stylesheet, so ⌘P produces the PDF and there is no second document to keep in sync.

### Motion

All motion respects `prefers-reduced-motion`. Every interactive control is keyboard-operable and focus-visible; the timeline stops are real buttons with `aria-current`.

## 7. Page content

### Home

1. **Nav** — sticky, blurred: brand · Research · SALab & FAME · Talks · CV. Tricolour rule beneath.
2. **Hero** — three "firsts" (display serif, yellow highlighter on `first`), then:
   > I've spent my career building the parts of a football operation that didn't exist yet — **a department, a research lab, a conference now in its fifth edition** — and then running them. These days I lead data recruitment at RSC Anderlecht.
3. **Identity block** — rule, name, then the legend, all links external:
   > Data Recruitment Lead, RSC Anderlecht · Co-founder, [SALab](https://salabufmg.github.io/) & [FAME](https://salabufmg.github.io/FAME26/) · Co-organizer, [MLSA @ ECML/PKDD](https://dtai.cs.kuleuven.be/events/MLSA26/index.php)
4. **Trajectory** — the accumulating timeline.
5. **Built from nothing** — two cards, SALab and FAME, linking to `/salab-fame/`.
6. **Research teaser** — three papers, thesis, MLSA row.
7. **Talks teaser** — Opta Pro Forum win, Data Footure, one more.
8. **Why Brazil** — final copy, approved:
   > No country has won more World Cups than Brazil, or produced more great footballers. None of it was matched by any analytics infrastructure — no club department, no research lab, no conference. *Closing that gap is what my career has been*, and everything on this page came out of it.

   The parallel between Brazil's footballing stature and Hugo's standing in analytics is left deliberately **unstated**. Drawing it converts the page's strongest passage into the self-superlative Rule 1 forbids.
9. **Footer** — social links only. **No email address** *(decided — personal address not to be exposed, and the UFMG address is not preferred).* LinkedIn therefore becomes the de facto inbox and should be the first link.

### Research

Reverse-chronological, expandable rows.

| Year | Work | Venue |
|---|---|---|
| 2024 | GraphEPV: A Framework for Estimating the Expected Possession Value in Basketball Using Graph Neural Networks | MLSA @ ECML/PKDD, Springer |
| 2023 | Characterizing Soccer Strategies based on Moves' Frequency, Importance and Effectiveness | ENIAC |
| 2022 | Generalized Action-based Ball Recovery Model using 360º data | StatsBomb Conference |
| 2020 | A new look into Off-ball Scoring Opportunity: taking into account the continuous nature of the game | FC Barcelona Analytics in Sports Tomorrow Congress |

Expanded rows show full author lists (Hugo bolded), a PDF link where one exists in `assets/pdf/`, and a BibTeX copy action.

**Thesis** — MSc, Computer Science, UFMG, defended February 2026:
> *Towards Learning Representations from Spatiotemporal Grids in Soccer*
> Supervisor: Wagner Meira Jr. Co-supervisors: **Jesse Davis** and Adriano C. M. Pereira.

Co-supervisors are shown deliberately: Jesse Davis is among the most prominent researchers in the field, and the association is a credential. **No abstract** *(decided)*.

**Service** — Co-organizer, Machine Learning & Data Mining for Sports Analytics, 13th edition, ECML/PKDD, Naples, 7 September 2026, with Pieter Robberechts, Maaike Van Roy and Albrecht Zimmermann. Second year as an organizer.

**Writing** — "The Tactical Influence of Analytics in Soccer".

### SALab & FAME

**SALab** — Brazil's first sports analytics lab, co-founded 2022 at UFMG, supervised by Wagner Meira Jr. and Adriano César Pereira of the Computer Science Department.

**FAME** — five-edition switcher. All detail below is sourced from `salabufmg.github.io`:

| Edition | Date | Detail |
|---|---|---|
| '22 — 1st | 21 Oct 2022 | CAD3 Auditorium B101/102, UFMG Pampulha. 09:00–14:00. R$5 nominal entry via Sympla. The first football analytics event ever held in Brazil. |
| '23 — 2nd | 17 Nov 2023 | CAD3 B101/102, 09:00–18:30. Lectures, panels, submitted-work presentations, published compendium. Sponsored by Gemini Sports Analytics. R$5 symbolic fee donated to CAMAV. |
| '24 — 3rd | 5 Sep 2024 | CAD3, 08:30–18:30, plus a pre-event workshop on 3 Sep. Ran as *Future of Football Conference — FAME '24: Business of Global Football*, UFMG × NYU. Sponsors: Gemini Sports Analytics, OneFan. |
| '25 — 4th | 3 Sep 2025 | CAD3, 08:30–18:30, plus a free hands-on preparatory workshop on 2 Sep. Sponsors: Gemini Sports Analytics, Gradient Sports. |
| '26 — 5th | 28 Sep 2026 | CAD3, UFMG Pampulha. **Upcoming.** Programme to be announced. |

Attendance figures are deliberately omitted *(decided — the edition history proves growth on its own)*. The growth is legible from the format instead: five hours to a full day, one day to workshop-plus-conference, one sponsor to two, and an international collaboration in 2024.

The `'26` tab must render gracefully with no programme, and must handle the transition from upcoming to past without a code change.

**Writing** — "FAME '23 Recap", surfaced under the 2023 edition.

### Talks & media

Six entries, poster-until-clicked, tagged by language and format.

| Talk | Detail | Tags |
|---|---|---|
| Opta Pro Forum — Algorithm Track | Stats Perform, Mar 2023, with Van Roy, Meira Jr. & Davis. Vimeo | **Winner**, EN, Conference |
| Data Footure | Podcast hosted with Caio Batatinha for Footure. YouTube playlist | PT, Podcast, Host |
| Winning With Data | Co-host, Feb 2024, guest Jesse Davis. Spotify | EN, Podcast, Co-host |
| Footstats live | Mar 2022. YouTube | PT, Live |
| Barça Innovation Hub webinar | FC Barcelona, Jun 2021. YouTube | EN, Webinar |
| Analytics in Sports Tomorrow Congress | FC Barcelona, Nov 2020. YouTube | EN, Conference |

### CV

Print-styled. Remit only — no headcount, no reporting lines.

**Experience** — Anderlecht (01/2026–now) · Orlando City SC (07/2025–12/2025) · Gemini (07/2023–06/2025) · Atlético Mineiro (04/2021–07/2023)
**Founded** — SALab (2022–now) · FAME (2022–now, five editions)
**Education** — MSc Computer Science, UFMG, defended 02/2026 · BSc Computational Mathematics, UFMG, 03/2018–08/2022
**Service & awards** — MLSA co-organizer, 2025 and 2026 (2026 is the workshop's 13th edition) · Opta Pro Forum Algorithm Track winner, 2023

## 8. Facts of record

Confirmed by Hugo. These override anything in the existing repo.

| | |
|---|---|
| **RSC Anderlecht** | Data Recruitment Lead · 01/2026 – present |
| **Orlando City SC** | Manager, Insights & Analytics · 07/2025 – 12/2025 |
| **Gemini Sports Analytics** | Intelligence Engineer · 07/2023 – 06/2025 |
| **Atlético Mineiro** | Data Scientist · 04/2021 – 07/2023 — the first analytics department at a Brazilian club, **confirmed as the first** |
| **SALab** | Co-founder · 2022 – present · UFMG |
| **FAME** | Co-founder & organizer · 2022 – present · five editions |
| **MLSA** | Co-organizer, 2nd year · 13th edition · ECML/PKDD, Naples, 7 Sep 2026 |
| **MSc** | Computer Science, UFMG · defended 02/2026 · *Towards Learning Representations from Spatiotemporal Grids in Soccer* · Meira Jr. (sup.), Davis & Pereira (co-sup.) |
| **BSc** | Computational Mathematics, UFMG · 03/2018 – 08/2022 |

## 9. Technical approach

**Astro + Tailwind, static output, deployed to GitHub Pages via GitHub Actions.** The repo and `hugoriosneto.github.io` are retained, so the URL never changes.

Astro suits a site that is mostly static with two genuinely interactive islands: the trajectory and the FAME switcher ship as small isolated bundles, and every other page ships zero JavaScript. Content collections give type-checked frontmatter, so a malformed entry fails the build instead of rendering wrong.

Rejected alternatives: **stripping al-folio back to the studs** — removing Bootstrap, jQuery, MDB and Masonry and rewriting the layouts is most of a rebuild's work for a lower ceiling, and Liquid is a poor fit for the accumulating timeline; **hand-rolled HTML/CSS/JS** — genuinely viable at five pages and zero dependencies, but adding a paper would mean editing HTML rather than a data file; **Next.js** — nothing here needs a server or data fetching.

### Content model

Astro content collections, all frontmatter schema-validated:

| Collection | Holds |
|---|---|
| `roles` | Timeline stops: org, title, dates, verb, blurb, capability chips |
| `papers` | Title, authors, venue, year, PDF path, BibTeX string, links |
| `talks` | Title, description, provider, embed URL, date, tags |
| `fame` | Edition number, year, date, venue, sponsors, detail, status |
| `writing` | The two posts, as MDX |

The four BibTeX entries move out of `_bibliography/papers.bib` into the `papers` collection, retaining a BibTeX string per entry for the copy action. `jekyll-scholar` goes.

### Removed entirely

The Ruby toolchain and all fifteen Jekyll plugins · Bootstrap 4.6 · jQuery 3.6 · MDB · Masonry · Font Awesome · MathJax · Distill · the news collection · the repositories page · `_data/cv.yml` (Einstein) · `assets/json/resume.json` · the ~20 template demo assets (`1.jpg`–`12.jpg`, screenshots, `example_pdf.pdf`, the stock video, the mp3) · the SALab favicon.

### Non-functional requirements

- **No external network requests at runtime.** Fonts self-hosted; embeds only load on click.
- **Accessibility:** WCAG AA contrast throughout — verified, not assumed. Keyboard-operable interactions, visible focus, `prefers-reduced-motion` honoured.
- **Performance:** Lighthouse ≥ 95 on all four categories; zero JS on pages without an island.
- **SEO:** sitemap, `schema.org/Person`, Open Graph image. `serve_og_meta` and `serve_schema_org` are both currently off.
- **Verification before "done":** production build succeeds · every internal and external link resolves · redirects from all old permalinks resolve · axe reports no violations · Lighthouse thresholds met · previews checked at 375px, 768px and 1280px.

## 10. Open items

| Item | Status |
|---|---|
| Dark mode | **Deferred** — "later". Ship light-only; token structure must make it additive. |
| FAME '26 programme | Not yet announced. Page must render without it and survive the upcoming→past transition. |
| Custom domain | Not discussed. `hugoriosneto.github.io` retained. |
| Thesis abstract | Not wanted. |
| Analytics | Currently disabled. Left disabled. |
