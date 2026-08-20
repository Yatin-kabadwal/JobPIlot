/* ============================================================
   JobPilot — application logic (vanilla JS, no build step)
   State lives in your browser (localStorage). Nothing is sent
   anywhere except optional AI enhancement, which uses YOUR key.
   ============================================================ */

/* ---------- tiny helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return n;
};
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function toast(msg, kind = "ok") {
  const t = el("div", { class: `toast toast--${kind}` }, msg);
  $("#toasts").appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 300); }, 2600);
}
async function copyText(text, label = "Copied to clipboard") {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch { toast("Press Ctrl/Cmd+C to copy", "warn"); }
}
function download(filename, text, type = "text/plain") {
  const a = el("a", { href: URL.createObjectURL(new Blob([text], { type })), download: filename });
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- state ---------- */
const KEY = "jobpilot_state_v1";
const DEFAULT_STATE = {
  profile: { name: "", location: "", keywords: "", skills: "", resumeUrl: "", portfolioUrl: "", linkedinUrl: "", dailyGoal: 5 },
  savedSearches: [],
  applications: [],
  settings: { apiKey: "", aiModel: "claude-sonnet-4-6" },
};
let STATE = load();
function load() {
  try { return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return structuredClone(DEFAULT_STATE); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(STATE)); }

/* ============================================================
   NAVIGATION
   ============================================================ */
