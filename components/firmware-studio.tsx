"use client";

import { useActionState, useState } from "react";
import { ArrowDownToLine, Check, FilePlus2, FileText, Terminal } from "lucide-react";
import { saveFirmwareFile } from "@/actions/proposals";
import type { ActionState } from "@/lib/actions";

type FirmwareFile = { id: string; fileName: string; language: string; content: string; updatedAt: string };
type Project = { id: string; title: string; firmwareFiles: FirmwareFile[] };

const starterFiles: Record<string, string> = {
  "main.ino": "#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  // Add firmware here\n  delay(1000);\n}\n",
  "sensors.h": "#pragma once\n\n// Add sensor interfaces for this proposal.\n",
  "config.h": "#pragma once\n\nconstexpr unsigned long SERIAL_BAUD = 115200;\n",
};

function Feedback({ state }: { state: ActionState }) {
  if (!state.error && !state.success) return null;
  return <p role="status" className={`text-xs ${state.error ? "text-rose-300" : "text-[#c5f277]"}`}>{state.error ?? state.success}</p>;
}

export function FirmwareStudio({ projects }: { projects: Project[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = projects.find((item) => item.id === projectId);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="max-w-sm flex-1"><span className="label">Project workspace</span><select className="field text-xs" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><p className="mono text-[9px] uppercase tracking-wider text-[#819092]">Source is saved with the selected proposal</p></div>
    {project ? <ProjectEditor key={project.id} project={project} /> : <div className="surface p-8 text-center text-xs text-[#8d999b]">Create a proposal before saving firmware files.</div>}
  </section>;
}

function ProjectEditor({ project }: { project: Project }) {
  const initialFiles = project.firmwareFiles.length
    ? Object.fromEntries(project.firmwareFiles.map((file) => [file.fileName, file.content]))
    : starterFiles;
  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [activeFile, setActiveFile] = useState(Object.keys(initialFiles)[0] ?? "main.ino");
  const [newFileName, setNewFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [verified, setVerified] = useState(false);
  const [showSerial, setShowSerial] = useState(false);
  const [state, action, pending] = useActionState(saveFirmwareFile, {});
  const code = files[activeFile] ?? "";
  const language = activeFile.endsWith(".h") ? "h" : activeFile.endsWith(".c") ? "c" : "cpp";

  function addFile() {
    const name = newFileName.trim();
    if (!/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,99}\.(ino|cpp|c|h)$/.test(name)) {
      setFileError("Use a .ino, .cpp, .c, or .h filename.");
      return;
    }
    if (files[name] !== undefined) {
      setFileError("A file with that name already exists.");
      return;
    }
    setFiles((current) => ({ ...current, [name]: "" }));
    setActiveFile(name);
    setNewFileName("");
    setFileError("");
  }

  function exportFile() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFile;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <section className="surface overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252b2f] px-4 py-3"><div className="flex items-center gap-2"><Terminal size={15} className="text-[#c5f277]" /><span className="text-xs font-semibold">Embedded workspace</span><span className="mono rounded border border-[#30383a] px-1.5 py-0.5 text-[8px] text-[#91a0a0]">AVR / ESP32 / C++</span></div><div className="flex gap-2"><button type="button" onClick={() => setVerified(activeFile.endsWith(".ino") && code.includes("setup") && code.includes("loop"))} className="btn-quiet !py-1.5 text-[10px]">Verify sketch</button><button type="button" onClick={exportFile} className="btn-quiet !py-1.5 text-[10px]"><ArrowDownToLine size={12} />Export file</button></div></div>
    <div className="grid min-h-[480px] lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="border-b border-[#252b2f] bg-[#0b0e10] p-3 lg:border-b-0 lg:border-r"><p className="mono mb-2 text-[9px] uppercase tracking-wider text-[#7f8b8e]">Project files</p>{Object.keys(files).sort().map((name) => <button key={name} type="button" onClick={() => { setActiveFile(name); setVerified(false); }} className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left mono text-[10px] ${activeFile === name ? "bg-[#1a2021] text-[#d7f6a7]" : "text-[#95a1a2]"}`}><FileText size={12} />{name}</button>)}<div className="mt-3 space-y-2 border-t border-[#252b2f] pt-3"><label><span className="label">New source file</span><input className="field !py-2 text-[10px]" value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="driver.h" /></label><button type="button" className="btn-quiet w-full !py-1.5 text-[10px]" onClick={addFile}><FilePlus2 size={12} />Add file</button>{fileError ? <p role="alert" className="text-[10px] text-rose-300">{fileError}</p> : null}</div><p className="mono mt-5 border-t border-[#252b2f] pt-3 text-[9px] text-[#7f8b8e]">TARGET BOARD</p><select className="field mt-2 !px-2 !py-2 text-[10px]"><option>Arduino Uno</option><option>ESP32 Dev Module</option><option>Raspberry Pi Pico</option></select><p className="mono mt-3 text-[9px] text-[#748184]">SIMULATED PORT · COM3</p></aside>
      <form action={action} className="flex min-w-0 flex-col"><input type="hidden" name="proposalId" value={project.id} /><input type="hidden" name="fileName" value={activeFile} /><input type="hidden" name="language" value={language} /><div className="flex justify-between border-b border-[#252b2f] bg-[#0c0f10] px-4 py-2"><span className="mono text-[10px] text-[#b8c2c1]">{activeFile}</span><button type="button" className="mono text-[9px] text-[#9ba7a8]" onClick={() => void navigator.clipboard.writeText(code)}>Copy code</button></div><textarea aria-label="Firmware source" name="content" spellCheck={false} value={code} onChange={(event) => { setFiles((current) => ({ ...current, [activeFile]: event.target.value })); setVerified(false); }} className="mono min-h-[300px] flex-1 resize-y bg-[#080b0c] p-4 text-xs leading-6 text-[#cdd5d3] outline-none" /><div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#252b2f] px-4 py-2 text-[9px]">{verified ? <span className="text-[#c5f277]">Basic structure verified · no compiler invoked</span> : <span className="text-[#818d90]">{project.title} · edits save to this proposal</span>}<div className="flex items-center gap-3"><button type="button" className="mono text-[#b6c1bf]" onClick={() => setShowSerial(!showSerial)}>{showSerial ? "Hide serial" : "Show serial"}</button><button className="btn-primary !py-1.5 text-[10px]" disabled={pending}><Check size={12} />{pending ? "Saving..." : "Save file"}</button></div></div><div className="px-4 pb-3"><Feedback state={state} /></div></form>
    </div>
    {showSerial ? <div className="border-t border-[#252b2f] bg-black p-3"><span className="mono text-[9px] uppercase text-[#c5f277]">Virtual serial · 115200 baud</span><pre className="mono mt-2 h-24 overflow-auto text-[10px] leading-5 text-[#a2afaa]">[SYSTEM] Bridge simulation initialized on COM3{"\n"}{verified ? "[VERIFY] Basic sketch structure detected." : "[WAITING] No physical serial port is connected."}</pre></div> : null}
  </section>;
}
