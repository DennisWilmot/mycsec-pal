# MyCSECPal Landing Page — Iteration Wireframe

Summary: Approved landing-page hierarchy, messaging intent, and responsive section structure.
Use when: Changing landing content, layout, calls to action, pricing, or product imagery.
Owner: Product design and marketing.
Last verified: 16 July 2026.
Status: proposed layout for review
Scope: landing page only
Direction: warm Caribbean exam companion; editorial, credible and product-led
Constraint: preserve the current hero section

## Page story

The page should answer five questions in order:

1. What is MyCSECPal?
2. Can I practise my subject?
3. What does using it feel like?
4. What do I receive after a paper?
5. How do I join or pay?

The product UI should do most of the explaining. Avoid oversized screenshots, repeated feature-card grids and isolated “big blam” sections.

---

## Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAV                                                                          │
│ [MyCSECPal]          Subjects   How it works   Pricing   Sign in   [Join beta]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ HERO — KEEP CURRENT DESIGN                                                   │
│                                                                              │
│  Now welcoming beta learners                    [current hero illustration]  │
│  Practice for CSEC exams the way                                             │
│  they’re actually written.                                                   │
│  Supporting copy                                                             │
│  [Join the beta →]                                                           │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ CHOOSE A SUBJECT TO GET STARTED                                              │
│ Start with what you are studying now.                  [←]  1 / 2  [→]       │
│                                                                              │
│ ┌──────────────────┐ ┌──────────────────────┐ ┌──────────────────┐           │
│ │   Mathematics    │ │      English A       │ │    Chemistry     │  →        │
│ │     artwork      │ │       artwork        │ │     artwork      │           │
│ │                  │ │                      │ │                  │           │
│ │ Mathematics      │ │ English A            │ │ Chemistry        │           │
│ │ Paper 1 · Paper 2│ │ Paper 1 · Paper 2    │ │ Coming soon      │           │
│ │ [Start now →]    │ │ [Start now →]        │ │                  │           │
│ └──────────────────┘ └──────────────────────┘ └──────────────────┘           │
│       standard            HOVER / FOCUS             next card peeks in       │
│                         (larger + artwork lifts)                              │
│                                                                              │
│ Carousel continues: Physics · Biology · POA · POB                            │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ YOUR WORKING MATTERS                                                        │
│                                                                              │
│ ┌────────────────────────────┐  Paper 2 is not only about the final answer.  │
│ │                            │  Show each step, save as you work and receive │
│ │ Existing Paper 2 workspace │  marks and feedback for the method you used.  │
│ │ screenshot                 │                                                │
│ │                            │  [Try now →]                                   │
│ └────────────────────────────┘                                                │
│        ~55% width                         ~35% width                           │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ SIMPLE STEPS. SERIOUS RESULTS.                                               │
│ One connected exam journey with different visual weights.                   │
│                                                                              │
│ ┌──────────────────────┐    · · · · · ·   ┌───────────────────────────────┐  │
│ │ 01                   │ ────────────────→ │                     02        │  │
│ │ PICK A SUBJECT       │                   │ [large start-paper image]     │  │
│ │ [small illustration] │                   │ START A FULL PAPER            │  │
│ │ Choose your focus.   │                   │ Paper 1 or Paper 2, timed     │  │
│ └──────────────────────┘                   │ and saved as you work.        │  │
│                                            └───────────────┬───────────────┘  │
│                                                            │                  │
│ ┌──────────────────────────────────────┐                    ↓                  │
│ │ 03                                   │    · · · · ·   ┌──────────────────┐  │
│ │ [wide report illustration]           │ ─────────────→ │ 04               │  │
│ │ GET A REPORT YOU CAN USE             │                │ TRACK GROWTH     │  │
│ │ Marks, examiner feedback and the     │                │ [radar/growth    │  │
│ │ next thing to revisit.               │                │  illustration]   │  │
│ └──────────────────────────────────────┘                └──────────────────┘  │
│                                                                              │
│   compact entry       dominant product moment       wide outcome   finish    │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ MORE THAN A FINAL SCORE                                                      │
│ A quieter, compact product tour. Screenshots never span the full viewport.   │
│                                                                              │
│  Understand the result                    ┌───────────────────────────────┐    │
│  Your report explains the pattern         │ Examiner summary screenshot  │    │
│  behind the score and gives a useful      │ at ~45–50% page width        │    │
│  next step.                               └───────────────────────────────┘    │
│                                                                              │
│ ┌───────────────────────────────┐         Review every question              │
│ │ Question review screenshot    │         Compare your response, the key and │
│ │ at ~45–50% page width         │         specific examiner feedback.        │
│ └───────────────────────────────┘                                             │
│                                                                              │
│  See progress over time                   ┌───────────────────────────────┐    │
│  The radar view turns multiple attempts   │ Progress/radar screenshot     │    │
│  into a clear subject profile.            │ at ~40–45% page width         │    │
│                                           └───────────────────────────────┘    │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ PRICING / BETA ACCESS                                                        │
│ Real exam practice. Clear access options.                                    │
│                                                                              │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐       │
│ │ Beta learner        │ │ Practice            │ │ Practice & Learn    │       │
│ │ Free / 14 days      │ │ $9.99 / month       │ │ Coming soon         │       │
│ │ concise benefits    │ │ concise benefits    │ │ concise preview     │       │
│ │ [Join beta]         │ │ [Choose Practice]   │ │ [Coming soon]       │       │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘       │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ FINAL CTA                                                                    │
│ [small island artwork]  Ready to practise a full CSEC paper?  [Join beta →] │
├──────────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                       │
│ Logo · Product links · Support · Legal · Social links                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Section specifications