const VIEWS = ["launchpad", "scanner", "toolkit", "tracker", "dashboard", "profile"];
function go(view) {
  VIEWS.forEach((v) => {
    $(`#view-${v}`).classList.toggle("hidden", v !== view);
    $(`#nav-${v}`).classList.toggle("active", v === view);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  render(view);
}

/* ============================================================
   LAUNCHPAD — pick keywords + sites, open pre-filled searches
   ============================================================ */
let selectedSites = new Set(SITES.map((s) => s.id));
function renderLaunchpad() {
  const grid = $("#site-grid"); grid.innerHTML = "";
  SITES.forEach((s) => {
    const on = selectedSites.has(s.id);
    grid.appendChild(el("button", {
      class: `sitecard ${on ? "on" : ""}`, type: "button", "aria-pressed": String(on),
      onclick: () => { on ? selectedSites.delete(s.id) : selectedSites.add(s.id); renderLaunchpad(); },
    },
      el("span", { class: "sitecard__code" }, s.code),
      el("span", { class: "sitecard__name" }, s.name),
      el("span", { class: "sitecard__tag" }, s.tag),
      el("span", { class: "sitecard__dot" }),
    ));
  });
  $("#lp-count").textContent = `${selectedSites.size} site${selectedSites.size === 1 ? "" : "s"} armed`;

  if (!$("#lp-kw").value && STATE.profile.keywords) $("#lp-kw").value = STATE.profile.keywords;
  if (!$("#lp-loc").value && STATE.profile.location) $("#lp-loc").value = STATE.profile.location;
}

function launchSearches() {
  const kw = $("#lp-kw").value.trim();
  const loc = $("#lp-loc").value.trim();
  if (!kw) { toast("Type at least one keyword to search for", "warn"); $("#lp-kw").focus(); return; }
  if (selectedSites.size === 0) { toast("Arm at least one site", "warn"); return; }

  const chosen = SITES.filter((s) => selectedSites.has(s.id));
  const links = chosen.map((s) => ({ site: s, url: s.build(kw, loc) }));

  // Render the link list first (always clickable — beats popup blockers)
  const box = $("#lp-results"); box.innerHTML = "";
  box.appendChild(el("div", { class: "results__head" },
    el("span", {}, `Search launched for “${kw}”${loc ? " · " + loc : ""}`),
    el("div", { class: "results__actions" },
      el("button", { class: "btn btn--ghost sm", onclick: () => copyText(links.map((l) => l.url).join("\n"), "All links copied") }, "Copy all links"),
    ),
  ));
  links.forEach((l, i) => {
    const row = el("a", { class: "resultrow", href: l.url, target: "_blank", rel: "noopener noreferrer", style: `animation-delay:${i * 45}ms` },
      el("span", { class: "resultrow__code" }, l.site.code),
      el("span", { class: "resultrow__name" }, l.site.name),
      el("span", { class: "resultrow__url" }, l.url.replace(/^https?:\/\//, "")),
      el("span", { class: "resultrow__go" }, "Open ↗"),
    );
    box.appendChild(row);
  });
  box.classList.remove("hidden");

  // Try to open them all. First reliably opens; rest may be blocked.
  let blocked = 0;
  links.forEach((l) => { const w = window.open(l.url, "_blank", "noopener"); if (!w) blocked++; });
  if (blocked > 0) toast(`${links.length - blocked} opened. Allow pop-ups to open all at once — or click the rows below.`, "warn");
  else toast(`Opened ${links.length} searches. Go apply!`);

  // Offer to save this search
  const exists = STATE.savedSearches.some((s) => s.kw === kw && s.loc === loc);
  if (!exists) {
    STATE.savedSearches.unshift({ id: uid(), kw, loc, sites: [...selectedSites], ts: Date.now() });
    STATE.savedSearches = STATE.savedSearches.slice(0, 12);
    save();
  }
  renderSavedSearches();
}

function renderSavedSearches() {
  const wrap = $("#lp-saved"); wrap.innerHTML = "";
  if (STATE.savedSearches.length === 0) { wrap.appendChild(el("p", { class: "muted sm" }, "Your recent searches will appear here for one-tap re-runs.")); return; }
  STATE.savedSearches.forEach((s) => {
    wrap.appendChild(el("div", { class: "chip" },
      el("button", { class: "chip__main", onclick: () => { $("#lp-kw").value = s.kw; $("#lp-loc").value = s.loc; selectedSites = new Set(s.sites); renderLaunchpad(); launchSearches(); } },
        `${s.kw}${s.loc ? " · " + s.loc : ""}`),
      el("button", { class: "chip__x", title: "Remove", onclick: () => { STATE.savedSearches = STATE.savedSearches.filter((x) => x.id !== s.id); save(); renderSavedSearches(); } }, "×"),
    ));
  });
}

/* ============================================================
   MATCH SCANNER — paste JD, see keyword match vs your skills
   ============================================================ */
const STOP = new Set(("a an and or the to of in for with on at is are be we you our your they their this that will able strong good work working experience years plus etc using use used across from into role team build built develop developed developing responsible responsibilities looking join company product platform including include end candidate candidates ideal must should have has knowledge skills skill required requirement requirements ability").split(/\s+/));
function tokenize(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+.#-]{1,}/g) || [])
    .map((w) => w.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));
}
function runScanner() {
  const jd = $("#sc-jd").value.trim();
  const mine = ($("#sc-skills").value.trim() || STATE.profile.skills || "");
  if (!jd) { toast("Paste a job description first", "warn"); return; }
  if (!mine) { toast("Add your skills (or fill them in Profile)", "warn"); return; }

  const mySet = new Set(tokenize(mine));
  // rank JD keywords by frequency
  const freq = {};
  tokenize(jd).forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const jdKeywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w]) => w);
  const top = jdKeywords.slice(0, 28);

  const matched = top.filter((w) => mySet.has(w));
  const missing = top.filter((w) => !mySet.has(w));
  const score = top.length ? Math.round((matched.length / top.length) * 100) : 0;

  const out = $("#sc-out"); out.innerHTML = "";
  out.appendChild(el("div", { class: "scanhead" },
    el("div", { class: `scoredial ${score >= 70 ? "hi" : score >= 45 ? "mid" : "lo"}`, style: `--val:${score}` },
      el("span", { class: "scoredial__num" }, String(score)), el("span", { class: "scoredial__pct" }, "%")),
    el("div", {},
      el("h4", {}, score >= 70 ? "Strong match" : score >= 45 ? "Partial match" : "Weak match"),
      el("p", { class: "muted sm" }, `${matched.length} of ${top.length} key terms from this JD appear in your skills. Add the missing ones (only if true) to your resume/summary to pass ATS filters.`)),
  ));
  out.appendChild(el("div", { class: "kwcols" },
    el("div", {}, el("div", { class: "kwlabel ok" }, "✓ You already have"), tagCloud(matched, "ok")),
    el("div", {}, el("div", { class: "kwlabel miss" }, "▲ Missing — consider adding"), tagCloud(missing, "miss")),
  ));
  out.appendChild(el("button", { class: "btn btn--ghost sm", onclick: () => copyText(missing.join(", "), "Missing keywords copied") }, "Copy missing keywords"));
  out.classList.remove("hidden");
}
function tagCloud(words, kind) {
  if (words.length === 0) return el("p", { class: "muted sm" }, "—");
  return el("div", { class: "tagcloud" }, words.map((w) => el("span", { class: `kw kw--${kind}` }, w)));
}

