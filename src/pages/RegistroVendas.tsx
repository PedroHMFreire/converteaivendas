"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { BarChart3, Edit2, Trash2, TrendingUp, Smile, Gift } from "lucide-react";
import { Chart } from "@/components/ui/chart";

const LOCAL_KEY = "converte:vendas:";
const PREMIO_KEY = "converte:premio-semana:";

type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor?: number; // usado só para estimativa de referência (não entra no cálculo)
  data: string;
  user_id: string;
  vendas: number;
  atendimentos: number;
};

type Loja = { id: string; nome: string; ticketMedio?: number; metaTicket?: number }; // + meta (referência, não entra no cálculo)
type Vendedor = { id: string; nome: string; lojaId: string };

function getLocalKey(userId: string) { return `${LOCAL_KEY}${userId}`; }
function getPremioKey(userId: string) { return `${PREMIO_KEY}${userId}`; }
function salvarVendasLocais(userId: string, vendas: Venda[]) { localStorage.setItem(getLocalKey(userId), JSON.stringify(vendas)); }
function carregarVendasLocais(userId: string): Venda[] {
  const raw = localStorage.getItem(getLocalKey(userId));
  if (!raw) return [];
  try { return JSON.parse(raw) as Venda[]; } catch { return []; }
}
function salvarPremioSemana(userId: string, premio: string) { localStorage.setItem(getPremioKey(userId), premio); }
function carregarPremioSemana(userId: string): string { return localStorage.getItem(getPremioKey(userId)) || ""; }
const dateOnly = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date(new Date(d)).toISOString().split("T")[0];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

async function sincronizarComBanco(userId: string, vendas: Venda[]) {
  try {
    await supabase.from("vendas_backup").upsert(
      [{ user_id: userId, vendas, updated_at: new Date().toISOString() }],
      { onConflict: "user_id" }
    );
  } catch (err) { console.error("Erro ao sincronizar vendas com banco:", err); }
}

async function upsertRegistro(v: Venda, userId: string) {
  try {
    const payload = { ...v, user_id: userId, data: dateOnly(v.data) };
    const { error } = await supabase.from("registros").upsert([payload], { onConflict: "id" });
    if (error) console.error("Erro upsert registros:", error.message);
  } catch (e) { console.error("Falha upsert registros:", e); }
}
async function deleteRegistro(id: string, userId: string) {
  try {
    const { error } = await supabase.from("registros").delete().eq("user_id", userId).eq("id", id);
    if (error) console.error("Erro delete registros:", error.message);
  } catch (e) { console.error("Falha delete registros:", e); }
}

/* ===== Métricas base (mantidas) ===== */
function calcularMetricaBase(vendas: Venda[], vendedores: Vendedor[], lojas: Loja[]) {
  const porVendedor = vendedores.map((v) => {
    const vend = vendas.filter((vd) => vd.vendedorId === v.id);
    const atend = vend.reduce((a, b) => a + (b.atendimentos || 0), 0);
    const efet = vend.reduce((a, b) => a + (b.vendas || 0), 0);
    return { id: v.id, nome: v.nome, lojaId: v.lojaId, atendimentos: atend, vendas: efet, conversao: atend > 0 ? (efet / atend) * 100 : 0 };
  });
  const porLoja = lojas.map((l) => {
    const vend = vendas.filter((vd) => vd.lojaId === l.id);
    const atend = vend.reduce((a, b) => a + (b.atendimentos || 0), 0);
    const efet = vend.reduce((a, b) => a + (b.vendas || 0), 0);
    return { id: l.id, nome: l.nome, atendimentos: atend, vendas: efet, conversao: atend > 0 ? (efet / atend) * 100 : 0 };
  });
  const porDiaMap: Record<string, { data: string; atendimentos: number; vendas: number }> = {};
  vendas.forEach((v) => {
    const key = dateOnly(v.data);
    if (!porDiaMap[key]) porDiaMap[key] = { data: key, atendimentos: 0, vendas: 0 };
    porDiaMap[key].atendimentos += v.atendimentos || 0;
    porDiaMap[key].vendas += v.vendas || 0;
  });
  const porDia = Object.values(porDiaMap).sort((a, b) => a.data.localeCompare(b.data));
  const totalAtendimentos = vendas.reduce((a, b) => a + (b.atendimentos || 0), 0);
  const totalVendas = vendas.reduce((a, b) => a + (b.vendas || 0), 0);
  const conversaoGeral = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;
  const melhorVendedor = porVendedor.filter(x => x.atendimentos >= 3).sort((a, b) => b.conversao - a.conversao)[0]?.nome || "-";
  const melhorLoja = porLoja.sort((a, b) => b.conversao - a.conversao)[0]?.nome || "-";
  return { porVendedor, porLoja, porDia, totalAtendimentos, totalVendas, conversaoGeral, melhorVendedor, melhorLoja };
}

