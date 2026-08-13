# 09 — Landing page brief

Everything needed to build Decant's marketing site in Next.js. **This file is
the whole handover.** You do not need the game's repo, its designer, or another
conversation — the palette, the type, every line of copy and the full legal
text are all below, taken from the shipping app rather than invented.

Where something genuinely is not decided yet, it is marked `TODO(owner)` and
listed again in §16. Nothing marked that way blocks a first build.

---

## 1. What this site is for

A small business site for a mobile game, in this order of importance:

1. **Explain what the game is** in under five seconds, to someone who has
   never heard of it.
2. **Send them to the store.** Every path on the page ends at a store button.
3. **Satisfy the store review forms.** Both Google Play and the App Store
   refuse a listing without a reachable privacy policy URL and a support
   contact. This site is where those live, which makes it a launch blocker
   rather than a nice-to-have.

It is not a blog, not a docs site, and not a place to explain how the game is
built. One marketing page plus two legal pages.

**Nobody goes looking for this site.** Visitors arrive from a store listing, a
link in a review, or a search for "water sort puzzle". So the page opens by
showing the game, not by introducing a company.

---

## 2. The product

Decant is a **water sort puzzle**. You pour coloured liquid between glass vials
until each vial holds a single colour. That is the entire game.

The genre is crowded, and the differentiator is tone: **no timer, no lives, no
way to lose.** Most competitors bolt a fail state and an energy meter onto the
same mechanic. This one does not, and the site should say so early and plainly.

| Fact          | Value                                        |
| ------------- | -------------------------------------------- |
| Name          | Decant                                       |
| Store title   | Decant: Water Sort Puzzle                    |
| Subtitle      | Pour, sort, unwind                           |
| Platforms     | Android and iOS, phones and tablets          |
| Orientation   | Portrait only                                |
| Price         | Free, ad-supported                           |
| Network       | Fully playable offline                       |
| Account       | None. No sign-up, no login, no server        |
| Data          | Progress stored on the device only           |
| Accessibility | Colourblind symbols on every colour          |
| Publisher     | `TODO(owner)` — legal entity name            |
| Support email | `TODO(owner)` — must still work in two years |
| Domain        | `TODO(owner)`                                |

### What the game actually contains

Useful background so the copy stays truthful. Do not put all of this on the
page — it is here so you never have to guess.

- **Three difficulty modes**: Gentle, Classic, Fiendish. Each has its own
  independent progress, its own level ladder and its own best scores.
- **Levels are generated, not authored.** Every board is produced from a seed
  and machine-verified solvable before it is ever shown. There is no fixed
  level count and no end to reach.
- **Stars** are awarded on efficiency — how close to the shortest possible
  solution you played — not on speed. Three stars means you played it well.
- **Hints** show the next pour, and are always drawn from the provably
  shortest remaining solution. A hint never sends you on a detour.
- **Undo and redo** are unlimited in the sense that matters: you can always
  take a move back.
- **A daily puzzle** ("the daily brew") — one new board each day, its
  difficulty scaled to how far the player has got. Claiming it builds a
  streak.
- **Coins** are earned by playing and by a daily reward. They buy hints, undos
  and spare vials. They are device-local, have no cash value, and cannot be
  bought with real money today.
- **Ads**: an occasional full-screen ad between levels, and optional rewarded
  ads the player chooses to watch for a spare vial or coins. Never mid-level.
- **A daily reminder notification**, off by default, scheduled entirely on the
  device. No push server exists.

---

## 3. Voice

Calm, plain, slightly dry. Short sentences. The product exists to lower
someone's heart rate; the page should read the same way.

Write like this:

> No timer. No lives. No way to lose.

Not like this:

> Embark on an unforgettable journey through a world of vibrant colours!

Hard rules:

- **No exclamation marks.** Anywhere on the site.
- **No "Download now!!!"** — the buttons already say what they do.
- **No invented numbers.** Levels are generated, so "500+ levels" is both
  false and ages badly. Say "puzzles that never run out" or say nothing.
