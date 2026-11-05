import Link from "next/link";
import { Cpu } from "lucide-react";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><section className="surface w-full max-w-md p-6 sm:p-8"><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold tracking-wider"><span className="grid size-8 place-items-center rounded bg-[#c5f277] text-[#18210f]"><Cpu size={17} /></span>STEM<span className="-ml-2 font-normal text-[#9ea9aa]">OS</span><span className="mono ml-1 text-[9px] text-[#7d898c]">LABCORE</span></Link><h1 className="text-xl font-semibold">Join the lab workspace</h1><p className="mt-2 text-xs leading-5 text-[#8e9a9c]">New accounts receive student access. An administrator can assign additional roles after registration.</p><div className="mt-6"><RegisterForm /></div></section></main>;
}