/* ============================================================
   TOOLKIT — cover letter / referral / follow-up generators
   ============================================================ */
function fillFromProfile(prefix) {
  if (STATE.profile.name) $(`#${prefix}-name`) && ($(`#${prefix}-name`).value ||= STATE.profile.name);
}
function genCover() {
  const p = STATE.profile;
  const name = $("#tk-name").value.trim() || p.name || "Your Name";
  const role = $("#tk-role").value.trim() || "the role";
  const company = $("#tk-company").value.trim() || "your company";
  const skills = $("#tk-skills").value.trim() || p.skills || "my core stack";
  const win = $("#tk-win").value.trim() || "shipped production features end to end";

  const text =
`Hi ${company} team,

I'm applying for ${role}. I'm a developer with hands-on experience in ${skills}, and I care about shipping reliable, user-facing software rather than just writing code.

Recently I ${win}. I like owning a feature from planning through deployment, debugging the hard production issues, and leaving things cleaner than I found them — the kind of work ${company} looks like it values.

I'd love to bring that to your team. My resume and live projects are attached/linked. Thank you for your time.

Best,
${name}${p.portfolioUrl ? "\n" + p.portfolioUrl : ""}`;
  $("#tk-out").value = text;
  toast("Cover letter drafted — edit freely, then copy");
}
function genReferral() {
  const p = STATE.profile;
  const name = $("#tk-name").value.trim() || p.name || "Your Name";
  const role = $("#tk-role").value.trim() || "an open role";
  const company = $("#tk-company").value.trim() || "your company";
  const skills = ($("#tk-skills").value.trim() || p.skills || "").split(",")[0] || "software";

  const text =
`Hi — I hope you're doing well! I came across ${role} at ${company} and it's a great fit for my background (${skills}${p.portfolioUrl ? ", portfolio: " + p.portfolioUrl : ""}).

Would you be open to referring me, or pointing me to the right person? Happy to share my resume and a 2-line summary so it's zero effort for you. Really appreciate it either way.

Thanks,
${name}`;
  $("#tk-out").value = text;
  toast("Referral message ready — send it to someone at the company");
}
function genFollowup() {
  const p = STATE.profile;
  const name = $("#tk-name").value.trim() || p.name || "Your Name";
  const role = $("#tk-role").value.trim() || "the role";
  const company = $("#tk-company").value.trim() || "your team";

  const text =
`Hi ${company} team,

Following up on my application for ${role}. I'm still very interested and would welcome the chance to talk about how I can contribute. If it helps, I'm happy to share more on my recent work.

Thanks for your time,
${name}`;
  $("#tk-out").value = text;
  toast("Follow-up drafted");
}
async function aiEnhance() {
  const key = STATE.settings.apiKey.trim();
  const draft = $("#tk-out").value.trim();
  if (!draft) { toast("Generate a draft first, then enhance", "warn"); return; }
  if (!key) { toast("Add your Anthropic API key in Profile to use AI enhance (optional)", "warn"); go("profile"); return; }

  const btn = $("#tk-ai"); btn.disabled = true; btn.textContent = "Enhancing…";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: STATE.settings.aiModel || "claude-sonnet-4-6",
        max_tokens: 700,
        messages: [{ role: "user", content:
          "Rewrite this job-application message so it is warm, specific and concise (no clichés, no 'I am writing to apply', under 160 words). Keep it honest and human. Return ONLY the rewritten message:\n\n" + draft }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (text) { $("#tk-out").value = text; toast("Enhanced with AI"); }
    else toast("AI returned nothing — keeping your draft", "warn");
  } catch (e) {
    toast("AI call failed (check key/network). Your draft is unchanged.", "warn");
  } finally { btn.disabled = false; btn.textContent = "✦ Enhance with AI"; }
}

