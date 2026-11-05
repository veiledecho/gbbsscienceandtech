"use client";

import { useActionState, useState } from "react";
import type { Role, ProposalStatus } from "@prisma/client";
import Image from "next/image";
import { Activity, ArrowDownToLine, ArrowRight, Atom, Bell, Box, Check, ChevronDown, CircleUserRound, Code2, Cpu, FilePlus2, FileText, FlaskConical, LogOut, Plus, Sparkles, Terminal, Users, Wrench } from "lucide-react";
import { checkInToLab } from "@/actions/attendance";
import { signOutUser } from "@/actions/auth";
import { checkoutHardware, registerHardware, returnHardware } from "@/actions/inventory";
import { createProposal, transitionProposal } from "@/actions/proposals";
import { createBulletin } from "@/actions/bulletins";
import type { ActionState } from "@/lib/actions";
import { OmniSearch, type SearchResult } from "@/components/omni-search";
import { FirmwareStudio } from "@/components/firmware-studio";

type SectionId = "dashboard" | "inventory" | "proposals" | "firmware" | "architect" | "attendance" | "bulletins";
type Hardware = { id: string; name: string; slug: string; category: string; qty: number; specs: string; pinout: string; location: string; imageUrl: string | null };
type FirmwareFile = { id: string; fileName: string; language: string; content: string; updatedAt: string };
type Proposal = { id: string; slug: string; title: string; abstract: string; status: ProposalStatus; leaderId: string; leader: string; teamMembers: string[]; bomItems: string[]; updatedAt: string; attachmentUrls: string[]; firmwareFiles: FirmwareFile[] };
type Attendance = { id: string; studentName: string; studentId: string; station: string; sessionType: string; objective: string; createdAt: string };
type Bulletin = { id: string; title: string; slug: string; category: string; content: string; author: string; publishedAt: string };
type Checkout = { id: string; hardwareName: string; borrowerName: string; qty: number; dueDate: string; projectRef: string | null };

const nav = [
  ["dashboard", "Command center", Activity], ["inventory", "Hardware stock", Box], ["proposals", "Project dossiers", FileText],
  ["firmware", "Firmware studio", Terminal], ["architect", "AI architect", Sparkles], ["attendance", "Lab sessions", Users], ["bulletins", "Bulletins", Bell],
] as const;
const statusNames: Record<ProposalStatus, string> = { DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "Under review", APPROVED: "Approved", ACTIVE: "Active", COMPLETED: "Completed" };
const labelDate = (date: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));

function Feedback({ state }: { state: ActionState }) {
  return state.error || state.success ? <p role="status" className={`mt-2 text-xs ${state.error ? "text-rose-300" : "text-[#c5f277]"}`}>{state.error ?? state.success}</p> : null;
}

function CheckoutForm({ item }: { item: Hardware }) {
  const [state, action, pending] = useActionState(checkoutHardware, {});
  return <form action={action} className="mt-4 border-t border-[#252b2f] pt-3"><input type="hidden" name="hardwareId" value={item.id} /><div className="grid grid-cols-[64px_1fr_auto] items-end gap-2"><label><span className="label">Qty</span><input aria-label="Quantity" className="field !px-2 !py-2 text-xs" type="number" name="qty" min="1" max={item.qty} defaultValue="1" /></label><label><span className="label">Due date</span><input aria-label="Due date" className="field !px-2 !py-2 text-xs" type="date" name="dueDate" min={new Date().toISOString().slice(0, 10)} required /></label><button className="btn-primary !px-2.5 !py-2" disabled={pending || item.qty < 1}><ArrowRight size={13} />{pending ? "..." : "Borrow"}</button></div><label className="mt-2 block"><span className="label">Project reference</span><input className="field !py-2 text-xs" name="projectRef" placeholder="Optional project name" maxLength={160} /></label><Feedback state={state} /></form>;
}

function ReturnForm({ checkout }: { checkout: Checkout }) {
  const [state, action, pending] = useActionState(returnHardware, {});
  return <form action={action} className="flex items-center gap-2"><input type="hidden" name="checkoutId" value={checkout.id} /><button className="btn-quiet !px-2.5 !py-1.5 text-[10px]" disabled={pending}><Check size={12} />{pending ? "Returning" : "Return"}</button><Feedback state={state} /></form>;
}

