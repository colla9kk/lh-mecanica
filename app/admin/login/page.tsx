"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Wrench } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin");
    });
  }, [router]);

  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    if (!isSupabaseConfigured) {
      setError("Configure o arquivo .env.local antes de entrar."); setLoading(false); return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError("E-mail ou senha incorretos."); setLoading(false); return; }
    router.replace("/admin");
  }

  return (
    <main className="grid min-h-screen bg-[#0e131b] p-5 text-white lg:grid-cols-2">
      <section className="hidden flex-col justify-between rounded-3xl bg-[#e8502a] p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3 font-black"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#e8502a]"><Wrench /></span> LH Mecânica</Link>
        <div><p className="max-w-xl text-5xl font-black leading-tight tracking-[-.04em]">Clientes, veículos e ordens de serviço em um só lugar.</p><p className="mt-6 max-w-lg text-lg text-white/75">Consulte a placa e encontre todo o histórico do veículo em poucos segundos.</p></div>
        <p className="text-sm text-white/65">Área exclusiva da oficina</p>
      </section>
      <section className="grid place-items-center px-2 py-12 sm:px-8">
        <form onSubmit={login} className="w-full max-w-md">
          <Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={17} /> Voltar para o site</Link>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-[#ff6a3d]"><LockKeyhole /></span>
          <h1 className="mt-7 text-4xl font-black tracking-[-.04em]">Entrar no painel</h1>
          <p className="mt-3 text-white/55">Use o acesso administrativo cadastrado na configuração.</p>
          {!isSupabaseConfigured && <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">O banco ainda não foi configurado. Siga o arquivo README.md.</div>}
          <label className="mt-8 grid gap-2 text-sm font-bold">E-mail<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-13 rounded-xl border border-white/15 bg-white/7 px-4 text-white" /></label>
          <label className="mt-5 grid gap-2 text-sm font-bold">Senha<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-13 rounded-xl border border-white/15 bg-white/7 px-4 text-white" /></label>
          {error && <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>}
          <button disabled={loading} className="mt-7 min-h-13 w-full rounded-xl bg-[#e8502a] px-5 font-black disabled:opacity-60">{loading ? "Entrando..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
