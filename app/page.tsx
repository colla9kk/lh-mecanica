"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Menu, Phone, X } from "lucide-react";
import { business, serviceHighlights } from "@/lib/config";
import { normalizePlate } from "@/lib/format";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", brand: "", model: "", year: "", plate: "", issue: "", running: "Sim", rescue: "Não" });

  function submitTriage(event: FormEvent) {
    event.preventDefault();
    const message = ["Olá, gostaria de solicitar uma avaliação.", "", `Nome: ${form.name}`, `Telefone: ${form.phone}`, `Veículo: ${form.brand} ${form.model}`, `Ano: ${form.year || "Não informado"}`, `Placa: ${form.plate || "Não informada"}`, `Problema: ${form.issue}`, `Veículo funcionando: ${form.running}`, `Precisa de socorro/guincho: ${form.rescue}`].join("\n");
    window.open(`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-[#111820]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f5f5f2]/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
            <img src="/images/logo-lh.jpeg" alt="Logo Mecânica LH" width={96} height={64} className="h-16 w-24 rounded-lg bg-white object-contain" />
            <span className="leading-none"><span className="block text-lg">Mecânica LH</span><span className="mt-1 block text-[11px] font-bold uppercase tracking-[.18em] text-[#6d747c]">Automotiva</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            <a href="#servicos" className="hover:text-[#b91424]">Serviços</a><a href="#triagem" className="hover:text-[#b91424]">Avaliação</a><a href="#contato" className="hover:text-[#b91424]">Contato</a><Link href="/admin/login" className="text-[#6d747c] hover:text-[#111820]">Área da oficina</Link>
          </nav>
          <button className="md:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <nav className="border-t border-black/10 bg-white px-5 py-4 md:hidden"><a href="#servicos" className="block py-3" onClick={() => setMenuOpen(false)}>Serviços</a><a href="#triagem" className="block py-3" onClick={() => setMenuOpen(false)}>Solicitar avaliação</a><a href="#contato" className="block py-3" onClick={() => setMenuOpen(false)}>Contato</a><Link href="/admin/login" className="block py-3">Área da oficina</Link></nav>}
      </header>

      <section className="relative overflow-hidden bg-[#0e131b] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80"><span className="h-2 w-2 rounded-full bg-[#b91424]" /> Atendimento em Guarujá e região</span>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-6xl lg:text-7xl">Seu carro em boas mãos, <span className="text-[#ff6674]">sem enrolação.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">Diagnóstico claro, orçamento organizado e acompanhamento do histórico do seu veículo em cada atendimento.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#triagem" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b91424] px-6 font-bold hover:bg-[#d31b2c]">Solicitar avaliação <ArrowRight size={18} /></a>
              <a href={`tel:${business.phone.replace(/\D/g, "")}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 font-bold hover:bg-white/8"><Phone size={18} /> {business.phone}</a>
            </div>
          </div>
          <figure className="relative min-h-[350px] overflow-hidden rounded-2xl border border-white/15 lg:min-h-[480px]">
            <img src="/images/fachada-oficina.jpeg" alt="Fachada da Mecânica LH com veículos em atendimento" width={1204} height={1600} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[50%_53%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
            <figcaption className="absolute bottom-0 left-0 right-0 p-6"><span className="text-xs font-bold uppercase tracking-[.2em] text-white/75">Mecânica LH</span><p className="mt-2 text-2xl font-black">Cuidado de verdade.<br />Aqui, na nossa oficina.</p></figcaption>
          </figure>
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div><p className="text-sm font-black uppercase tracking-[.18em] text-[#b91424]">Serviços</p><h2 className="mt-4 text-4xl font-black tracking-[-.035em]">Manutenção completa para o seu veículo.</h2><p className="mt-5 leading-7 text-[#69717a]">Conte o que está acontecendo. A oficina recebe as informações e entra em contato para orientar o próximo passo.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{serviceHighlights.map((service, index) => <div key={service} className="flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-5 shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#111820] text-sm font-black text-white">{String(index + 1).padStart(2, "0")}</span><span className="font-bold">{service}</span></div>)}</div>
        </div>
      </section>

      <section aria-labelledby="oficina-title" className="bg-[#0e131b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8">
          <figure className="overflow-hidden rounded-2xl">
            <img src="/images/oficina-esquina.jpeg" alt="Vista externa da esquina e entrada da Mecânica LH" width={1204} height={1600} loading="lazy" className="h-[320px] w-full object-cover object-[50%_54%] sm:h-[380px]" />
            <figcaption className="mt-3 text-sm text-white/60">Nossa fachada, para você reconhecer quando chegar.</figcaption>
          </figure>
          <div><p className="text-sm font-bold uppercase tracking-[.18em] text-[#ff6674]">Conheça a oficina</p><h2 id="oficina-title" className="mt-4 text-4xl font-black tracking-tight">Seu próximo atendimento começa com uma conversa.</h2><p className="mt-5 leading-8 text-white/70">Conte o que seu carro está apresentando e fale diretamente com a Mecânica LH. Envie os dados do veículo e combine o atendimento pelo WhatsApp.</p><a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#b91424] px-6 py-4 font-bold">Falar com a oficina <ArrowRight size={18} /></a></div>
        </div>
      </section>

      <section id="triagem" className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.75fr_1.25fr] lg:px-8">
          <div><p className="text-sm font-black uppercase tracking-[.18em] text-[#b91424]">Triagem rápida</p><h2 className="mt-4 text-4xl font-black tracking-[-.035em]">Explique o problema antes de trazer o carro.</h2><p className="mt-5 leading-7 text-[#69717a]">Preencha os dados e envie direto para o WhatsApp da oficina. Isso ajuda a agilizar o atendimento.</p></div>
          <form onSubmit={submitTriage} className="grid gap-5 rounded-3xl border border-black/8 bg-[#f7f7f4] p-6 shadow-[0_20px_70px_rgba(17,24,32,.08)] sm:grid-cols-2 sm:p-8">
            <Field label="Seu nome"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Telefone"><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Marca"><input required placeholder="Ex.: Chevrolet" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="Modelo"><input required placeholder="Ex.: Onix" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="Ano"><input inputMode="numeric" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
            <Field label="Placa (opcional)"><input value={form.plate} onChange={(e) => setForm({ ...form, plate: normalizePlate(e.target.value) })} /></Field>
            <Field label="O veículo está funcionando?"><select value={form.running} onChange={(e) => setForm({ ...form, running: e.target.value })}><option>Sim</option><option>Não</option><option>Com dificuldade</option></select></Field>
            <Field label="Precisa de socorro ou guincho?"><select value={form.rescue} onChange={(e) => setForm({ ...form, rescue: e.target.value })}><option>Não</option><option>Sim</option><option>Não tenho certeza</option></select></Field>
            <Field label="Descreva o problema" wide><textarea required rows={4} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} /></Field>
            <button className="min-h-14 rounded-xl bg-[#b91424] px-6 font-black text-white hover:bg-[#9f101f] sm:col-span-2">Enviar pelo WhatsApp</button>
          </form>
        </div>
      </section>

      <footer id="contato" className="bg-[#0e131b] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-3 lg:px-8"><div><img src="/images/logo-lh.jpeg" alt="Mecânica LH — serviços automotivos" width={150} height={100} loading="lazy" className="mb-5 rounded-xl bg-white object-contain" /><h2 className="text-xl font-black">Mecânica LH</h2><p className="mt-3 text-sm text-white/55">{business.tagline}</p></div><div className="space-y-4 text-sm text-white/80"><a href={`tel:+${business.whatsapp}`} className="flex items-center gap-2"><Phone size={17} /> {business.phone}</a><a href={`mailto:${business.email}`} className="block break-all underline underline-offset-4">{business.email}</a><p className="flex gap-2"><MapPin size={17} /> {business.address}</p></div><div className="text-sm text-white/65 md:text-right"><p>{business.hours}</p><p className="mt-3">© {new Date().getFullYear()} Mecânica LH</p></div></div></footer>
    </main>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`grid gap-2 text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span><div className="[&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-black/10 [&_input]:bg-white [&_input]:px-4 [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-black/10 [&_select]:bg-white [&_select]:px-4 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black/10 [&_textarea]:bg-white [&_textarea]:p-4">{children}</div></label>;
}