/* ===== Estimativa de referência (não entra no cálculo) ===== */
function construirTicketEstimadoMap(vendas: Venda[]): Record<string, number> {
  const porLoja: Record<string, { totalValor: number; totalVendas: number }> = {};
  for (const v of vendas) {
    const lv = v.valor ?? 0;
    const vv = v.vendas ?? 0;
    if (!porLoja[v.lojaId]) porLoja[v.lojaId] = { totalValor: 0, totalVendas: 0 };
    porLoja[v.lojaId].totalValor += lv;
    porLoja[v.lojaId].totalVendas += vv;
  }
  const estimado: Record<string, number> = {};
  for (const lojaId of Object.keys(porLoja)) {
    const { totalValor, totalVendas } = porLoja[lojaId];
    estimado[lojaId] = totalVendas > 0 ? totalValor / totalVendas : 0;
  }
  return estimado;
}

/* ===== Raio-X (usa SOMENTE ticketMedio salvo) ===== */
function calcularPerdas(vendas: Venda[], vendedores: Vendedor[], lojas: Loja[]) {
  // mapa de tickets salvos (0 se ausente): usado nos cálculos
  const ticketSalvoMap: Record<string, number> = {};
  const lojasSemTicket: string[] = [];
  for (const l of lojas) {
    const t = (typeof l.ticketMedio === "number" && !Number.isNaN(l.ticketMedio) && l.ticketMedio > 0) ? l.ticketMedio : 0;
    ticketSalvoMap[l.id] = t;
    if (t === 0) lojasSemTicket.push(l.nome);
  }
  // referência visual (não usada nos cálculos)
  const ticketEstimadoMap = construirTicketEstimadoMap(vendas);

  let valorPerdidoTotal = 0;
  const perdidosPorVendedorMap: Record<string, number> = {};
  const valorPerdidoPorLojaMap: Record<string, number> = {};

  for (const v of vendas) {
    const perdidos = Math.max((v.atendimentos || 0) - (v.vendas || 0), 0);
    const ticket = ticketSalvoMap[v.lojaId] || 0; // ← SOMENTE o salvo entra aqui
    const valorPerdido = perdidos * ticket;

    perdidosPorVendedorMap[v.vendedorId] = (perdidosPorVendedorMap[v.vendedorId] || 0) + perdidos;
    valorPerdidoPorLojaMap[v.lojaId] = (valorPerdidoPorLojaMap[v.lojaId] || 0) + valorPerdido;
    valorPerdidoTotal += valorPerdido;
  }

  const getVendedorNome = (id: string) => vendedores.find(v => v.id === id)?.nome || "-";
  const getLojaNome = (id: string) => lojas.find(l => l.id === id)?.nome || "-";

  const perdidosPorVendedor = Object.entries(perdidosPorVendedorMap)
    .map(([vendedorId, perdidos]) => ({ nome: getVendedorNome(vendedorId), perdidos }))
    .sort((a, b) => b.perdidos - a.perdidos)
    .slice(0, 12);

  const valorPerdidoPorLoja = Object.entries(valorPerdidoPorLojaMap)
    .map(([lojaId, valor]) => ({ nome: getLojaNome(lojaId), lojaId, valor }))
    .sort((a, b) => b.valor - a.valor);

  return {
    valorPerdidoTotal,
    perdidosPorVendedor,
    valorPerdidoPorLoja,
    ticketSalvoMap,
    ticketEstimadoMap, // referência visual
    lojasSemTicket,
  };
}