- **No fake social proof.** No star ratings, no download counts, no
  testimonials, no "as featured in". Nothing has launched. Inventing any of it
  is the one thing on this page that would be genuinely dishonest — and a
  fabricated `aggregateRating` in structured data is a search penalty on top.
- **British spelling.** "Colour", not "color". The app uses it throughout.
- **Never say "AI-powered"**, "revolutionary", "seamless", or "elevate".

---

## 4. Brand colours

**Exact values from the app's own palette.** Use them verbatim. The game
enforces a lint rule that forbids a raw hex anywhere outside its single palette
file; hold the same line here — declare these as CSS custom properties once,
then reference only the variables.

### Ground and surfaces

| Token          | Hex       | Use                                 |
| -------------- | --------- | ----------------------------------- |
| `--night-deep` | `#150A34` | Page background. The darkest ground |
| `--night`      | `#2A1758` | Section backgrounds, one step up    |
| `--panel`      | `#3A2670` | Cards, panels                       |
| `--panel-top`  | `#4A3488` | Card top edge, hover state, borders |
| `--soot`       | `#0A051A` | Footer, deepest wells               |

### Text

| Token         | Hex       | Use                           |
| ------------- | --------- | ----------------------------- |
| `--ink`       | `#F4ECFF` | Body text, headings           |
| `--ink-muted` | `#B7A6E6` | Secondary text, captions      |
| `--on-gold`   | `#3A2306` | Text on gold. **Never white** |

### Gold — the accent that carries the brand

| Token           | Hex       | Use                          |
| --------------- | --------- | ---------------------------- |
| `--gold`        | `#FFC94B` | Primary accent, the wordmark |
| `--gold-light`  | `#FFDE86` | Gradient top                 |
| `--gold-sheen`  | `#FFD170` | Gloss on buttons             |
| `--gold-bronze` | `#E7A32E` | Deeper gold                  |
| `--gold-dark`   | `#B7801C` | Gradient bottom, borders     |
| `--gold-pale`   | `#FFEFB4` | Highlights                   |
| `--lamp`        | `#FFBE64` | Warm glow behind the hero    |

### Green — the action colour

| Token             | Hex       | Use            |
| ----------------- | --------- | -------------- |
| `--accent`        | `#37D26B` | Success, ticks |
| `--accent-bright` | `#7BF0A6` | Highlight      |
| `--accent-dark`   | `#1C9647` | Pressed state  |

### The liquids

The twelve puzzle colours, in the order the game introduces them. Use for
decoration — hero vials, a colour strip, list bullets. **Never for body text**;
several are far too bright on the dark ground.

| Name      | Hex       |
| --------- | --------- |
| Coral     | `#FF4242` |
| Mango     | `#FF8A1E` |
| Plum      | `#A24DFF` |
| Lime      | `#A6E82A` |
| Aqua      | `#22C9EC` |
| Rose      | `#FF4FA6` |
| Blueberry | `#3B7BFF` |
| Grape     | `#7B3FF2` |
| Tangerine | `#FFCE1F` |
| Teal      | `#14C7B2` |
| Fern      | `#00902D` |
| Olive     | `#5A6C12` |

### How the palette behaves

- **The site is dark. There is no light mode.** The app has exactly one look.
  Do not add a theme toggle, and do not write a `prefers-color-scheme` block
  that lightens anything.
- **Gold is for one thing per viewport.** The wordmark, or the primary button
  — not both competing. Gold everywhere reads as a casino, not an apothecary.
- **Text on gold is `--on-gold`.** White on `#FFC94B` is roughly 1.9:1 and
  fails WCAG outright. This is the easiest mistake to make on this palette.
- **Surfaces get lighter as they come forward**: `--night-deep` for the page,
  `--night` for a section band, `--panel` for a card on top of that.