/* ============================================================
   TRACKER — log applications, statuses, export
   ============================================================ */
let trackerFilter = "all";
function addApplication(seed = {}) {
  const app = {
    id: uid(), company: "", role: "", site: "linkedin", url: "",
    status: "applied", date: todayStr(), notes: "", followUpSent: false, ...seed,
  };
  STATE.applications.unshift(app); save(); renderTracker(); renderDashboard();
  return app;
}
function renderTracker() {
  const body = $("#tracker-body"); body.innerHTML = "";
  const apps = STATE.applications.filter((a) => trackerFilter === "all" || a.status === trackerFilter);

  $("#tracker-empty").classList.toggle("hidden", STATE.applications.length !== 0);

  apps.forEach((a) => {
    const st = STATUSES.find((s) => s.id === a.status) || STATUSES[1];
    const stale = a.status === "applied" && !a.followUpSent && daysSince(a.date) >= 7;
    const row = el("div", { class: "trow" },
      el("input", { class: "ti ti--co", value: a.company, placeholder: "Company",
        oninput: (e) => { a.company = e.target.value; save(); } }),
      el("input", { class: "ti ti--ro", value: a.role, placeholder: "Role",
        oninput: (e) => { a.role = e.target.value; save(); } }),
      siteSelect(a),
      statusSelect(a, st),
      el("input", { class: "ti ti--dt", type: "date", value: a.date,
        oninput: (e) => { a.date = e.target.value; save(); renderDashboard(); } }),
      el("div", { class: "trow__acts" },
        a.url ? el("a", { class: "ic", href: a.url, target: "_blank", rel: "noopener", title: "Open posting" }, "↗") : linkAdd(a),
        el("a", { class: "ic", href: referralSearchUrl(a.company, a.role), target: "_blank", rel: "noopener", title: "Find someone to ask for a referral" }, "★"),
        stale ? el("button", { class: "ic warn", title: "No reply in 7+ days — send a follow-up", onclick: () => { $("#tk-company").value = a.company; $("#tk-role").value = a.role; genFollowup(); a.followUpSent = true; save(); go("toolkit"); } }, "⏰") : null,
        el("button", { class: "ic danger", title: "Delete", onclick: () => { STATE.applications = STATE.applications.filter((x) => x.id !== a.id); save(); renderTracker(); renderDashboard(); } }, "🗑"),
      ),
    );
    body.appendChild(row);
  });
}
function daysSince(d) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function linkAdd(a) {
  return el("button", { class: "ic", title: "Add posting link", onclick: () => {
    const u = prompt("Paste the job posting URL:"); if (u) { a.url = u.trim(); save(); renderTracker(); }
  } }, "＋");
}
function siteSelect(a) {
  const sel = el("select", { class: "ti ti--se", onchange: (e) => { a.site = e.target.value; save(); } },
    ...SITES.map((s) => el("option", { value: s.id, ...(s.id === a.site ? { selected: "selected" } : {}) }, s.name)),
    el("option", { value: "other", ...(a.site === "other" ? { selected: "selected" } : {}) }, "Other"));
  return sel;
}
function statusSelect(a, st) {
  const sel = el("select", { class: "ti ti--st", style: `color:${st.color}`, onchange: (e) => { a.status = e.target.value; save(); renderTracker(); renderDashboard(); } },
    ...STATUSES.map((s) => el("option", { value: s.id, ...(s.id === a.status ? { selected: "selected" } : {}) }, s.label)));
  return sel;
}
function exportJSON() { download("jobpilot-backup.json", JSON.stringify(STATE, null, 2), "application/json"); toast("Backup downloaded"); }
function exportCSV() {
  const rows = [["Company", "Role", "Site", "Status", "Date", "URL", "Notes"]];
  STATE.applications.forEach((a) => rows.push([a.company, a.role, a.site, a.status, a.date, a.url, (a.notes || "").replace(/\n/g, " ")]));
  const csv = rows.map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  download("jobpilot-applications.csv", csv, "text/csv"); toast("CSV exported");
}
function importJSON(file) {
  const fr = new FileReader();
  fr.onload = () => { try { const d = JSON.parse(fr.result); STATE = { ...structuredClone(DEFAULT_STATE), ...d }; save(); toast("Backup restored"); go("dashboard"); } catch { toast("That file isn't a valid backup", "err"); } };
  fr.readAsText(file);
}

