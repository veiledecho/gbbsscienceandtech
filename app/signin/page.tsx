import Link from "next/link";
import { redirect } from "next/navigation";
import { Cpu } from "lucide-react";
import { signInWithCredentials } from "@/actions/auth";
import { auth } from "@/lib/auth";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ registered?: string; error?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/");
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><section className="surface w-full max-w-md p-6 sm:p-8"><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold tracking-wider"><span className="grid size-8 place-items-center rounded bg-[#c5f277] text-[#18210f]"><Cpu size={17} /></span>STEM<span className="-ml-2 font-normal text-[#9ea9aa]">OS</span><span className="mono ml-1 text-[9px] text-[#7d898c]">LABCORE</span></Link><h1 className="text-xl font-semibold">Sign in to LabCore</h1><p className="mt-2 text-xs text-[#8e9a9c]">Access the lab inventory, project pipeline, and session ledger.</p>{params.registered ? <p className="mt-4 rounded border border-[#40513a] bg-[#192219] p-3 text-xs text-[#c5f277]">Account created. Sign in to continue.</p> : null}{params.error ? <p role="alert" className="mt-4 rounded border border-rose-900 bg-rose-950/30 p-3 text-xs text-rose-200">{params.error === "credentials" ? "Email or password is incorrect." : "Sign-in service is unavailable. Verify DATABASE_URL and try again."}</p> : null}<form action={signInWithCredentials} className="mt-6 space-y-4"><label className="block"><span className="label">Email</span><input className="field text-sm" name="email" type="email" autoComplete="email" required /></label><label className="block"><span className="label">Password</span><input className="field text-sm" name="password" type="password" autoComplete="current-password" required /></label><button className="btn-primary w-full">Sign in</button></form><p className="mt-5 text-center text-xs text-[#8e9a9c]">New to the lab? <Link href="/register" className="text-[#c5f277] hover:underline">Create a student account</Link></p></section></main>;
}