- **Borders are `--panel-top` at low opacity**, not grey. A neutral grey
  hairline reads as a dashboard.

---

## 5. Typography

**Poppins**, which is what the app bundles.

- Weights 400, 500, 600, 700. Load via `next/font/google` so it is
  self-hosted and there is no layout shift.
- Headings 600–700, tight tracking (`-0.02em` on large sizes).
- Body 400, line height 1.6.
- The wordmark **DECANT** is 700, uppercase, `letter-spacing: 0.12em`, with
  the gold gradient clipped to the text.

```tsx
// app/layout.tsx
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});
```

---

## 6. Stack and project shape

**Next.js App Router, TypeScript, Tailwind CSS v4, statically exported.**

There is no backend, no database, no API route and no dynamic rendering. Every
page is static HTML.

```text
app/
  layout.tsx           root layout, fonts, metadata, JSON-LD
  page.tsx             the marketing page
  globals.css          design tokens + Tailwind
  privacy/page.tsx     privacy policy (full text in §13)
  terms/page.tsx       terms of use (full text in §14)
  not-found.tsx        404
components/
  Header.tsx
  Hero.tsx
  HowItWorks.tsx
  Features.tsx
  Gallery.tsx
  Honest.tsx           the "what it does not do" section
  Faq.tsx
  Footer.tsx
  StoreButtons.tsx     shared, used in hero + footer
  PhoneFrame.tsx       wraps a screenshot in a device bezel
  Wordmark.tsx
lib/
  content.ts           all copy as typed constants
  stores.ts            store URLs in one place
public/
  images/              screenshots (placeholders for now)
  icon.png             the real app icon
```

### Rules

- **Server components by default.** The only client components should be the
  FAQ accordion and the mobile menu. Mark them `'use client'` and nothing
  else.
- **All copy lives in `lib/content.ts`**, typed, not scattered through JSX.
  Every string on this site is in §7–§12 below; put them there.
- **Store URLs live in `lib/stores.ts`.** One file to edit when the listings
  go live.
- **No UI component library.** This is one page; a component kit is more
  bytes than the entire site should weigh.
- **No animation library.** CSS transitions and one or two keyframe
  animations cover everything here.

### Static export

```ts
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default config;
```

`output: 'export'` disables the Image Optimization API, which needs a server —
hence `unoptimized`. Ship correctly sized files instead; see §12.

---

## 7. Design tokens

Put this in `app/globals.css`. It is the only place a hex may appear.

```css
@import 'tailwindcss';

@theme {
  /* Ground and surfaces */
  --color-night-deep: #150a34;
  --color-night: #2a1758;
  --color-panel: #3a2670;
  --color-panel-top: #4a3488;
  --color-soot: #0a051a;

  /* Text */
  --color-ink: #f4ecff;
  --color-ink-muted: #b7a6e6;
  --color-on-gold: #3a2306;

  /* Gold */
  --color-gold: #ffc94b;
  --color-gold-light: #ffde86;
  --color-gold-sheen: #ffd170;
  --color-gold-bronze: #e7a32e;
  --color-gold-dark: #b7801c;
  --color-gold-pale: #ffefb4;
  --color-lamp: #ffbe64;

  /* Action green */
  --color-accent: #37d26b;
  --color-accent-bright: #7bf0a6;
  --color-accent-dark: #1c9647;

  /* Liquids */
  --color-coral: #ff4242;
  --color-mango: #ff8a1e;
  --color-plum: #a24dff;
  --color-lime: #a6e82a;
  --color-aqua: #22c9ec;
  --color-rose: #ff4fa6;
  --color-blueberry: #3b7bff;
  --color-grape: #7b3ff2;
  --color-tangerine: #ffce1f;
  --color-teal: #14c7b2;
  --color-fern: #00902d;
  --color-olive: #5a6c12;

  --font-sans: var(--font-poppins), system-ui, sans-serif;
}

:root {
  color-scheme: dark;
}

body {
  background: var(--color-night-deep);
  color: var(--color-ink);
}

/* The two gradients the app uses everywhere */
.grad-gold {
  background-image: linear-gradient(
    180deg,
    var(--color-gold-light) 0%,
    var(--color-gold) 55%,
    var(--color-gold-dark) 100%
  );
}

.grad-panel {
  background-image: linear-gradient(
    135deg,
    var(--color-panel-top) 0%,
    var(--color-panel) 100%
  );
}

/* Wordmark: gold gradient clipped to the letters */
.wordmark {
  background-image: linear-gradient(
    180deg,
    var(--color-gold-light) 0%,
    var(--color-gold) 55%,
    var(--color-gold-dark) 100%
  );
  background-clip: text;
  color: transparent;
  letter-spacing: 0.12em;
  font-weight: 700;
  text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Component patterns

**Primary button** — gold gradient, dark text, no bottom lip. The app's design
notes call out the raised bevel as an explicit correction: buttons are flat and
glossy, and press down by 2px.

```tsx
<a
  className="grad-gold inline-flex items-center rounded-2xl px-7 py-4
             font-semibold text-on-gold shadow-lg
             transition-transform active:translate-y-0.5"