function InventoryRegistration() {
  const [state, action, pending] = useActionState(registerHardware, {});
  return <details className="surface p-4"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold"><span className="flex items-center gap-2"><Plus size={14} className="text-[#c5f277]" />Register hardware</span><ChevronDown size={14} /></summary><form action={action} className="mt-4 grid gap-3 sm:grid-cols-2"><Field name="name" label="Name" required /><Field name="category" label="Category" required /><Field name="qty" label="Available qty" type="number" required /><Field name="location" label="Drawer location" required /><label className="sm:col-span-2"><span className="label">Specifications</span><textarea className="field text-xs" name="specs" maxLength={3000} required /></label><label className="sm:col-span-2"><span className="label">Pinout JSON</span><textarea className="field mono min-h-20 text-xs" name="pinout" defaultValue={'{"pins": []}'} required /></label><label className="sm:col-span-2"><span className="label">Component photo · max 3 MB</span><input className="field text-xs" type="file" name="image" accept="image/*" /></label><button className="btn-primary sm:col-span-2" disabled={pending}><Plus size={14} />{pending ? "Registering..." : "Add component"}</button><div className="sm:col-span-2"><Feedback state={state} /></div></form></details>;
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label><span className="label">{label}</span><input className="field text-xs" name={name} type={type} required={required} /></label>;
}

function ProposalForm() {
  const [state, action, pending] = useActionState(createProposal, {});
  return <form action={action} className="surface space-y-3 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><FilePlus2 size={15} className="text-[#c5f277]" />Start a proposal</h2><label><span className="label">Project title</span><input className="field text-xs" name="title" minLength={5} maxLength={160} required /></label><label><span className="label">Abstract</span><textarea className="field min-h-24 text-xs" name="abstract" minLength={30} maxLength={12000} required placeholder="Problem, approach, intended outcome" /></label><label><span className="label">Team members · comma-separated</span><input className="field text-xs" name="teamMembers" maxLength={1000} /></label><label><span className="label">BOM · JSON array</span><input className="field mono text-xs" name="bomItems" defaultValue="[]" placeholder='["Arduino Uno", "MQ-2 sensor"]' /></label><label><span className="label">PDF or image · 3.5 MB total</span><input className="field text-xs" type="file" name="attachments" accept="application/pdf,image/jpeg,image/png,image/webp" multiple /></label><button className="btn-primary w-full" disabled={pending}><Plus size={14} />{pending ? "Saving..." : "Save draft"}</button><Feedback state={state} /></form>;
}

export function AppShell(props: {
  user: { id: string; name: string; email: string; role: Role };
  hardware: Hardware[]; proposals: Proposal[]; attendance: Attendance[]; bulletins: Bulletin[]; checkouts: Checkout[];
  stats: { units: number; checkinsToday: number; proposalCount: number; loans: number };
}) {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [parts, setParts] = useState<string[]>([]);
  const [architect, setArchitect] = useState("");
  const [architectError, setArchitectError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  // Add firmware here\n  delay(1000);\n}\n");
  const [serial, setSerial] = useState(false);
  const privileged = ["ADMIN", "EXECUTIVE", "FACULTY_ADVISOR"].includes(props.user.role);

  function navigate(result: SearchResult) {
    const target: Record<string, SectionId> = { Hardware: "inventory", Proposal: "proposals", Bulletin: "bulletins", Firmware: "firmware", Attendance: "attendance", Checkout: "inventory" };
    setSection(target[result.type] ?? "dashboard");
  }
  async function generate(formData: FormData) {
    setBusy(true); setArchitectError(""); setArchitect("");
    try {
      const response = await fetch("/api/ai/architect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ application: formData.get("application"), complexity: formData.get("complexity"), components: parts }) });
      const data = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Generation failed.");
      setArchitect(data.text ?? "");
    } catch (error) { setArchitectError(error instanceof Error ? error.message : "Generation failed."); }
    finally { setBusy(false); }
  }

  const headings: Record<SectionId, [string, string]> = {
    dashboard: ["Command center", "Lab operations overview"], inventory: ["Hardware stock", "Components, verified pinouts, drawer locations, and active loans"],
    proposals: ["Project dossiers", "Move ideas from draft through review, build, and completion"], firmware: ["Firmware studio", "Browser workspace for embedded code and simulated serial output"],
    architect: ["AI project architect", "Generate a first-pass circuit plan and Arduino sketch"], attendance: ["Lab sessions", "Digital sign-in and attendance records"], bulletins: ["Lab bulletins", "Club notices, workshops, and equipment updates"],
  };

  return <div className="min-h-screen lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
    <aside className="border-b border-[#252b2f] bg-[#0b0e10]/95 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
      <div className="flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-md bg-[#c5f277] text-[#19220f]"><Cpu size={19} /></div><div><div className="text-[13px] font-bold tracking-[.08em]">STEM<span className="font-normal text-[#9ea9aa]">OS</span></div><div className="mono mt-0.5 text-[9px] uppercase tracking-[.12em] text-[#7d898c]">LabCore · v3.0</div></div></div>
      <div className="mt-6 hidden lg:block"><OmniSearch onSelect={navigate} /></div>
      <nav className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-7 lg:block lg:space-y-1 lg:overflow-visible"><p className="mono mb-2 hidden px-3 text-[9px] uppercase tracking-[.14em] text-[#687478] lg:block">Workspace</p>{nav.map(([id, title, Icon]) => <button key={id} onClick={() => setSection(id)} className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors lg:w-full ${section === id ? "bg-[#1a2021] text-[#dff9af]" : "text-[#899598] hover:bg-white/[.04] hover:text-[#e8eeed]"}`}><Icon size={15} strokeWidth={1.8} />{title}{id === "architect" ? <span className="ml-auto mono text-[8px] uppercase text-[#c5f277]">AI</span> : null}</button>)}</nav>
      <div className="mt-5 hidden rounded-md border border-[#252b2f] bg-[#101416] p-3 lg:block"><div className="flex items-center gap-2 text-[10px] font-semibold"><span className="size-1.5 rounded-full bg-[#c5f277]" />Lab network online</div><p className="mono mt-2 text-[9px] text-[#7e898c]">DATA · POSTGRESQL<br />FIRMWARE · SIMULATION</p></div>
      <div className="mt-4 hidden border-t border-[#252b2f] pt-4 lg:absolute lg:bottom-4 lg:left-3 lg:right-3 lg:block"><div className="flex items-center gap-2.5 px-2"><CircleUserRound size={17} className="text-[#a5b0b2]" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{props.user.name}</div><div className="mono mt-0.5 text-[9px] text-[#7d898c]">{props.user.role.replaceAll("_", " ")}</div></div><form action={signOutUser}><button className="btn-quiet !border-transparent !bg-transparent !p-1.5" title="Sign out" aria-label="Sign out"><LogOut size={14} /></button></form></div></div>
    </aside>
    <main className="min-w-0 px-4 pb-10 pt-4 sm:px-6 lg:px-9 lg:pt-7">
      <header className="mb-7 flex items-center justify-between gap-3 border-b border-[#252b2f] pb-5"><div><p className="mono text-[9px] uppercase tracking-[.16em] text-[#859195]">Science & technology · operations</p><h1 className="mt-1 text-xl font-semibold text-[#edf2f0]">{headings[section][0]}</h1><p className="mt-1 text-xs text-[#899598]">{headings[section][1]}</p></div><div className="w-48 sm:hidden"><OmniSearch onSelect={navigate} /></div><div className="hidden items-center gap-2 rounded-md border border-[#273033] bg-[#101416] px-2.5 py-2 text-[10px] text-[#92a0a2] sm:flex"><span className="size-1.5 rounded-full bg-[#c5f277]" />Workspace live</div></header>
      <div key={section} className="enter">
        {section === "dashboard" ? <Dashboard hardware={props.hardware} proposals={props.proposals} stats={props.stats} onNavigate={setSection} /> : null}
        {section === "inventory" ? <Inventory items={props.hardware} loans={props.checkouts} privileged={privileged} query={query} setQuery={setQuery} category={category} setCategory={setCategory} /> : null}
        {section === "proposals" ? <div className="space-y-4"><Proposals items={props.proposals} query={query} setQuery={setQuery} /><ProposalWorkflow items={props.proposals} userId={props.user.id} role={props.user.role} /></div> : null}
        {section === "firmware" ? props.proposals.length ? <FirmwareStudio projects={props.proposals} /> : <Firmware code={code} setCode={setCode} serial={serial} setSerial={setSerial} /> : null}
        {section === "architect" ? <Architect items={props.hardware} parts={parts} setParts={setParts} result={architect} error={architectError} busy={busy} generate={generate} /> : null}
        {section === "attendance" ? <AttendanceView rows={props.attendance} query={query} setQuery={setQuery} privileged={privileged} /> : null}
        {section === "bulletins" ? <div className="space-y-4">{privileged ? <BulletinForm /> : null}<Bulletins items={props.bulletins} query={query} setQuery={setQuery} /></div> : null}
      </div>
      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-[#252b2f] pt-4 mono text-[9px] uppercase tracking-wider text-[#657175]"><span>STEM OS · LABCORE</span><span>{props.user.role.replaceAll("_", " ")} · Firmware simulation only</span></footer>
    </main>
  </div>;
}

function Dashboard({ hardware, proposals, stats, onNavigate }: { hardware: Hardware[]; proposals: Proposal[]; stats: { units: number; checkinsToday: number; proposalCount: number; loans: number }; onNavigate: (id: SectionId) => void }) {
  const metrics = [["Cataloged units", stats.units, Box], ["Lab check-ins today", stats.checkinsToday, Users], ["Active builds & reviews", stats.proposalCount, FileText], ["Components on loan", stats.loans, Wrench]] as const;
  return <section className="space-y-5"><div className="relative overflow-hidden rounded-lg border border-[#313a39] bg-[#111617] p-5 sm:p-7"><div className="absolute -right-12 -top-20 size-64 rounded-full border border-[#c5f277]/10" /><div className="relative max-w-2xl"><span className="mono inline-flex items-center gap-2 rounded border border-[#344036] bg-[#17201a] px-2 py-1 text-[9px] uppercase tracking-[.13em] text-[#c5f277]">Lab bench network · 01—08</span><h2 className="mt-4 max-w-xl text-2xl font-semibold leading-tight sm:text-[30px]">A clearer view of what the lab can build.</h2><p className="mt-3 max-w-xl text-xs leading-6 text-[#a2adad]">Hardware, project dossiers, and lab sessions in one operating workspace. Start with verified inventory, then turn a working idea into a reviewable build.</p><div className="mt-5 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => onNavigate("inventory")}><Box size={14} />Browse stock</button><button className="btn-quiet" onClick={() => onNavigate("proposals")}><FilePlus2 size={14} />Draft proposal</button><button className="btn-quiet" onClick={() => onNavigate("firmware")}><Code2 size={14} />Firmware studio</button></div></div></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <div key={label} className="surface flex items-center gap-3 p-4"><div className="grid size-9 place-items-center rounded-md border border-[#30383a] bg-[#161c1d] text-[#c5f277]"><Icon size={17} /></div><div><div className="mono text-xl font-semibold">{value}</div><div className="mt-1 text-[10px] text-[#8f9b9d]">{label}</div></div></div>)}</div><div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]"><div className="surface p-4"><SectionHeader icon={FileText} title="Engineering dossiers" onClick={() => onNavigate("proposals")} /><div className="divide-y divide-[#242b2e]">{proposals.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.title}</p><p className="mt-1 text-[10px] text-[#899597]">{item.leader} · Updated {labelDate(item.updatedAt)}</p></div><StatusTag status={item.status} /></div>)}</div>{proposals.length === 0 ? <Empty text="No proposals submitted yet." /> : null}</div><div className="surface p-4"><SectionHeader icon={Box} title="Bench readiness" onClick={() => onNavigate("inventory")} />{hardware.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#242b2e] py-2.5 last:border-0"><div className="min-w-0"><p className="truncate text-[11px] font-medium">{item.name}</p><p className="mono mt-1 truncate text-[9px] text-[#798689]">{item.location}</p></div><span className="mono whitespace-nowrap rounded border border-[#30383a] px-2 py-1 text-[9px] text-[#c5f277]">{item.qty} units</span></div>)}{hardware.length === 0 ? <Empty text="Seed the sample catalog to get started." /> : null}</div></div></section>;
}

function SectionHeader({ icon: Icon, title, onClick }: { icon: typeof Box; title: string; onClick: () => void }) {
  return <div className="mb-2 flex items-center justify-between border-b border-[#252b2f] pb-3"><h2 className="flex items-center gap-2 text-xs font-semibold"><Icon size={14} className="text-[#c5f277]" />{title}</h2><button className="mono text-[9px] uppercase text-[#aab5b4] hover:text-[#c5f277]" onClick={onClick}>View all →</button></div>;
}

function StatusTag({ status }: { status: ProposalStatus }) {
  return <span className="mono shrink-0 rounded border border-[#354039] bg-[#18201a] px-2 py-1 text-[8px] uppercase tracking-wider text-[#c5f277]">{statusNames[status]}</span>;
}

function Empty({ children, text }: { children?: string; text?: string }) {
  return <div className="surface-soft px-4 py-7 text-center text-xs text-[#7e8a8d]">{text ?? children}</div>;
}

function Inventory({ items, loans, privileged, query, setQuery, category, setCategory }: { items: Hardware[]; loans: Checkout[]; privileged: boolean; query: string; setQuery: (value: string) => void; category: string; setCategory: (value: string) => void }) {
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const visible = items.filter((item) => (category === "All categories" || category === item.category) && `${item.name} ${item.category} ${item.specs} ${item.location} ${item.pinout}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><p className="mono text-[10px] text-[#829093]">{items.length} catalog records · {items.reduce((sum, item) => sum + item.qty, 0)} available units</p>{privileged ? <InventoryRegistration /> : null}</div><div className="surface flex flex-col gap-2 p-2 sm:flex-row"><select className="field !w-auto min-w-40 !py-2 text-xs" value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select><input className="field !py-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter names, specs, pinouts, drawers..." /></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <HardwareCard item={item} key={item.id} />)}</div>{visible.length === 0 ? <Empty>No matching hardware records.</Empty> : null}<ActiveLoans loans={loans} /></section>;
}

function HardwareCard({ item }: { item: Hardware }) {
  return <article className="surface overflow-hidden"><div className="relative flex h-28 items-center justify-center border-b border-[#252b2f] bg-[linear-gradient(135deg,#14191a,#0c1011)]">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={480} height={280} unoptimized className="h-full w-full object-cover" /> : <div className="grid size-14 place-items-center rounded-md border border-[#34403a] bg-[#17201a] text-[#c5f277]"><Cpu size={25} strokeWidth={1.5} /></div>}<span className="mono absolute right-3 top-3 rounded border border-[#35413a] bg-[#101713]/90 px-2 py-1 text-[9px] text-[#c5f277]">{item.qty} available</span></div><div className="p-4"><div className="mono text-[9px] uppercase tracking-wider text-[#9ba8a7]">{item.category}</div><h3 className="mt-1 text-sm font-semibold">{item.name}</h3><p className="mt-2 min-h-10 text-[11px] leading-5 text-[#a0acad]">{item.specs}</p><div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#8e9a9c]"><Box size={12} className="text-[#c5f277]" />{item.location}</div><details className="mt-3 border-t border-[#252b2f] pt-3"><summary className="cursor-pointer text-[10px] text-[#bac4c3]">Pinout schema</summary><pre className="mono mt-2 overflow-x-auto whitespace-pre-wrap text-[10px] leading-5 text-[#9eaaaa]">{item.pinout}</pre></details><CheckoutForm item={item} /></div></article>;
}

function ActiveLoans({ loans }: { loans: Checkout[] }) {
  if (!loans.length) return null;
  return <div className="surface overflow-hidden"><div className="border-b border-[#252b2f] px-4 py-3 text-xs font-semibold">Active loan ledger</div><div className="divide-y divide-[#252b2f]">{loans.map((loan) => <div key={loan.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-xs font-medium">{loan.hardwareName} <span className="mono text-[#96a2a3]">×{loan.qty}</span></p><p className="mt-1 text-[10px] text-[#849093]">{loan.borrowerName}{loan.projectRef ? ` · ${loan.projectRef}` : ""} · due {labelDate(loan.dueDate)}</p></div><ReturnForm checkout={loan} /></div>)}</div></div>;
}

function ProposalWorkflow({ items, userId, role }: { items: Proposal[]; userId: string; role: Role }) {
  const transitions: Record<ProposalStatus, ProposalStatus[]> = {
    DRAFT: ["SUBMITTED"], SUBMITTED: ["UNDER_REVIEW"], UNDER_REVIEW: ["SUBMITTED", "APPROVED"],
    APPROVED: ["ACTIVE"], ACTIVE: ["COMPLETED"], COMPLETED: [],
  };
  const actionable = items.filter((item) => role === "STUDENT" ? item.leaderId === userId && item.status === "DRAFT" : transitions[item.status].length > 0);
  if (!actionable.length) return null;
  return <section className="surface p-4"><h2 className="mb-3 text-xs font-semibold">Review queue & submissions</h2><div className="space-y-2">{actionable.map((item) => <ProposalTransition key={item.id} proposal={item} role={role} transitions={transitions[item.status]} />)}</div></section>;
}

function ProposalTransition({ proposal, role, transitions }: { proposal: Proposal; role: Role; transitions: ProposalStatus[] }) {
  const [state, action, pending] = useActionState(transitionProposal, {});
  return <form action={action} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#252b2f] pt-3 first:border-0 first:pt-0"><input type="hidden" name="proposalId" value={proposal.id} /><div className="min-w-0"><p className="truncate text-xs font-medium">{proposal.title}</p><p className="mono mt-1 text-[9px] text-[#839093]">{statusNames[proposal.status]} →</p></div><div className="flex items-center gap-2"><select className="field !w-auto min-w-32 !py-2 text-[10px]" name="status" defaultValue={transitions[0]}>{transitions.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><button className="btn-primary !py-2 text-[10px]" disabled={pending}>{role === "STUDENT" ? "Submit" : "Update"}</button></div><div className="w-full"><Feedback state={state} /></div></form>;
}

function Proposals({ items, query, setQuery }: { items: Proposal[]; query: string; setQuery: (value: string) => void }) {
  const stages: ProposalStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "ACTIVE", "COMPLETED"];
  const visible = items.filter((item) => `${item.title} ${item.abstract} ${item.leader} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-4"><div className="grid grid-cols-3 gap-2 md:grid-cols-6">{stages.map((status) => <div key={status} className="surface px-3 py-2.5"><p className="mono text-[8px] uppercase tracking-wider text-[#849093]">{statusNames[status]}</p><p className="mono mt-1 text-lg font-semibold">{items.filter((item) => item.status === status).length}</p></div>)}</div><input className="field !py-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, lead, abstract, or status..." /><div className="space-y-2">{visible.map((item) => <article key={item.id} className="surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-[10px] text-[#8c999b]">Lead {item.leader}{item.teamMembers.length ? ` · Team ${item.teamMembers.join(", ")}` : ""}</p></div><StatusTag status={item.status} /></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-[#abb5b5]">{item.abstract}</p>{item.bomItems.length ? <div className="mt-3 flex flex-wrap gap-1.5">{item.bomItems.map((part) => <span key={part} className="rounded border border-[#30383a] px-2 py-1 text-[9px] text-[#9ca8a9]">{part}</span>)}</div> : null}<div className="mt-4 flex items-center justify-between border-t border-[#252b2f] pt-3"><span className="mono text-[9px] text-[#7f8b8d]">Updated {labelDate(item.updatedAt)}</span>{item.attachmentUrls.length ? <a href={item.attachmentUrls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#c5f277]">Dossier files <ArrowRight size={12} /></a> : null}</div></article>)}{visible.length === 0 ? <Empty>No proposals found. Draft a dossier to begin the pipeline.</Empty> : null}</div></div><ProposalForm /></section>;
}

function AttendanceForm() {
  const [state, action, pending] = useActionState(checkInToLab, {});
  return <form action={action} className="surface space-y-3 p-4"><div><p className="text-xs font-semibold">Lab check-in</p><p className="mt-1 text-[10px] text-[#899598]">Your account name and school ID are attached automatically.</p></div><label><span className="label">Workbench station</span><select className="field text-xs" name="station" required><option value="">Choose station</option>{["Bench 01 · Soldering", "Bench 02 · Microcontrollers", "Bench 03 · Robotics", "Bench 04 · Sensors", "Bench 05 · Open workspace"].map((station) => <option key={station}>{station}</option>)}</select></label><label><span className="label">Session type</span><select className="field text-xs" name="sessionType" required><option>Independent build</option><option>Club workshop</option><option>Mentor review</option><option>Hardware training</option></select></label><label><span className="label">Objective</span><textarea className="field min-h-24 text-xs" name="objective" minLength={5} maxLength={1000} required placeholder="What are you working on today?" /></label><button className="btn-primary w-full" disabled={pending}><Users size={14} />{pending ? "Recording..." : "Check in"}</button><Feedback state={state} /></form>;
}

function AttendanceView({ rows, query, setQuery, privileged }: { rows: Attendance[]; query: string; setQuery: (value: string) => void; privileged: boolean }) {
  const visible = rows.filter((item) => `${item.studentName} ${item.studentId} ${item.station} ${item.objective}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"><AttendanceForm /><div className="surface overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-[#252b2f] p-4"><div><p className="text-xs font-semibold">Session ledger</p><p className="mono mt-1 text-[9px] text-[#829093]">Visible records: {rows.length}</p></div>{privileged ? <a href="/api/attendance/export" className="btn-quiet !px-2.5 !py-2 text-[10px]"><ArrowDownToLine size={13} />Export CSV</a> : null}</div><div className="border-b border-[#252b2f] p-3"><input className="field !py-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member, bench, objective..." /></div><div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-xs"><thead className="mono bg-[#0b0e10] text-[9px] uppercase text-[#849094]"><tr>{["Member", "Station", "Session", "Objective", "Time"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#242b2e]">{visible.map((item) => <tr key={item.id} className="text-[#c2ccca]"><td className="px-4 py-3"><span className="block font-medium">{item.studentName}</span><span className="mono mt-1 block text-[9px] text-[#7f8a8d]">{item.studentId}</span></td><td className="px-4 py-3">{item.station}</td><td className="px-4 py-3">{item.sessionType}</td><td className="max-w-64 px-4 py-3 text-[#98a4a6]">{item.objective}</td><td className="whitespace-nowrap px-4 py-3 text-[#8f9b9d]">{labelDate(item.createdAt)}</td></tr>)}</tbody></table>{visible.length === 0 ? <Empty>No session records found.</Empty> : null}</div></div></section>;
}

function BulletinForm() {
  const [state, action, pending] = useActionState(createBulletin, {});
  return <details className="surface p-4"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold"><span className="flex items-center gap-2"><Plus size={14} className="text-[#c5f277]" />Publish bulletin</span><ChevronDown size={14} /></summary><form action={action} className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="label">Title</span><input className="field text-xs" name="title" minLength={5} maxLength={160} required /></label><label><span className="label">Category</span><input className="field text-xs" name="category" maxLength={80} required placeholder="Workshops, Robotics..." /></label><label className="sm:col-span-2"><span className="label">Announcement</span><textarea className="field min-h-24 text-xs" name="content" minLength={20} maxLength={8000} required /></label><button className="btn-primary sm:col-span-2" disabled={pending}><Plus size={14} />{pending ? "Publishing..." : "Publish to lab"}</button><div className="sm:col-span-2"><Feedback state={state} /></div></form></details>;
}

function Bulletins({ items, query, setQuery }: { items: Bulletin[]; query: string; setQuery: (value: string) => void }) {
  const visible = items.filter((item) => `${item.title} ${item.category} ${item.content}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="space-y-4"><input className="field !py-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bulletins..." /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((post) => <article key={post.id} className="surface p-4"><div className="flex justify-between"><span className="mono text-[9px] uppercase tracking-wider text-[#c5f277]">{post.category}</span><span className="mono text-[9px] text-[#7f8b8e]">{labelDate(post.publishedAt)}</span></div><h2 className="mt-3 text-sm font-semibold leading-5">{post.title}</h2><p className="mt-2 text-xs leading-5 text-[#a0acad]">{post.content}</p><p className="mono mt-4 text-[9px] text-[#758184]">Posted by {post.author}</p></article>)}{visible.length === 0 ? <Empty>No bulletins have been published.</Empty> : null}</div></section>;
}

function Architect({ items, parts, setParts, result, error, busy, generate }: { items: Hardware[]; parts: string[]; setParts: (value: string[] | ((current: string[]) => string[])) => void; result: string; error: string; busy: boolean; generate: (formData: FormData) => Promise<void> }) {
  return <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]"><div className="surface space-y-5 p-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-[#1c2420] text-[#c5f277]"><Atom size={18} /></div><div><h2 className="text-sm font-semibold">Synthesize a build plan</h2><p className="mt-1 text-[11px] text-[#899598]">Gemini 2.5 Flash · AI-generated output requires engineering review</p></div></div><form action={generate} className="space-y-4"><label><span className="label">Application or problem</span><textarea className="field min-h-24 text-xs" name="application" minLength={8} maxLength={500} required placeholder="Describe the problem this project should solve" /></label><label><span className="label">Complexity</span><select className="field text-xs" name="complexity" defaultValue="intermediate"><option value="beginner">Beginner · read loops and indicators</option><option value="intermediate">Intermediate · state machines and actuators</option><option value="advanced">Advanced · IoT and power optimization</option></select></label><div><span className="label">Available lab components</span><div className="flex flex-wrap gap-2">{items.filter((item) => item.qty > 0).map((item) => <button key={item.id} type="button" aria-pressed={parts.includes(item.name)} onClick={() => setParts((current) => current.includes(item.name) ? current.filter((name) => name !== item.name) : [...current, item.name])} className={`rounded-md border px-2.5 py-1.5 text-[10px] ${parts.includes(item.name) ? "border-[#c5f277]/60 bg-[#c5f277]/10 text-[#d7f6a7]" : "border-[#30383b] text-[#a3adaf]"}`}>{item.name}</button>)}</div></div><button className="btn-primary" disabled={busy}><Sparkles size={14} />{busy ? "Synthesizing..." : "Generate architecture"}</button></form>{error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}</div><div className="surface min-h-64 p-4"><div className="mb-3 flex items-center justify-between border-b border-[#252b2f] pb-3"><span className="mono text-[10px] uppercase tracking-wider text-[#aab4b5]">Architecture output</span>{result ? <button className="btn-quiet !px-2 !py-1 text-[10px]" onClick={() => void navigator.clipboard.writeText(result)}>Copy output</button> : null}</div>{result ? <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-[#c9d2d1]">{result}</pre> : <div className="flex min-h-52 flex-col items-center justify-center text-center"><FlaskConical size={22} className="text-[#586366]" /><p className="mt-3 text-xs text-[#829093]">Architecture notes and firmware sketch will appear here.</p></div>}</div></section>;
}

function Firmware({ code, setCode, serial, setSerial }: { code: string; setCode: (value: string) => void; serial: boolean; setSerial: (value: boolean) => void }) {
  const [verified, setVerified] = useState(false);
  const [file, setFile] = useState("main.ino");
  function exportFile() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = file; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252b2f] px-4 py-3"><div className="flex items-center gap-2"><Terminal size={15} className="text-[#c5f277]" /><span className="text-xs font-semibold">Embedded workspace</span><span className="mono rounded border border-[#30383a] px-1.5 py-0.5 text-[8px] text-[#91a0a0]">AVR / ESP32 / C++</span></div><div className="flex gap-2"><button onClick={() => setVerified(code.includes("setup") && code.includes("loop"))} className="btn-quiet !py-1.5 text-[10px]">Verify sketch</button><button onClick={exportFile} className="btn-primary !py-1.5 text-[10px]"><ArrowDownToLine size={12} />Export</button></div></div><div className="grid min-h-[480px] lg:grid-cols-[190px_minmax(0,1fr)]"><aside className="border-b border-[#252b2f] bg-[#0b0e10] p-3 lg:border-b-0 lg:border-r"><p className="mono mb-2 text-[9px] uppercase tracking-wider text-[#7f8b8e]">Project files</p>{["main.ino", "sensors.h", "config.h"].map((name) => <button key={name} onClick={() => setFile(name)} className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left mono text-[10px] ${file === name ? "bg-[#1a2021] text-[#d7f6a7]" : "text-[#95a1a2]"}`}><FileText size={12} />{name}</button>)}<p className="mono mt-5 border-t border-[#252b2f] pt-3 text-[9px] text-[#7f8b8e]">TARGET BOARD</p><select className="field mt-2 !px-2 !py-2 text-[10px]"><option>Arduino Uno</option><option>ESP32 Dev Module</option><option>Raspberry Pi Pico</option></select><p className="mono mt-3 text-[9px] text-[#748184]">SIMULATED PORT · COM3</p></aside><div className="flex min-w-0 flex-col"><div className="flex justify-between border-b border-[#252b2f] bg-[#0c0f10] px-4 py-2"><span className="mono text-[10px] text-[#b8c2c1]">{file}</span><button className="mono text-[9px] text-[#9ba7a8]" onClick={() => void navigator.clipboard.writeText(code)}>Copy code</button></div><textarea aria-label="Firmware source" spellCheck={false} value={code} onChange={(event) => { setCode(event.target.value); setVerified(false); }} className="mono min-h-[300px] flex-1 resize-y bg-[#080b0c] p-4 text-xs leading-6 text-[#cdd5d3] outline-none" /><div className="flex items-center justify-between border-t border-[#252b2f] px-4 py-2 text-[9px]">{verified ? <span className="text-[#c5f277]">Basic structure verified · no compiler invoked</span> : <span className="text-[#818d90]">Local draft · not persisted to a proposal</span>}<button className="mono text-[#b6c1bf]" onClick={() => setSerial(!serial)}>{serial ? "Hide serial" : "Show serial"}</button></div>{serial ? <div className="border-t border-[#252b2f] bg-black p-3"><span className="mono text-[9px] uppercase text-[#c5f277]">Virtual serial · 115200 baud</span><pre className="mono mt-2 h-24 overflow-auto text-[10px] leading-5 text-[#a2afaa]">[SYSTEM] Bridge simulation initialized on COM3{"\n"}{verified ? "[VERIFY] Basic sketch structure detected." : "[WAITING] No physical serial port is connected."}</pre></div> : null}</div></div></section>;
}