/* ============================================================
   DASHBOARD — momentum, pipeline, by-site, summary report
   ============================================================ */
function renderDashboard() {
  const apps = STATE.applications;
  const goal = Math.max(1, Number(STATE.profile.dailyGoal) || 5);
  const today = apps.filter((a) => a.date === todayStr()).length;
  const pct = Math.min(100, Math.round((today / goal) * 100));

  // momentum ring
  const ring = $("#ring"); if (ring) ring.style.setProperty("--pct", pct);
  $("#ring-num").textContent = `${today}/${goal}`;
  $("#ring-cap").textContent = today >= goal ? "Goal hit today 🔥" : "applied today";

  // streak
  $("#stat-streak").textContent = streak(apps);
  $("#stat-total").textContent = apps.length;
  const applied = apps.filter((a) => ["applied", "interview", "offer", "rejected"].includes(a.status)).length;
  const replies = apps.filter((a) => ["interview", "offer"].includes(a.status)).length;
  $("#stat-reply").textContent = applied ? Math.round((replies / applied) * 100) + "%" : "—";

  // pipeline
  const pipe = $("#pipeline"); pipe.innerHTML = "";
  STATUSES.forEach((s) => {
    const n = apps.filter((a) => a.status === s.id).length;
    pipe.appendChild(el("div", { class: "pipe" },
      el("div", { class: "pipe__bar", style: `--c:${s.color};--h:${apps.length ? (n / apps.length) * 100 : 0}` }, el("span", {}, String(n))),
      el("div", { class: "pipe__lbl" }, s.label)));
  });

  // by site
  const bySite = $("#bysite"); bySite.innerHTML = "";
  const counts = {};
  apps.forEach((a) => (counts[a.site] = (counts[a.site] || 0) + 1));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) bySite.appendChild(el("p", { class: "muted sm" }, "No applications logged yet — your breakdown by site shows up here."));
  entries.forEach(([id, n]) => {
    const site = SITES.find((s) => s.id === id);
    const max = entries[0][1];
    bySite.appendChild(el("div", { class: "sbrow" },
      el("span", { class: "sbrow__name" }, site ? site.name : "Other"),
      el("span", { class: "sbrow__track" }, el("span", { class: "sbrow__fill", style: `width:${(n / max) * 100}%` })),
      el("span", { class: "sbrow__n" }, String(n))));
  });
}
function streak(apps) {
  const days = new Set(apps.map((a) => a.date));
  let n = 0; const d = new Date();
  // count today only if applied; otherwise start from yesterday
  if (!days.has(todayStr())) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function buildReport() {
  const apps = STATE.applications;
  if (apps.length === 0) return "No applications logged yet.";
  const byStatus = {}; const bySite = {};
  apps.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; bySite[a.site] = (bySite[a.site] || 0) + 1; });
  const applied = apps.filter((a) => a.status !== "saved").length;
  const replies = apps.filter((a) => ["interview", "offer"].includes(a.status)).length;

  let r = `JOB SEARCH SUMMARY — ${new Date().toLocaleDateString()}\n`;
  r += `================================================\n`;
  r += `Total tracked: ${apps.length}   |   Applied: ${applied}   |   Response rate: ${applied ? Math.round((replies / applied) * 100) : 0}%\n\n`;
  r += `By status:\n`;
  STATUSES.forEach((s) => byStatus[s.id] && (r += `  • ${s.label}: ${byStatus[s.id]}\n`));
  r += `\nBy site:\n`;
  Object.entries(bySite).sort((a, b) => b[1] - a[1]).forEach(([id, n]) => {
    const s = SITES.find((x) => x.id === id); r += `  • ${s ? s.name : "Other"}: ${n}\n`;
  });
  r += `\nRecent applications:\n`;
  apps.slice(0, 12).forEach((a) => {
    const s = SITES.find((x) => x.id === a.site);
    r += `  • ${a.date}  ${a.company || "—"} — ${a.role || "—"}  [${(STATUSES.find((x) => x.id === a.status) || {}).label}]  via ${s ? s.name : a.site}\n`;
  });
  return r;
}