>
  Get the game
</a>
```

**Card** — panel gradient, hairline border, generous radius.

```tsx
<div className="grad-panel rounded-3xl border border-panel-top/60 p-7">
```

**Section band** — alternate `--night-deep` and `--night` down the page so
sections separate without dividing lines.

---

## 8. Page structure

One page, eight sections, in this order.

### 8.1 Header

Sticky. Background `--night-deep` at 80% with `backdrop-blur`. A hairline
bottom border in `--panel-top` at low opacity.

- Left: the **DECANT** wordmark, ~20px
- Right: `Features` · `FAQ` · `Privacy`, then a small gold `Get the game`
  button that scrolls to the hero buttons

Under 768px: drop the links, keep the wordmark and the button.

### 8.2 Hero

The most important 600 pixels on the site. Two columns on desktop, stacked on
mobile with the text first.

**H1** (the only `<h1>` on the site):

> Pour. Sort. Unwind.

**Sub-headline:**

> A water sort puzzle with no timer, no lives, and no way to lose. Just
> coloured liquid, glass vials, and as long as you like.

**Buttons:** the two store badges. See §11.

**Under the buttons**, small, `--ink-muted`:

> Free · Works offline · No account needed

**Right column:** `hero-board` screenshot in a phone frame, with a large soft
radial glow behind it in `--lamp` at ~12% opacity, fading to nothing. The glow
is what makes the composition feel lamplit rather than flat.

Optional, worth it if time allows: three CSS-drawn vials drifting slowly
behind the phone, filled with bands of the liquid colours. The app's own home
screen does exactly this, so it is on-brand rather than decoration. Drift
slowly — 20s+ per cycle — and stop entirely under `prefers-reduced-motion`.

### 8.3 How it works

Three steps. Side by side on desktop, stacked on mobile. Each is a numbered
badge in gold, a two-word heading, one sentence.

1. **Tap to lift** — Tap a vial and it rises out of the rack.
2. **Tap to pour** — Tap another. Liquid moves onto its own colour, or into
   empty space.
3. **Sort them all** — When every vial holds a single colour, the board is
   done.

### 8.4 Features

Six cards, three columns on desktop, one on mobile. Heading plus one or two
sentences. Skip icons unless they would be specific — generic icons are worse
than none.

**No pressure**
No timer and no fail state. Undo any move, restart whenever, put it down in
the middle of a puzzle and pick it up tomorrow.

**Puzzles that never run out**
Every board is generated and machine-checked to be solvable before you see it.
Nobody hands you a level that cannot be finished.

**Three difficulties**
Gentle for room to breathe, Classic for the curve most people want, Fiendish
for twelve colours and a single spare vial.

**Hints that actually help**
A hint shows the next pour, and it is always drawn from the shortest way home
— never a detour that costs you stars.

**A new brew daily**
One fresh puzzle every day, tuned to how far you have come. Come back
tomorrow and keep the streak.

**Made to be read**
Colourblind marks give every colour its own symbol, so the board works whether
or not you can tell two purples apart.

### 8.5 Screenshot gallery

Horizontal strip of five phone screenshots. Scroll-snapped and swipeable on
mobile, laid flat on desktop.

Caption underneath, small, centred, `--ink-muted`:

> Every board is generated. No two players get the same run.

### 8.6 The honest bit

Short and quiet — one centred column, no card. Unusual for a game site and
deliberate: it is the part that makes everything above it credible.

**Heading:** What it does not do

> Decant is free, and ads are how it pays for itself. You will see one between
> levels now and then, and you can choose to watch one for a spare vial when a
> board has you stuck. That is the whole arrangement.
>
> There is no account, no sign-up and nothing to log in to. Your progress is
> saved on your phone, not on a server. The game works with no connection at
> all.

### 8.7 FAQ

Accordion, one open at a time. Use native `<details>`/`<summary>` styled with
CSS — it is keyboard accessible and needs no JavaScript.

**Is it free?**
Yes. It is supported by ads. Rewarded ads — the ones that give you a spare
vial or coins — are always your choice.

**Do I need an internet connection?**
No. The game is fully playable offline. Ads need a connection; nothing else
does.

**Do I need an account?**
No. There is no sign-up and no login. Your progress is stored on your device.

**How many levels are there?**
Levels are generated rather than hand-built, so there is no end to reach.
Every one is checked to be solvable before it reaches you.

**Is it colourblind friendly?**
There is a setting that puts a distinct symbol on every colour, so a board can
be read by shape as well as by hue.

**Will my progress carry to a new phone?**
Progress is saved on the device. If your phone backs up to Google Drive or
iCloud, that backup may include it — but there is no account to sign in to, so
we cannot move it for you.

**Which devices does it run on?**
Android and iOS, phones and tablets.

### 8.8 Footer

`--soot` background, generous top padding.

- The wordmark, small, and a one-line description
- Store badges again
- Links: `Privacy policy` · `Terms` · `Support` (a `mailto:`)
- `© [year] TODO(owner). All rights reserved.`

---

## 9. Metadata

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://TODO-domain.com'),
  title: 'Decant — Water Sort Puzzle | No timers, no fails',
  description:
    'A calm water sort puzzle. Pour coloured liquid between vials until ' +
    'each holds a single colour. No timer, no lives, no way to lose. ' +
    'Free on Android and iOS.',
  applicationName: 'Decant',
  keywords: [
    'water sort puzzle',
    'colour sort game',
    'relaxing puzzle game',
    'offline puzzle game',
    'no timer puzzle',
    'vial sort',
  ],
  openGraph: {
    type: 'website',
    title: 'Decant — Water Sort Puzzle',
    description:
      'Pour coloured liquid between vials until each holds one colour. ' +
      'No timer, no lives, no way to lose.',
    images: [{ url: '/images/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decant — Water Sort Puzzle',
    description: 'A calm water sort puzzle. No timers, no fails.',
    images: ['/images/og-image.png'],
  },
  icons: { icon: '/icon.png', apple: '/icon.png' },
};

export const viewport = {
  themeColor: '#150A34',
};
```

