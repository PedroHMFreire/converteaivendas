"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import {
  BarChart3,
  Edit2,
  Trash2,
  TrendingUp,
  Smile,
  Gift,
  Trophy,
  PlusCircle,
} from "lucide-react";

const LOCAL_KEY = "converte:vendas:";
const PREMIO_KEY = "converte:premio-semana:";

// ===== Helpers =====
function getLocalKey(userId: string) { return `${LOCAL_KEY}${userId}`; }
function getPremioKey(userId: string) { return `${PREMIO_KEY}${userId}`; }

function salvarVendasLocais(userId: string, vendas: Venda[]) {
  localStorage.setItem(getLocalKey(userId), JSON.stringify(vendas));
}
function carregarVendasLocais(userId: string): Venda[] {
  const raw = localStorage.getItem(getLocalKey(userId));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
function salvarPremioSemana(userId: string, premio: string) {
  localStorage.setItem(getPremioKey(userId), premio);
}
function carregarPremioSemana(userId: string): string {
  return localStorage.getItem(getPremioKey(userId)) || "";
}

type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor?: number;
  data: string;
  user_id: string;
  vendas: number;
  atendimentos: number;
};
type Loja = { id: string; nome: string };
type Vendedor = { id: string; nome: string; lojaId: string };

// Garantir YYYY-MM-DD
const dateOnly = (d: string) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const nd = new Date(d);
  return new Date(nd.getFullYear(), nd.getMonth(), nd.getDate()).toISOString().split("T")[0];
};

// Backup periódico em vendas_backup
async function sincronizarComBanco(userId: string, vendas: Venda[]) {
  try {
    await supabase.from("vendas_backup").upsert(
      [{ user_id: userId, vendas, updated_at: new Date().toISOString() }],
      { onConflict: "user_id" }
    );
  } catch (err) {
    console.error("Erro ao sincronizar vendas com banco:", err);
  }
}

// Sincronização direta em 'registros'
async function upsertRegistro(v: Venda, userId: string) {
  try {
    const payload = { ...v, user_id: userId, data: dateOnly(v.data) };
    const { error } = await supabase.from("registros").upsert([payload], { onConflict: "id" });
    if (error) console.error("Erro upsert registros:", error.message);
  } catch (e) {
    console.error("Falha upsert registros:", e);
  }
}
async function deleteRegistro(id: string, userId: string) {
  try {
    const { error } = await supabase.from("registros").delete().eq("user_id", userId).eq("id", id);
    if (error) console.error("Erro delete registros:", error.message);
  } catch (e) {
    console.error("Falha delete registros:", e);
  }
}