/* ============================================================
   PROFILE / SETTINGS
   ============================================================ */
function renderProfile() {
  const p = STATE.profile, s = STATE.settings;
  const map = { "pf-name": p.name, "pf-loc": p.location, "pf-kw": p.keywords, "pf-skills": p.skills,
    "pf-resume": p.resumeUrl, "pf-portfolio": p.portfolioUrl, "pf-linkedin": p.linkedinUrl,
    "pf-goal": p.dailyGoal, "pf-key": s.apiKey, "pf-model": s.aiModel };
  Object.entries(map).forEach(([id, v]) => { const n = $("#" + id); if (n) n.value = v ?? ""; });
}
function saveProfile() {
  STATE.profile = {
    name: $("#pf-name").value.trim(), location: $("#pf-loc").value.trim(),
    keywords: $("#pf-kw").value.trim(), skills: $("#pf-skills").value.trim(),
    resumeUrl: $("#pf-resume").value.trim(), portfolioUrl: $("#pf-portfolio").value.trim(),
    linkedinUrl: $("#pf-linkedin").value.trim(), dailyGoal: Math.max(1, Number($("#pf-goal").value) || 5),
  };
  STATE.settings = { apiKey: $("#pf-key").value.trim(), aiModel: $("#pf-model").value.trim() || "claude-sonnet-4-6" };
  save(); toast("Profile saved"); renderLaunchpad();
}
function wipeAll() {
  if (!confirm("Erase ALL your data on this device (applications, profile, searches)? This can't be undone.")) return;
  localStorage.removeItem(KEY); STATE = load(); toast("All data cleared"); go("dashboard");
}

/* ---------- render dispatcher ---------- */
function render(view) {
  if (view === "launchpad") { renderLaunchpad(); renderSavedSearches(); }
  if (view === "tracker") renderTracker();
  if (view === "dashboard") renderDashboard();
  if (view === "profile") renderProfile();
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // nav
  VIEWS.forEach((v) => $(`#nav-${v}`).addEventListener("click", () => go(v)));
  $$("[data-goto]").forEach((b) => b.addEventListener("click", () => go(b.dataset.goto)));

  // launchpad
  $("#lp-launch").addEventListener("click", launchSearches);
  $("#lp-all").addEventListener("click", () => { selectedSites = new Set(SITES.map((s) => s.id)); renderLaunchpad(); });
  $("#lp-none").addEventListener("click", () => { selectedSites = new Set(); renderLaunchpad(); });
  $("#lp-kw").addEventListener("keydown", (e) => { if (e.key === "Enter") launchSearches(); });

  // scanner
  $("#sc-run").addEventListener("click", runScanner);

  // toolkit
  $("#tk-cover").addEventListener("click", genCover);
  $("#tk-refer").addEventListener("click", genReferral);
  $("#tk-follow").addEventListener("click", genFollowup);
  $("#tk-ai").addEventListener("click", aiEnhance);
  $("#tk-copy").addEventListener("click", () => copyText($("#tk-out").value, "Message copied"));

  // tracker
  $("#tr-add").addEventListener("click", () => { addApplication(); toast("Row added — fill it in"); });
  $("#tr-csv").addEventListener("click", exportCSV);
  $("#tr-json").addEventListener("click", exportJSON);
  $("#tr-import").addEventListener("change", (e) => e.target.files[0] && importJSON(e.target.files[0]));
  $$(".filterchip").forEach((c) => c.addEventListener("click", () => {
    trackerFilter = c.dataset.f; $$(".filterchip").forEach((x) => x.classList.toggle("on", x === c)); renderTracker();
  }));

  // dashboard
  $("#db-report").addEventListener("click", () => copyText(buildReport(), "Summary report copied"));
  $("#db-download").addEventListener("click", () => download("job-search-summary.txt", buildReport()));

  // profile
  $("#pf-save").addEventListener("click", saveProfile);
  $("#pf-wipe").addEventListener("click", wipeAll);
  $("#pf-key-toggle").addEventListener("click", () => { const i = $("#pf-key"); i.type = i.type === "password" ? "text" : "password"; });

  go("launchpad");
});