### Structured data

One `<script type="application/ld+json">` in the root layout.

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Decant: Water Sort Puzzle",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Android, iOS",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

**Omit `aggregateRating` entirely** until real ratings exist. A fabricated one
violates Google's structured data policy and risks a manual action.

Also ship `robots.txt` and a `sitemap.ts` covering the three pages.

---

## 10. Images

**No real screenshots exist yet.** Build with placeholders and make the swap
trivial: one `<Image>` per slot, correct aspect ratio, real `alt` text, and
the filename below.

A placeholder can be a flat `--panel` rectangle with the slot name on it. What
matters is that **the aspect ratio is right**, so nothing reflows when the
real files land.

| Slot          | File                      | Ratio    | Will show                   |
| ------------- | ------------------------- | -------- | --------------------------- |
| `hero-board`  | `/images/hero-board.png`  | 9:19.5   | Mid-game board, part sorted |
| `shot-home`   | `/images/shot-home.png`   | 9:19.5   | Home screen and vial rack   |
| `shot-board`  | `/images/shot-board.png`  | 9:19.5   | A board being played        |
| `shot-win`    | `/images/shot-win.png`    | 9:19.5   | Win screen with three stars |
| `shot-daily`  | `/images/shot-daily.png`  | 9:19.5   | The daily brew screen       |
| `shot-stages` | `/images/shot-stages.png` | 9:19.5   | Level grid with stars       |
| `icon`        | `/icon.png`               | 1:1      | App icon — **this is real** |
| `og-image`    | `/images/og-image.png`    | 1200×630 | Social preview card         |

