"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CarFront, ChevronRight, CircleDollarSign, ClipboardList, Download, FileDown,
  LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Search, UserRound, Users, Wrench, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dateBR, money, normalizePlate, today } from "@/lib/format";
import { downloadOrderPdf } from "@/lib/pdf";
import { Customer, OrderStatus, ServiceItem, ServiceOrder, Vehicle, statusLabels } from "@/lib/types";

type Tab = "inicio" | "placa" | "clientes" | "veiculos" | "ordens" | "backup";
const emptyItem: ServiceItem = { type: "servico", description: "", quantity: 1, unit_price: 0, subtotal: 0 };

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("inicio");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [plateSearch, setPlateSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [presetVehicleId, setPresetVehicleId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    const [customersResult, vehiclesResult, ordersResult] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("vehicles").select("*, customer:customers(*)").order("created_at", { ascending: false }),
      supabase.from("service_orders").select("*, customer:customers(*), vehicle:vehicles(*), items:service_order_items(*)").order("created_at", { ascending: false }),
    ]);
    const firstError = customersResult.error || vehiclesResult.error || ordersResult.error;
    if (firstError) setError("Não foi possível carregar os dados. Confira a configuração do Supabase.");
    setCustomers((customersResult.data || []) as Customer[]);
    setVehicles((vehiclesResult.data || []) as unknown as Vehicle[]);
    setOrders((ordersResult.data || []) as unknown as ServiceOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/admin/login"); return; }
      setReady(true); void loadData();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/admin/login");
    });
    return () => data.subscription.unsubscribe();
  }, [loadData, router]);

  useEffect(() => {
    type ModelContext = {
      registerTool: (tool: {
        name: string;
        title: string;
        description: string;
        inputSchema: object;
        annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        execute: (input: { plate?: string }) => unknown;
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "consultar_historico_por_placa",
      title: "Consultar histórico pela placa",
      description: "Localiza um veículo já cadastrado pela oficina e retorna suas ordens de serviço.",
      inputSchema: {
        type: "object",
        properties: { plate: { type: "string", description: "Placa do veículo." } },
        required: ["plate"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const plate = normalizePlate(input.plate || "");
        const vehicle = vehicles.find((item) => item.plate === plate);
        if (!vehicle) return { found: false, plate };
        return {
          found: true,
          vehicle: { id: vehicle.id, plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model, year: vehicle.year },
          orders: orders.filter((order) => order.vehicle_id === vehicle.id).map((order) => ({
            number: order.order_number,
            date: order.entry_date,
            status: statusLabels[order.status],
            reportedProblem: order.reported_problem,
            total: order.total,
          })),
        };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [vehicles, orders]);

  function notify(text: string) {
    setMessage(text); setTimeout(() => setMessage(""), 3500);
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/admin/login"); }
  function navigate(next: Tab) { setTab(next); setMobileMenu(false); }
  function newOrderFor(vehicleId: string) { setPresetVehicleId(vehicleId); setTab("ordens"); setSelectedOrder(null); window.scrollTo({ top: 0, behavior: "smooth" }); }

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#0e131b] text-white"><RefreshCw className="animate-spin text-[#b91424]" /></main>;

  const foundVehicle = plateSearch.length >= 3
    ? vehicles.find((vehicle) => vehicle.plate.includes(normalizePlate(plateSearch)))
    : undefined;
  const foundOrders = foundVehicle ? orders.filter((order) => order.vehicle_id === foundVehicle.id) : [];

  return (
    <main className="min-h-screen bg-[#f3f4f4] text-[#131a22] lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0e131b] p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-black"><img src="/images/logo-lh.jpeg" alt="Logo Mecânica LH" width={72} height={48} className="rounded-lg bg-white object-contain" /> LH Mecânica</div>
          <button className="lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="mt-10 space-y-2">
          <NavButton active={tab === "inicio"} icon={LayoutDashboard} onClick={() => navigate("inicio")}>Visão geral</NavButton>
          <NavButton active={tab === "placa"} icon={Search} onClick={() => navigate("placa")}>Consultar placa</NavButton>
          <NavButton active={tab === "clientes"} icon={Users} onClick={() => navigate("clientes")}>Clientes</NavButton>
          <NavButton active={tab === "veiculos"} icon={CarFront} onClick={() => navigate("veiculos")}>Veículos</NavButton>
          <NavButton active={tab === "ordens"} icon={ClipboardList} onClick={() => navigate("ordens")}>Ordens de serviço</NavButton>
          <NavButton active={tab === "backup"} icon={Download} onClick={() => navigate("backup")}>Backup</NavButton>
        </nav>
        <button onClick={logout} className="absolute bottom-6 left-5 right-5 flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/65 hover:bg-white/5 hover:text-white"><LogOut size={18} /> Sair</button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-black/8 bg-[#f3f4f4]/92 px-5 backdrop-blur sm:px-8">
          <button className="lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu /></button>
          <div className="hidden lg:block"><p className="text-sm font-bold text-[#6b737d]">Painel da oficina</p></div>
          <button onClick={() => void loadData()} className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar</button>
        </header>

        <section className="mx-auto max-w-[1500px] p-5 sm:p-8">
          {message && <div className="fixed right-5 top-22 z-[80] rounded-xl bg-[#147d50] px-5 py-4 text-sm font-bold text-white shadow-xl">{message}</div>}
          {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
          {tab === "inicio" && <Dashboard customers={customers} vehicles={vehicles} orders={orders} loading={loading} onPlate={() => setTab("placa")} onNewOrder={() => setTab("ordens")} onSelectOrder={setSelectedOrder} />}
          {tab === "placa" && <PlateLookup query={plateSearch} onQuery={setPlateSearch} vehicle={foundVehicle} orders={foundOrders} onNewOrder={newOrderFor} onSelectOrder={setSelectedOrder} />}
          {tab === "clientes" && <CustomersPanel customers={customers} onSaved={async () => { notify("Cliente cadastrado."); await loadData(); }} onError={setError} />}
          {tab === "veiculos" && <VehiclesPanel vehicles={vehicles} customers={customers} onSaved={async () => { notify("Veículo cadastrado."); await loadData(); }} onError={setError} onNewOrder={newOrderFor} />}
          {tab === "ordens" && <OrdersPanel orders={orders} vehicles={vehicles} presetVehicleId={presetVehicleId} clearPreset={() => setPresetVehicleId("")} onSaved={async () => { notify("Ordem de serviço criada."); await loadData(); }} onError={setError} onSelectOrder={setSelectedOrder} />}
          {tab === "backup" && <BackupPanel customers={customers} vehicles={vehicles} orders={orders} />}
        </section>
      </div>

      {selectedOrder && <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} onChanged={async () => { await loadData(); setSelectedOrder(null); notify("Ordem atualizada."); }} onError={setError} />}
    </main>
  );
}

function NavButton({ active, icon: Icon, children, onClick }: { active: boolean; icon: typeof Search; children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${active ? "bg-[#b91424] text-white" : "text-white/58 hover:bg-white/6 hover:text-white"}`}><Icon size={18} />{children}</button>;
}

function PageTitle({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#b91424]">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-.035em] sm:text-4xl">{title}</h1>{copy && <p className="mt-3 max-w-2xl text-[#68717a]">{copy}</p>}</div>{action}</div>;
}

function Dashboard({ customers, vehicles, orders, loading, onPlate, onNewOrder, onSelectOrder }: { customers: Customer[]; vehicles: Vehicle[]; orders: ServiceOrder[]; loading: boolean; onPlate: () => void; onNewOrder: () => void; onSelectOrder: (o: ServiceOrder) => void }) {
  const active = orders.filter((o) => !["entregue", "cancelada"].includes(o.status));
  const revenue = orders.filter((o) => o.status === "entregue").reduce((sum, o) => sum + Number(o.total), 0);
  return <><PageTitle eyebrow="Hoje na oficina" title="Visão geral" copy="Acompanhe os atendimentos e encontre rapidamente o que precisa." action={<div className="flex gap-3"><button onClick={onPlate} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black">Consultar placa</button><button onClick={onNewOrder} className="rounded-xl bg-[#b91424] px-4 py-3 text-sm font-black text-white">Nova OS</button></div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} label="Clientes" value={customers.length} />
      <Metric icon={CarFront} label="Veículos" value={vehicles.length} />
      <Metric icon={ClipboardList} label="Ordens ativas" value={active.length} />
      <Metric icon={CircleDollarSign} label="Total entregue" value={money(revenue)} />
    </div>
    <section className="mt-8 rounded-2xl border border-black/8 bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Ordens recentes</h2><span className="text-sm text-[#6b737d]">{orders.length} no total</span></div>
      <div className="mt-5 divide-y divide-black/7">{loading ? <p className="py-8 text-center text-[#6b737d]">Carregando...</p> : orders.slice(0, 8).map((order) => <button key={order.id} onClick={() => onSelectOrder(order)} className="grid w-full gap-2 py-4 text-left hover:bg-black/[.015] sm:grid-cols-[110px_1fr_150px_120px_24px] sm:items-center"><strong>{order.order_number}</strong><span><b>{order.vehicle?.plate}</b><small className="ml-2 text-[#6b737d]">{order.vehicle?.brand} {order.vehicle?.model}</small></span><Status status={order.status} /><b>{money(order.total)}</b><ChevronRight size={18} /></button>)}
      {!loading && orders.length === 0 && <Empty text="Nenhuma ordem cadastrada." />}</div>
    </section>
  </>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return <article className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#111820] text-white"><Icon size={20} /></span><p className="mt-5 text-sm font-bold text-[#727a84]">{label}</p><p className="mt-1 text-3xl font-black tracking-tight">{value}</p></article>;
}

function PlateLookup({ query, onQuery, vehicle, orders, onNewOrder, onSelectOrder }: { query: string; onQuery: (q: string) => void; vehicle?: Vehicle; orders: ServiceOrder[]; onNewOrder: (id: string) => void; onSelectOrder: (o: ServiceOrder) => void }) {
  return <><PageTitle eyebrow="Histórico do veículo" title="Consultar por placa" copy="Digite uma placa já cadastrada para ver o proprietário e todos os atendimentos." />
    <div className="relative max-w-xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#79818a]" size={20} /><input autoFocus value={query} onChange={(e) => onQuery(normalizePlate(e.target.value))} placeholder="ABC1D23" className="h-16 w-full rounded-2xl border border-black/10 bg-white pl-12 pr-5 text-xl font-black uppercase tracking-[.12em] shadow-sm" /></div>
    {query.length >= 3 && !vehicle && <div className="mt-7 max-w-xl rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center"><CarFront className="mx-auto text-[#9aa0a6]" /><h2 className="mt-4 font-black">Veículo não encontrado</h2><p className="mt-2 text-sm text-[#6b737d]">Confira a placa ou cadastre o veículo na seção Veículos.</p></div>}
    {vehicle && <div className="mt-8 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><article className="rounded-2xl bg-[#111820] p-7 text-white"><p className="text-sm font-bold text-white/50">Veículo encontrado</p><p className="mt-3 text-3xl font-black tracking-[.1em]">{vehicle.plate}</p><p className="mt-5 text-lg font-bold">{vehicle.brand} {vehicle.model}</p><p className="mt-1 text-white/60">{vehicle.year || "Ano não informado"} • {vehicle.color || "Cor não informada"}</p><hr className="my-6 border-white/10" /><p className="text-sm text-white/50">Proprietário</p><p className="mt-1 font-bold">{vehicle.customer?.name}</p><p className="mt-1 text-sm text-white/60">{vehicle.customer?.phone}</p><button onClick={() => onNewOrder(vehicle.id)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b91424] px-4 py-3 font-black"><Plus size={18} /> Nova ordem para este veículo</button></article>
      <article className="rounded-2xl border border-black/8 bg-white p-6"><h2 className="text-xl font-black">Histórico de atendimentos</h2><div className="mt-4 divide-y divide-black/7">{orders.map((order) => <button key={order.id} onClick={() => onSelectOrder(order)} className="grid w-full gap-2 py-4 text-left sm:grid-cols-[110px_100px_1fr_100px_20px] sm:items-center"><b>{order.order_number}</b><span className="text-sm text-[#68717a]">{dateBR(order.entry_date)}</span><span className="truncate">{order.reported_problem}</span><Status status={order.status} /><ChevronRight size={18} /></button>)}{orders.length === 0 && <Empty text="Este veículo ainda não possui ordens." />}</div></article></div>}
  </>;
}

function CustomersPanel({ customers, onSaved, onError }: { customers: Customer[]; onSaved: () => void; onError: (e: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", document: "", phone: "", whatsapp: "", email: "", address: "", notes: "" });
  async function submit(e: FormEvent) { e.preventDefault(); const { error } = await supabase.from("customers").insert(form); if (error) { onError("Não foi possível cadastrar o cliente."); return; } setForm({ name: "", document: "", phone: "", whatsapp: "", email: "", address: "", notes: "" }); setShowForm(false); onSaved(); }
  return <><PageTitle eyebrow="Relacionamento" title="Clientes" copy="Cadastre os proprietários antes de adicionar os veículos." action={<button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-[#b91424] px-5 py-3 text-sm font-black text-white"><Plus size={17} /> Novo cliente</button>} />
    {showForm && <form onSubmit={submit} className="mb-7 grid gap-4 rounded-2xl border border-black/8 bg-white p-6 sm:grid-cols-2 xl:grid-cols-3"><Input label="Nome completo" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} /><Input label="CPF ou CNPJ" value={form.document} onChange={(v) => setForm({ ...form, document: v })} /><Input label="Telefone" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /><Input label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} /><Input label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /><Input label="Endereço" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /><label className="grid gap-2 text-sm font-bold sm:col-span-2 xl:col-span-3">Observações<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-black/10 p-3" /></label><div className="flex gap-3 sm:col-span-2 xl:col-span-3"><button className="rounded-xl bg-[#111820] px-5 py-3 font-bold text-white">Salvar cliente</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-black/10 px-5 py-3 font-bold">Cancelar</button></div></form>}
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#111820] text-sm text-white"><tr><th className="p-4">Nome</th><th className="p-4">Telefone</th><th className="p-4">Documento</th><th className="p-4">E-mail</th><th className="p-4">Cadastro</th></tr></thead><tbody className="divide-y divide-black/7">{customers.map((c) => <tr key={c.id}><td className="p-4 font-bold">{c.name}</td><td className="p-4">{c.phone}</td><td className="p-4">{c.document || "—"}</td><td className="p-4">{c.email || "—"}</td><td className="p-4">{dateBR(c.created_at)}</td></tr>)}</tbody></table></div>{customers.length === 0 && <Empty text="Nenhum cliente cadastrado." />}</div>
  </>;
}

function VehiclesPanel({ vehicles, customers, onSaved, onError, onNewOrder }: { vehicles: Vehicle[]; customers: Customer[]; onSaved: () => void; onError: (e: string) => void; onNewOrder: (id: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", plate: "", brand: "", model: "", year: "", color: "", mileage: "", fuel: "", chassis: "", notes: "" });
  async function submit(e: FormEvent) { e.preventDefault(); const payload = { ...form, plate: normalizePlate(form.plate), year: form.year ? Number(form.year) : null, mileage: form.mileage ? Number(form.mileage) : null }; const { error } = await supabase.from("vehicles").insert(payload); if (error) { onError(error.code === "23505" ? "Esta placa já está cadastrada." : "Não foi possível cadastrar o veículo."); return; } setShowForm(false); setForm({ customer_id: "", plate: "", brand: "", model: "", year: "", color: "", mileage: "", fuel: "", chassis: "", notes: "" }); onSaved(); }
  return <><PageTitle eyebrow="Frota atendida" title="Veículos" copy="Cada placa mantém seu próprio histórico de ordens." action={<button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-[#b91424] px-5 py-3 text-sm font-black text-white"><Plus size={17} /> Novo veículo</button>} />
    {showForm && <form onSubmit={submit} className="mb-7 grid gap-4 rounded-2xl border border-black/8 bg-white p-6 sm:grid-cols-2 xl:grid-cols-3"><Select label="Proprietário" required value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} options={customers.map((c) => [c.id, c.name])} /><Input label="Placa" required value={form.plate} onChange={(v) => setForm({ ...form, plate: normalizePlate(v) })} /><Input label="Marca" required value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} /><Input label="Modelo" required value={form.model} onChange={(v) => setForm({ ...form, model: v })} /><Input label="Ano" type="number" value={form.year} onChange={(v) => setForm({ ...form, year: v })} /><Input label="Cor" value={form.color} onChange={(v) => setForm({ ...form, color: v })} /><Input label="Quilometragem" type="number" value={form.mileage} onChange={(v) => setForm({ ...form, mileage: v })} /><Input label="Combustível" value={form.fuel} onChange={(v) => setForm({ ...form, fuel: v })} /><Input label="Chassi" value={form.chassis} onChange={(v) => setForm({ ...form, chassis: v })} /><div className="flex gap-3 sm:col-span-2 xl:col-span-3"><button disabled={!customers.length} className="rounded-xl bg-[#111820] px-5 py-3 font-bold text-white disabled:opacity-40">Salvar veículo</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-black/10 px-5 py-3 font-bold">Cancelar</button></div></form>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{vehicles.map((v) => <article key={v.id} className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-start justify-between"><span className="rounded-lg bg-[#111820] px-3 py-2 font-black tracking-[.12em] text-white">{v.plate}</span><button onClick={() => onNewOrder(v.id)} className="rounded-lg bg-[#ffe6de] p-2 text-[#d9411e]" title="Nova ordem"><Plus size={18} /></button></div><h2 className="mt-5 text-xl font-black">{v.brand} {v.model}</h2><p className="mt-1 text-sm text-[#6b737d]">{v.year || "Ano não informado"} • {v.color || "Cor não informada"}</p><div className="mt-5 border-t border-black/7 pt-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8a9198]">Proprietário</p><p className="mt-1 font-bold">{v.customer?.name}</p></div></article>)}{vehicles.length === 0 && <Empty text="Nenhum veículo cadastrado." />}</div>
  </>;
}

function OrdersPanel({ orders, vehicles, presetVehicleId, clearPreset, onSaved, onError, onSelectOrder }: { orders: ServiceOrder[]; vehicles: Vehicle[]; presetVehicleId: string; clearPreset: () => void; onSaved: () => void; onError: (e: string) => void; onSelectOrder: (o: ServiceOrder) => void }) {
  const [showForm, setShowForm] = useState(Boolean(presetVehicleId));
  const [form, setForm] = useState({ vehicle_id: presetVehicleId, entry_date: today(), expected_delivery_date: "", mileage: "", reported_problem: "", diagnosis: "", notes: "", discount: "0" });
  const [items, setItems] = useState<ServiceItem[]>([{ ...emptyItem }]);
  useEffect(() => { if (presetVehicleId) { setShowForm(true); setForm((f) => ({ ...f, vehicle_id: presetVehicleId })); clearPreset(); } }, [presetVehicleId, clearPreset]);
  const totals = useMemo(() => calculateTotals(items, Number(form.discount || 0)), [items, form.discount]);
  function updateItem(index: number, field: keyof ServiceItem, value: string) { setItems((current) => current.map((item, i) => { if (i !== index) return item; const next = { ...item, [field]: field === "quantity" || field === "unit_price" ? Number(value) : value }; return { ...next, subtotal: Number(next.quantity) * Number(next.unit_price) }; })); }
  async function submit(e: FormEvent) {
    e.preventDefault(); const vehicle = vehicles.find((v) => v.id === form.vehicle_id); if (!vehicle) return;
    const validItems = items.filter((i) => i.description.trim());
    const { data, error } = await supabase.from("service_orders").insert({ customer_id: vehicle.customer_id, vehicle_id: vehicle.id, entry_date: form.entry_date, expected_delivery_date: form.expected_delivery_date || null, mileage: form.mileage ? Number(form.mileage) : null, reported_problem: form.reported_problem, diagnosis: form.diagnosis || null, notes: form.notes || null, status: "aberta", ...totals }).select().single();
    if (error || !data) { onError("Não foi possível criar a ordem."); return; }
    if (validItems.length) {
      const { error: itemError } = await supabase.from("service_order_items").insert(validItems.map((item) => ({ service_order_id: data.id, type: item.type, description: item.description, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal })));
      if (itemError) { onError("A ordem foi criada, mas os itens não foram salvos."); return; }
    }
    if (form.mileage) await supabase.from("vehicles").update({ mileage: Number(form.mileage) }).eq("id", vehicle.id);
    setShowForm(false); setItems([{ ...emptyItem }]); setForm({ vehicle_id: "", entry_date: today(), expected_delivery_date: "", mileage: "", reported_problem: "", diagnosis: "", notes: "", discount: "0" }); onSaved();
  }
  return <><PageTitle eyebrow="Atendimentos" title="Ordens de serviço" copy="Crie uma nova ordem a cada visita e preserve o histórico do veículo." action={<button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-[#b91424] px-5 py-3 text-sm font-black text-white"><Plus size={17} /> Nova OS</button>} />
    {showForm && <form onSubmit={submit} className="mb-8 rounded-2xl border border-black/8 bg-white p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Select label="Veículo" required value={form.vehicle_id} onChange={(v) => setForm({ ...form, vehicle_id: v })} options={vehicles.map((v) => [v.id, `${v.plate} • ${v.brand} ${v.model}`])} /><Input label="Data de entrada" type="date" required value={form.entry_date} onChange={(v) => setForm({ ...form, entry_date: v })} /><Input label="Previsão de entrega" type="date" value={form.expected_delivery_date} onChange={(v) => setForm({ ...form, expected_delivery_date: v })} /><Input label="Quilometragem" type="number" value={form.mileage} onChange={(v) => setForm({ ...form, mileage: v })} /></div>
      <label className="mt-4 grid gap-2 text-sm font-bold">Problema relatado<textarea required rows={3} value={form.reported_problem} onChange={(e) => setForm({ ...form, reported_problem: e.target.value })} className="rounded-xl border border-black/10 p-3" /></label>
      <div className="mt-7 flex items-center justify-between"><h2 className="font-black">Serviços e peças</h2><button type="button" onClick={() => setItems([...items, { ...emptyItem }])} className="text-sm font-black text-[#b91424]">+ Adicionar item</button></div>
      <div className="mt-3 space-y-3">{items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-[#f5f5f2] p-3 md:grid-cols-[150px_1fr_90px_140px_40px]"><select value={item.type} onChange={(e) => updateItem(index, "type", e.target.value)} className="rounded-lg border border-black/10 bg-white px-3"><option value="servico">Serviço</option><option value="mao_de_obra">Mão de obra</option><option value="peca">Peça</option></select><input placeholder="Descrição" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} className="min-h-11 rounded-lg border border-black/10 px-3" /><input aria-label="Quantidade" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="rounded-lg border border-black/10 px-3" /><input aria-label="Valor unitário" type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} className="rounded-lg border border-black/10 px-3" /><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="grid place-items-center text-red-500"><X size={18} /></button></div>)}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Diagnóstico<textarea rows={3} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="rounded-xl border border-black/10 p-3" /></label><label className="grid gap-2 text-sm font-bold">Observações<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-black/10 p-3" /></label></div>
      <div className="mt-6 flex flex-col items-end gap-2 border-t border-black/8 pt-5"><Input label="Desconto" type="number" value={form.discount} onChange={(v) => setForm({ ...form, discount: v })} /><p className="text-sm text-[#6b737d]">Peças: {money(totals.parts_total)} • Serviços: {money(totals.labor_total)}</p><p className="text-2xl font-black">Total: {money(totals.total)}</p></div>
      <div className="mt-6 flex gap-3"><button disabled={!vehicles.length} className="rounded-xl bg-[#111820] px-5 py-3 font-black text-white disabled:opacity-40">Criar ordem</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-black/10 px-5 py-3 font-bold">Cancelar</button></div>
    </form>}
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-[#111820] text-sm text-white"><tr><th className="p-4">OS</th><th className="p-4">Data</th><th className="p-4">Veículo</th><th className="p-4">Cliente</th><th className="p-4">Status</th><th className="p-4">Total</th></tr></thead><tbody className="divide-y divide-black/7">{orders.map((o) => <tr key={o.id} onClick={() => onSelectOrder(o)} className="cursor-pointer hover:bg-black/[.02]"><td className="p-4 font-black">{o.order_number}</td><td className="p-4">{dateBR(o.entry_date)}</td><td className="p-4"><b>{o.vehicle?.plate}</b> • {o.vehicle?.model}</td><td className="p-4">{o.customer?.name}</td><td className="p-4"><Status status={o.status} /></td><td className="p-4 font-bold">{money(o.total)}</td></tr>)}</tbody></table></div>{orders.length === 0 && <Empty text="Nenhuma ordem cadastrada." />}</div>
  </>;
}

function OrderDetails({ order, onClose, onChanged, onError }: { order: ServiceOrder; onClose: () => void; onChanged: () => void; onError: (e: string) => void }) {
  const [newItem, setNewItem] = useState<ServiceItem>({ ...emptyItem });
  const locked = order.status === "entregue";
  async function updateStatus(status: OrderStatus) {
    if (order.status === "entregue") return;
    const completed_at = status === "concluida" || status === "entregue" ? new Date().toISOString() : null;
    const { error } = await supabase.from("service_orders").update({ status, completed_at }).eq("id", order.id);
    if (error) { onError("Não foi possível alterar o status."); return; } onChanged();
  }
  async function addItem(e: FormEvent) {
    e.preventDefault(); if (locked || !newItem.description.trim()) return;
    const subtotal = Number(newItem.quantity) * Number(newItem.unit_price);
    const allItems = [...(order.items || []), { ...newItem, subtotal }];
    const totals = calculateTotals(allItems, Number(order.discount));
    const { error } = await supabase.from("service_order_items").insert({ service_order_id: order.id, type: newItem.type, description: newItem.description, quantity: newItem.quantity, unit_price: newItem.unit_price, subtotal });
    if (error) { onError("Não foi possível adicionar o item."); return; }
    await supabase.from("service_orders").update(totals).eq("id", order.id); onChanged();
  }
  const whatsapp = () => { const phone = order.customer?.whatsapp || order.customer?.phone || ""; const message = `Olá! A ${order.order_number} do veículo ${order.vehicle?.plate} está como “${statusLabels[order.status]}”. Valor: ${money(order.total)}.`; window.open(`https://wa.me/55${phone.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(message)}`, "_blank"); };
  return <div className="fixed inset-0 z-[70] bg-black/55 p-3 backdrop-blur-sm sm:p-6"><div className="ml-auto h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-black/8 bg-white p-5 sm:p-7"><div><p className="text-sm font-bold text-[#b91424]">{order.order_number}</p><h2 className="mt-1 text-2xl font-black">{order.vehicle?.plate} • {order.vehicle?.brand} {order.vehicle?.model}</h2></div><button onClick={onClose} aria-label="Fechar"><X /></button></div>
    <div className="p-5 sm:p-7"><div className="grid gap-4 rounded-2xl bg-[#f5f5f2] p-5 sm:grid-cols-3"><div><small>Cliente</small><p className="font-bold">{order.customer?.name}</p></div><div><small>Entrada</small><p className="font-bold">{dateBR(order.entry_date)}</p></div><div><small>Status</small><Status status={order.status} /></div></div>
      <div className="mt-6"><h3 className="font-black">Problema relatado</h3><p className="mt-2 leading-7 text-[#59626c]">{order.reported_problem}</p>{order.diagnosis && <><h3 className="mt-5 font-black">Diagnóstico</h3><p className="mt-2 leading-7 text-[#59626c]">{order.diagnosis}</p></>}</div>
      <div className="mt-7"><h3 className="font-black">Itens</h3><div className="mt-3 divide-y divide-black/7 rounded-xl border border-black/8">{(order.items || []).map((item, i) => <div key={item.id || i} className="grid grid-cols-[1fr_auto] gap-3 p-4"><div><b>{item.description}</b><p className="text-sm text-[#6b737d]">{item.quantity} × {money(item.unit_price)}</p></div><b>{money(item.subtotal)}</b></div>)}{!order.items?.length && <Empty text="Nenhum item lançado." />}</div></div>
      {!locked && <form onSubmit={addItem} className="mt-5 grid gap-3 rounded-xl bg-[#fff4f0] p-4 md:grid-cols-[130px_1fr_90px_130px_auto]"><select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ServiceItem["type"] })} className="rounded-lg border border-black/10 bg-white px-3"><option value="servico">Serviço</option><option value="mao_de_obra">Mão de obra</option><option value="peca">Peça</option></select><input required placeholder="Novo item" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="min-h-11 rounded-lg border border-black/10 px-3" /><input type="number" min=".01" step=".01" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} className="rounded-lg border border-black/10 px-3" /><input type="number" min="0" step=".01" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })} className="rounded-lg border border-black/10 px-3" /><button className="rounded-lg bg-[#b91424] px-4 font-black text-white">Adicionar</button></form>}
      {locked && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Esta ordem foi entregue e está bloqueada. Crie uma nova OS para registrar outro atendimento.</p>}
      <div className="mt-7 flex items-end justify-between border-t border-black/8 pt-6"><div className="flex flex-wrap gap-2">{order.status === "concluida" && <button onClick={() => updateStatus("em_andamento")} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800">Reabrir ordem</button>}{!locked && <select value={order.status} onChange={(e) => updateStatus(e.target.value as OrderStatus)} className="rounded-xl border border-black/10 px-3 py-2 text-sm font-bold">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div><div className="text-right"><p className="text-sm text-[#6b737d]">Total da ordem</p><p className="text-3xl font-black">{money(order.total)}</p></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => downloadOrderPdf(order)} className="flex items-center justify-center gap-2 rounded-xl bg-[#111820] px-5 py-3 font-black text-white"><FileDown size={18} /> Baixar PDF</button><button onClick={whatsapp} className="rounded-xl border border-black/10 px-5 py-3 font-black">Enviar resumo pelo WhatsApp</button></div>
    </div></div></div>;
}

function BackupPanel({ customers, vehicles, orders }: { customers: Customer[]; vehicles: Vehicle[]; orders: ServiceOrder[] }) {
  function download() { const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), customers, vehicles, orders }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `backup-lh-mecanica-${today()}.json`; a.click(); URL.revokeObjectURL(url); }
  return <><PageTitle eyebrow="Segurança dos dados" title="Backup manual" copy="Baixe uma cópia dos clientes, veículos, ordens e itens. Guarde o arquivo em um local seguro." /><div className="max-w-2xl rounded-2xl border border-black/8 bg-white p-7"><Download className="text-[#b91424]" size={32} /><h2 className="mt-5 text-2xl font-black">Exportar todos os dados</h2><p className="mt-3 leading-7 text-[#67707a]">O plano gratuito não deve ser tratado como substituto de backup. Faça esta exportação pelo menos uma vez por semana.</p><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-[#f5f5f2] p-3"><b>{customers.length}</b><small className="block">clientes</small></div><div className="rounded-xl bg-[#f5f5f2] p-3"><b>{vehicles.length}</b><small className="block">veículos</small></div><div className="rounded-xl bg-[#f5f5f2] p-3"><b>{orders.length}</b><small className="block">ordens</small></div></div><button onClick={download} className="mt-6 flex items-center gap-2 rounded-xl bg-[#111820] px-5 py-3 font-black text-white"><Download size={18} /> Baixar backup JSON</button></div></>;
}

function Status({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = { aberta: "bg-blue-50 text-blue-700", aguardando_aprovacao: "bg-amber-50 text-amber-800", aprovada: "bg-cyan-50 text-cyan-800", em_andamento: "bg-violet-50 text-violet-700", concluida: "bg-emerald-50 text-emerald-700", entregue: "bg-slate-100 text-slate-700", cancelada: "bg-red-50 text-red-700" };
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ${colors[status]}`}>{statusLabels[status]}</span>;
}

function Input({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-xl border border-black/10 px-3" /></label>;
}
function Select({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (v: string) => void; options: string[][]; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white px-3"><option value="">Selecione</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
function Empty({ text }: { text: string }) { return <p className="col-span-full py-10 text-center text-sm text-[#7a828a]">{text}</p>; }
function calculateTotals(items: ServiceItem[], discount: number) {
  const parts_total = items.filter((i) => i.type === "peca").reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);
  const labor_total = items.filter((i) => i.type !== "peca").reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);
  return { parts_total, labor_total, discount, total: Math.max(0, parts_total + labor_total - discount) };
}