### 1. Hero

- Keep the existing hero structure, copy, illustration and primary action.
- Preserve it as the only large, high-energy section at the top of the page.
- The next section should begin with generous breathing room rather than another coloured block.

### 2. Subject carousel

Subjects, in order:

1. Mathematics — available
2. English A — available once released
3. Chemistry — coming soon
4. Physics — coming soon
5. Biology — coming soon
6. Principles of Accounts (POA) — coming soon
7. Principles of Business (POB) — coming soon

Desktop behaviour:

- Show roughly 3.25 cards so the clipped fourth card communicates horizontal movement.
- The hovered or keyboard-focused card scales to approximately `1.04–1.06` and rises slightly.
- Its artwork may lift independently by a smaller amount.
- Neighbouring cards should not jump; use transforms rather than changing layout width.
- Available cards reveal or strengthen the `Start now` action on hover/focus.
- Coming-soon cards remain informative and are not disguised as disabled primary actions.
- Arrow buttons and drag/swipe both move the carousel.
- Pause any automatic movement while hovered, focused or when reduced motion is requested.

Mobile behaviour:

- One card occupies about 84–88% of the viewport, leaving the next card visible.
- Use horizontal snapping and touch scrolling.
- Do not require hover to expose availability or the primary action.

### 3. Your working matters

- Keep the existing Paper 2 product image.
- Replace `Try a sample question` with **`Try now`**.
- Do not use the phrase “try some questions.”
- Use a two-column composition with the screenshot as the dominant evidence, not a decorative backdrop.
- Copy should explain three product truths: show working, autosave, receive method-aware feedback.

Suggested copy:

> Paper 2 is not only about the final answer. Show each step, save as you work and receive marks and feedback for the method you used.

### 4. Simple steps. Serious results.

- Replace both the equal-card row and the repeated alternating-row idea with one asymmetric journey map.
- Use a two-row composition with different visual weights:
  - `01 Pick a subject` is a compact entry block in the upper left.
  - `02 Start a paper` is the dominant block, approximately twice as wide, in the upper right.
  - `03 Get your report` is a wide outcome block in the lower left.
  - `04 Track your growth` is a compact finishing block in the lower right.
- Connect the stages with a restrained dotted or hand-drawn path so the reading order is unmistakable.
- The blocks should not share identical image placement:
  - Step 1 uses a small illustration beside or beneath short copy.
  - Step 2 gives most of its space to the image.
  - Step 3 uses a wide image with copy anchored below it.
  - Step 4 uses the illustration as a compact visual endpoint.
- Use the existing step illustrations.
- Step numbers should act as quiet orientation markers, not oversized decorations.
- Use surface colour and spacing to group the journey; avoid four matching bordered cards.

Mobile behaviour:

- Convert the map into one vertical route with a single thin connecting path.
- Preserve the different emphasis: Step 2 and Step 3 remain larger than Step 1 and Step 4.
- Keep every step visible; do not turn the journey into a carousel.

### 5. More than a final score

This section receives the largest change.

- Remove the three full-width screenshot “blasts.”
- Treat each result view as one compact benefit row.
- Alternate text and screenshot positions to continue the page rhythm.
- Keep each screenshot near 40–50% of the content width and cap its height.
- Crop around the relevant product evidence rather than showing the whole application chrome every time.
- Use only three benefits:
  - Understand the result — examiner summary.
  - Review every question — answer and feedback comparison.
  - See progress over time — radar/profile view.
- No oversized scores or decorative statistics on the marketing page.

### 6. Pricing

- Retain the three access options, but reduce repeated benefit copy.
- Make the current or recommended plan distinct through hierarchy and placement, not exaggerated scale.
- Keep prices, limits and “coming soon” states explicit.
- The beta card should continue to state that no payment card is required.

### 7. Final CTA and footer

- Use a compact closing band with the island artwork at a supportive scale.
- Add a proper footer below it for product, support, legal and social links.
- The footer should be quieter than the CTA and should visually close the page.

---

## Interaction and accessibility notes

- Hover enlargement must also activate with `:focus-visible`.
- Carousel controls require visible labels and keyboard support.
- Preserve a logical DOM order even when image/text positions alternate visually.
- On mobile, keep text before the associated image when that improves comprehension.
- Respect `prefers-reduced-motion`; remove automatic sliding and scale animation while retaining clear focus styling.
- Avoid layout shift when cards scale or screenshots load.
- All screenshots need descriptive alt text that explains the product state shown.
- All coming-soon states must remain readable without relying on colour alone.

---

## Content and asset map

| Section | Existing asset/content | Action |
|---|---|---|
| Hero | Current hero and Caribbean companions | Keep |
| Subjects | Existing subject artwork | Add Biology, POA and POB to carousel |
| Working matters | `Short Answer practice paper ui math.png` | Keep; change CTA to `Try now` |
| Steps | Four `/assets/steps/` images | Recompose as alternating rows |
| Examiner summary | English attempt report screenshot | Reduce and crop to evidence |
| Question review | Attempt report question-review screenshot | Reduce and crop to evidence |
| Progress | Mathematics radar screenshot | Reduce and crop to evidence |
| Pricing | Existing three plans | Tighten and retain |
| Closing CTA | Island artwork | Keep smaller |

## Implementation boundary for the next pass

The next implementation should alter the landing page only. It should not change authenticated Practice, Results or Progress screens, except for reusing their existing screenshots or assets in the landing-page product tour.