9:19.5 is a modern phone. Every screenshot sits inside a CSS phone frame:
`border-radius` about 12% of the width, a 2px `--panel-top` border, and a soft
shadow. No notch, no home indicator — a plain rounded slab reads as a phone
without dating the design.

Ask the game's owner for `assets/icon.png` from the app repo; it is finished
and can be used today for the favicon, the header mark and the OG card.

**Alt text**, written properly rather than "screenshot":

- `hero-board` — "A Decant puzzle in progress, with several vials already
  sorted into single colours"
- `shot-win` — "The level complete screen showing three stars"

---

## 11. Store buttons

**The app is not published, so no store URLs exist yet.**

Build `lib/stores.ts` and point everything through it:

```ts
export const STORES = {
  play: {
    label: 'Get it on Google Play',
    url: null as string | null, // TODO(owner)
  },
  apple: {
    label: 'Download on the App Store',
    url: null as string | null, // TODO(owner)
  },
};
```

When `url` is `null`, render the button **disabled** with a `Coming soon`
label rather than a dead link to `#`. A link that goes nowhere is worse than
one that says it is not ready.

Both platforms have strict badge rules:

- Use the **official badge artwork**. Do not redraw, recolour, or place it on
  a gold background.
- Keep the required clear space around each badge.
- If the badges look wrong this early, a plain gold `Get the game` button is a
  fine placeholder. Do not invent something that looks official.

---

## 12. Technical requirements

- **Static export.** Deployable to Vercel, Netlify, Cloudflare Pages or a
  plain bucket. No server, no environment variables, no secrets.
- **Budget: under 200KB of JS.** A one-page static site that ships a megabyte
  of JavaScript is a failure regardless of how it looks.
- **Lighthouse 95+** on all four categories, mobile profile.
- **Responsive** from 320px to 2560px. Test at 360px — that is a real phone,
  and it is what most visitors will be on.
- **Accessible:**
  - Every image has meaningful `alt`
  - Every interactive element is keyboard reachable, with a visible focus ring
    (gold, 2px, offset)
  - Contrast meets WCAG AA — `--ink` on `--night-deep` is ~13:1, `--on-gold`
    on `--gold` is ~9:1, both fine; `--ink-muted` on `--night-deep` is ~6:1,
    fine for body but do not go smaller than 14px with it
  - One `<h1>`, headings in order, no level skipped
  - The app ships colourblind support; a site that fails contrast would be a
    poor advert for it
- **`prefers-reduced-motion` respected** — the global rule in §7 covers it.
- **No cookie banner**, because nothing should set a cookie. If analytics is
  wanted later, use a cookieless service such as Plausible or Fathom; do not
  add Google Analytics, which would force a consent banner onto a site whose
  whole pitch is that it collects nothing.
- **Legal pages must render without JavaScript** and return HTTP 200. Some
  store reviewers fetch them with a plain HTTP client, and a page that needs
  JS to show its text will read as empty.

