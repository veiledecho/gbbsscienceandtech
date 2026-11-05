"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUser } from "@/actions/auth";
import type { ActionState } from "@/lib/actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerUser, {} as ActionState);
  return <form action={action} className="space-y-4">
    <label className="block"><span className="label">Full name</span><input className="field text-sm" name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
    <label className="block"><span className="label">School ID</span><input className="field text-sm" name="studentId" autoComplete="off" required minLength={2} maxLength={40} /></label>
    <label className="block"><span className="label">Email</span><input className="field text-sm" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label className="block"><span className="label">Password · 10 characters minimum</span><input className="field text-sm" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
    {state.error ? <p role="alert" className="text-xs text-rose-300">{state.error}</p> : null}
    <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating account..." : "Create student account"}</button>
    <p className="text-center text-xs text-[#8e9a9c]">Already registered? <Link href="/signin" className="text-[#c5f277] hover:underline">Sign in</Link></p>
  </form>;
}