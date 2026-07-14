import Link from "next/link";
import review from "@/data/terra-review.json";

const decisionStyles: Record<string, string> = {
  PURSUE_NOW: "border-[#FE8007]/40 bg-[#FE8007]/10 text-[#9a4700] dark:text-[#ffad5c]",
  NURTURE: "border-[#113E80]/30 bg-[#113E80]/10 text-[#113E80] dark:text-[#8db8f4]",
  DISQUALIFIED_CONFIRMED: "border-[var(--border)] bg-black/[0.03] text-[var(--muted)] dark:bg-white/[0.04]",
};

function label(decision: string) {
  if (decision === "PURSUE_NOW") return "Pursue now";
  if (decision === "DISQUALIFIED_CONFIRMED") return "Confirmed exclusion";
  return "Research next";
}

export default function RecoveryPage() {
  const pursue = review.reports.filter((report) => report.decision === "PURSUE_NOW");

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#113E80] dark:text-[#8db8f4]">
              <span className="h-2 w-2 rounded-full bg-[#FE8007]" /> Sol recovery review
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Next 100 prospects</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Four batches of 25. Live source evidence is separated from commercial verification, so missing research stays visible instead of becoming a false rejection.
            </p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm font-medium hover:border-[#113E80]/50">
            Dashboard
          </Link>
        </header>

        <section className="grid gap-px border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Reviewed", review.total],
            ["Pursue now", review.counts.PURSUE_NOW],
            ["Research next", review.counts.NURTURE],
            ["Confirmed exclusions", review.counts.DISQUALIFIED_CONFIRMED],
            ["Audit precision", `${Math.round(review.audit.auditedPrecision * 100)}%`],
          ].map(([name, value]) => (
            <div key={name} className="bg-[var(--background)] px-4 py-4">
              <div className="text-xs font-medium text-[var(--muted)]">{name}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </section>

        <section className="py-6">
          <h2 className="text-lg font-semibold">Work first</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {pursue.map((report) => (
              <article key={report.id} className="rounded-lg border border-[#FE8007]/35 bg-[var(--panel)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{report.host}</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{report.organization}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold ${decisionStyles[report.decision]}`}>{label(report.decision)}</span>
                </div>
                <p className="mt-4 text-sm leading-6">{report.pitchHook}</p>
                <div className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]">
                  <div><span className="font-semibold text-[var(--foreground)]">Offer:</span> {report.offer}</div>
                  <div className="mt-2"><span className="font-semibold text-[var(--foreground)]">Video gap:</span> {report.videoGapReason}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={report.offerEvidenceUrl} target="_blank" rel="noreferrer" className="rounded-md bg-[#113E80] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d3268]">Offer</a>
                  {report.videoGapEvidenceUrls?.slice(0, 1).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold">Clip sample</a>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Decision ledger</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Open a record to see the exact reason and unresolved gates.</p>
            </div>
            <div className="text-xs text-[var(--muted)]">Methodology: {review.methodology}</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            {review.reports.map((report, index) => (
              <details key={report.id} className="group border-b border-[var(--border)] last:border-b-0">
                <summary className="grid cursor-pointer list-none grid-cols-[42px_minmax(180px,1fr)_140px] items-center gap-3 px-3 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:grid-cols-[55px_minmax(180px,1fr)_150px_120px_120px]">
                  <span className="text-xs tabular-nums text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{report.host}</span>
                    <span className="block truncate text-xs text-[var(--muted)]">{report.organization}</span>
                  </span>
                  <span className={`justify-self-start rounded-full border px-2 py-1 text-[10px] font-semibold ${decisionStyles[report.decision]}`}>{label(report.decision)}</span>
                  <span className="hidden text-xs text-[var(--muted)] sm:block">Batch {report.batch}</span>
                  <span className="hidden text-xs text-[var(--muted)] sm:block">{report.sourceType}</span>
                </summary>
                <div className="grid gap-5 border-t border-[var(--border)] bg-black/[0.015] px-4 py-4 text-sm dark:bg-white/[0.02] lg:grid-cols-[1.25fr_1fr]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Decision</div>
                    <p className="mt-2 leading-6">{report.decisionReason}</p>
                    {report.pitchHook && <><div className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Pitch hook</div><p className="mt-2 leading-6">{report.pitchHook}</p></>}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Evidence and gaps</div>
                    {report.missingGates.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">{report.missingGates.map((gate) => <li key={gate}>- {gate}</li>)}</ul>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                        <div>Buyer: {report.buyer}</div><div>Point-man: {report.pointMan}</div><div>Contact: {report.contact}</div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.sourceEvidenceUrl && <a href={report.sourceEvidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#113E80] underline underline-offset-4 dark:text-[#8db8f4]">Source</a>}
                      {report.evidence.map((item) => <a key={`${report.id}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#113E80] underline underline-offset-4 dark:text-[#8db8f4]">Evidence</a>)}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
