import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Gauge, SearchCheck, ShieldCheck } from "lucide-react";
import { CATEGORY_COMMERCIAL_GUIDE, COMMERCIAL_BENCHMARKS } from "@/lib/commercialBenchmarks";

const outcomes = [
  { label: "Pursue now", value: 22, percent: 2.6, color: "bg-brand-orange" },
  { label: "Nurture", value: 456, percent: 54.3, color: "bg-brand-blue" },
  { label: "Factual exclusions", value: 362, percent: 43.1, color: "bg-foreground/20" },
];

const steps = [
  ["1", "Rank and freeze", "Fit-ranked all 840 records, collapsed duplicate owned-media accounts, and fixed each cohort before research."],
  ["2", "Collect evidence", "Checked owned long-form, true latest publication, historical cadence, roles, contact, offer, funnel, and video gap from official routes."],
  ["3", "Conservative decision", "Missing evidence stayed NURTURE. Only a proved hard gate could create a confirmed exclusion."],
  ["4", "Sol adversarial review", "Rechecked promotions, nurture decisions, factual exclusions, stale routes, and deterministic audit samples."],
  ["5", "Fail-closed validation", "Validated every batch, stopped incomplete research from counting, and composed one exact 840-record reviewed ledger."],
];

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-panel px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-sm font-black">Dial<span className="text-brand-orange">Dash</span></Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-extrabold text-brand-blue">Open dashboard <ArrowRight size={14} /></Link>
        </div>
      </nav>

      <header className="border-b border-border bg-panel px-5 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-orange">DialDash review report</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">From a large prospect list to a reviewed sales intelligence system.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted md:text-lg">Every one of the 840 energy prospects now has a completed decision. The dashboard distinguishes evidence-cleared outreach targets from recoverable nurture accounts and factual exclusions.</p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-emerald-600/20 bg-emerald-500/5 px-3 py-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={15} /> 840 / 840 reviewed · Sol gate passed</div>
        </div>
      </header>

      <section className="px-5 pt-10 md:px-10">
        <figure className="mx-auto max-w-6xl overflow-hidden rounded-lg border border-border bg-panel">
          <Image src="/report/before-after.png" alt="DialDash before and after: from 840 unqualified names to 840 reviewed prospect decisions" width={1677} height={941} priority unoptimized className="h-auto w-full" />
        </figure>
      </section>

      <section className="px-5 py-12 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-muted">Before</div>
            <h2 className="mt-2 text-3xl font-black">Volume without enough certainty</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-muted">
              <li>575 records lacked a reachability status.</li>
              <li>311 lacked explicit contact or outreach completeness.</li>
              <li>No record had a prospect-specific, transaction-aware pitch hook.</li>
              <li>Freshness could borrow dates from the wrong channel or trust stale and broken routes.</li>
              <li>Content owner, on-mic host, and economic buyer were often treated as the same person.</li>
              <li>Missing evidence could look like rejection, hiding potentially recoverable clients.</li>
            </ul>
          </div>
          <div className="border-l-4 border-brand-blue bg-panel p-6 md:p-8">
            <div className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">Now</div>
            <h2 className="mt-2 text-3xl font-black">One reviewed decision for every prospect</h2>
            <div className="mt-7 space-y-5">
              {outcomes.map((outcome) => (
                <div key={outcome.label}>
                  <div className="mb-2 flex items-center justify-between text-sm"><strong>{outcome.label}</strong><span className="font-black">{outcome.value} <span className="font-medium text-muted">({outcome.percent}%)</span></span></div>
                  <div className="h-2 overflow-hidden rounded-sm bg-background"><div className={`h-full ${outcome.color}`} style={{ width: `${outcome.percent}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-7 text-sm leading-6 text-muted">The 456 nurture accounts are not failed leads. They are prospects where the offer, buyer, contact, funnel, ownership, or inspected video gap still needs evidence before outreach.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-panel px-5 py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div><ShieldCheck className="text-brand-blue" /><h3 className="mt-4 text-lg font-black">Safer decisions</h3><p className="mt-2 text-sm leading-6 text-muted">Hard gates override scores, but absence of evidence remains nurture. That prevents false rejection and false confidence.</p></div>
            <div><SearchCheck className="text-brand-orange" /><h3 className="mt-4 text-lg font-black">Transaction-aware research</h3><p className="mt-2 text-sm leading-6 text-muted">The review separates owner, host, buyer, offer, TOF, MOF, BOF, and the real video-distribution opportunity.</p></div>
            <div><Gauge className="text-brand-blue" /><h3 className="mt-4 text-lg font-black">Operational dashboard</h3><p className="mt-2 text-sm leading-6 text-muted">The full review is a separate overlay, so corrected Sol decisions appear without corrupting the original prospect profiles.</p></div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">Commercial economics benchmark</div>
          <h2 className="mt-2 max-w-4xl text-3xl font-black">What each energy avatar can sell, and what the transaction may be worth.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-muted">DialDash uses the prospect&apos;s own published price first. When that does not exist, it uses public filings, government rate cards, or first-party market prices as a comparable and labels the result estimated. A role-based hypothesis remains inferred.</p>

          <div className="mt-8 divide-y divide-border border-y border-border">
            {CATEGORY_COMMERCIAL_GUIDE.map((guide) => (
              <div key={guide.category} className="grid gap-3 py-5 md:grid-cols-[190px_1fr_1fr]">
                <div className="font-black text-foreground">{guide.category}</div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Typical avatars and engines</div>
                  <p className="mt-1 text-xs leading-5 text-foreground/80">{guide.avatars}. {guide.likelyEngines}.</p>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">How to interpret value</div>
                  <p className="mt-1 text-xs leading-5 text-muted">{guide.pricingInterpretation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-x-8 gap-y-7 md:grid-cols-2">
            {Object.values(COMMERCIAL_BENCHMARKS).filter((benchmark) => benchmark.sources.length > 0).map((benchmark) => (
              <article key={benchmark.id} className="border-t-2 border-brand-blue pt-4">
                <div className="text-sm font-black text-foreground">{benchmark.engine}</div>
                <div className="mt-2 text-base font-black text-brand-blue">{benchmark.range}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">{benchmark.unit}</div>
                <p className="mt-3 text-xs leading-5 text-muted">{benchmark.basis} {benchmark.caveat}</p>
                {benchmark.examples.length > 0 && (
                  <div className="mt-4 border-l-2 border-brand-orange pl-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">Named people to study</div>
                    <div className="mt-2 space-y-3">
                      {benchmark.examples.map((example) => (
                        <div key={`${benchmark.id}-${example.name}`} className="text-[11px] leading-5">
                          <a href={example.url} target="_blank" rel="noreferrer" className="font-black text-foreground hover:text-brand-blue">{example.name}</a>
                          <span className="text-muted"> · {example.organization}</span>
                          <div className="text-foreground/75">{example.avatar}</div>
                          <div className="text-muted">{example.priceConnection}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  {benchmark.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-[10px] font-extrabold text-brand-blue hover:underline">{source.title}</a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">How we did it</div>
          <h2 className="mt-2 text-3xl font-black">A fixed, auditable pipeline</h2>
          <figure className="mt-8 overflow-hidden rounded-lg border border-border bg-panel">
            <Image src="/report/methodology-faster.png" alt="DialDash five-stage review pipeline and a faster future workflow" width={1677} height={941} loading="eager" unoptimized className="h-auto w-full" />
          </figure>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {steps.map(([number, title, body]) => (
              <div key={number} className="grid gap-3 py-6 md:grid-cols-[50px_220px_1fr] md:items-start">
                <div className="text-2xl font-black text-brand-orange">{number}</div><h3 className="font-black">{title}</h3><p className="text-sm leading-6 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-brand-blue px-5 py-12 text-white md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-extrabold uppercase tracking-wider text-white/65">How to do the next run faster</div>
          <h2 className="mt-2 max-w-3xl text-3xl font-black">Spend expert reasoning only where deterministic evidence cannot decide.</h2>
          <div className="mt-8 grid gap-x-8 gap-y-5 text-sm leading-6 text-white/80 md:grid-cols-2">
            <p><strong className="text-white">1. Canonical identity first.</strong> Resolve the person, show, organization, and owned domains before checking freshness.</p>
            <p><strong className="text-white">2. Source-specific lanes.</strong> Process podcasts, YouTube, newsletters, and institutional channels with separate deterministic extractors.</p>
            <p><strong className="text-white">3. Reuse evidence.</strong> Cache official feeds, channel IDs, offer pages, and contact pages across reruns.</p>
            <p><strong className="text-white">4. Route exceptions early.</strong> Broken links should trigger identity recovery, never an inactivity decision.</p>
            <p><strong className="text-white">5. Escalate narrowly.</strong> Use a light model for extraction and Sol only for ambiguous owner, buyer, offer, funnel, or visual-quality cases.</p>
            <p><strong className="text-white">6. Audit continuously.</strong> Review a deterministic sample after every 25 and stop below 90%, rather than repairing hundreds at the end.</p>
          </div>
          <Link href="/dashboard" className="mt-9 inline-flex items-center gap-2 rounded-md bg-brand-orange px-4 py-3 text-sm font-black text-white">Inspect the 840 prospects <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
