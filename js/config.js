/* ============================================================
   JobPilot — configuration
   All job-site "launch" links are built here. These open each
   site's OWN search page pre-filled with your keywords. Nothing
   logs in or submits on your behalf, so your accounts stay safe.
   If a site changes its URL format, just edit its build() below.
   ============================================================ */

const enc  = (s) => encodeURIComponent((s || "").trim());
const slug = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SITES = [
  {
    id: "linkedin", name: "LinkedIn", code: "LI", tag: "Network + jobs",
    build: (kw, loc) => `https://www.linkedin.com/jobs/search/?keywords=${enc(kw)}&location=${enc(loc || "India")}`,
  },
  {
    id: "naukri", name: "Naukri", code: "NK", tag: "Largest in India",
    build: (kw, loc) => loc
      ? `https://www.naukri.com/${slug(kw)}-jobs-in-${slug(loc)}`
      : `https://www.naukri.com/${slug(kw)}-jobs`,
  },
  {
    id: "indeed", name: "Indeed", code: "IN", tag: "Broad aggregator",
    build: (kw, loc) => `https://in.indeed.com/jobs?q=${enc(kw)}&l=${enc(loc)}`,
  },
  {
    id: "wellfound", name: "Wellfound", code: "WF", tag: "Startups (AngelList)",
    build: (kw) => `https://wellfound.com/role/r/${slug(kw)}`,
  },
  {
    id: "ycombinator", name: "Y Combinator", code: "YC", tag: "Work at a Startup",
    build: (kw) => `https://www.workatastartup.com/jobs?query=${enc(kw)}`,
  },
  {
    id: "internshala", name: "Internshala", code: "IS", tag: "Internships + fresher jobs",
    build: (kw) => `https://internshala.com/jobs/keywords-${slug(kw)}`,
  },
  {
    id: "foundit", name: "Foundit", code: "FD", tag: "Formerly Monster",
    build: (kw, loc) => `https://www.foundit.in/srp/results?query=${enc(kw)}&locations=${enc(loc)}`,
  },
  {
    id: "shine", name: "Shine", code: "SH", tag: "India jobs",
    build: (kw, loc) => loc
      ? `https://www.shine.com/job-search/${slug(kw)}-jobs-in-${slug(loc)}`
      : `https://www.shine.com/job-search/${slug(kw)}-jobs`,
  },
  {
    id: "cutshort", name: "Cutshort", code: "CS", tag: "Curated tech roles",
    build: (kw) => `https://cutshort.io/jobs/search?q=${enc(kw)}`,
  },
  {
    id: "google", name: "Google Jobs", code: "GG", tag: "Meta-search everything",
    build: (kw, loc) => `https://www.google.com/search?q=${enc(kw + " jobs " + (loc || ""))}&ibp=htl;jobs`,
  },
];

const STATUSES = [
  { id: "saved",     label: "Saved",     color: "#8a94ad" },
  { id: "applied",   label: "Applied",   color: "#5b8def" },
  { id: "interview", label: "Interview", color: "#f5b841" },
  { id: "offer",     label: "Offer",     color: "#3ddc97" },
  { id: "rejected",  label: "Rejected",  color: "#ff6b6b" },
];

// A referral is worth 5x a cold apply — this opens a LinkedIn people
// search for someone at the company you can ask. (Just a link.)
const referralSearchUrl = (company, role) =>
  `https://www.linkedin.com/search/results/people/?keywords=${enc((company || "") + " " + (role ? "" : "recruiter"))}`.trim();
