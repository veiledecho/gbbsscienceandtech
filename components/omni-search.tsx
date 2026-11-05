"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export type SearchResult = { type: string; id: string; title: string; detail: string };

export function OmniSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json() as { results?: SearchResult[] };
        setResults(data.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [open, query]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery("");
  }, [open]);

  return <>
    <button type="button" className="btn-quiet w-full justify-between" onClick={() => setOpen(true)}>
      <span className="flex items-center gap-2 text-[#96a1a5]"><Search size={14} />Search LabCore</span>
      <kbd className="mono rounded border border-[#30373a] px-1.5 py-0.5 text-[9px] text-[#9ba7aa]">/ or Ctrl K</kbd>
    </button>
    {open ? <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="surface enter w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#252b2f] px-4"><Search size={17} className="text-[#9aa5a8]" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hardware, proposals, code..." className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#697579]" /><button type="button" aria-label="Close search" className="btn-quiet !p-2" onClick={() => setOpen(false)}><X size={15} /></button></div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {query.length < 2 ? <p className="p-4 text-xs text-[#889497]">Type at least two characters to search your lab.</p> : null}
          {loading ? <p className="p-4 text-xs text-[#889497]">Searching records...</p> : null}
          {!loading && query.length >= 2 && results.length === 0 ? <p className="p-4 text-xs text-[#889497]">No matching records.</p> : null}
          {results.map((result) => <button key={`${result.type}-${result.id}`} type="button" onClick={() => { onSelect(result); setOpen(false); }} className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-3 text-left hover:bg-white/[.05]"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#e7eceb]">{result.title}</span><span className="mt-1 block truncate text-[10px] text-[#8b979a]">{result.detail}</span></span><span className="mono shrink-0 text-[9px] uppercase text-[#c5f277]">{result.type}</span></button>)}
        </div>
      </div>
    </div> : null}
  </>;
}