"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Clock3, CreditCard, ExternalLink, FileVideo, MessageSquare, Play, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "dialdash:portal-demo-feedback:v1";

const deliverables = [
  { name: "Motion edit", detail: "Maps, labels, persistent figures, restrained motion", status: "Ready for review", version: "v2", accent: true },
  { name: "Clean select", detail: "Chosen excerpt with clean audio and no public-facing graphics", status: "Delivered", version: "v1", accent: false },
  { name: "Thumbnail", detail: "Technically credible frame and title treatment", status: "Ready for review", version: "v1", accent: false },
];

export function ClientPortalDemo({ paymentUrl, driveUrl }: { paymentUrl?: string; driveUrl?: string }) {
  const [feedback, setFeedback] = useState("");
  const [savedFeedback, setSavedFeedback] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setSavedFeedback(JSON.parse(saved) as string[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function submitFeedback() {
    const value = feedback.trim();
    if (!value) return;
    const next = [value, ...savedFeedback];
    setSavedFeedback(next);
    setFeedback("");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div><div className="text-lg font-black text-brand-blue">Energy <span className="text-brand-orange">Dial</span></div><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Client workspace preview</div></div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Private project</div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <section className="mb-6 flex flex-col gap-5 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-blue">Super-Spiked / Trial 01</div><h1 className="mt-2 text-3xl font-black">The map behind the market call</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">A private review space for the motioned edit, clean select, thumbnail, feedback, approval, and payment.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-md border border-zinc-200 bg-white px-3 py-2"><div className="text-[9px] font-bold uppercase text-zinc-500">Due</div><div className="mt-0.5 text-sm font-extrabold">Tomorrow, 4 PM</div></div>
            <div className="rounded-md border border-brand-orange/30 bg-brand-orange/5 px-3 py-2"><div className="text-[9px] font-bold uppercase text-brand-orange">Status</div><div className="mt-0.5 text-sm font-extrabold">Client review</div></div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="aspect-video bg-[#0c1420] p-5 text-white sm:p-7">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between"><span className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase">Private preview</span><span className="text-xs text-white/60">00:34</span></div>
                  <button type="button" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange text-white shadow-lg" aria-label="Play demo preview"><Play size={22} fill="currentColor" /></button>
                  <div><div className="text-xs font-bold uppercase tracking-wider text-[#8fb8ed]">Visual system</div><div className="mt-2 max-w-xl text-2xl font-black">Numbers stay visible. Geography stays clear. The expert stays credible.</div></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 p-3 sm:p-4"><div className="flex items-center gap-2 text-xs font-bold text-zinc-600"><ShieldCheck size={15} className="text-brand-blue" />Demo player only; Google Drive supplies the source files.</div>{driveUrl ? <a href={driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-xs font-extrabold text-zinc-800 hover:border-brand-blue"><ExternalLink size={13} />Open Drive folder</a> : <span className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-400">Drive link pending</span>}</div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-4 py-4 sm:px-5"><h2 className="font-black">Deliverables</h2><p className="mt-1 text-xs text-zinc-500">Every public asset and private working file in one approval trail.</p></div>
              <div className="divide-y divide-zinc-200">
                {deliverables.map((item, index) => <button key={item.name} type="button" onClick={() => setSelected(index)} className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left sm:px-5 ${selected === index ? "bg-brand-blue/[0.035]" : "hover:bg-zinc-50"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-md ${item.accent ? "bg-brand-orange text-white" : "bg-zinc-100 text-brand-blue"}`}><FileVideo size={17} /></span><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-extrabold">{item.name}<span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500">{item.version}</span></span><span className="mt-1 block truncate text-xs text-zinc-500">{item.detail}</span></span><span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700"><Check size={12} />{item.status}</span></button>)}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2"><MessageSquare size={17} className="text-brand-blue" /><h2 className="font-black">Feedback</h2></div>
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} placeholder="Add a timestamp and the exact change you want..." className="mt-4 w-full resize-y rounded-md border border-zinc-200 p-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" />
              <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[10px] text-zinc-500">Preview feedback stays on this device.</span><button type="button" onClick={submitFeedback} className="rounded-md bg-brand-blue px-4 py-2 text-xs font-extrabold text-white hover:bg-[#0c326a]">Save note</button></div>
              {savedFeedback.length > 0 && <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4">{savedFeedback.map((item, index) => <div key={`${item}-${index}`} className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-700"><span className="mr-2 font-extrabold text-brand-blue">Client</span>{item}</div>)}</div>}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-zinc-200 bg-white p-5"><div className="flex items-center gap-2"><Clock3 size={16} className="text-brand-orange" /><h2 className="font-black">Approval path</h2></div><ol className="mt-4 space-y-4">{["Review the motion edit", "Leave timestamped changes", "Approve the final version", "Receive posting copy and source files"].map((step, index) => <li key={step} className="grid grid-cols-[24px_1fr] gap-2 text-sm"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${index === 0 ? "bg-brand-orange text-white" : "bg-zinc-100 text-zinc-500"}`}>{index + 1}</span><span className={index === 0 ? "font-extrabold" : "text-zinc-600"}>{step}</span></li>)}</ol></section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5"><div className="text-[10px] font-extrabold uppercase tracking-wider text-brand-blue">Included with the trial</div><ul className="mt-4 space-y-3">{["Clip-selection rationale", "One platform-specific posting brief", "Technical accuracy pass", "Clean select for your archive", "One thumbnail direction"].map((item) => <li key={item} className="flex gap-2 text-sm text-zinc-700"><Check size={15} className="mt-0.5 shrink-0 text-brand-orange" />{item}</li>)}</ul></section>

            <section className="rounded-lg border border-brand-blue/20 bg-brand-blue/[0.035] p-5"><div className="flex items-center gap-2"><CreditCard size={16} className="text-brand-blue" /><h2 className="font-black">Continue monthly</h2></div><div className="mt-3 flex items-end gap-1"><span className="text-3xl font-black">$997</span><span className="pb-1 text-xs text-zinc-500">/ month</span></div><p className="mt-2 text-xs leading-5 text-zinc-600">Four educational clips, one nominated source episode each week, thumbnail direction, and a defined review window.</p>{paymentUrl ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-between rounded-md bg-brand-orange px-4 py-3 text-sm font-extrabold text-white hover:bg-[#e66f00]">Pay with Flutterwave<ChevronRight size={16} /></a> : <button type="button" disabled className="mt-4 flex w-full items-center justify-between rounded-md bg-zinc-200 px-4 py-3 text-sm font-extrabold text-zinc-500">Flutterwave link pending<ChevronRight size={16} /></button>}<p className="mt-2 text-[9px] text-zinc-500">The preview never initiates a payment without your live Flutterwave link.</p></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