// Métricas locais (para cards, gráficos e ranking)
function calcularMetrica(vendas: Venda[], vendedores: Vendedor[], lojas: Loja[]) {
  const porVendedor = vendedores.map((v) => {
    const vendasVendedor = vendas.filter((vd) => vd.vendedorId === v.id);
    const atendimentos = vendasVendedor.reduce((a, b) => a + (b.atendimentos || 0), 0);
    const vendasEfet = vendasVendedor.reduce((a, b) => a + (b.vendas || 0), 0);
    return { id: v.id, nome: v.nome, lojaId: v.lojaId, atendimentos, vendas: vendasEfet, conversao: atendimentos > 0 ? (vendasEfet / atendimentos) * 100 : 0 };
  });
  const porLoja = lojas.map((l) => {
    const vendasLoja = vendas.filter((vd) => vd.lojaId === l.id);
    const atendimentos = vendasLoja.reduce((a, b) => a + (b.atendimentos || 0), 0);
    const vendasEfet = vendasLoja.reduce((a, b) => a + (b.vendas || 0), 0);
    return { id: l.id, nome: l.nome, atendimentos, vendas: vendasEfet, conversao: atendimentos > 0 ? (vendasEfet / atendimentos) * 100 : 0 };
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

  const melhorVendedor =
    porVendedor
      .filter((x) => x.atendimentos >= 3)
      .sort((a, b) => b.conversao - a.conversao)[0]?.nome || "-";

  const melhorLoja =
    porLoja
      .sort((a, b) => b.conversao - a.conversao)[0]?.nome || "-";

  return {
    porVendedor,
    porLoja,
    porDia,
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    melhorVendedor,
    melhorLoja,
  };
}

export default function Home() {
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

  useEffect(() => {
    (async () => {
      const { data: userResp, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userResp?.user) {
        toast({ title: "Você precisa estar logado." });
        return;
      }
      const uid = userResp.user.id;
      setUserId(uid);

      // 1) Ler de 'registros'
      let vendasLocais: Venda[] = [];
      try {
        const { data: regs, error: regsError } = await supabase
          .from("registros")
          .select("*")
          .eq("user_id", uid);
        if (Array.isArray(regs) && regs.length) {
          vendasLocais = regs.map((r: any) => ({ ...r, data: dateOnly(r.data) }));
        }
        if (regsError) console.warn("Erro ao buscar 'registros':", regsError.message);
      } catch (e) {
        console.warn("Falha ao consultar 'registros':", e);
      }

      // 2) Fallback: backup
      if (!vendasLocais.length) {
        const { data, error } = await supabase
          .from("vendas_backup")
          .select("vendas")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();
        if (data?.vendas) {
          vendasLocais = data.vendas;
          salvarVendasLocais(uid, vendasLocais);
        }
        if (error) {
          toast({ title: "Erro ao buscar vendas do Supabase", description: error.message });
        }
      }

      // 3) Fallback final: localStorage
      if (!vendasLocais.length) vendasLocais = carregarVendasLocais(uid);
      setVendas(vendasLocais);

      // Cadastros (lojas e vendedores)
      try {
        const { data: cad, error: cadErr } = await supabase
          .from("cadastros")
          .select("lojas, vendedores")
          .eq("user_id", uid)
          .limit(1)
          .single();
        if (cad) {
          setLojas(cad.lojas || []);
          setVendedores(cad.vendedores || []);
          localStorage.setItem(`converte:lojas:${uid}`, JSON.stringify(cad.lojas || []));
          localStorage.setItem(`converte:vendedores:${uid}`, JSON.stringify(cad.vendedores || []));
        }
        if (cadErr) console.warn("Erro ao buscar cadastros:", cadErr.message);
      } catch (e) {
        console.warn("Falha ao consultar cadastros:", e);
      }

      setPremioSemana(carregarPremioSemana(uid));
      setPremioEdit(carregarPremioSemana(uid));
    })();
  }, []);

  // Backup automático a cada 30min
  useEffect(() => {
    if (!userId) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      sincronizarComBanco(userId, vendas);
    }, 30 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, vendas]);

  // Filtros e métricas
  const vendasFiltradas = vendas.filter((v) => {
    const vendedorOK = filtroVendedor ? v.vendedorId === filtroVendedor : true;
    const lojaOK = filtroLoja ? v.lojaId === filtroLoja : true;
    const dataOK =
      (!filtroDataInicio || dateOnly(v.data) >= filtroDataInicio) &&
      (!filtroDataFim || dateOnly(v.data) <= filtroDataFim);
    return vendedorOK && lojaOK && dataOK;
  });

  const metricas = calcularMetrica(vendasFiltradas, vendedores, lojas);
  const evolucaoPorDia = metricas.porDia;
  const conversaoPorLoja = metricas.porLoja.map(l => ({ nome: l.nome, conversao: Number(l.conversao.toFixed(1)) }));

  // ====== Ranking (já existente) ======
  const getLojaNome = (id: string) => lojas.find(l => l.id === id)?.nome || "-";
  const ranking = metricas.porVendedor
    .map(v => ({
      id: v.id,
      nome: v.nome,
      lojaNome: getLojaNome(v.lojaId),
      atendimentos: v.atendimentos,
      vendas: v.vendas,
      conversao: Number(v.conversao.toFixed(1)),
    }))
    .filter(r => r.atendimentos >= 3)
    .sort((a, b) => b.conversao - a.conversao)
    .slice(0, 6);

  // ====== NOVO 1: Atendimentos por data (comparativo entre lojas) ======
  // top 5 lojas por atendimentos no período; demais => "Outras"
  const palette = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#14b8a6", "#84cc16"];
  const atendimentosPorLojaTotal: Record<string, number> = {};
  vendasFiltradas.forEach(v => {
    atendimentosPorLojaTotal[v.lojaId] = (atendimentosPorLojaTotal[v.lojaId] || 0) + (v.atendimentos || 0);
  });
  const topLojaIds = Object.entries(atendimentosPorLojaTotal)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const hasOutras = Object.keys(atendimentosPorLojaTotal).length > topLojaIds.length;

  const lojaKeyLabels = [
    ...topLojaIds.map(id => getLojaNome(id)),
    ...(hasOutras ? ["Outras"] : []),
  ];

  const porDataLoja: Record<string, Record<string, number>> = {};
  vendasFiltradas.forEach(v => {
    const d = dateOnly(v.data);
    if (!porDataLoja[d]) porDataLoja[d] = {};
    const keyName = topLojaIds.includes(v.lojaId) ? getLojaNome(v.lojaId) : (hasOutras ? "Outras" : getLojaNome(v.lojaId));
    porDataLoja[d][keyName] = (porDataLoja[d][keyName] || 0) + (v.atendimentos || 0);
  });
  const atendimentosComparativoLojas = Object.keys(porDataLoja)
    .sort((a,b) => a.localeCompare(b))
    .map(d => ({ data: d, ...lojaKeyLabels.reduce((acc, k) => ({ ...acc, [k]: porDataLoja[d][k] || 0 }), {}) }));

  const comparativoLojasConfig = lojaKeyLabels.reduce((acc, key, idx) => {
    acc[key] = { color: palette[idx % palette.length] };
    return acc;
  }, {} as Record<string, { color: string }>);

  // ====== NOVO 2: Atendimentos por vendedor (top 10) ======
  const atendimentosPorVendedorData = metricas.porVendedor
    .map(v => ({ nome: v.nome, atendimentos: v.atendimentos }))
    .filter(v => v.atendimentos > 0)
    .sort((a,b) => b.atendimentos - a.atendimentos)
    .slice(0, 10);

  // ====== Modal / Edição ======
  const handleAtendimentosChange = (at: number) => {
    setEditingVenda((prev) => (prev ? { ...prev, atendimentos: at } : prev));
    setConversaoPreview((prev) => {
      const v = editingVenda?.vendas ?? 0;
      return at > 0 ? (v / at) * 100 : null;
    });
  };
  const handleVendasChange = (vendasNum: number) => {
    setEditingVenda((prev) => (prev ? { ...prev, vendas: vendasNum } : prev));
    setConversaoPreview(
      editingVenda && editingVenda.atendimentos > 0
        ? (vendasNum / editingVenda.atendimentos) * 100
        : null
    );
  };

  const salvarVenda = async (venda: Venda) => {
    if (!userId) return;
    const id = venda.id || crypto.randomUUID();
    const normalizada = { ...venda, id, user_id: userId, data: dateOnly(venda.data) };

    await upsertRegistro(normalizada, userId); // sync imediato

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
    setConversaoPreview(
      venda.atendimentos > 0 ? (venda.vendas / venda.atendimentos) * 100 : null
    );
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
  const getVendedorNome = (id: string) => vendedores.find(v => v.id === id)?.nome || "-";

  const registrosRecentes = vendas
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 30);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-8">
      {/* Header fixo com botão principal */}
      <div className="sticky top-0 z-30 -mx-2 md:-mx-4 px-2 md:px-4 py-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h1 className="text-lg font-bold">Home</h1>
        <Button onClick={novaVenda} className="inline-flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> Registrar venda
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 mt-4">
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
      </div>

      {/* Indicadores */}
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
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Trophy className="w-5 h-5" /> Melhor Vendedor</div>
          <div className="text-xl font-bold mt-1">{metricas.melhorVendedor}</div>
        </div>
        <div className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Gift className="w-5 h-5" /> Melhor Loja</div>
          <div className="text-xl font-bold mt-1">{metricas.melhorLoja}</div>
        </div>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="w-full overflow-x-auto">
          <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Atendimentos x Vendas</CardTitle></CardHeader>
          <CardContent>
            <div className="min-w-[220px] sm:min-w-0 min-h-[220px] w-full">
              <Chart
                data={evolucaoPorDia}
                type="bar"
                keys={["atendimentos", "vendas"]}
                config={{ atendimentos: { color: "#6366f1" }, vendas: { color: "#10b981" } }}
                xKey="data"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="w-full overflow-x-auto">
          <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Conversão por Lojas</CardTitle></CardHeader>
          <CardContent>
            <div className="min-w-[220px] sm:min-w-0 min-h-[220px] w-full">
              <Chart
                data={conversaoPorLoja}
                type="bar"
                keys={["conversao"]}
                config={{ conversao: { color: "#22c55e" } }}
                xKey="nome"
                yLabel="%"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NOVOS GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* 1) Atendimentos por data – comparativo entre lojas */}
        <Card className="w-full overflow-x-auto">
          <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Atendimentos por data (lojas)</CardTitle></CardHeader>
          <CardContent>
            <div className="min-w-[260px] sm:min-w-0 min-h-[260px] w-full">
              <Chart
                data={atendimentosComparativoLojas}
                type="bar"
                keys={lojaKeyLabels}
                config={comparativoLojasConfig}
                xKey="data"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2) Atendimentos por vendedor */}
        <Card className="w-full overflow-x-auto">
          <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Atendimentos por vendedor (top 10)</CardTitle></CardHeader>
          <CardContent>
            <div className="min-w-[220px] sm:min-w-0 min-h-[260px] w-full">
              <Chart
                data={atendimentosPorVendedorData}
                type="bar"
                keys={["atendimentos"]}
                config={{ atendimentos: { color: "#6366f1" } }}
                xKey="nome"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Conversão */}
      <Card className="w-full overflow-x-auto mb-8">
        <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Trophy className="w-5 h-5" /> Ranking de Conversão</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
                  <th className="px-2 py-1 text-left">#</th>
                  <th className="px-2 py-1 text-left">Vendedor</th>
                  <th className="px-2 py-1 text-left">Loja</th>
                  <th className="px-2 py-1 text-center">Atend.</th>
                  <th className="px-2 py-1 text-center">Vendas</th>
                  <th className="px-2 py-1 text-center">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, idx) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-zinc-800">
                    <td className="px-2 py-1">{idx + 1}</td>
                    <td className="px-2 py-1">{r.nome}</td>
                    <td className="px-2 py-1">{r.lojaNome}</td>
                    <td className="px-2 py-1 text-center">{r.atendimentos}</td>
                    <td className="px-2 py-1 text-center">{r.vendas}</td>
                    <td className="px-2 py-1 text-center">{r.conversao.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Registros Recentes */}
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

      {/* Modal de registro/edição */}
      {isDialogOpen && editingVenda && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Smile className="w-5 h-5 text-green-500" />
              {editingVenda.id ? "Registrar/Editar Venda" : "Registrar Venda"}
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
              <input className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" type="date" value={editingVenda.data} onChange={(e) => setEditingVenda({ ...editingVenda, data: e.target.value })} required />
              <input className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" type="number" placeholder="Atendimentos" value={editingVenda.atendimentos} onChange={(e) => handleAtendimentosChange(Number(e.target.value))} min={0} required />
              <input className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" type="number" placeholder="Vendas" value={editingVenda.vendas} onChange={(e) => handleVendasChange(Number(e.target.value))} min={0} required />
              <select className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" value={editingVenda.vendedorId ?? ""} onChange={(e) => setEditingVenda({ ...editingVenda, vendedorId: e.target.value })} required>
                <option value="">Selecione o vendedor</option>
                {vendedores.map((v) => (<option key={v.id} value={v.id}>{v.nome}</option>))}
              </select>
              <select className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white" value={editingVenda.lojaId ?? ""} onChange={(e) => setEditingVenda({ ...editingVenda, lojaId: e.target.value })} required>
                <option value="">Selecione a loja</option>
                {lojas.map((l) => (<option key={l.id} value={l.id}>{l.nome}</option>))}
              </select>

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
    </div>
  );
}
