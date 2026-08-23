const apiKey = process.env.JULES_API_KEY?.trim();
if (!apiKey) {
  throw new Error("JULES_API_KEY is not configured as a GitHub Actions repository secret");
}

const repository = process.env.GITHUB_REPOSITORY?.trim();
if (repository !== "PenPicasso/DialDash") {
  throw new Error("This workflow is restricted to PenPicasso/DialDash");
}

const task = process.env.JULES_TASK?.trim();
const runUrl = process.env.GITHUB_RUN_URL?.trim();
const batchSize = Math.min(25, Math.max(1, Number(process.env.ENRICHMENT_BATCH_SIZE || 10)));

const sharedRules = [
  "Read AGENTS.md before changing anything.",
  "Work only in the existing PenPicasso/DialDash repository and open a pull request; never deploy or merge automatically.",
  "Never expose, modify, or infer secrets. Never weaken validation to make a check pass.",
  "Run npm ci, npm run lint, npm run typecheck, npm run validate:data, and npm run build before proposing a pull request.",
];

const prompts = {
  repair_deployment: [
    "Diagnose and repair the failed DialDash deployment reported by GitHub.",
    `Workflow run: ${runUrl || "unavailable"}`,
    `Deployment environment: ${process.env.DEPLOYMENT_ENVIRONMENT || "unknown"}`,
    `Deployment URL: ${process.env.DEPLOYMENT_URL || "unavailable"}`,
    `Commit SHA: ${process.env.DEPLOYMENT_SHA || "unknown"}`,
    "Determine whether the failure is reproducible from code. If it is, make the smallest durable fix and add a regression test.",
    "If the failure depends on unavailable provider configuration, permissions, quota, or secrets, document the exact blocker instead of inventing a code change.",
  ],
  enrich_prospects: [
    `Improve at most ${batchSize} high-potential DialDash prospect records that are incomplete, stale, or weakly evidenced.`,
    "Prioritize existing READY/HOT prospects and records closest to READY. Do not optimize for raw lead count.",
    "Every accepted prospect must satisfy the strict ICP in AGENTS.md: an energy-focused English-language operator; a named visible point-man; a usable outreach path; active X presence; active YouTube or Apple/Spotify podcast evidence; and either roughly $1M-$50M revenue or 5-200 employees.",
    "Prefer founder-led boutiques with long-form content and low or weak short-form output. Exclude majors, giant utilities, large EPCs, corporate monoliths, generic news brands, aggregators, and people without a direct outreach path.",
    "Use direct public evidence URLs and source-specific dates. Never guess revenue, employee count, identity, activity, audience, email, or social handles.",
    "Preserve uncertain candidates as staged/review material; do not promote them to READY. Modify data/nodes.json only for evidence-backed improvements and explain every changed record in the pull request.",
  ],
};

if (!(task in prompts)) {
  throw new Error(`Unsupported JULES_TASK: ${task || "(missing)"}`);
}

const response = await fetch("https://jules.googleapis.com/v1alpha/sessions", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-goog-api-key": apiKey,
  },
  body: JSON.stringify({
    title: task === "repair_deployment" ? "Repair failed DialDash deployment" : "Strict DialDash prospect enrichment",
    prompt: [...sharedRules, ...prompts[task]].join("\n"),
    sourceContext: {
      source: "sources/github/PenPicasso/DialDash",
      githubRepoContext: { startingBranch: "main" },
    },
    automationMode: "AUTO_CREATE_PR",
  }),
});

if (!response.ok) {
  throw new Error(`Jules request failed with HTTP ${response.status}; verify the repository connection and secret`);
}

const session = await response.json();
console.log(`Started Jules session ${session.name || session.id || "(identifier unavailable)"}`);
