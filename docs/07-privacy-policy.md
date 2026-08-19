# 07 — Privacy policy

**Published 19 Aug 2026** at
<https://decant-website-rho.vercel.app/privacy/> — the source of truth is now
that page, not this file. This one stays as the reasoning behind the wording
and as the notes for whoever files the store forms.

**Still not read by a lawyer.** That was one of three preconditions and it is
the one still outstanding; the other two — filling the placeholders and hosting
at a public URL — are done.

The text below is written from what the code actually does, checked rather than
assumed: there is no `fetch`, no `XMLHttpRequest` and no socket anywhere in
`src/` or in the three local native modules. Every byte that leaves the device
belongs to the Google Mobile Ads SDK. If that ever stops being true — an
analytics vendor, a crash reporter, a leaderboard — this file is wrong the same
day, and the store forms filed against it are wrong too.

## The filled values

| Placeholder    | Value                                            |
| -------------- | ------------------------------------------------ |
| `[PUBLISHER]`  | Walqalum Games                                   |
| `[CONTACT]`    | `games.walqalum@gmail.com`                       |
| `[POLICY_URL]` | `https://decant-website-rho.vercel.app/privacy/` |
| `[DATE]`       | 19 August 2026                                   |

**Four places hold that URL and they have to move together**: the site itself
(`decant-web`, in both the page copy and `metadataBase`), `PRIVACY_URL` in
`src/ui/chrome/SettingsDrawer.tsx`, the Play Console App content form, and
AdMob. A policy citing a URL it is not served from is the kind of mismatch a
reviewer checks for.

**The trailing slash is canonical.** `decant-web` sets `trailingSlash` in its
Next config, so `/privacy` 308s to `/privacy/`. File the slashed form
everywhere — a redirect works in a browser and is one more thing between a
crawler and the document.

The site is on an auto-generated Vercel hostname, which is the weak part. It
changes if the Vercel project is renamed, and a dead privacy URL on a live
listing is a policy strike rather than a broken link. `vercel.app` is also a
shared public-suffix domain, which is a weaker ownership signal for
`app-ads.txt` than a domain we control — unverified whether AdMob minds. A
subdomain of `walqalum.com` pointed at the same deployment fixes both and was
offered; the Vercel host was kept for launch.

The `Privacy policy` row in `src/ui/chrome/SettingsDrawer.tsx` opens it. The
row already showed a one-paragraph summary — it was never dead, contrary to
what this file used to say — and now carries a `Read policy` button beside
`Close`. The summary gained a line about Google's collection, because a
summary that says only "we collect nothing" is misleading about the half that
matters.

---

## Privacy Policy for Decant

**Last updated: [DATE]**

Decant is a water sort puzzle game published by [PUBLISHER]. This policy
explains what happens to information when you play it.

The short version: the game itself collects nothing about you and sends nothing
anywhere. It shows ads, and the advertising service that supplies them does
collect information. That section is the one worth reading.

### Information we collect

**None.**

Decant has no accounts, no sign-in and no server. We do not ask for your name,
email address, phone number or location, and there is nowhere for us to send
them if we did.

### Information stored on your device

The game saves your progress so you can close it and come back. This stays on
your device, in the app's private storage, and is never transmitted to us:

- which levels you have finished, your star ratings and your best scores
- the puzzle you are part way through, so a level survives closing the app
- your coin balance, daily reward streak and anything you have unlocked
- your settings, including sound, haptics, difficulty and colourblind marks
- a short diagnostic log of recent in-game actions — levels started and
  finished, hints used, rewards claimed — kept so a fault can be investigated
  if you report one

That last item goes nowhere. There is no analytics service, no account and no
network call behind it; it is a rolling record of the last couple of hundred
actions, overwritten as you play, readable only on your own device.

Uninstalling the app deletes all of it.

If you have device backups switched on — Google Drive on Android, iCloud on
iOS — your operating system may include this saved data in its backup. That
backup belongs to you and your platform account. We have no access to it.

### Advertising

Decant shows ads through **Google AdMob**. Ads are how the game pays for
itself, and rewarded ads are optional: you choose to watch one in exchange for
a spare vial or extra coins.

To serve and measure ads, Google may collect information including:

- your device's advertising identifier
- approximate (coarse) location
- how you interact with ads and with the app
- device, performance and crash information

**We never see any of this.** It goes to Google, not to us, and we receive only
aggregate earnings figures that identify no one.

Google's own privacy policy governs that data:
<https://policies.google.com/privacy>

You can read how Google uses information from apps that use its services at:
<https://policies.google.com/technologies/partner-sites>

#### Your choices about advertising

- **In the European Economic Area, the UK and Switzerland**, you are asked for
  consent before any personalised advertising happens, through Google's own
  consent form. You can decline, and you will still be able to play and to earn
  rewards. Ads will simply be less relevant.
- **On iOS**, the system asks separately whether Decant may track your activity
  across other companies' apps and websites. Declining is fine and costs you
  nothing in the game. You can change this later in
  **Settings → Privacy & Security → Tracking**.
- **On Android**, you can reset or delete your advertising ID in
  **Settings → Google → Ads**.

### Notifications

If you turn on the daily reminder, Decant schedules a notification on your
device to tell you when your reward is ready. This is scheduled and delivered
entirely by your phone. There is no push server, we send you nothing, and no
notification token or device identifier is created or transmitted.

You can turn reminders off inside the game or in your system settings.

### Purchases

Decant does not currently sell anything. Coins are earned by playing and exist
only on your device; they have no cash value and cannot be transferred. If
paid items are added later, this policy will be updated before they ship.

### Children

Decant is suitable for a general audience but is **not directed to children**,
and we do not knowingly collect information from anyone under 13 (or the
equivalent age in your country). Advertising in the app is limited to content
rated for general audiences.

If you believe a child has provided information to us, contact [CONTACT] and we
will act on it.

### Your rights

Because we hold no information about you, there is nothing for us to hand over,
correct or erase on request. To remove everything Decant has stored, uninstall
the app and, if you use device backups, delete the app's data from your
platform backup.

For information Google holds, use the choices listed under **Advertising**
above, or contact Google directly.

### Data security

Saved game data stays in your device's app-private storage, protected by the
operating system's own sandboxing. Because none of it is transmitted or stored
by us, there is no server of ours that could be breached.

### Changes to this policy

If this policy changes, the updated version will be published at [POLICY_URL]
with a new date at the top. Material changes will also be noted in the app's
release notes.

### Contact

Questions about this policy: **[CONTACT]**

---

## Notes for whoever files the store forms

Keep these consistent with the policy. They are separate declarations and
reviewers compare them.

- **Play Data Safety** — declare the advertising ID as collected and shared for
  advertising. Confirmed present in the merged release manifest as
  `com.google.android.gms.permission.AD_ID`, alongside three
  `ACCESS_ADSERVICES_*` permissions. Everything else the app stores is
  on-device only and is not "collected" under Google's definition.
- **Apple App Privacy labels** — declare what Google's SDK declares, not what
  the app does. Its own manifest at
  `GoogleMobileAds.framework/PrivacyInfo.xcprivacy` lists seven types; Device
  ID is the only one marked as used for tracking.
- **Target audience** — general audience, **not** child-directed. Tagging the
  app as child-directed would force non-personalised ads on everyone and cut
  revenue sharply, and it is not what this game is.
- **`src/ads/setup.ts` sets `MaxAdContentRating.G`** — a ceiling on ad content,
  which is a different question from who the app is aimed at. Do not let the
  two get conflated on a form.
