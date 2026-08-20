# 🚀 JobPilot — your job-hunt command center

Applying to jobs one-by-one across LinkedIn, Naukri, Indeed, Wellfound, Internshala, Foundit, Shine, Y Combinator and more is exhausting. **JobPilot** removes the busywork — search every board in one shot, beat the ATS filters, generate the messages that actually get replies, and track every application in one place.

Built for people grinding the job hunt. Free, open, and runs entirely in your browser.

> **Live demo:** _add your deployed link here_

---

## Why it's built this way (please read)

You'll notice JobPilot does **not** log into your accounts and auto-submit applications for you. That's a deliberate choice, not a missing feature:

- **LinkedIn, Naukri and Indeed permanently ban accounts that use automation** to apply — it violates their Terms of Service. A tool that got its users banned would do more harm than good.
- **Mass "spray-and-pray" applying lowers your callback rate.** Recruiters and ATS software filter out generic bulk applications. 20 tailored applications beat 500 blind ones.

So JobPilot automates everything *around* applying — the searching, the keyword-matching, the writing, the tracking — and keeps **you** on the submit button. That's the version that's both safe and actually effective.

---

## Features

- **Launchpad** — Enter your keywords once, pick your sites, and open every board's search pre-filled in one click. Popup-safe (clickable link rows too). Recent searches are saved for one-tap re-runs.
- **Match Scanner** — Paste a job description + your skills and get a keyword-match score, the terms you already have, and the terms you're missing — so you can tune your resume to pass ATS filters.
- **Outreach** — Generate a tailored **cover letter**, **referral request**, or **follow-up** message. Edit freely, copy, send. Optional one-click **AI enhance** (uses your own API key).
- **Tracker** — Log every application, move it through the pipeline (Saved → Applied → Interview → Offer → Rejected), and get an automatic ⏰ nudge when something has had no reply for 7+ days. The ★ button finds someone at the company to ask for a referral. Export to CSV or back up to JSON.
- **Dashboard** — A daily-goal momentum ring, a day streak, response rate, your pipeline, and a breakdown of where you're applying. Generate a clean **summary report** to copy or download.
- **Profile** — Set your details once; they pre-fill everything else. Stored only on your device.

---

## Run it locally

No build step, no dependencies. Either:

1. **Just open it** — double-click `index.html`. (Some browsers restrict a few features on `file://`; if so, use option 2.)
2. **Serve it** (recommended):
   ```bash
   # Python
   python3 -m http.server 5173
   # then open http://localhost:5173
   ```
   or
   ```bash
   npx serve .
   ```

---

## Deploy a live link (free) to share

Pick whichever is easiest:

**Netlify Drop (fastest — no account setup needed for a quick link)**
1. Go to <https://app.netlify.com/drop>
2. Drag the whole `jobpilot` folder onto the page.
3. You get a live URL in seconds. Share that.

**Vercel**
1. Push this folder to a GitHub repo.
2. Import it at <https://vercel.com/new>. Framework preset: **Other**. No build command, output directory = root.
3. Deploy → you get a `*.vercel.app` link.

**GitHub Pages**
1. Push to a repo named e.g. `jobpilot`.
2. Repo → Settings → Pages → Source: `main` branch, `/ (root)`.
3. Your site goes live at `https://<your-username>.github.io/jobpilot/`.

---

## Optional: AI-enhanced messages

The **✦ Enhance with AI** button in Outreach is optional. To turn it on, open **Profile → AI enhance** and paste your own Anthropic API key. It's stored only in your browser and called directly from your device. Everything else works with no key at all.

> Note: calling the API from a browser exposes the key to that browser session. Use your own key on your own device; don't ship a shared key in a public deployment.

---

## Customize

- **Add / edit job sites:** open `js/config.js` and edit the `SITES` array. Each site just needs a `build(keywords, location)` function that returns its search URL. Sites occasionally change their URL formats — if a link stops landing on results, tweak it here.
- **Statuses, colors, defaults:** also in `js/config.js` and the top of `js/app.js`.

---

## Privacy

Everything you enter (profile, applications, searches) is stored in your browser's `localStorage` and never leaves your device. There's no backend and no tracking. Use **Profile → Erase all my data** to wipe it anytime, or **Backup (JSON)** to move it between devices.

---

## Tech

Plain HTML + CSS + vanilla JavaScript. No framework, no build, no server. Works on any modern browser and any static host.

## License

MIT — free to use, modify, and share. See `LICENSE`.