export default function RegistroVendas() {
  const [userId, setUserId] = useState<string>("");
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [conversaoPreview, setConversaoPreview] = useState<number | null>(null);
  const [filtroVendedor, setFiltroVendedor] = useState<string>("");
  const [filtroLoja, setFiltroLoja] = useState<string>("");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [premioSemana, setPremioSemana] = useState<string>("");
  const [premioEdit, setPremioEdit] = useState<string>("");
  const [editandoPremio, setEditandoPremio] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar dados
  useEffect(() => {
    (async () => {
      const { data: userResp, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userResp?.user) { toast({ title: "Você precisa estar logado." }); return; }
      const uid = userResp.user.id;
      setUserId(uid);

      // registros
      let vendasLocais: Venda[] = [];
      try {
        const { data: regs } = await supabase.from("registros").select("*").eq("user_id", uid);
        if (Array.isArray(regs) && regs.length) vendasLocais = regs.map((r: any) => ({ ...r, data: dateOnly(r.data) }));
      } catch (e) { console.warn("Falha ao consultar 'registros':", e); }

      // fallback backup
      if (!vendasLocais.length) {
        try {
          const { data } = await supabase
            .from("vendas_backup").select("vendas")
            .eq("user_id", uid).order("updated_at", { ascending: false }).limit(1).single();
          if (data?.vendas) { vendasLocais = data.vendas; salvarVendasLocais(uid, vendasLocais); }
        } catch (e) { /* noop */ }
      }
      if (!vendasLocais.length) vendasLocais = carregarVendasLocais(uid);
      setVendas(vendasLocais);

      // cadastros (lojas + vendedores) — agora com ticketMedio em lojas
      try {
        const { data: cad } = await supabase.from("cadastros").select("lojas, vendedores").eq("user_id", uid).limit(1).single();
        if (cad) {
          setLojas((cad.lojas || []) as Loja[]);
          setVendedores((cad.vendedores || []) as Vendedor[]);
          localStorage.setItem(`converte:lojas:${uid}`, JSON.stringify(cad.lojas || []));
          localStorage.setItem(`converte:vendedores:${uid}`, JSON.stringify(cad.vendedores || []));
        }
      } catch (e) { console.warn("Falha ao consultar 'cadastros':", e); }

      setPremioSemana(carregarPremioSemana(uid));
      setPremioEdit(carregarPremioSemana(uid));
    })();
  }, []);

  // Backup periódico
  useEffect(() => {
    if (!userId) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => { sincronizarComBanco(userId, vendas); }, 30 * 60 * 1000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [userId, vendas]);

  // Filtros
  const vendasFiltradas = useMemo(() => vendas.filter((v) => {
    const vendedorOK = filtroVendedor ? v.vendedorId === filtroVendedor : true;
    const lojaOK = filtroLoja ? v.lojaId === filtroLoja : true;
    const dataOK = (!filtroDataInicio || dateOnly(v.data) >= filtroDataInicio) && (!filtroDataFim || dateOnly(v.data) <= filtroDataFim);
    return vendedorOK && lojaOK && dataOK;
  }), [vendas, filtroVendedor, filtroLoja, filtroDataInicio, filtroDataFim]);

  const metricas = useMemo(() => calcularMetricaBase(vendasFiltradas, vendedores, lojas), [vendasFiltradas, vendedores, lojas]);
  const evolucaoPorDia = metricas.porDia;
  const conversaoPorLoja = metricas.porLoja.map(l => ({ nome: l.nome, conversao: Number(l.conversao.toFixed(1)) }));

  // ===== Raio-X (com tickets salvos) =====
  const perdas = useMemo(() => calcularPerdas(vendasFiltradas, vendedores, lojas), [vendasFiltradas, vendedores, lojas]);
  const { valorPerdidoTotal, perdidosPorVendedor, valorPerdidoPorLoja, lojasSemTicket, ticketSalvoMap, ticketEstimadoMap } = perdas;

  // Atualiza ticket local e salva em cadastros
  const atualizarTicketLocal = (lojaId: string, valor: number) => {
    setLojas(prev => prev.map(l => l.id === lojaId ? { ...l, ticketMedio: Number.isFinite(valor) ? Math.max(0, valor) : undefined } : l));
  };

  const atualizarMetaTicket = (lojaId: string, valor: number) => {
  setLojas(prev =>
    prev.map(l =>
      l.id === lojaId
        ? { ...l, metaTicket: Number.isFinite(valor) ? Math.max(0, valor) : undefined }
        : l
    )
  );
};

  const salvarTickets = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("cadastros").upsert(
        [{ user_id: userId, lojas, vendedores, updated_at: new Date().toISOString() }],
        { onConflict: "user_id" }
      );
      if (error) throw error;
      localStorage.setItem(`converte:lojas:${userId}`, JSON.stringify(lojas));
      toast({ title: "Ticket médio atualizado!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar ticket médio", description: String(e), variant: "destructive" });
    }
  };

  // CRUD vendas
  const handleAtendimentosChange = (at: number) => {
    setEditingVenda((prev) => (prev ? { ...prev, atendimentos: at } : prev));
    setConversaoPreview((prev) => {
      const v = editingVenda?.vendas ?? 0;
      return at > 0 ? (v / at) * 100 : null;
    });
  };
  const handleVendasChange = (vendasNum: number) => {
    setEditingVenda((prev) => (prev ? { ...prev, vendas: vendasNum } : prev));
    setConversaoPreview(editingVenda && editingVenda.atendimentos > 0 ? (vendasNum / editingVenda.atendimentos) * 100 : null);
  };

  const registrosRecentes = vendas.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30);
  const getVendedorNome = (id: string) => vendedores.find(v => v.id === id)?.nome || "-";
  const getLojaNome = (id: string) => lojas.find(l => l.id === id)?.nome || "-";

  const salvarVenda = async (venda: Venda) => {
    if (!userId) return;
    const id = venda.id || crypto.randomUUID();
    const normalizada = { ...venda, id, user_id: userId, data: dateOnly(venda.data) };
    await upsertRegistro(normalizada, userId);
    const novas = [...vendas.filter(v => v.id !== id), normalizada];
    setVendas(novas);
    salvarVendasLocais(userId, novas);
    sincronizarComBanco(userId, novas);
    setIsDialogOpen(false);
    setEditingVenda(null);
    setConversaoPreview(null);
    toast({ title: "Venda registrada!", description: `Conversão: ${((normalizada.vendas / (normalizada.atendimentos || 1)) * 100).toFixed(1)}%` });
  };

  const excluirVenda = async (id: string) => {
    if (!userId) return;
    const novasVendas = vendas.filter((v) => v.id !== id);
    setVendas(novasVendas);
    salvarVendasLocais(userId, novasVendas);
    await deleteRegistro(id, userId);
    sincronizarComBanco(userId, novasVendas);
  };

  const editarVenda = (venda: Venda) => {
    setEditingVenda(venda);
    setIsDialogOpen(true);
    setConversaoPreview(venda.atendimentos > 0 ? (venda.vendas / venda.atendimentos) * 100 : null);
  };

  const novaVenda = () => {
    setEditingVenda({
      id: crypto.randomUUID(),
      vendedorId: "",
      lojaId: "",
      atendimentos: 0,
      vendas: 0,
      data: dateOnly(new Date().toISOString()),
      user_id: userId!,
    });
    setIsDialogOpen(true);
    setConversaoPreview(null);
  };

  const vendedoresFiltrados = filtroLoja ? vendedores.filter((v) => v.lojaId === filtroLoja) : vendedores;

  /* ================= UI ================= */
  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-8">
      {/* Filtros + ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-bold mb-1">Loja</label>
            <select className="border p-2 w-full dark:bg-zinc-800 dark:text-white" value={filtroLoja} onChange={(e) => setFiltroLoja(e.target.value)}>
              <option value="">Todas</option>
              {lojas.map((l) => (<option key={l.id} value={l.id}>{l.nome}</option>))}
            </select>
          </div>
          <div className="w-full sm:w-56">
            <label className="block text-xs font-bold mb-1">Vendedor</label>
            <select className="border p-2 w-full dark:bg-zinc-800 dark:text-white" value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)}>
              <option value="">Todos</option>
              {vendedoresFiltrados.map((v) => (<option key={v.id} value={v.id}>{v.nome}</option>))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div>
            <label className="block text-xs font-bold mb-1">Data início</label>
            <input className="border rounded p-2 w-full dark:bg-zinc-800 dark:text-white" type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Data fim</label>
            <input className="border rounded p-2 w-full dark:bg-zinc-800 dark:text-white" type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <Button onClick={novaVenda} className="w-full">Nova venda</Button>
        </div>
      </div>

      {/* Painel: Ticket médio por loja */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Ticket médio por loja</h3>
          <Button size="sm" onClick={salvarTickets}>Salvar tickets</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lojas.length === 0 ? (
            <div className="text-xs text-gray-500">Cadastre lojas na página Cadastros.</div>
          ) : lojas.map((l) => {
            const hasSalvo = typeof l.ticketMedio === "number" && l.ticketMedio > 0;
            return (
              <div key={l.id} className="flex items-center gap-2">
                <div className="text-xs w-40 truncate flex items-center gap-2">
                  <span>{l.nome}</span>
                  {hasSalvo ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Usado</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pendente</span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Ex.: 180"
                  value={l.ticketMedio ?? ""}
                  onChange={(e) => atualizarTicketLocal(l.id, Number(e.target.value))}
                  className="border rounded p-2 text-sm w-36 dark:bg-zinc-800 dark:text-white"
                />
                <div className="text-[11px] text-gray-500">
                  Ref.: {brl(ticketEstimadoMap[l.id] || 0)} <span className="opacity-60">(não entra no cálculo)</span>
                </div>
              </div>
            );
          })}
        </div>
        {lojasSemTicket.length > 0 && (
          <div className="text-[11px] text-amber-600 mt-2">
            Preencha o ticket médio das lojas para projeções corretas. Faltando: {lojasSemTicket.join(", ")}
          </div>
        )}
      </div>

{/* Tabela comparativa (Ticket salvo × Meta — meta é referência e NÃO entra no cálculo) */}
<div className="mb-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold">Ticket médio × Meta Ticket (referência)</h3>
    <Button size="sm" onClick={salvarTickets}>Salvar metas</Button> {/* usa o mesmo salvamento de lojas */}
  </div>

  {lojas.length === 0 ? (
    <div className="text-xs text-gray-500">Sem lojas cadastradas.</div>
  ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
            <th className="px-2 py-1 text-left">Loja</th>
            <th className="px-2 py-1 text-right">Ticket atual (usado)</th>
            <th className="px-2 py-1 text-right">Meta Ticket (editável)</th>
            <th className="px-2 py-1 text-right">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {lojas.map((l) => {
            const atual = (typeof l.ticketMedio === "number" && l.ticketMedio > 0) ? l.ticketMedio! : undefined;
            const meta = (typeof l.metaTicket === "number" && l.metaTicket >= 0) ? l.metaTicket! : undefined;
            const gap = (meta !== undefined && atual !== undefined) ? (meta - atual) : undefined; // >0 = falta subir

            return (
              <tr key={l.id} className="border-b border-gray-100 dark:border-zinc-800">
                <td className="px-2 py-1">{l.nome}</td>
                <td className="px-2 py-1 text-right">{atual !== undefined ? brl(atual) : "-"}</td>
                <td className="px-2 py-1 text-right">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Meta"
                    value={l.metaTicket ?? ""}
                    onChange={(e) => atualizarMetaTicket(l.id, Number(e.target.value))}
                    className="border rounded p-1 w-28 text-right dark:bg-zinc-800 dark:text-white"
                    title="Meta de ticket por loja (referência, não entra no cálculo)"
                  />
                </td>
                <td className={`px-2 py-1 text-right ${
                  gap !== undefined ? (gap > 0 ? "text-rose-600" : "text-emerald-600") : ""
                }`}>
                  {gap !== undefined ? (gap === 0 ? "OK" : brl(gap)) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
  <p className="text-[11px] text-gray-500 mt-2">
    * A <strong>Meta Ticket</strong> é apenas referência gerencial e <strong>não entra</strong> nos cálculos de valor perdido ou conversão.
  </p>
</div>

      {/* Indicadores principais + Perdas */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        <div className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Smile className="w-5 h-5" /> Atendimentos</div>
          <div className="text-xl font-bold mt-1">{metricas.totalAtendimentos}</div>
        </div>
        <div className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><TrendingUp className="w-5 h-5" /> Vendas</div>
          <div className="text-xl font-bold mt-1">{metricas.totalVendas}</div>
        </div>
        <div className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><BarChart3 className="w-5 h-5" /> Conversão</div>
          <div className="text-xl font-bold mt-1">{metricas.conversaoGeral.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><BarChart3 className="w-5 h-5" /> Perdidos</div>
          <div className="text-xl font-bold mt-1">
            {vendasFiltradas.reduce((acc, v) => acc + Math.max((v.atendimentos||0)-(v.vendas||0), 0), 0)}
          </div>
        </div>
        <div className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Gift className="w-5 h-5" /> Valor Perdido</div>
          <div className="text-xl font-bold mt-1">{brl(valorPerdidoTotal)}</div>
        </div>
      </div>

      {/* Gráficos: base + raio-x */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="w-full max-w-full overflow-x-auto">
          <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Evolução de Atendimentos e Vendas
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 sm:p-4 w-full">
            <Chart
              data={evolucaoPorDia}
              type="bar"
              keys={["atendimentos", "vendas"]}
              config={{ atendimentos: { color: "#6366f1" }, vendas: { color: "#10b981" } }}
              xKey="data"
            />
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto">
          <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Conversão por Lojas
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 sm:p-4 w-full">
            <Chart
              data={conversaoPorLoja}
              type="bar"
              keys={["conversao"]}
              config={{ conversao: { color: "#22c55e" } }}
              xKey="nome"
              yLabel="%"
            />
          </div>
        </div>
      </div>

      {/* Raio-X: Perdidos por vendedor + Valor perdido por loja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="w-full max-w-full overflow-x-auto">
          <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Não convertidos por vendedor (Top 12)
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 sm:p-4 w-full">
            <Chart
              data={perdidosPorVendedor}
              type="bar"
              keys={["perdidos"]}
              config={{ perdidos: { color: "#ef4444" } }}
              xKey="nome"
            />
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto">
          <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Vendas Perdidas
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 sm:p-4 w-full">
            <Chart
              data={valorPerdidoPorLoja.map(x => ({ ...x, valor: Math.round(x.valor) }))}
              type="bar"
              keys={["valor"]}
              config={{ valor: { color: "#f59e0b" } }}
              xKey="nome"
              yLabel="R$"
            />
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <Edit2 className="w-5 h-5" /> Registros Recentes
        </h2>
        {registrosRecentes.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-sm">Nenhum registro cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm border rounded">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
                  <th className="px-1 sm:px-2 py-1 text-left">Data</th>
                  <th className="px-1 sm:px-2 py-1 text-left">Vendedor</th>
                  <th className="px-1 sm:px-2 py-1 text-left">Loja</th>
                  <th className="px-1 sm:px-2 py-1 text-center">Atend.</th>
                  <th className="px-1 sm:px-2 py-1 text-center">Vendas</th>
                  <th className="px-1 sm:px-2 py-1 text-center">Valor</th>
                  <th className="px-1 sm:px-2 py-1 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registrosRecentes.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-zinc-800">
                    <td className="px-1 sm:px-2 py-1">{r.data}</td>
                    <td className="px-1 sm:px-2 py-1">{getVendedorNome(r.vendedorId)}</td>
                    <td className="px-1 sm:px-2 py-1">{getLojaNome(r.lojaId)}</td>
                    <td className="px-1 sm:px-2 py-1 text-center">{r.atendimentos}</td>
                    <td className="px-1 sm:px-2 py-1 text-center">{r.vendas}</td>
                    <td className="px-1 sm:px-2 py-1 text-center">{r.valor ? brl(r.valor) : "-"}</td>
                    <td className="px-1 sm:px-2 py-1 text-center">
                      <Button size="sm" variant="ghost" onClick={() => editarVenda(r)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => excluirVenda(r.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edição/criação */}
      {isDialogOpen && editingVenda && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Smile className="w-5 h-5 text-green-500" />
              {editingVenda.id ? "Editar Venda" : "Nova Venda"}
            </h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (editingVenda && editingVenda.atendimentos >= 0 && editingVenda.vendas >= 0 && editingVenda.vendedorId && editingVenda.lojaId && editingVenda.data) {
                  salvarVenda(editingVenda);
                } else {
                  toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" });
                }
              }}
            >
    <label className="block text-xs font-bold mb-1">Data</label>
    <input className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" type="date" value={editingVenda.data} onChange={(e) => setEditingVenda({ ...editingVenda, data: e.target.value })} required />

    <label className="block text-xs font-bold mb-1">Atendimentos</label>
    <input className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" type="number" placeholder="Insira a quantidade de atendimentos" value={editingVenda.atendimentos === 0 ? "" : editingVenda.atendimentos} onChange={(e) => handleAtendimentosChange(Number(e.target.value))} min={0} required />

    <label className="block text-xs font-bold mb-1">Vendas</label>
    <input className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" type="number" placeholder="Insira a quantidade de vendas" value={editingVenda.vendas === 0 ? "" : editingVenda.vendas} onChange={(e) => handleVendasChange(Number(e.target.value))} min={0} required />

              <select
                className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white"
                value={editingVenda.vendedorId ?? ""}
                onChange={(e) => {
                  const vid = e.target.value;
                  const vend = vendedores.find(v => v.id === vid);
                  setEditingVenda({ ...editingVenda, vendedorId: vid, lojaId: vend?.lojaId ?? "" });
                }}
                required
              >
                <option value="">Selecione o vendedor</option>
                {vendedores.map((v) => (<option key={v.id} value={v.id}>{v.nome}</option>))}
              </select>
              <label className="block text-xs font-bold mb-1">Loja</label>
              <input
                className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white"
                type="text"
                value={getLojaNome(editingVenda.lojaId) || ""}
                placeholder="Selecione um vendedor para preencher a loja"
                readOnly
                disabled
              />

              {conversaoPreview !== null && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Conversão prévia: {conversaoPreview.toFixed(1)}%</div>
              )}

              <div className="flex items-center justify-end gap-2 mt-4">
                <Button variant="outline" type="button" onClick={() => { setIsDialogOpen(false); setEditingVenda(null); }}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-8 sm:mt-12 py-6 border-t text-center text-xs text-gray-500 dark:text-gray-400">
        Convertê &copy; {new Date().getFullYear()} — Performance e resultados com inteligência.
      </footer>
    </div>
  );
}