---

## 13. Privacy policy — full text

Publish at `/privacy`. **This URL goes in both store consoles and inside the
app, so it must never move.**

Replace `[PUBLISHER]`, `[CONTACT]` and `[DATE]` before publishing. Everything
else is written from what the app actually does, verified against its source —
there is no `fetch`, no socket and no analytics service anywhere in it. Every
byte that leaves the device belongs to Google's ad SDK.

**Have someone qualified read this before it goes live.** It is accurate, but
accurate is not the same as legally reviewed.

```markdown
# Privacy Policy for Decant

**Last updated: [DATE]**

Decant is a water sort puzzle game published by [PUBLISHER]. This policy
explains what happens to information when you play it.

The short version: the game itself collects nothing about you and sends
nothing anywhere. It shows ads, and the advertising service that supplies
them does collect information. That section is the one worth reading.

## Information we collect

**None.**

Decant has no accounts, no sign-in and no server. We do not ask for your
name, email address, phone number or location, and there is nowhere for us
to send them if we did.

## Information stored on your device

The game saves your progress so you can close it and come back. This stays
on your device, in the app's private storage, and is never transmitted to
us:

- which levels you have finished, your star ratings and your best scores
- the puzzle you are part way through, so a level survives closing the app
- your coin balance, daily reward streak and anything you have unlocked
- your settings, including sound, haptics, difficulty and colourblind marks
- a short diagnostic log of recent in-game actions — levels started and
  finished, hints used, rewards claimed — kept so a fault can be
  investigated if you report one

That last item goes nowhere. There is no analytics service, no account and
no network call behind it; it is a rolling record of the last couple of
hundred actions, overwritten as you play, readable only on your own device.

Uninstalling the app deletes all of it.

If you have device backups switched on — Google Drive on Android, iCloud on
iOS — your operating system may include this saved data in its backup. That
backup belongs to you and your platform account. We have no access to it.

## Advertising

Decant shows ads through **Google AdMob**. Ads are how the game pays for
itself, and rewarded ads are optional: you choose to watch one in exchange
for a spare vial or extra coins.

To serve and measure ads, Google may collect information including:

- your device's advertising identifier
- approximate (coarse) location
- how you interact with ads and with the app
- device, performance and crash information

**We never see any of this.** It goes to Google, not to us, and we receive
only aggregate earnings figures that identify no one.

Google's own privacy policy governs that data:
https://policies.google.com/privacy

You can read how Google uses information from apps that use its services
at: https://policies.google.com/technologies/partner-sites

### Your choices about advertising

- **In the European Economic Area, the UK and Switzerland**, you are asked
  for consent before any personalised advertising happens, through Google's
  own consent form. You can decline, and you will still be able to play and
  to earn rewards. Ads will simply be less relevant.
- **On iOS**, the system asks separately whether Decant may track your
  activity across other companies' apps and websites. Declining is fine and
  costs you nothing in the game. You can change this later in
  **Settings → Privacy & Security → Tracking**.
- **On Android**, you can reset or delete your advertising ID in
  **Settings → Google → Ads**.

## Notifications

If you turn on the daily reminder, Decant schedules a notification on your
device to tell you when your reward is ready. This is scheduled and
delivered entirely by your phone. There is no push server, we send you
nothing, and no notification token or device identifier is created or
transmitted.

You can turn reminders off inside the game or in your system settings.

## Purchases

Decant does not currently sell anything. Coins are earned by playing and
exist only on your device; they have no cash value and cannot be
transferred. If paid items are added later, this policy will be updated
before they ship.

## Children

Decant is suitable for a general audience but is **not directed to
children**, and we do not knowingly collect information from anyone under
13 (or the equivalent age in your country). Advertising in the app is
limited to content rated for general audiences.

If you believe a child has provided information to us, contact [CONTACT]
and we will act on it.

## Your rights

Because we hold no information about you, there is nothing for us to hand
over, correct or erase on request. To remove everything Decant has stored,
uninstall the app and, if you use device backups, delete the app's data
from your platform backup.

For information Google holds, use the choices listed under **Advertising**
above, or contact Google directly.

## Data security

Saved game data stays in your device's app-private storage, protected by
the operating system's own sandboxing. Because none of it is transmitted or
stored by us, there is no server of ours that could be breached.

## Changes to this policy

If this policy changes, the updated version will be published at this same
address with a new date at the top. Material changes will also be noted in
the app's release notes.

## Contact

Questions about this policy: **[CONTACT]**
```

