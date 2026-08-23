import Link from "next/link";
import review from "@/data/sol-review-round-2.json";

const styles: Record<string, string> = {
  PURSUE_NOW: "border-[#FE8007]/40 bg-[#FE8007]/10 text-[#9a4700] dark:text-[#ffad5c]",
  NURTURE: "border-[#113E80]/30 bg-[#113E80]/10 text-[#113E80] dark:text-[#8db8f4]",
  DISQUALIFIED_CONFIRMED: "border-[var(--border)] bg-black/[0.03] text-[var(--muted)] dark:bg-white/[0.04]",
};

function label(decision: string) {
  if (decision === "PURSUE_NOW") return "Pursue now";
  if (decision === "NURTURE") return "Research hold";
  return "Confirmed exclusion";
}

export default function RoundTwoRecoveryPage() {
  const pursue = review.reports.filter((report) => report.decision === "PURSUE_NOW");

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#113E80] dark:text-[#8db8f4]"><span className="h-2 w-2 rounded-full bg-[#FE8007]" />Sol recovery review</div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Round two: next 100</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Four non-overlapping batches of 25. Open any record to inspect its controlling decision reason, offer, funnel and video-gap evidence.</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-medium">
            <Link href="/recovery" className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 hover:border-[#113E80]/50">Round one</Link>
            <Link href="/dashboard" className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 hover:border-[#113E80]/50">Dashboard</Link>
          </nav>
        </header>

        <section className="grid gap-px border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          {[["Reviewed", review.total], ["Pursue now", review.counts.PURSUE_NOW], ["Research hold", review.counts.NURTURE], ["Confirmed exclusions", review.counts.DISQUALIFIED_CONFIRMED], ["Evidence audit", `${review.audit.passedChecks}/${review.audit.sampleSize}`]].map(([name, value]) => (
            <div key={name} className="bg-[var(--background)] px-4 py-4"><div className="text-xs font-medium text-[var(--muted)]">{name}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div></div>
          ))}
        </section>

        <section className="py-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Work first</h2><p className="mt-1 text-sm text-[var(--muted)]">{pursue.length} accounts cleared every hard gate, including owned-source freshness and historical cadence.</p></div><div className="text-xs text-[var(--muted)]">215 review decisions / 214 unique identities</div></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pursue.map((report) => (
              <article key={report.id} className="rounded-lg border border-[#FE8007]/35 bg-[var(--panel)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{report.host}</h3><p className="mt-0.5 text-xs text-[var(--muted)]">{report.organization}</p></div><span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold ${styles[report.decision]}`}>Pursue now</span></div>
                <p className="mt-4 text-sm leading-6">{report.pitchHook}</p>
                <div className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]"><div><span className="font-semibold text-[var(--foreground)]">Offer:</span> {report.offer}</div><div className="mt-2"><span className="font-semibold text-[var(--foreground)]">Cadence:</span> {report.historicalCadence?.medianIntervalDays ?? "n/a"}d median, {report.historicalCadence?.latestGapDays ?? "n/a"}d since latest</div><div className="mt-2"><span className="font-semibold text-[var(--foreground)]">Video gap:</span> {report.videoGapReason}</div></div>
                <div className="mt-4 flex flex-wrap gap-2"><a href={report.offerEvidenceUrl} target="_blank" rel="noreferrer" className="rounded-md bg-[#113E80] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d3268]">Offer</a>{report.videoGapEvidenceUrls.slice(0, 1).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold">Gap evidence</a>)}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Decision ledger</h2><p className="mt-1 text-sm text-[var(--muted)]">The exclusion label is never a substitute for the reason underneath it.</p></div><div className="text-xs text-[var(--muted)]">Methodology: {review.methodology}</div></div>
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            {review.reports.map((report, index) => (
              <details key={report.id} className="group border-b border-[var(--border)] last:border-b-0">
                <summary className="grid cursor-pointer list-none grid-cols-[38px_minmax(130px,1fr)_128px] items-center gap-2 px-3 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:grid-cols-[55px_minmax(180px,1fr)_150px_100px]">
                  <span className="text-xs tabular-nums text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{report.host}</span><span className="block truncate text-xs text-[var(--muted)]">{report.organization}</span></span><span className={`justify-self-start rounded-full border px-2 py-1 text-[10px] font-semibold ${styles[report.decision]}`}>{label(report.decision)}</span><span className="hidden text-xs text-[var(--muted)] sm:block">Batch {report.batch}</span>
                </summary>
                <div className="grid gap-5 border-t border-[var(--border)] bg-black/[0.015] px-4 py-4 text-sm dark:bg-white/[0.02] lg:grid-cols-[1.2fr_1fr]">
                  <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Decision</div><p className="mt-2 leading-6">{report.decisionReason}</p>{report.pitchHook && <><div className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Pitch hook</div><p className="mt-2 leading-6">{report.pitchHook}</p></>}</div>
                  <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Evidence and transaction</div>{report.decision === "PURSUE_NOW" ? <div className="mt-2 space-y-2 text-sm text-[var(--muted)]"><div>Buyer: {report.buyer}</div><div>Contact: {report.contact}</div><div>BOF: {report.bof?.join("; ")}</div></div> : report.missingGates.length ? <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">{report.missingGates.map((gate) => <li key={gate}>- {gate}</li>)}</ul> : <div className="mt-2 text-sm text-[var(--muted)]">Category: {report.exclusionCategory?.replaceAll("_", " ")}</div>}<div className="mt-3 flex flex-wrap gap-3">{report.sourceEvidenceUrl && <a href={report.sourceEvidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#113E80] underline underline-offset-4 dark:text-[#8db8f4]">Source</a>}{report.contactUrl && <a href={report.contactUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#113E80] underline underline-offset-4 dark:text-[#8db8f4]">Contact</a>}{report.evidence.map((item) => <a key={`${report.id}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#113E80] underline underline-offset-4 dark:text-[#8db8f4]">Evidence</a>)}</div></div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <p className="border-t border-[var(--border)] py-4 text-xs leading-5 text-[var(--muted)]">Audit note: {review.audit.limitation}</p>
      </div>
    </main>
  );
}