---

## 14. Terms of use — full text

Publish at `/terms`. Same caveat: **have it reviewed.** This is a plain,
honest starting point for a free game that sells nothing, not a substitute for
advice.

```markdown
# Terms of Use

**Last updated: [DATE]**

These terms cover your use of Decant, a mobile game published by
[PUBLISHER]. By installing or playing it, you agree to them.

## The licence

We give you a personal, non-exclusive, non-transferable licence to install
and play Decant on devices you own or control, for your own
non-commercial use.

You may not sell, rent, sub-licence or redistribute the app, modify or
reverse-engineer it except where the law expressly allows, or use it to
break any law.

## What the game costs

Decant is free to download and play. It is funded by advertising.

Coins earned in the game are a feature of the game, not currency. They
have no monetary value, cannot be exchanged for money or transferred to
anyone else, and may be adjusted or reset if we have to correct a fault.

## Your saved progress

Your progress is stored on your own device. We do not hold a copy, and we
cannot recover, restore or transfer it for you. Uninstalling the app
deletes it.

## Advertising

The app shows advertisements supplied by Google AdMob. Advertisements come
from third parties and we do not control their content. Anything you buy
or agree to with an advertiser is between you and them.

## Availability

We may update, change or discontinue the app at any time. We do not
promise it will always be available or free of faults.

## Disclaimer

The app is provided "as is", without warranties of any kind, to the extent
the law allows. We do not warrant that it will be uninterrupted or
error-free.

## Limitation of liability

To the extent the law allows, we are not liable for any indirect or
consequential loss arising from your use of the app.

Nothing in these terms limits liability that cannot be limited by law,
including for death or personal injury caused by negligence.

## Changes

We may update these terms. The current version will always be at this
address, with the date it took effect at the top.

## Contact

Questions: **[CONTACT]**
```

---

## 15. Things not to do

Each one is a mistake this specific page invites:

- **No light mode.** The app is dark. One look.
- **No white text on gold.** `--on-gold` exists for exactly this.
- **No invented ratings, download counts or testimonials.** Nothing has
  shipped.
- **No level count.** Levels are generated.
- **No newsletter signup.** There is nothing to send anyone.
- **No cookie banner** on a site that sets no cookies.
- **No stock photos of relaxed people.** Show the game.
- **No fast hero animation.** If the vials move, they drift. The product is
  calm and the page should be too.
- **No dead `#` links on the store buttons.** Disabled and honest beats
  clickable and broken.
- **No `aggregateRating` in the structured data.**

---

## 16. Open questions

Answer before launch. None blocks a first build — use the placeholders and
leave a `TODO(owner)` comment at each site.

| #   | Question                      | Blocks                        |
| --- | ----------------------------- | ----------------------------- |
| 1   | Domain name                   | Canonical URLs, OG tags       |
| 2   | Support email                 | Both store forms, the footer  |
| 3   | Legal entity name and address | Privacy policy, terms, footer |
| 4   | Play Store URL                | Store buttons                 |
| 5   | App Store URL                 | Store buttons                 |
| 6   | Real screenshots              | Every image slot in §10       |
| 7   | Legal review of §13 and §14   | Publishing either page        |

Items 4 and 5 arrive only once the listings are live, so the site must be
built and deployable without them. That is why §11 specifies a disabled
button rather than a placeholder link.
